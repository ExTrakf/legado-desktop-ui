<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useReaderStore } from '@/stores/reader'
import { useBookshelfStore } from '@/stores/bookshelf'
import BookSpine from '@/components/reader/BookSpine.vue'
import AppSheet from '@/components/app/AppSheet.vue'
import AppIconButton from '@/components/app/AppIconButton.vue'
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
      <header
        v-if="chromeVisible"
        class="reader-layout__top"
      >
        <AppIconButton
          icon="mdi-arrow-left"
          label="返回书架"
          @click="router.push('/bookshelf')"
        />
        <div class="reader-layout__titles">
          <span class="reader-layout__book">{{ book?.name }}</span>
          <span class="reader-layout__chapter m3-mono">{{ reader.chapter?.title ?? '' }}</span>
        </div>
        <v-spacer />
        <AppIconButton
          icon="mdi-view-list"
          label="章节目录"
          @click="catalogOpen = true"
        />
        <AppIconButton
          icon="mdi-download-multiple"
          label="缓存本书"
          @click="cacheOpen = true"
        />
        <AppIconButton
          icon="mdi-format-text"
          label="阅读设置"
          @click="settingsOpen = true"
        />
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
      <footer
        v-if="chromeVisible"
        class="reader-layout__bottom"
      >
        <v-btn
          variant="tonal"
          prepend-icon="mdi-view-list"
          @click="catalogOpen = true"
        >
          目录
        </v-btn>
        <v-btn
          variant="tonal"
          :prepend-icon="currentSurface().icon"
          @click="cycleSurface"
        >
          {{ currentSurface().label }}
        </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-format-size"
          @click="settingsOpen = true"
        >
          字号
        </v-btn>
        <v-spacer />
        <span class="reader-layout__progress m3-mono">
          {{ Math.round(progress * 100) }}%
        </span>
      </footer>
    </transition>

    <AppSheet v-model="catalogOpen">
      <div class="reader-layout__sheet-head">
        <span class="m3-title-medium">目录</span>
        <AppIconButton icon="mdi-close" label="关闭" @click="catalogOpen = false" />
      </div>
      <v-list
        class="reader-layout__catalog"
        density="compact"
      >
        <v-list-item
          v-for="(c, i) in chapters"
          :key="c.url"
          :active="i === chapterIndex"
          :title="c.title"
          class="m3-interactive"
          rounded="lg"
          @click="reader.jumpTo(i); catalogOpen = false"
        >
          <template #prepend>
            <span class="m3-mono reader-layout__catalog-no">
              {{ String(i + 1).padStart(2, '0') }}
            </span>
          </template>
          <template #append>
            <v-icon v-if="i === chapterIndex" icon="mdi-book-open-page-variant-outline" size="small" />
          </template>
        </v-list-item>
      </v-list>
    </AppSheet>

    <v-dialog
      :model-value="cacheOpen"
      max-width="420"
      persistent
      @update:model-value="cacheOpen = $event"
    >
      <v-card rounded="xl">
        <v-card-title class="m3-title-medium">缓存本书</v-card-title>
        <v-card-text class="reader-layout__cache-text">
          将《{{ book?.name }}》的全部章节正文缓存到本地，离线也能阅读。
        </v-card-text>
        <v-card-actions class="reader-layout__cache-actions">
          <v-spacer />
          <v-btn variant="text" @click="cacheOpen = false">取消</v-btn>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-close-circle-outline"
            :loading="cacheBusy"
            @click="runCache('remove')"
          >
            移除缓存
          </v-btn>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-stop-circle-outline"
            :loading="cacheBusy"
            @click="runCache('stop')"
          >
            停止
          </v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-download-multiple"
            :loading="cacheBusy"
            @click="runCache('start')"
          >
            开始缓存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <AppSheet v-model="settingsOpen">
      <div class="reader-layout__sheet-head">
        <span class="m3-title-medium">阅读设置</span>
        <AppIconButton icon="mdi-close" label="关闭" @click="settingsOpen = false" />
      </div>
      <div class="reader-layout__setting">
        <span class="m3-label-large">底色</span>
        <div class="reader-layout__segmented" role="radiogroup" aria-label="阅读底色">
          <v-btn
            v-for="s in surfaces"
            :key="s.value"
            variant="tonal"
            :color="settings.surface === s.value ? 'primary' : undefined"
            :prepend-icon="s.icon"
            size="small"
            class="m3-interactive"
            @click="reader.updateSettings({ surface: s.value })"
          >
            {{ s.label }}
          </v-btn>
        </div>
      </div>
      <div class="reader-layout__setting">
        <span class="m3-label-large">字号</span>
        <v-slider
          :model-value="settings.fontSizeRem"
          :min="0.875"
          :max="1.5"
          :step="0.0625"
          show-ticks="always"
          thumb-label="always"
          color="primary"
          @update:model-value="reader.updateSettings({ fontSizeRem: $event as number })"
        />
      </div>
      <div class="reader-layout__setting">
        <span class="m3-label-large">行距</span>
        <v-slider
          :model-value="settings.lineHeight"
          :min="1.4"
          :max="2.4"
          :step="0.1"
          show-ticks="always"
          thumb-label="always"
          color="primary"
          @update:model-value="reader.updateSettings({ lineHeight: $event as number })"
        />
      </div>
      <div class="reader-layout__setting">
        <span class="m3-label-large">字体</span>
        <div class="reader-layout__segmented" role="radiogroup" aria-label="阅读字体">
          <v-btn
            variant="tonal"
            :color="settings.font === 'serif' ? 'primary' : undefined"
            size="small"
            class="m3-interactive"
            @click="reader.updateSettings({ font: 'serif' })"
          >
            衬线
          </v-btn>
          <v-btn
            variant="tonal"
            :color="settings.font === 'sans' ? 'primary' : undefined"
            size="small"
            class="m3-interactive"
            @click="reader.updateSettings({ font: 'sans' })"
          >
            黑体
          </v-btn>
        </div>
      </div>
    </AppSheet>

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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.reader-layout__titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 4px;
}

.reader-layout__book {
  font-family: var(--md-ref-typeface-display);
  font-weight: 600;
  font-size: var(--md-sys-typescale-title-medium-size);
  line-height: 1.3;
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reader-layout__chapter {
  font-size: var(--md-sys-typescale-label-small-size);
  color: var(--md-sys-color-on-surface-variant);
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
  padding: 10px 16px;
  background: var(--md-sys-color-surface-container);
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.reader-layout__progress {
  color: var(--md-sys-color-on-surface-variant);
}

.reader-layout__sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px 8px;
  color: var(--md-sys-color-on-surface);
}

.reader-layout__catalog {
  max-height: 60vh;
  overflow-y: auto;
}

.reader-layout__catalog-no {
  color: var(--md-sys-color-on-surface-variant);
  font-size: var(--md-sys-typescale-label-small-size);
  width: 28px;
  text-align: right;
}

.reader-layout__setting {
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--md-sys-color-on-surface);
}

.reader-layout__cache-text {
  color: var(--md-sys-color-on-surface-variant);
}

.reader-layout__cache-actions {
  padding-bottom: 16px;
  gap: 4px;
  flex-wrap: wrap;
}

.reader-layout__segmented {
  display: flex;
  gap: 8px;
}

.chrome-enter-active,
.chrome-leave-active {
  transition: opacity var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized),
    transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
}

.chrome-enter-from,
.chrome-leave-to {
  opacity: 0;
}

.chrome-enter-from {
  transform: translateY(-16px);
}

.chrome-leave-to {
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
