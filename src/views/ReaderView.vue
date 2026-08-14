<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useReaderStore } from '@/stores/reader'

const reader = useReaderStore()
const { settings, htmls, chapters, loadedIndices, loading, error } = storeToRefs(reader)

const view = ref<HTMLElement | null>(null)
const pageEl = ref<HTMLElement | null>(null)
const pageFlow = ref<HTMLElement | null>(null)
let raf = 0
let saveTimer: number | undefined
let snapTimer: number | undefined
let lastX = 0
let lastY = 0

const mode = computed(() => settings.value.mode)
const fontClass = computed(() => `reading-font--${settings.value.font}`)
const contentStyle = computed(() => ({
  fontSize: `${settings.value.fontSizeRem}rem`,
  lineHeight: settings.value.lineHeight,
}))

/** 判断 hex 背景是否偏亮（决定前景用深/浅色） */
function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55
}

/** 阅读底色：自定义背景色优先，否则按底色预设输出 CSS 变量 */
const surfaceStyle = computed(() => {
  const s = settings.value
  const custom =
    s.bgColor && /^#?[0-9a-f]{6}$/i.test(s.bgColor) ? s.bgColor : null
  if (custom) {
    const light = isLightColor(custom)
    return {
      '--reading-bg': custom,
      '--reading-fg': light ? '#1c1b1e' : '#e6e1e6',
      '--reading-fg-weak': light ? '#49454e' : '#cac4cf',
      '--reading-accent': 'var(--md-sys-color-primary)',
    }
  }
  if (s.surface === 'ink') {
    return {
      '--reading-bg': '#101414',
      '--reading-fg': '#e4eae8',
      '--reading-fg-weak': '#8a9593',
      '--reading-accent': '#cfbcff',
    }
  }
  if (s.surface === 'green') {
    return {
      '--reading-bg': '#e6f0e3',
      '--reading-fg': '#243020',
      '--reading-fg-weak': '#51604c',
      '--reading-accent': '#3f6a3a',
    }
  }
  return {
    '--reading-bg': 'var(--md-sys-color-surface)',
    '--reading-fg': 'var(--md-sys-color-on-surface)',
    '--reading-fg-weak': 'var(--md-sys-color-on-surface-variant)',
    '--reading-accent': 'var(--md-sys-color-primary)',
  }
})

/* ---- 定位（恢复进度 / 跳章 / 切换模式） ---- */

function scrollEl(): HTMLElement | null {
  return mode.value === 'page' ? pageEl.value : view.value
}

function scrollToIndex(index: number, fraction = 0) {
  const el = scrollEl()
  if (!el) return
  // 恢复进度/跳章应瞬间定位，不受 scroll-behavior:smooth 影响
  const prev = el.style.scrollBehavior
  el.style.scrollBehavior = 'auto'
  try {
    if (mode.value === 'page') {
      const marker = pageFlow.value?.querySelector<HTMLElement>(
        `.reader-page__marker[data-index="${index}"]`,
      )
      if (marker) el.scrollLeft = Math.max(0, marker.offsetLeft)
      return
    }
    const block = el.querySelector<HTMLElement>(`.reader-block[data-index="${index}"]`)
    if (!block) return
    const range = block.offsetHeight - el.clientHeight
    el.scrollTop = block.offsetTop + (range > 0 ? fraction * range : 0)
  } finally {
    el.style.scrollBehavior = prev
  }
}

watch(
  () => {
    const r = reader.restore
    return r
      ? [r.index, r.pos, reader.raws[r.index] !== undefined, reader.settings.mode] as const
      : null
  },
  (v) => {
    if (!v) return
    const [index, pos] = v
    const raw = reader.raws[index]
    if (raw === undefined) return
    const fraction = raw.length ? Math.min(1, Math.max(0, pos / raw.length)) : 0
    void nextTick(() => {
      scrollToIndex(index, fraction)
      reader.clearRestore()
    })
  },
)

/* 切换阅读模式时保持当前进度，并重排翻页列宽 */
watch(mode, async () => {
  const raw = reader.raws[reader.chapterIndex]
  const pos = raw ? Math.floor(reader.fraction * raw.length) : 0
  reader.setRestore(reader.chapterIndex, pos)
  if (mode.value === 'page') {
    await nextTick()
    updatePageColWidth()
  }
})

/* ---- 滚动模式：连续滚动 + 无缝加载下一章 + 滑过即卸载 ---- */

function onScroll() {
  const el = view.value
  if (!el || mode.value !== 'scroll') return
  reader.setView(el)
  const delta = el.scrollTop - lastY
  lastY = el.scrollTop
  if (Math.abs(delta) > 2) reader.setChromeVisible(delta < 0)

  if (raf) cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    updateScrollWindow(el)
    if (saveTimer) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => void reader.saveProgress(), 600)
  })
}

