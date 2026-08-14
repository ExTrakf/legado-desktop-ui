<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useBookshelfStore } from '@/stores/bookshelf'
import { coverUrl } from '@/api/books'
import type { Book } from '@/types'

const route = useRoute()
const router = useRouter()
const shelf = useBookshelfStore()
const { books } = storeToRefs(shelf)

const book = computed<Book | null>(
  () => books.value.find((b) => b.bookUrl === route.params.url) ?? null,
)

onMounted(() => {
  if (!book.value) void shelf.loadBooks()
})

const imgFailed = ref(false)
const coverSrc = computed(() => (book.value?.coverUrl ? coverUrl(book.value.coverUrl) : ''))
const firstChar = computed(() => book.value?.name.trim().charAt(0) || '阅')

/** 标签：按常见分隔符切 kind 字段 */
const tags = computed(() =>
  (book.value?.kind ?? '').split(/[,，、;；\s]+/).map((t) => t.trim()).filter(Boolean),
)

function startReading() {
  if (!book.value) return
  router.push(`/book/${encodeURIComponent(book.value.bookUrl)}`)
}
</script>

<template>
  <div class="view-wrap detail">
    <div v-if="book" class="detail">
      <section class="detail__hero">
        <div class="detail__cover-wrap">
          <img
            v-if="coverSrc && !imgFailed"
            class="detail__cover"
            :src="coverSrc"
            :alt="`《${book.name}》封面`"
            loading="lazy"
            @error="imgFailed = true"
          />
          <div v-else class="detail__cover detail__cover--empty" aria-hidden="true">
            <span class="detail__cover-char">{{ firstChar }}</span>
          </div>
        </div>

        <div class="detail__info">
          <h1 class="detail__title">{{ book.name }}</h1>
          <p v-if="book.author" class="detail__author">{{ book.author }}</p>
          <p class="detail__meta mono">
            <template v-if="book.wordCount"><span>{{ book.wordCount }}</span></template>
            <template v-if="book.totalChapterNum > 0">
              <span> · {{ book.totalChapterNum }} 章</span>
            </template>
          </p>
          <div v-if="tags.length" class="detail__tags">
            <span v-for="t in tags" :key="t" class="detail__tag">{{ t }}</span>
          </div>
          <p v-if="book.latestChapterTitle" class="detail__latest">
            <span class="detail__latest-label">最新章节</span>
            {{ book.latestChapterTitle }}
          </p>
          <div class="detail__actions">
            <button type="button" class="micl-button-filled-m" @click="startReading">
              <i class="mdi mdi-book-open-page-variant micl-button__icon" aria-hidden="true" />
              开始阅读
            </button>
          </div>
        </div>
      </section>

      <section class="detail__intro">
        <h2 class="detail__section-title">简介</h2>
        <p class="detail__intro-text">{{ book.intro || '（暂无简介）' }}</p>
      </section>
    </div>

    <div v-else class="empty-state">
      <i class="mdi mdi-book-open-blank-variant-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__title">未找到这本书</span>
      <span class="empty-state__hint">可能已从书架移除</span>
      <button type="button" class="micl-button-tonal-m" @click="router.push('/bookshelf')">
        <i class="mdi mdi-arrow-left micl-button__icon" aria-hidden="true" />
        返回书架
      </button>
    </div>
  </div>
</template>

<style scoped>
.detail {
  max-width: 900px;
}

/* 英雄区：封面陈列于低层表面，略带光晕，像摆在展台上的书 */
.detail__hero {
  display: flex;
  align-items: flex-start;
  gap: clamp(24px, 5vw, 48px);
  padding: clamp(20px, 4vw, 40px);
  border-radius: var(--md-sys-shape-corner-extra-large);
  background: linear-gradient(
    165deg,
    var(--md-sys-color-surface-container-low) 0%,
    transparent 78%
  );
}

.detail__cover-wrap {
  position: relative;
  flex: 0 0 auto;
}

.detail__cover-wrap::before {
  content: '';
  position: absolute;
  inset: -18px;
  z-index: 0;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    var(--md-sys-color-primary-container) 0%,
    transparent 72%
  );
  opacity: 0.55;
  filter: blur(10px);
}

.detail__cover {
  position: relative;
  z-index: 1;
  width: clamp(160px, 22vw, 220px);
  aspect-ratio: 2 / 3;
  object-fit: cover;
  display: block;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-high);
  box-shadow:
    0 2px 4px rgb(0 0 0 / 0.12),
    0 12px 28px rgb(0 0 0 / 0.28),
    0 28px 56px rgb(0 0 0 / 0.18);
}

.detail__cover--empty {
  display: grid;
  place-items: center;
}

.detail__cover-char {
  font-family: var(--md-ref-typeface-display);
  font-size: 72px;
  font-weight: 700;
  color: var(--md-sys-color-on-surface-variant);
}

.detail__info {
  flex: 1;
  min-width: 0;
}

.detail__title {
  margin: 0;
  font-family: var(--md-ref-typeface-display);
  font-size: var(--md-sys-typescale-headline-large-size);
  line-height: 1.2;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.detail__author {
  margin: 10px 0 0;
  font-size: var(--md-sys-typescale-body-large-size);
  color: var(--md-sys-color-on-surface-variant);
}

.detail__meta {
  margin: 6px 0 0;
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-outline);
}

.detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.detail__tag {
  padding: 4px 12px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-medium-size);
  font-weight: 500;
}

.detail__latest {
  margin: 18px 0 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-body-medium-size);
}

.detail__latest-label {
  flex: 0 0 auto;
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-outline);
}

.detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}

/* 简介 */
.detail__intro {
  margin-top: 8px;
  padding-top: 28px;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.detail__section-title {
  margin: 0 0 16px;
  font-family: var(--md-ref-typeface-display);
  font-size: var(--md-sys-typescale-title-large-size);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.detail__intro-text {
  margin: 0;
  font-family: var(--md-ref-typeface-reading);
  font-size: var(--md-sys-typescale-body-large-size);
  line-height: 1.9;
  color: var(--md-sys-color-on-surface);
  text-align: justify;
  white-space: pre-wrap;
}

/* 入场：封面 → 信息 → 简介，错峰淡入上移 */
.detail__cover-wrap,
.detail__info,
.detail__intro {
  animation: detail-in var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized)
    both;
}

.detail__cover-wrap {
  animation-delay: 0ms;
}

.detail__info {
  animation-delay: 60ms;
}

.detail__intro {
  animation-delay: 120ms;
}

@keyframes detail-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .detail__hero {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .detail__info {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .detail__tags {
    justify-content: center;
  }

  .detail__actions {
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail__cover-wrap,
  .detail__info,
  .detail__intro {
    animation: none;
  }
}
</style>
