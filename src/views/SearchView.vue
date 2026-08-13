<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSearchStore } from '@/stores/search'
import { useBookshelfStore } from '@/stores/bookshelf'
import { useRouter } from 'vue-router'
import { coverUrl } from '@/api/books'
import type { Book, SearchBook } from '@/types'

const router = useRouter()
const search = useSearchStore()
const shelf = useBookshelfStore()
const { keyword, groups, running, error, authError, total } = storeToRefs(search)

const input = ref('')
const addingUrl = ref('')
const snackbar = ref('')

onBeforeUnmount(() => search.stop())

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
  void router.push({ name: 'reader', params: { url: encodeURIComponent(b.bookUrl) } })
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
  <div class="search-view">
    <v-text-field
      v-model="input"
      prepend-inner-icon="mdi-magnify"
      placeholder="书名 / 作者 / 关键字"
      variant="outlined"
      hide-details
      clearable
      class="search-view__input"
      @keydown.enter="startSearch"
    >
      <template #append-inner>
        <v-btn
          icon="mdi-send"
          variant="text"
          :loading="running"
          :disabled="!input.trim()"
          aria-label="搜索"
          @click="startSearch"
        />
      </template>
    </v-text-field>

    <div v-if="authError" class="search-view__auth">
      <v-icon icon="mdi-shield-lock-outline" size="40" color="warning" />
      <span class="search-view__auth-title">{{ error }}</span>
      <v-btn variant="tonal" prepend-icon="mdi-cog-outline" @click="router.push('/settings')">
        去配置令牌
      </v-btn>
    </div>

    <div v-else-if="running && groups.length === 0" class="search-view__state">
      <v-progress-circular indeterminate color="primary" size="36" />
      <span class="search-view__state-text">正在多源搜索“{{ keyword }}”…</span>
    </div>

    <div v-else-if="!running && groups.length === 0" class="search-view__state">
      <v-icon icon="mdi-magnify" size="48" color="on-surface-variant" />
      <span class="m3-headline-small search-view__state-title">搜索全网小说</span>
      <span class="search-view__state-text">输入关键字，回车开始多源搜索</span>
    </div>

    <div v-else class="search-view__results">
      <div class="search-view__summary">
        <span class="m3-label-large search-view__summary-text">
          共找到 <span class="m3-mono">{{ total }}</span> 本 · {{ keyword }}
        </span>
        <v-progress-linear
          v-if="running"
          indeterminate
          color="primary"
          height="2"
          class="search-view__summary-bar"
        />
      </div>

      <section
        v-for="group in groups"
        :key="group.originName"
        class="search-view__group"
      >
        <h3 class="search-view__group-title">
          <v-icon icon="mdi-source-branch" size="18" />
          {{ group.originName }}
          <span class="m3-mono search-view__group-count">{{ group.books.length }}</span>
        </h3>
        <div
          v-for="b in group.books"
          :key="b.bookUrl"
          class="search-view__row m3-interactive"
          role="button"
          tabindex="0"
          @click="openBook(b)"
          @keydown.enter="openBook(b)"
        >
          <img
            class="search-view__cover"
            :src="b.coverUrl ? coverUrl(b.coverUrl) : undefined"
            :alt="`《${b.name}》封面`"
            loading="lazy"
          />
          <div class="search-view__meta">
            <span class="search-view__name text-truncate">{{ b.name }}</span>
            <span class="search-view__author text-truncate">{{ b.author }}</span>
            <span v-if="b.latestChapterTitle" class="search-view__latest text-truncate">
              {{ b.latestChapterTitle }}
            </span>
          </div>
          <div class="search-view__actions">
            <v-btn
              icon="mdi-bookshelf"
              variant="tonal"
              size="small"
              :loading="addingUrl === b.bookUrl"
              aria-label="加入书架"
              @click.stop="addToShelf(b)"
            />
          </div>
        </div>
      </section>
    </div>

    <v-snackbar
      :model-value="!!snackbar"
      :timeout="2500"
      location="bottom"
      @update:model-value="snackbar = $event ? snackbar : ''"
    >
      {{ snackbar }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.search-view {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 32px) 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-view__auth {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
  color: var(--md-sys-color-on-surface-variant);
  text-align: center;
}

.search-view__auth-title {
  font-size: var(--md-sys-typescale-body-medium-size);
}

.search-view__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 0;
  color: var(--md-sys-color-on-surface-variant);
}

.search-view__state-title {
  color: var(--md-sys-color-on-surface);
}

.search-view__state-text {
  font-size: var(--md-sys-typescale-body-medium-size);
}

.search-view__summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-view__summary-text {
  color: var(--md-sys-color-on-surface-variant);
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
  align-items: center;
  gap: 16px;
  padding: 10px;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-low);
  cursor: pointer;
}

.search-view__cover {
  width: 44px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--md-sys-shape-corner-extra-small);
  background: var(--md-sys-color-surface-container-high);
}

.search-view__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.search-view__name {
  font-family: var(--md-ref-typeface-display);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.search-view__author,
.search-view__latest {
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.search-view__actions {
  display: flex;
  gap: 4px;
}
</style>