function updateScrollWindow(el: HTMLElement) {
  const blocks = Array.from(el.querySelectorAll<HTMLElement>('.reader-block'))
  if (!blocks.length) return
  const st = el.scrollTop
  const vh = el.clientHeight

  // 当前章：第一个底部越过视口顶部的块
  let current = reader.chapterIndex
  for (const b of blocks) {
    if (b.offsetTop + b.offsetHeight > st + 4) {
      current = Number(b.dataset.index)
      break
    }
  }

  const first = blocks[0]
  const last = blocks[blocks.length - 1]
  const firstIndex = Number(first.dataset.index)
  const lastIndex = Number(last.dataset.index)

  // 无缝加载下一章：接近当前末尾即预取
  if (st + vh > last.offsetTop + last.offsetHeight - 800) {
    void reader.ensureLoaded(lastIndex + 1)
  }
  // 往回滑：接近首块顶部且前面还有章节时，预载前一章，让回溯无缝衔接
  if (reader.loadedStart > 0 && st < first.offsetTop + 600) {
    void reader.ensureLoaded(reader.loadedStart - 1)
  }
  // 回看超出窗口时补载（兜底）
  if (current < reader.loadedStart || current > reader.loadedEnd) {
    void reader.ensureWindow(current, 1)
  }
  // 及时卸载已完全滑过的章节（留上边际，避免滚动锚定抖动）
  if (firstIndex < current && first.offsetTop + first.offsetHeight < st - 900) {
    reader.unloadBefore(firstIndex + 1)
  }

  const block = blocks.find((b) => Number(b.dataset.index) === current)
  if (block) {
    const range = block.offsetHeight - vh
    const frac = range > 0 ? Math.min(1, Math.max(0, (st - block.offsetTop) / range)) : 1
    reader.setReadingPosition(current, frac)
  }
}

/* ---- 翻页模式：横向分栏 + 平滑吸附 + 无缝加载下一章 ---- */

function onPageScroll() {
  const el = pageEl.value
  if (!el || mode.value !== 'page') return
  reader.setView(el)
  const delta = el.scrollLeft - lastX
  lastX = el.scrollLeft
  if (Math.abs(delta) > 2) reader.setChromeVisible(delta < 0)

  if (snapTimer) window.clearTimeout(snapTimer)
  snapTimer = window.setTimeout(snapPage, 120)

  if (raf) cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    updatePagePosition(el)
    if (saveTimer) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => void reader.saveProgress(), 600)
  })
}

/** 分栏列宽填满阅读区（= 容器宽 - 左右内边距；容器宽已排除左侧进度条） */
const pageColWidth = ref(0)
const pageFlowStyle = computed(() =>
  pageColWidth.value > 0 ? { columnWidth: `${pageColWidth.value}px` } : {},
)

function updatePageColWidth() {
  const el = pageEl.value
  const flow = pageFlow.value
  if (!el || !flow) return
  const pl = parseFloat(getComputedStyle(flow).paddingLeft) || 0
  const pr = parseFloat(getComputedStyle(flow).paddingRight) || 0
  const w = Math.max(0, el.clientWidth - pl - pr)
  if (w !== pageColWidth.value) pageColWidth.value = w
}

/** 一页的步进 = 列宽（填满阅读区）+ 列间距 */
function pageStep(): number {
  const el = pageEl.value
  const flow = pageFlow.value
  if (!el || !flow) return 0
  const pl = parseFloat(getComputedStyle(flow).paddingLeft) || 0
  const pr = parseFloat(getComputedStyle(flow).paddingRight) || 0
  const gap = parseFloat(getComputedStyle(flow).columnGap) || 0
  return el.clientWidth - pl - pr + gap
}

/** 停止滚动后平滑吸附到最近一页 */
function snapPage() {
  const el = pageEl.value
  if (!el) return
  const step = pageStep()
  if (step <= 0) return
  const target = Math.round(el.scrollLeft / step) * step
  if (Math.abs(el.scrollLeft - target) > 4) {
    el.scrollTo({ left: target, behavior: 'smooth' })
  }
}

/** 键盘翻页：前后一页（dir = ±1） */
function flipPage(dir: number) {
  const el = pageEl.value
  if (!el) return
  const step = pageStep()
  if (step <= 0) return
  const target = Math.round(el.scrollLeft / step) * step + dir * step
  const max = el.scrollWidth - el.clientWidth
  el.scrollTo({ left: Math.min(max, Math.max(0, target)), behavior: 'smooth' })
}

