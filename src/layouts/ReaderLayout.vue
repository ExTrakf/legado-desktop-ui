<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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

const drawerOpen = ref(false)
const drawerQuery = ref('')
const capsuleRef = ref<HTMLElement | null>(null)
const settingsOpen = ref(false)
const settingsTab = ref<'global' | 'info' | 'more'>('global')
const stageInner = ref<HTMLElement | null>(null)
const stageHeight = ref(0)
let stageRO: ResizeObserver | null = null

const stageStyle = computed(() =>
  stageHeight.value > 0 ? { height: `${stageHeight.value}px` } : {},
)

function measureStage() {
  const el = stageInner.value
  // 实测高度 +50px 硬补偿，避免卡片短于内容被裁
  if (el) stageHeight.value = el.offsetHeight + 50
}

/** 卡片高度跟随当前标签内容自适应（带动画），避免右侧滚动条 */
watch([settingsOpen, settingsTab], async () => {
  if (!settingsOpen.value) {
    stageRO?.disconnect()
    stageRO = null
    stageHeight.value = 0
    return
  }
  await nextTick()
  const el = stageInner.value
  if (!el) return
  if (!stageRO) stageRO = new ResizeObserver(measureStage)
  stageRO.observe(el)
  requestAnimationFrame(measureStage)
})
const cacheOpen = ref(false)
const cacheBusy = ref(false)
const snackbar = ref('')

const progress = computed(() => reader.bookProgress)

const filteredChapters = computed(() => {
  const kw = drawerQuery.value.trim().toLowerCase()
  const all = reader.chapters.map((c, i) => ({ chapter: c, index: i }))
  if (!kw) return all
  return all.filter(({ chapter }) => chapter.title.toLowerCase().includes(kw))
})

function jumpToChapter(i: number) {
  reader.jumpTo(i)
  drawerOpen.value = false
}

function onWindowKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && drawerOpen.value) drawerOpen.value = false
}

/** 阅读底色的明暗决定阅读器界面主题：夜间→深色、护眼→浅色、浅色→跟随全局 */
const readerTheme = computed<string | undefined>(() => {
  const surface = settings.value.surface
  if (surface === 'ink') return 'dark'
  if (surface === 'green') return 'light'
  return undefined
})

const surfaces: { value: ReadingSurface; label: string; icon: string }[] = [
  { value: 'paper', label: '浅色', icon: 'mdi-weather-sunny' },
  { value: 'green', label: '护眼', icon: 'mdi-leaf' },
  { value: 'ink', label: '夜间', icon: 'mdi-weather-night' },
]

/** 自定义背景色预设（value 为 null 表示跟随底色预设/主题） */
const bgPresets: { label: string; value: string | null; style: string }[] = [
  { label: '跟随主题', value: null, style: 'linear-gradient(135deg, #fafdfc 50%, #191c1c 50%)' },
  { label: '羊皮纸', value: '#f5eee0', style: '#f5eee0' },
  { label: '护眼绿', value: '#e6f0e3', style: '#e6f0e3' },
  { label: '米灰', value: '#ecebe4', style: '#ecebe4' },
  { label: '夜间', value: '#101414', style: '#101414' },
  { label: '墨蓝', value: '#1c2530', style: '#1c2530' },
]

function currentSurface() {
  return surfaces.find((s) => s.value === settings.value.surface) ?? surfaces[0]
}

function cycleSurface() {
  const idx = surfaces.findIndex((s) => s.value === settings.value.surface)
  const next = surfaces[(idx + 1) % surfaces.length].value
  reader.updateSettings({ surface: next, bgColor: null })
}

function setBgColor(v: string | null) {
  reader.updateSettings({ bgColor: v })
}

