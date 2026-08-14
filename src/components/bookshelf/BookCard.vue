<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { coverUrl } from '@/api/books'
import type { Book } from '@/types'

const props = defineProps<{
  book: Book
}>()

const emit = defineEmits<{ open: [Book]; delete: [Book]; detail: [Book] }>()

const imgFailed = ref(false)
const firstChar = computed(() => props.book.name.trim().charAt(0) || '阅')

/* 长按封面 → 详情；短按 → 阅读器 */
const LONG_PRESS_MS = 550
let pressTimer: number | undefined
let longFired = false
let pressX = 0
let pressY = 0
const pressing = ref(false)

function onPointerDown(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('.book-card__delete')) return
  longFired = false
  pressing.value = true
  pressX = e.clientX
  pressY = e.clientY
  window.clearTimeout(pressTimer)
  pressTimer = window.setTimeout(() => {
    longFired = true
    emit('detail', props.book)
  }, LONG_PRESS_MS)
}

function onPointerMove(e: PointerEvent) {
  // 拖动超过阈值视为滑动，取消长按
  if (Math.abs(e.clientX - pressX) > 8 || Math.abs(e.clientY - pressY) > 8) {
    window.clearTimeout(pressTimer)
    pressing.value = false
  }
}

function cancelLongPress() {
  window.clearTimeout(pressTimer)
  pressing.value = false
}

watch(
  () => props.book.coverUrl,
  () => {
    imgFailed.value = false
  },
)

const coverSrc = computed(() => {
  if (!props.book.coverUrl) return ''
  return coverUrl(props.book.coverUrl)
})

const progressPercent = computed(() => {
  if (props.book.totalChapterNum <= 0) return 0
  const read = Math.max(0, props.book.durChapterIndex + 1) / props.book.totalChapterNum
  return Math.round(Math.min(1, read) * 100)
})

function onOpen() {
  if (longFired) {
    longFired = false
    return
  }
  emit('open', props.book)
}
</script>

<template>
  <div
    class="book-card"
    role="button"
    tabindex="0"
    :aria-label="`打开《${book.name}》，长按查看详情`"
    @click="onOpen"
    @pointerdown="onPointerDown"
    @pointerup="cancelLongPress"
    @pointermove="onPointerMove"
    @pointerleave="cancelLongPress"
    @pointercancel="cancelLongPress"
    @keydown.enter.prevent="onOpen"
    @keydown.space.prevent="onOpen"
  >
    <div class="book-card__cover" :class="{ 'book-card__cover--pressing': pressing }">
      <img
        v-if="coverSrc && !imgFailed"
        :src="coverSrc"
        :alt="`《${book.name}》封面`"
        loading="lazy"
        @error="imgFailed = true"
      />
      <div v-else class="book-card__fallback" aria-hidden="true">
        <span class="book-card__fallback-char">{{ firstChar }}</span>
      </div>
      <button
        type="button"
        class="micl-iconbutton-standard-xs book-card__delete"
        :aria-label="`删除《${book.name}》`"
        @click.stop="emit('delete', book)"
      >
        <i class="mdi mdi-delete-outline" aria-hidden="true" />
      </button>
    </div>
    <div class="book-card__info">
      <span class="book-card__name text-truncate" :title="book.name">{{ book.name }}</span>
      <span v-if="book.author" class="book-card__author text-truncate">{{ book.author }}</span>
      <span v-if="book.durChapterTitle" class="book-card__chapter text-truncate">
        {{ book.durChapterTitle }}
      </span>
      <progress
        class="micl-linear-progress book-card__progress"
        :value="progressPercent / 100"
        max="1"
        aria-label="阅读进度"
      />
    </div>
  </div>
</template>

<style scoped>
.book-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  outline-offset: 4px;
}

.book-card__cover {
  position: relative;
  aspect-ratio: 2 / 3;
  width: 100%;
  overflow: hidden;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-high);
  box-shadow: var(--md-sys-elevation-level1);
  transition:
    transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized),
    box-shadow var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
}

.book-card:hover .book-card__cover,
.book-card:focus-visible .book-card__cover {
  transform: translateY(-3px);
  box-shadow: var(--md-sys-elevation-level3);
}

/* 长按反馈：封面微微放大（覆盖 hover 上浮） */
.book-card .book-card__cover--pressing,
.book-card:hover .book-card__cover--pressing {
  transform: scale(1.05);
}

.book-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
}

.book-card:hover .book-card__cover img,
.book-card:focus-visible .book-card__cover img {
  transform: scale(1.05);
}

.book-card__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: linear-gradient(
    160deg,
    var(--md-sys-color-primary-container) 0%,
    var(--md-sys-color-surface-container-high) 100%
  );
}

.book-card__fallback-char {
  font-family: var(--md-ref-typeface-display);
  font-size: 56px;
  font-weight: 700;
  color: var(--md-sys-color-on-primary-container);
}

.book-card__delete {
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: 0;
  background: var(--md-sys-color-surface-container);
  transition: opacity var(--md-sys-motion-duration-short) var(--md-sys-motion-easing-standard);
}

.book-card:hover .book-card__delete,
.book-card:focus-visible .book-card__delete,
.book-card__delete:focus-visible {
  opacity: 1;
}

.book-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.book-card__name {
  font-family: var(--md-ref-typeface-display);
  font-size: var(--md-sys-typescale-title-medium-size);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.book-card__author,
.book-card__chapter {
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.book-card__progress {
  margin-top: 4px;
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .book-card__cover,
  .book-card__cover img {
    transition: none;
  }

  .book-card__cover--pressing {
    transform: none;
  }

  .book-card__delete {
    opacity: 1;
  }
}

/* 触屏设备没有 hover：删除按钮常驻可见 */
@media (hover: none) {
  .book-card__delete {
    opacity: 1;
  }
}
</style>