function updatePagePosition(el: HTMLElement) {
  const flow = pageFlow.value
  if (!flow) return
  const sl = el.scrollLeft
  const vw = el.clientWidth
  const markers = Array.from(flow.querySelectorAll<HTMLElement>('.reader-page__marker'))
  if (!markers.length) return

  let current = Number(markers[0].dataset.index)
  let startX = markers[0].offsetLeft
  let markerIdx = 0
  markers.forEach((m, i) => {
    if (m.offsetLeft <= sl + vw / 2) {
      current = Number(m.dataset.index)
      startX = m.offsetLeft
      markerIdx = i
    }
  })
  const next = markers[markerIdx + 1]
  const endX = next ? next.offsetLeft : el.scrollWidth
  const frac =
    endX > startX ? Math.min(1, Math.max(0, (sl + vw / 2 - startX) / (endX - startX))) : 1
  reader.setReadingPosition(current, frac)

  // 无缝加载下一章：翻到末尾即预取，追加为右侧新列
  if (sl + vw > el.scrollWidth - 900) {
    void reader.ensureLoaded(reader.loadedEnd + 1)
  }
}

/* ---- 键盘 ---- */

function onKeydown(e: KeyboardEvent) {
  if (mode.value === 'page') {
    // 翻页模式：上下方向键 + PgUp/PgDn 翻页；
    // 拦截所有方向/PgUp/PgDn，避免浏览器对横向容器自动平移/滚动
    const flipMap: Record<string, number> = {
      ArrowDown: 1,
      PageDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      PageUp: -1,
      ArrowLeft: -1,
    }
    if (e.key in flipMap) {
      e.preventDefault()
      flipPage(flipMap[e.key])
    }
    return
  }
  if (e.key === 'ArrowRight') reader.nextChapter()
  else if (e.key === 'ArrowLeft') reader.prevChapter()
}

onMounted(() => {
  reader.setView(view.value)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
  void nextTick(updatePageColWidth)
})

function onResize() {
  if (mode.value === 'page') updatePageColWidth()
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
  if (raf) cancelAnimationFrame(raf)
  if (snapTimer) window.clearTimeout(snapTimer)
  if (saveTimer) window.clearTimeout(saveTimer)
  void reader.saveProgress()
  reader.setChromeVisible(true)
})
</script>

<template>
  <div
    ref="view"
    class="reader-view m3-scrollbar"
    :class="{ 'reader-view--page': mode === 'page' }"
    @scroll="onScroll"
  >
    <!-- 滚动模式：多章连续排布，滑过即卸载 -->
    <div v-if="mode === 'scroll'" class="reader-view__scroll" :class="fontClass" :style="surfaceStyle">
      <section
        v-for="i in loadedIndices"
        :key="i"
        class="reader-block"
        :data-index="i"
      >
        <header v-if="i === 0" class="reader-view__head">
          <h1 class="reader-view__book m3-headline-small">
            {{ reader.book?.name ?? '未命名' }}
          </h1>
          <p v-if="reader.book?.author" class="reader-view__author m3-label-large">
            {{ reader.book.author }}
          </p>
        </header>
        <h2 class="reader-view__chapter-title">{{ chapters[i]?.title ?? '' }}</h2>
        <div class="reader-view__rule" />
        <div
          class="reader-view__content"
          :style="contentStyle"
          v-html="htmls[i] ?? ''"
        />
      </section>

      <div v-if="loading" class="reader-view__loading">
        <progress class="micl-linear-progress" aria-label="正在加载正文" />
      </div>

      <div v-if="error" class="reader-view__error">
        <i class="mdi mdi-alert-circle-outline reader-view__error-icon" aria-hidden="true" />
        <p class="reader-view__error-msg">{{ error }}</p>
        <button type="button" class="micl-button-tonal-m" @click="reader.retry()">
          <i class="mdi mdi-refresh micl-button__icon" aria-hidden="true" />
          重试
        </button>
      </div>
    </div>

    <!-- 翻页模式：横向分栏翻页 -->
    <div
      v-else
      ref="pageEl"
      class="reader-view__page"
      :class="fontClass"
      :style="surfaceStyle"
      @scroll="onPageScroll"
    >
      <div ref="pageFlow" class="reader-view__page-flow" :style="pageFlowStyle">
        <template v-for="i in loadedIndices" :key="i">
          <span class="reader-page__marker" :data-index="i" aria-hidden="true" />
          <header v-if="i === 0" class="reader-view__head">
            <h1 class="reader-view__book m3-headline-small">
              {{ reader.book?.name ?? '未命名' }}
            </h1>
            <p v-if="reader.book?.author" class="reader-view__author m3-label-large">
              {{ reader.book.author }}
            </p>
          </header>
          <h2 class="reader-view__chapter-title">{{ chapters[i]?.title ?? '' }}</h2>
          <div class="reader-view__rule" />
          <div
            class="reader-view__content"
            :style="contentStyle"
            v-html="htmls[i] ?? ''"
          />
        </template>
      </div>

      <div v-if="loading" class="reader-view__loading reader-view__loading--float">
        <progress class="micl-linear-progress" aria-label="正在加载正文" />
      </div>

      <div v-if="error" class="reader-view__error reader-view__error--float">
        <i class="mdi mdi-alert-circle-outline reader-view__error-icon" aria-hidden="true" />
        <p class="reader-view__error-msg">{{ error }}</p>
        <button type="button" class="micl-button-tonal-m" @click="reader.retry()">
          <i class="mdi mdi-refresh micl-button__icon" aria-hidden="true" />
          重试
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reader-view {
  position: relative;
  flex: 1;
  height: 100%;
  overflow-y: auto;
  scroll-behavior: smooth;
  background: transparent;
}