function onMouseMove(e: MouseEvent) {
  // 抽屉打开时不随悬浮弹顶栏/胶囊，避免遮挡抽屉搜索框
  if (drawerOpen.value) return
  const capsuleEl = capsuleRef.value
  const overCapsule = capsuleEl
    ? e.target instanceof Node && capsuleEl.contains(e.target as Node)
    : false
  const topZone = e.clientY < 84
  const bottomZone = e.clientY > window.innerHeight - 88
  reader.setChromeVisible(overCapsule || topZone || bottomZone)
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
  window.addEventListener('keydown', onWindowKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  stageRO?.disconnect()
  stageRO = null
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
    :data-theme="readerTheme"
    @mousemove="onMouseMove"
    @mouseleave="reader.setChromeVisible(false)"
  >
    <transition name="chrome">
      <header v-if="chromeVisible && !drawerOpen" class="micl-appbar reader-layout__top">
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
      @jump="reader.jumpTo"
      @open-catalog="drawerOpen = true"
    />

    <main class="reader-layout__main">
      <router-view />
    </main>

    <transition name="capsule">
      <nav v-if="chromeVisible && !drawerOpen" ref="capsuleRef" class="reader-layout__capsule" aria-label="阅读工具栏">
        <div class="reader-layout__capsule-row reader-layout__capsule-row--split">
          <button
            type="button"
            class="micl-iconbutton-tonal-s"
            :disabled="chapterIndex <= 0"
            aria-label="上一章"
            title="上一章"
            @click="reader.prevChapter()"
          >
            <i class="mdi mdi-chevron-up" aria-hidden="true" />
          </button>
          <span class="reader-layout__capsule-chapter mono">{{ chapterIndex + 1 }} / {{ chapters.length }}</span>
          <button
            type="button"
            class="micl-iconbutton-tonal-s"
            :disabled="chapterIndex >= chapters.length - 1"
            aria-label="下一章"
            title="下一章"
            @click="reader.nextChapter()"
          >
            <i class="mdi mdi-chevron-down" aria-hidden="true" />
          </button>
        </div>
        <div class="reader-layout__capsule-sep" aria-hidden="true" />
        <div class="reader-layout__capsule-row reader-layout__capsule-row--split">
          <div class="reader-layout__capsule-row reader-layout__capsule-actions">
            <button
              type="button"
              class="micl-iconbutton-tonal-s"
              aria-label="章节目录"
              title="章节目录"
              @click="drawerOpen = true"
            >
              <i class="mdi mdi-view-list" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="micl-iconbutton-tonal-s"
              :aria-label="`切换底色，当前${currentSurface().label}`"
              title="底色"
              @click="cycleSurface"
            >
              <i :class="`mdi ${currentSurface().icon}`" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="micl-iconbutton-tonal-s"
              aria-label="字号与排版设置"
              title="字号"
              @click="settingsOpen = true"
            >
              <i class="mdi mdi-format-size" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="micl-iconbutton-tonal-s"
              aria-label="阅读界面设置"
              title="设置"
              @click="settingsOpen = true"
            >
              <i class="mdi mdi-cog-outline" aria-hidden="true" />
            </button>
          </div>
          <span class="reader-layout__capsule-info mono">{{ Math.round(progress * 100) }}%</span>
        </div>
      </nav>
    </transition>

    <transition name="drawer" :duration="{ enter: 260, leave: 150 }">
      <div v-if="drawerOpen" class="reader-drawer__backdrop" @click="drawerOpen = false">
        <aside class="reader-drawer" role="dialog" aria-label="章节目录" @click.stop>
          <header class="reader-drawer__head">
            <div class="micl-textfield-filled reader-drawer__search">
              <label for="drawer-search">搜索章节</label>
              <input id="drawer-search" type="search" v-model="drawerQuery" placeholder="章节标题关键字" />
            </div>
          </header>
          <ul class="reader-drawer__list m3-scrollbar">
            <li
              v-for="item in filteredChapters"
              :key="item.chapter.url"
              class="reader-drawer__item"
              :class="{ 'reader-drawer__item--active': item.index === chapterIndex }"
              tabindex="0"
              @click="jumpToChapter(item.index)"
              @keydown.enter="jumpToChapter(item.index)"
            >
              <span class="mono reader-drawer__no">{{ String(item.index + 1).padStart(2, '0') }}</span>
              <span class="reader-drawer__title">{{ item.chapter.title }}</span>
            </li>
            <li v-if="filteredChapters.length === 0" class="reader-drawer__empty">
              没有匹配的章节
            </li>
          </ul>
        </aside>
      </div>
    </transition>

    <AppDialog :open="settingsOpen" title="阅读界面" @update:open="settingsOpen = $event">
      <div class="reader-settings">
        <div class="reader-settings__stage" :style="stageStyle">
          <div ref="stageInner" class="reader-settings__stage-inner">
            <div v-if="settingsTab === 'global'" class="reader-settings__panel reader-settings__body">
              <div class="reader-settings__section">
                <span class="reader-settings__label">字号</span>
                <input
                  type="range"
                  class="micl-slider-xs reader-layout__slider"
                  min="0.875"
                  max="1.5"
                  step="0.0625"
                  :value="settings.fontSizeRem"
                  aria-label="字号"
                  @input="reader.updateSettings({ fontSizeRem: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="reader-settings__value mono">{{ settings.fontSizeRem.toFixed(3) }}rem</span>
              </div>

              <div class="reader-settings__section">
                <span class="reader-settings__label">行距</span>
                <input
                  type="range"
                  class="micl-slider-xs reader-layout__slider"
                  min="1.4"
                  max="2.4"
                  step="0.1"
                  :value="settings.lineHeight"
                  aria-label="行距"
                  @input="reader.updateSettings({ lineHeight: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="reader-settings__value mono">{{ settings.lineHeight.toFixed(1) }}</span>
              </div>

              <div class="reader-settings__section">
                <span class="reader-settings__label">字体</span>
                <div class="micl-chips reader-settings__segmented">
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

              <div class="reader-settings__section">
                <span class="reader-settings__label">自定义背景颜色</span>
                <div class="reader-settings__colors">
                  <button
                    v-for="c in bgPresets"
                    :key="c.value ?? 'none'"
                    type="button"
                    class="reader-settings__swatch"
                    :class="{ 'reader-settings__swatch--on': settings.bgColor === c.value }"
                    :style="{ background: c.style }"
                    :title="c.label"
                    :aria-label="c.label"
                    @click="setBgColor(c.value)"
                  />
                  <label class="reader-settings__picker" title="自定义颜色" aria-label="自定义颜色">
                    <input
                      type="color"
                      :value="settings.bgColor ?? '#f5eee0'"
                      @input="setBgColor(($event.target as HTMLInputElement).value)"
                    />
                  </label>
                </div>
              </div>

              <div class="reader-settings__section">
                <span class="reader-settings__label">翻页动画</span>
                <div class="micl-chips reader-settings__segmented">
                  <button
                    type="button"
                    class="micl-button--toggle micl-chip-filter"
                    :aria-pressed="settings.mode === 'scroll' ? 'true' : 'false'"
                    @click="reader.updateSettings({ mode: 'scroll' })"
                  >
                    滚动
                  </button>
                  <button
                    type="button"
                    class="micl-button--toggle micl-chip-filter"
                    :aria-pressed="settings.mode === 'page' ? 'true' : 'false'"
                    @click="reader.updateSettings({ mode: 'page' })"
                  >
                    滑动
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="reader-settings__panel reader-settings__placeholder">
              「{{ settingsTab === 'info' ? '信息' : '更多' }}」设置即将开放
            </div>
          </div>
        </div>
      </div>

      <template #actions>
        <div class="micl-chips reader-settings__tabs" role="tablist" aria-label="阅读设置分类">
          <button
            type="button"
            class="micl-button--toggle micl-chip-filter"
            :aria-pressed="settingsTab === 'global' ? 'true' : 'false'"
            @click="settingsTab = 'global'"
          >
            全局
          </button>
          <button
            type="button"
            class="micl-button--toggle micl-chip-filter"
            :aria-pressed="settingsTab === 'info' ? 'true' : 'false'"
            @click="settingsTab = 'info'"
          >
            信息
          </button>
          <button
            type="button"
            class="micl-button--toggle micl-chip-filter"
            :aria-pressed="settingsTab === 'more' ? 'true' : 'false'"
            @click="settingsTab = 'more'"
          >
            更多
          </button>
        </div>
      </template>
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
  height: 100%;
  overflow: hidden;
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
}

/* 局部主题作用域：data-theme 驱动 M3 token 级联到阅读器整棵子树 */
.reader-layout[data-theme='dark'] {
  color-scheme: dark;
}

.reader-layout[data-theme='light'] {
  color-scheme: light;
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
  transition: background-color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
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

.reader-layout__capsule {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(600px, calc(100vw - 96px));
  padding: 10px 16px;
  border-radius: 28px;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  box-shadow: var(--md-sys-elevation-level3);
}

.reader-layout__capsule-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reader-layout__capsule-row--split {
  justify-content: space-between;
}

.reader-layout__capsule-sep {
  height: 1px;
  background: var(--md-sys-color-outline-variant);
  opacity: 0.7;
}

.reader-layout__capsule-chapter {
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-on-surface-variant);
  white-space: nowrap;
}

.reader-layout__capsule-info {
  margin-left: auto;
  padding-inline: 4px;
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-on-surface-variant);
  white-space: nowrap;
}

