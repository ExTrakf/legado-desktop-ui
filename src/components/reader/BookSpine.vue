<script setup lang="ts">
import { computed } from 'vue'
import type { Chapter } from '@/types'

const props = defineProps<{
  chapters: Chapter[]
  chapterIndex: number
  progress: number
}>()

const emit = defineEmits<{
  jump: [index: number]
  openCatalog: []
}>()

const percent = computed(() =>
  Math.min(1, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0)),
)

const ticks = computed(() =>
  props.chapters.map((c, i) => {
    const pos = (i + 0.5) / props.chapters.length
    const state = i < props.chapterIndex ? 'read' : i === props.chapterIndex ? 'current' : 'unread'
    return { index: i, pos, title: c.title, state }
  }),
)
</script>

<template>
  <aside class="book-spine" aria-label="全书进度与章节">
    <div class="book-spine__meta book-spine__meta--top m3-mono">
      {{ chapters.length }}
    </div>

    <div
      class="book-spine__track"
      role="button"
      tabindex="0"
      :aria-label="`已读 ${Math.round(percent * 100)}%，按回车打开目录`"
      @click="emit('openCatalog')"
      @keydown.enter.prevent="emit('openCatalog')"
      @keydown.space.prevent="emit('openCatalog')"
    >
      <div class="book-spine__fill" :style="{ height: `${percent * 100}%` }" />
      <div
        v-for="t in ticks"
        :key="t.index"
        class="book-spine__tick"
        :class="`book-spine__tick--${t.state}`"
        :style="{ top: `${t.pos * 100}%` }"
        :title="t.title"
        role="button"
        tabindex="0"
        :aria-label="`跳到第 ${t.index + 1} 章 ${t.title}`"
        @click.stop="emit('jump', t.index)"
        @keydown.enter.stop.prevent="emit('jump', t.index)"
      />
    </div>

    <div class="book-spine__meta book-spine__meta--bottom m3-mono">
      {{ Math.round(percent * 100) }}%
    </div>
  </aside>
</template>

<style scoped>
.book-spine {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 48px;
  padding: 12px 0;
  background: var(--md-sys-color-surface-container-low);
  border-right: 1px solid var(--md-sys-color-outline-variant);
  gap: 8px;
}

.book-spine__meta {
  font-size: var(--md-sys-typescale-label-small-size);
  line-height: var(--md-sys-typescale-label-small-line-height);
  color: var(--md-sys-color-on-surface-variant);
  writing-mode: vertical-rl;
  text-orientation: mixed;
  user-select: none;
}

.book-spine__track {
  position: relative;
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  cursor: pointer;
  outline-offset: -2px;
}

.book-spine__track::before {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-outline-variant);
}

.book-spine__fill {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary);
  opacity: 0.9;
  transition: height var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
}

.book-spine__tick {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-outline-variant);
  cursor: pointer;
  transition:
    background-color var(--md-sys-motion-duration-short) var(--md-sys-motion-easing-standard),
    transform var(--md-sys-motion-duration-short) var(--md-sys-motion-easing-emphasized);
}

.book-spine__tick:hover,
.book-spine__tick:focus-visible {
  background: var(--md-sys-color-on-surface-variant);
  transform: translate(-50%, -50%) scale(1.6);
}

.book-spine__tick--read {
  background: var(--md-sys-color-primary);
}

.book-spine__tick--current {
  background: var(--md-sys-color-on-primary);
  box-shadow: 0 0 0 2px var(--md-sys-color-primary);
  transform: translate(-50%, -50%) scale(1.5);
}

.book-spine__tick--current:hover {
  transform: translate(-50%, -50%) scale(1.9);
}

@media (prefers-reduced-motion: reduce) {
  .book-spine__fill,
  .book-spine__tick {
    transition: none;
  }
}
</style>