.reader-view--page {
  overflow: hidden;
}

/* ---- 滚动模式 ---- */

.reader-view__scroll {
  min-height: 100%;
  transition:
    background-color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized),
    color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
}

.reader-block {
  max-width: min(68ch, 860px);
  margin: 0 auto;
  padding: 40px clamp(20px, 6vw, 56px) 64px;
}

/* ---- 翻页模式 ---- */

.reader-view__page {
  position: relative;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.reader-view__page-flow {
  position: relative;
  height: 100%;
  column-gap: 80px;
  column-fill: auto;
  padding-block: 40px 64px;
  padding-inline: 40px;
  transition:
    background-color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized),
    color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
}

.reader-page__marker {
  display: block;
  width: 0;
  height: 0;
}

/* ---- 通用排版 ---- */

.reader-view__head {
  text-align: center;
  margin-bottom: 40px;
}

.reader-view__book {
  color: var(--md-sys-color-on-surface);
  transition: color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
}

.reader-view__author {
  display: block;
  margin-top: 6px;
  color: var(--md-sys-color-on-surface-variant);
  transition: color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
}

.reader-view__chapter-title {
  margin-top: 28px;
  font-family: var(--md-ref-typeface-display);
  font-size: 1.35em;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
  transition: color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
}

.reader-view__rule {
  width: 48px;
  height: 2px;
  margin: 24px auto 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary);
  transition: background-color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
}

.reader-view__content {
  font-family: var(--md-ref-typeface-reading);
  color: inherit;
  text-align: justify;
  transition:
    font-size var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
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

.reader-view__loading {
  padding: 48px 0;
}

.reader-view__loading--float {
  position: absolute;
  inset-inline: 0;
  bottom: 72px;
  padding: 12px 20vw;
}

.reader-view__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
}

.reader-view__error--float {
  position: absolute;
  inset: 0;
  justify-content: center;
}

.reader-view__error-icon {
  font-size: 40px;
  color: var(--md-sys-color-error);
}

.reader-view__error-msg {
  color: inherit;
  text-align: center;
  word-break: break-all;
}

/* 阅读底色：由 --reading-* 变量驱动（预设或自定义背景色），变量在 surfaceStyle 内联注入 */
.reader-view__scroll,
.reader-view__page {
  background: var(--reading-bg, var(--md-sys-color-surface));
  color: var(--reading-fg, var(--md-sys-color-on-surface));
  transition:
    background-color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized),
    color var(--md-sys-motion-duration-long) var(--md-sys-motion-easing-emphasized);
}

.reader-view__book,
.reader-view__chapter-title {
  color: var(--reading-fg, var(--md-sys-color-on-surface));
}

.reader-view__author {
  color: var(--reading-fg-weak, var(--md-sys-color-on-surface-variant));
}

.reader-view__rule {
  background: var(--reading-accent, var(--md-sys-color-primary));
}

/* 阅读字体（衬线 / 黑体） */
.reading-font--sans .reader-view__content {
  font-family: var(--md-ref-typeface-body);
}

@media (max-width: 600px) {
  .reader-block,
  .reader-view__page-flow {
    padding-top: 24px;
  }
}

@media (min-width: 960px) {
  .reader-block {
    max-width: min(1120px, 82vw);
    padding-inline: clamp(48px, 8vw, 120px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reader-view {
    scroll-behavior: auto;
  }

  .reader-view__scroll,
  .reader-view__page-flow,
  .reader-view__book,
  .reader-view__author,
  .reader-view__chapter-title,
  .reader-view__rule,
  .reader-view__content {
    transition: none;
  }
}
</style>