/* ---- 章节抽屉 ---- */
.reader-drawer__backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  justify-content: flex-end;
  background: color-mix(in srgb, var(--md-sys-color-scrim) 40%, transparent);
}

.reader-drawer {
  width: min(360px, 92vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--md-sys-color-surface-container);
  border-left: 1px solid var(--md-sys-color-outline-variant);
  box-shadow: var(--md-sys-elevation-level3);
}

.reader-drawer__head {
  padding: 16px;
}

.reader-drawer__search {
  margin: 0;
}

.reader-drawer__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0 8px 24px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reader-drawer__item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--md-sys-shape-corner-medium);
  cursor: pointer;
  outline-offset: -2px;
}

.reader-drawer__item:hover,
.reader-drawer__item:focus-visible {
  background: var(--md-sys-color-surface-container-high);
}

.reader-drawer__item--active {
  background: var(--md-sys-color-secondary-container);
}

.reader-drawer__item--active .reader-drawer__title {
  color: var(--md-sys-color-on-secondary-container);
}

.reader-drawer__no {
  flex: 0 0 auto;
  min-width: 40px;
  text-align: right;
  font-size: var(--md-sys-typescale-label-small-size);
  color: var(--md-sys-color-on-surface-variant);
}

.reader-drawer__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reader-drawer__empty {
  padding: 32px 12px;
  text-align: center;
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-on-surface-variant);
}

