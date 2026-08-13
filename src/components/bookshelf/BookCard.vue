<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { coverUrl } from '@/api/books'
import type { Book } from '@/types'

const props = defineProps<{
  book: Book
}>()

const emit = defineEmits<{ open: [Book]; delete: [Book] }>()

const imgFailed = ref(false)
const firstChar = computed(() => props.book.name.trim().charAt(0) || '阅')

watch(() => props.book.coverUrl, () => {
  imgFailed.value = false
})

const coverSrc = computed(() => {
  if (!props.book.coverUrl) return ''
  return coverUrl(props.book.coverUrl)
})

const progressPercent = computed(() => {
  if (props.book.totalChapterNum <= 0) return 0
  // durChapterIndex 是 0 基：读到最后一章（index = total-1）即 100%
  const read = Math.max(0, props.book.durChapterIndex + 1) / props.book.totalChapterNum
  return Math.round(Math.min(1, read) * 100)
})

function onOpen() {
  emit('open', props.book)
}
</script>

<template>
  <div
    class="book-card"
    role="button"
    tabindex="0"
    :aria-label="`打开《${book.name}》`"
    @click="onOpen"
    @keydown.enter.prevent="onOpen"
  >
    <div class="book-card__cover">
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
      <v-btn
        class="book-card__delete"
        icon="mdi-delete-outline"
        size="x-small"
        variant="flat"
        :aria-label="`删除《${book.name}》`"
        @click.stop="emit('delete', book)"
      />
    </div>
    <div class="book-card__info">
      <span class="book-card__name text-truncate" :title="book.name">{{ book.name }}</span>
      <span v-if="book.author" class="book-card__author text-truncate">{{ book.author }}</span>
      <span v-if="book.durChapterTitle" class="book-card__chapter text-truncate">
        {{ book.durChapterTitle }}
      </span>
      <div class="book-card__progress">
        <v-progress-linear
          :model-value="progressPercent"
          height="3"
          rounded
          color="primary"
          bg-color="outline-variant"
        />
      </div>
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
  border-radius: var(--md-sys-shape-corner-medium);
}

.book-card__cover {
  position: relative;
  aspect-ratio: 2 / 3;
  width: 100%;
  overflow: hidden;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-high);
  box-shadow: var(--md-sys-elevation-level1);
  transition: transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
}

.book-card:hover .book-card__cover,
.book-card:focus-visible .book-card__cover {
  transform: translateY(-3px);
}

.book-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.book-card__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-surface-container-high) 100%);
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
}

@media (prefers-reduced-motion: reduce) {
  .book-card__cover {
    transition: none;
  }

  .book-card__delete {
    opacity: 1;
  }
}
</style>
