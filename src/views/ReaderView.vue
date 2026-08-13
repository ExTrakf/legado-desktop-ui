<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useReaderStore } from '@/stores/reader'

const reader = useReaderStore()
const { settings, contentHtml, contentRaw, chapterLabel, loading, error, chapter } = storeToRefs(reader)

const view = ref<HTMLElement | null>(null)
let lastY = 0
let raf = 0
let saveTimer: number | undefined

const surfaceClass = computed(() => `reading--${settings.value.surface}`)
const fontClass = computed(() => `reading-font--${settings.value.font}`)

watch([contentHtml, loading], () => {
  const el = view.value
  if (!el || loading.value) return
  const book = reader.book
  if (!book || book.durChapterPos <= 0 || book.durChapterIndex !== reader.chapterIndex) return
  const len = contentRaw.value.length
  if (len <= 0) return
  const fraction = Math.min(1, book.durChapterPos / len)
  requestAnimationFrame(() => {
    el.scrollTop = fraction * (el.scrollHeight - el.clientHeight)
  })
})

function onScroll() {
  const el = view.value
  if (!el) return
  reader.setView(el)
  const delta = el.scrollTop - lastY
  lastY = el.scrollTop
  if (Math.abs(delta) > 2) reader.setChromeVisible(delta < 0)

  if (raf) cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    if (saveTimer) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => void reader.saveProgress(), 600)
  })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') void reader.nextChapter()
  else if (e.key === 'ArrowLeft') void reader.prevChapter()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (raf) cancelAnimationFrame(raf)
  if (saveTimer) window.clearTimeout(saveTimer)
  void reader.saveProgress()
  reader.setChromeVisible(true)
})
</script>

<template>
  <div
    ref="view"
    class="reader-view m3-scrollbar"
    @scroll="onScroll"
  >
    <div
      class="reader-view__column"
      :class="[surfaceClass, fontClass]"
    >
      <header class="reader-view__head">
        <h1 class="reader-view__book m3-headline-small">
          {{ reader.book?.name ?? '未命名' }}
        </h1>
        <p v-if="reader.book?.author" class="reader-view__author m3-label-large">
          {{ reader.book.author }}
        </p>
        <h2 class="reader-view__chapter-title">
          {{ chapter?.title ?? '' }}
        </h2>
        <div class="reader-view__rule" />
      </header>

      <div v-if="loading" class="reader-view__loading">
        <progress class="micl-linear-progress" aria-label="正在加载正文" />
      </div>

      <div v-else-if="error" class="reader-view__error">
        <i class="mdi mdi-alert-circle-outline reader-view__error-icon" aria-hidden="true" />
        <p class="reader-view__error-msg">{{ error }}</p>
        <button type="button" class="micl-button-tonal-m" @click="reader.loadContent()">
          <i class="mdi mdi-refresh micl-button__icon" aria-hidden="true" />
          重试
        </button>
      </div>

      <article
        v-else
        class="reader-view__content"
        :style="{
          fontSize: `${settings.fontSizeRem}rem`,
          lineHeight: settings.lineHeight,
        }"
        v-html="contentHtml"
      />

      <footer class="reader-view__foot">
        <span class="mono reader-view__chapter-no">{{ chapterLabel }}</span>
        <div class="reader-view__foot-actions">
          <button
            type="button"
            class="micl-button-tonal-m"
            :disabled="reader.chapterIndex <= 0"
            @click="reader.prevChapter()"
          >
            <i class="mdi mdi-chevron-up micl-button__icon" aria-hidden="true" />
            上一章
          </button>
          <button
            type="button"
            class="micl-button-tonal-m"
            :disabled="reader.chapterIndex >= reader.chapters.length - 1"
            @click="reader.nextChapter()"
          >
            下一章
            <i class="mdi mdi-chevron-down micl-button__icon" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.reader-view {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  scroll-behavior: smooth;
  background: var(--md-sys-color-surface);
}

.reader-view__column {
  max-width: min(68ch, 860px);
  margin: 0 auto;
  padding: 40px clamp(20px, 6vw, 56px) 96px;
  min-height: 100%;
}

.reader-view__head {
  text-align: center;
  margin-bottom: 40px;
}

.reader-view__book {
  color: var(--md-sys-color-on-surface);
}

.reader-view__author {
  display: block;
  margin-top: 6px;
  color: var(--md-sys-color-on-surface-variant);
}

.reader-view__chapter-title {
  margin-top: 28px;
  font-family: var(--md-ref-typeface-display);
  font-size: 1.35em;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.reader-view__rule {
  width: 48px;
  height: 2px;
  margin: 24px auto 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary);
}

.reader-view__content {
  font-family: var(--md-ref-typeface-reading);
  color: var(--md-sys-color-on-surface);
  text-align: justify;
  transition: font-size var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);
}

.reader-view__content :deep(p) {
  text-indent: 2em;
  margin: 0 0 0.5em;
}

.reader-view__content :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1em auto;
  border-radius: var(--md-sys-shape-corner-medium);
}

.reader-view__foot {
  margin-top: 56px;
  padding-top: 20px;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.reader-view__chapter-no {
  color: var(--md-sys-color-on-surface-variant);
}

.reader-view__loading {
  padding: 48px 0;
}

.reader-view__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
}

.reader-view__error-icon {
  font-size: 40px;
  color: var(--md-sys-color-error);
}

.reader-view__error-msg {
  color: var(--md-sys-color-on-surface-variant);
  text-align: center;
  word-break: break-all;
}

/* 阅读底色（三档）——纯色表面 */
.reading--paper {
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
}

.reading--paper .reader-view__book,
.reading--paper .reader-view__chapter-title {
  color: var(--md-sys-color-on-surface);
}

.reading--green {
  background: #e6f0e3;
  color: #243020;
}

.reading--green .reader-view__book,
.reading--green .reader-view__chapter-title {
  color: #243020;
}

.reading--green .reader-view__author,
.reading--green .reader-view__chapter-no {
  color: #51604c;
}

.reading--green .reader-view__rule {
  background: #3f6a3a;
}

.reading--green .reader-view__foot {
  border-top-color: #b8c9b3;
}

.reading--ink {
  background: #101414;
  color: #cdd6d4;
}

.reading--ink .reader-view__book,
.reading--ink .reader-view__chapter-title {
  color: #e4eae8;
}

.reading--ink .reader-view__author,
.reading--ink .reader-view__chapter-no {
  color: #8a9593;
}

.reading--ink .reader-view__rule {
  background: #4ddad6;
}

.reading--ink .reader-view__foot {
  border-top-color: #2a3130;
}

/* 阅读字体（衬线 / 黑体） */
.reading-font--sans .reader-view__content {
  font-family: var(--md-ref-typeface-body);
}

@media (max-width: 600px) {
  .reader-view__column {
    padding-top: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reader-view {
    scroll-behavior: auto;
  }
}
</style>
