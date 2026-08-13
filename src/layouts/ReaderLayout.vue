<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useReaderStore } from '@/stores/reader'
import { useBookshelfStore } from '@/stores/bookshelf'
import BookSpine from '@/components/reader/BookSpine.vue'
import AppDialog from '@/components/app/AppDialog.vue'
import AppSnackbar from '@/components/app/AppSnackbar.vue'
import { cacheBook, cacheBookRemove, cacheBookStop } from '@/api/system'
import type { ReadingSurface } from '@/types'

const route = useRoute()
const router = useRouter()
const reader = useReaderStore()
const bookshelf = useBookshelfStore()
const { chromeVisible, chapters, chapterIndex, settings, book } = storeToRefs(reader)

const catalogOpen = ref(false)
const settingsOpen = ref(false)
const cacheOpen = ref(false)
const cacheBusy = ref(false)
const snackbar = ref('')

const progress = computed(() => reader.progressFraction)

const surfaces: { value: ReadingSurface; label: string; icon: string }[] = [
  { value: 'paper', label: '浅色', icon: 'mdi-weather-sunny' },
  { value: 'green', label: '护眼', icon: 'mdi-leaf' },
  { value: 'ink', label: '夜间', icon: 'mdi-weather-night' },
]

function currentSurface() {
  return surfaces.find((s) => s.value === settings.value.surface) ?? surfaces[0]
}

function cycleSurface() {
  const idx = surfaces.findIndex((s) => s.value === settings.value.surface)
  reader.updateSettings({ surface: surfaces[(idx + 1) % surfaces.length].value })
}

function onMouseMove(e: MouseEvent) {
  const topZone = e.clientY < 84
  const bottomZone = e.clientY > window.innerHeight - 88
  reader.setChromeVisible(topZone || bottomZone)
}

async function openBook() {
  const url = route.params.url as string
  const found = bookshelf.books.find((b) => b.bookUrl === url)
  if (found) {
    await reader.openBook(found)
  } else {
    await bookshelf.loadBooks()
    const retry = bookshelf.books.find((b) => b.bookUrl === url)
    if (retry) await reader.openBook(retry)
    else router.replace('/bookshelf')
  }
}

onMounted(() => {
  void openBook()
})

async function runCache(action: 'start' | 'stop' | 'remove') {
  if (!reader.book) return
  cacheBusy.value = true
  try {
    if (action === 'start') {
      await cacheBook(reader.book.bookUrl)
      snackbar.value = '已开始缓存本书'
    } else if (action === 'stop') {
      await cacheBookStop()
      snackbar.value = '已停止缓存'
    } else {
      await cacheBookRemove(reader.book.bookUrl)
      snackbar.value = '已移除本书缓存队列'
    }
    cacheOpen.value = false
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    cacheBusy.value = false
  }
}
</script>