.reader-layout__slider {
  width: 100%;
}

/* ---- 阅读界面设置卡 ---- */
.reader-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: min(320px, 76vw);
}

/* 高度随内容自适应（带动画，+50px 补偿）；极矮窗口由外部内容区兜底 */
.reader-settings__stage {
  overflow-y: auto;
  overflow-x: hidden;
  transition: height var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.reader-settings__stage::-webkit-scrollbar {
  display: none;
}

.reader-settings__stage-inner {
  min-width: 0;
}

.reader-settings__panel {
  animation: settings-panel-in var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);
}

.reader-settings__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reader-settings__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reader-settings__label {
  font-family: var(--md-ref-typeface-display);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.reader-settings__value {
  color: var(--md-sys-color-on-surface-variant);
  text-align: right;
}

.reader-settings__segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reader-settings__colors {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.reader-settings__swatch,
.reader-settings__picker {
  position: relative;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: var(--md-sys-shape-corner-full);
  border: 2px solid var(--md-sys-color-outline-variant);
  cursor: pointer;
}

.reader-settings__swatch--on {
  border-color: var(--md-sys-color-primary);
  box-shadow: 0 0 0 2px var(--md-sys-color-primary-container);
}

.reader-settings__picker {
  display: grid;
  place-items: center;
}

.reader-settings__picker::after {
  content: '+';
  font-size: 20px;
  line-height: 1;
  color: var(--md-sys-color-on-surface-variant);
}

.reader-settings__picker input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.reader-settings__placeholder {
  display: grid;
  place-items: center;
  min-height: 180px;
  color: var(--md-sys-color-on-surface-variant);
}

.reader-settings__tabs {
  width: 100%;
  justify-content: flex-start;
}

@keyframes settings-panel-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 阅读设置卡不允许出现右侧滚动条（内容超限时仍可用滚轮） */
:deep(.micl-dialog__content) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

:deep(.micl-dialog__content::-webkit-scrollbar) {
  display: none;
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

/* 悬浮胶囊：从底部上浮（保留 translateX(-50%) 居中） */
.capsule-enter-active,
.capsule-leave-active {
  transition: opacity var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized),
    transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
}

.capsule-enter-from,
.capsule-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(24px);
}

.capsule-enter-to,
.capsule-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* 章节抽屉：面板从右滑入（遮罩用半透明底色，面板保持不透明） */
.drawer-enter-active .reader-drawer {
  transition: transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
}

.drawer-leave-active .reader-drawer {
  transition: transform var(--md-sys-motion-duration-short) var(--md-sys-motion-easing-standard);
}

.drawer-enter-from .reader-drawer,
.drawer-leave-to .reader-drawer {
  transform: translateX(100%);
}

.drawer-enter-to .reader-drawer,
.drawer-leave-from .reader-drawer {
  transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
  .chrome-enter-active,
  .chrome-leave-active,
  .capsule-enter-active,
  .capsule-leave-active,
  .drawer-enter-active .reader-drawer,
  .drawer-leave-active .reader-drawer,
  .reader-settings__stage,
  .reader-settings__panel,
  .reader-layout__top {
    transition: none;
  }

  .reader-settings__panel {
    animation: none;
  }
}
</style>
