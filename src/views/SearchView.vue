<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSearchStore } from '@/stores/search'
import { useBookshelfStore } from '@/stores/bookshelf'
import { useRouter } from 'vue-router'
import { coverUrl } from '@/api/books'
import AppSnackbar from '@/components/app/AppSnackbar.vue'
import type { Book, SearchBook } from '@/types'

const router = useRouter()
const search = useSearchStore()
const shelf = useBookshelfStore()
const { keyword, groups, running, error, authError, total } = storeToRefs(search)

const input = ref('')
const addingUrl = ref('')
const snackbar = ref('')

const doneCount = computed(() => search.groups.filter((g) => g.done).length)

onMounted(() => {
  void shelf.loadBooks()
})

onBeforeUnmount(() => search.stop())

/** 入场错峰：行号封顶，避免大批量推送时延迟累计过大 */
function rowStyle(i: number) {
  return { '--row-i': String(Math.min(i, 8)) }
}

/** 结果卡片第二行：优先简介，缺省时回退到最新章节 */
function introText(b: SearchBook): string {
  const intro = b.intro?.trim()
  if (intro) return intro
  if (b.latestChapterTitle) return `最新：${b.latestChapterTitle}`
  return ''
}

/** 是否已在书架（用于加入按钮的已入架状态） */
function inShelf(bookUrl: string) {
  return shelf.books.some((x) => x.bookUrl === bookUrl)
}

function startSearch() {
  void search.start(input.value)
}

/** 搜索结果 → 完整 Book（后端目录/正文都要求书先入库） */
function toBook(b: SearchBook): Book {
  return {
    bookUrl: b.bookUrl,
    tocUrl: b.tocUrl,
    origin: b.origin,
    originName: b.originName,
    name: b.name,
    author: b.author,
    kind: b.kind,
    coverUrl: b.coverUrl,
    intro: b.intro,
    type: b.type,
    group: 0,
    latestChapterTitle: b.latestChapterTitle,
    latestChapterTime: Date.now(),
    lastCheckTime: Date.now(),
    lastCheckCount: 0,
    totalChapterNum: 0,
    durChapterTitle: null,
    durChapterIndex: 0,
    durVolumeIndex: 0,
    chapterInVolumeIndex: 0,
    durChapterPos: 0,
    durChapterTime: 0,
    wordCount: b.wordCount,
    canUpdate: true,
    order: 0,
    originOrder: b.originOrder,
    variable: b.variable,
    syncTime: 0,
  }
}

async function openBook(b: SearchBook) {
  if (!shelf.books.some((x) => x.bookUrl === b.bookUrl)) {
    try {
      await shelf.addBook(toBook(b))
    } catch (e) {
      snackbar.value = (e as Error).message
      return
    }
  }
  void router.push({ path: `/book/${encodeURIComponent(b.bookUrl)}` })
}

async function addToShelf(b: SearchBook) {
  addingUrl.value = b.bookUrl
  try {
    await shelf.addBook(toBook(b))
    snackbar.value = `已加入书架：${b.name}`
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    addingUrl.value = ''
  }
}
</script>