<template>
  <div
    class="reader-layout"
    @mousemove="onMouseMove"
    @mouseleave="reader.setChromeVisible(false)"
  >
    <transition name="chrome">
      <header v-if="chromeVisible" class="micl-appbar reader-layout__top">
        <div class="micl-appbar__leading">
          <button
            type="button"
            class="micl-iconbutton-standard-m"
            aria-label="返回书架"
            @click="router.push('/bookshelf')"
          >
            <i class="mdi mdi-arrow-left" aria-hidden="true" />
          </button>
        </div>
        <div class="micl-appbar__headline">
          <h1 class="reader-layout__book">{{ book?.name }}</h1>
          <p class="micl-appbar__subtitle reader-layout__chapter mono">
            {{ reader.chapter?.title ?? '' }}
          </p>
        </div>
        <div class="micl-appbar__trailing">
          <button
            type="button"
            class="micl-iconbutton-standard-m"
            aria-label="章节目录"
            @click="catalogOpen = true"
          >
            <i class="mdi mdi-view-list" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="micl-iconbutton-standard-m"
            aria-label="缓存本书"
            @click="cacheOpen = true"
          >
            <i class="mdi mdi-download-multiple" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="micl-iconbutton-standard-m"
            aria-label="阅读设置"
            @click="settingsOpen = true"
          >
            <i class="mdi mdi-format-text" aria-hidden="true" />
          </button>
        </div>
      </header>
    </transition>

    <BookSpine
      :chapters="chapters"
      :chapter-index="chapterIndex"
      :progress="progress"
      @jump="(i) => { reader.jumpTo(i); reader.view?.scrollTo({ top: 0 }) }"
      @open-catalog="catalogOpen = true"
    />

    <main class="reader-layout__main">
      <router-view />
    </main>

    <transition name="chrome">
      <footer v-if="chromeVisible" class="reader-layout__bottom">
        <button
          type="button"
          class="micl-button-text-m"
          @click="catalogOpen = true"
        >
          <i class="mdi mdi-view-list micl-button__icon" aria-hidden="true" />
          目录
        </button>
        <button type="button" class="micl-button-text-m" @click="cycleSurface">
          <i :class="`mdi ${currentSurface().icon} micl-button__icon`" aria-hidden="true" />
          {{ currentSurface().label }}
        </button>
        <button type="button" class="micl-button-text-m" @click="settingsOpen = true">
          <i class="mdi mdi-format-size micl-button__icon" aria-hidden="true" />
          字号
        </button>
        <div class="spacer" />
        <span class="reader-layout__progress mono">{{ Math.round(progress * 100) }}%</span>
      </footer>
    </transition>

    <AppDialog :open="catalogOpen" title="目录" @update:open="catalogOpen = $event">
      <ul class="micl-list reader-layout__catalog">
        <li
          v-for="(c, i) in chapters"
          :key="c.url"
          class="micl-list-item-two clickable"
          :class="{ 'reader-layout__catalog-active': i === chapterIndex }"
          tabindex="0"
          @click="reader.jumpTo(i); catalogOpen = false"
          @keydown.enter="reader.jumpTo(i); catalogOpen = false"
        >
          <span class="micl-list-item__text">
            <span class="micl-list-item__headline">
              <span class="mono reader-layout__catalog-no">{{ String(i + 1).padStart(2, '0') }}</span>
              {{ c.title }}
            </span>
          </span>
        </li>
      </ul>
    </AppDialog>

    <AppDialog :open="settingsOpen" title="阅读设置" @update:open="settingsOpen = $event">
      <div class="reader-layout__setting">
        <span class="reader-layout__setting-label">底色</span>
        <div class="reader-layout__segmented" role="radiogroup" aria-label="阅读底色">
          <button
            v-for="s in surfaces"
            :key="s.value"
            type="button"
            class="micl-button--toggle micl-chip-filter"
            :aria-pressed="settings.surface === s.value ? 'true' : 'false'"
            @click="reader.updateSettings({ surface: s.value })"
          >
            <i :class="`mdi ${s.icon}`" aria-hidden="true" />
            {{ s.label }}
          </button>
        </div>
      </div>
      <div class="reader-layout__setting">
        <span class="reader-layout__setting-label">字号</span>
        <input
          type="range"
          class="micl-slider-m reader-layout__slider"
          min="0.875"
          max="1.5"
          step="0.0625"
          :value="settings.fontSizeRem"
          aria-label="字号"
          @input="reader.updateSettings({ fontSizeRem: Number(($event.target as HTMLInputElement).value) })"
        />
        <span class="reader-layout__setting-value mono">{{ settings.fontSizeRem.toFixed(3) }}rem</span>
      </div>
      <div class="reader-layout__setting">
        <span class="reader-layout__setting-label">行距</span>
        <input
          type="range"
          class="micl-slider-m reader-layout__slider"
          min="1.4"
          max="2.4"
          step="0.1"
          :value="settings.lineHeight"
          aria-label="行距"
          @input="reader.updateSettings({ lineHeight: Number(($event.target as HTMLInputElement).value) })"
        />
        <span class="reader-layout__setting-value mono">{{ settings.lineHeight.toFixed(1) }}</span>
      </div>
      <div class="reader-layout__setting">
        <span class="reader-layout__setting-label">字体</span>
        <div class="reader-layout__segmented" role="radiogroup" aria-label="阅读字体">
          <button
            type="button"
            class="micl-button--toggle micl-chip-filter"
            :aria-pressed="settings.font === 'serif' ? 'true' : 'false'"
            @click="reader.updateSettings({ font: 'serif' })"
          >
            衬线
          </button>
          <button
            type="button"
            class="micl-button--toggle micl-chip-filter"
            :aria-pressed="settings.font === 'sans' ? 'true' : 'false'"
            @click="reader.updateSettings({ font: 'sans' })"
          >
            黑体
          </button>
        </div>
      </div>
    </AppDialog>

    <AppDialog
      :open="cacheOpen"
      title="缓存本书"
      :supporting="`将《${book?.name ?? ''}》的全部章节正文缓存到本地，离线也能阅读。`"
      @update:open="cacheOpen = $event"
    >
      <template #actions>
        <button
          type="button"
          class="micl-button-text-m"
          :disabled="cacheBusy"
          @click="runCache('remove')"
        >
          移除缓存
        </button>
        <button
          type="button"
          class="micl-button-text-m"
          :disabled="cacheBusy"
          @click="runCache('stop')"
        >
          停止
        </button>
        <button
          type="button"
          class="micl-button-filled-m"
          :disabled="cacheBusy"
          @click="runCache('start')"
        >
          开始缓存
        </button>
      </template>
    </AppDialog>

    <AppSnackbar :open="!!snackbar" @update:open="snackbar = ''">
      {{ snackbar }}
    </AppSnackbar>
  </div>
</template>

<style scoped>
.reader-layout {
  position: relative;
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--md-sys-color-surface);
}

.reader-layout__main {
  flex: 1;
  display: flex;
  min-width: 0;
  height: 100%;
}

.reader-layout__top {
  position: absolute;
  top: 0;
  left: 48px;
  right: 0;
  z-index: 10;
  background: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.reader-layout__book {
  font-family: var(--md-ref-typeface-display);
  font-size: var(--md-sys-typescale-title-medium-size) !important;
  line-height: 1.3;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60vw;
}

.reader-layout__chapter {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 40ch;
}

.reader-layout__bottom {
  position: absolute;
  bottom: 0;
  left: 48px;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--md-sys-color-surface-container);
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.reader-layout__progress {
  color: var(--md-sys-color-on-surface-variant);
}

.reader-layout__catalog {
  max-height: 60vh;
  overflow-y: auto;
}

.reader-layout__catalog-active {
  background: var(--md-sys-color-secondary-container);
}

.reader-layout__catalog-no {
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-small-size);
  width: 32px;
  display: inline-block;
  text-align: right;
  margin-right: 8px;
}

.reader-layout__setting {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.reader-layout__setting-label {
  font-family: var(--md-ref-typeface-display);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.reader-layout__segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reader-layout__slider {
  width: 100%;
}

.reader-layout__setting-value {
  color: var(--md-sys-color-on-surface-variant);
  text-align: right;
}

.chrome-enter-active,
.chrome-leave-active {
  transition: opacity var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized),
    transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
}

.chrome-enter-from,
.chrome-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}

.chrome-enter-to,
.chrome-leave-from {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .chrome-enter-active,
  .chrome-leave-active {
    transition: none;
  }
}
</style>