<template>
  <div class="view-wrap search-view">
    <div class="micl-textfield-outlined search-view__input">
      <label for="search-keyword">书名 / 作者 / 关键字</label>
      <input
        id="search-keyword"
        type="search"
        v-model="input"
        placeholder="回车开始多源搜索"
        @keydown.enter="startSearch"
      />
      <button
        type="button"
        class="micl-iconbutton-standard-m search-view__send"
        :disabled="!input.trim() || running"
        aria-label="搜索"
        @click="startSearch"
      >
        <i class="mdi mdi-send" aria-hidden="true" />
      </button>
    </div>

    <div v-if="authError" class="empty-state">
      <i class="mdi mdi-shield-lock-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__title">{{ error }}</span>
      <button type="button" class="micl-button-tonal-m" @click="router.push('/settings')">
        <i class="mdi mdi-cog-outline micl-button__icon" aria-hidden="true" />
        去配置令牌
      </button>
    </div>

    <div v-else-if="running && groups.length === 0" class="empty-state">
      <progress class="micl-circular-progress" aria-label="正在搜索" />
      <span class="empty-state__hint">正在多源搜索“{{ keyword }}”…</span>
    </div>

    <div v-else-if="!running && groups.length === 0" class="empty-state">
      <i class="mdi mdi-magnify empty-state__icon" aria-hidden="true" />
      <span class="empty-state__title">搜索全网小说</span>
      <span class="empty-state__hint">输入关键字，回车开始多源搜索</span>
    </div>

    <div v-else class="search-view__results">
      <div class="search-view__summary">
        <span class="search-view__summary-text">
          共 <span class="mono">{{ total }}</span> 本 · “{{ keyword }}”
          <span class="search-view__summary-sources">
            <template v-if="running">
              搜索中 · 已完成 <span class="mono">{{ doneCount }}</span>/{{ groups.length }} 个书源
            </template>
            <template v-else>
              来自 <span class="mono">{{ groups.length }}</span> 个书源
            </template>
          </span>
        </span>
        <progress v-if="running" class="micl-linear-progress search-view__summary-bar" aria-label="搜索中" />
      </div>

      <section v-for="group in groups" :key="group.originName" class="search-view__group">
        <h3 class="search-view__group-title">
          <i class="mdi mdi-source-branch" aria-hidden="true" />
          {{ group.originName }}
          <span class="mono search-view__group-count">{{ group.books.length }}</span>
        </h3>
        <div
          v-for="(b, idx) in group.books"
          :key="b.bookUrl"
          class="micl-card-outlined search-view__row clickable"
          role="button"
          tabindex="0"
          :style="rowStyle(idx)"
          @click="openBook(b)"
          @keydown.enter="openBook(b)"
        >
          <img
            v-if="b.coverUrl"
            class="search-view__cover"
            :src="coverUrl(b.coverUrl)"
            :alt="`《${b.name}》封面`"
            loading="lazy"
          />
          <div v-else class="search-view__cover search-view__cover--empty" aria-hidden="true">
            {{ b.name.trim().charAt(0) || '阅' }}
          </div>
          <div class="search-view__meta">
            <div class="search-view__headline">
              <span class="search-view__name text-truncate">{{ b.name }}</span>
              <span v-if="b.author" class="search-view__author text-truncate">{{ b.author }}</span>
            </div>
            <span v-if="introText(b)" class="search-view__intro">{{ introText(b) }}</span>
          </div>
          <div class="search-view__actions">
            <button
              type="button"
              class="micl-iconbutton-tonal-s"
              :disabled="inShelf(b.bookUrl) || addingUrl === b.bookUrl"
              :aria-label="inShelf(b.bookUrl) ? `已在书架 ${b.name}` : `加入书架 ${b.name}`"
              :title="inShelf(b.bookUrl) ? '已在书架' : '加入书架'"
              @click.stop="addToShelf(b)"
            >
              <i :class="inShelf(b.bookUrl) ? 'mdi mdi-check' : 'mdi mdi-bookshelf'" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </div>

    <AppSnackbar :open="!!snackbar" @update:open="snackbar = ''">
      {{ snackbar }}
    </AppSnackbar>
  </div>
</template>

<style scoped>
.search-view {
  max-width: 720px;
}

.search-view__input {
  position: relative;
}

.search-view__send {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

/* 原生 search 清除叉号会挤在发送键右侧，去掉（右侧操作由发送键承担） */
.search-view__input input[type='search']::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

.search-view__summary {
  position: sticky;
  top: 8px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
  box-shadow: var(--md-sys-elevation-level1);
}

.search-view__summary-text {
  font-size: var(--md-sys-typescale-label-large-size);
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant);
}

.search-view__summary-sources {
  margin-inline-start: 6px;
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-outline);
}

.search-view__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-view__group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 4px;
  font-family: var(--md-ref-typeface-display);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.search-view__group-count {
  color: var(--md-sys-color-on-surface-variant);
}

.search-view__row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  cursor: pointer;
  animation: search-row-in var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized)
    both;
  animation-delay: calc(var(--row-i, 0) * 25ms);
}

.search-view__cover {
  width: 44px;
  height: 60px;
  object-fit: cover;
  flex: 0 0 auto;
  border-radius: var(--md-sys-shape-corner-extra-small);
  background: var(--md-sys-color-surface-container-high);
}

.search-view__cover--empty {
  display: grid;
  place-items: center;
  font-family: var(--md-ref-typeface-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.search-view__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.search-view__headline {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.search-view__name {
  flex: 1 1 0;
  min-width: 0;
  font-family: var(--md-ref-typeface-display);
  font-size: var(--md-sys-typescale-title-medium-size);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.search-view__author {
  flex: 0 1 auto;
  min-width: 0;
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.search-view__intro {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: 1.5;
  color: var(--md-sys-color-on-surface-variant);
}

.search-view__actions {
  display: flex;
  gap: 4px;
  flex: 0 0 auto;
}

@keyframes search-row-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-view__row {
    animation: none;
  }
}
</style>
