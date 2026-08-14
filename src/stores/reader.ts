import { defineStore } from 'pinia'
import type { Book, Chapter, ReaderSettings } from '@/types'
import { getBookContent, getChapterList, saveBookProgress } from '@/api/books'
import { formatContent } from '@/utils/content'
import { useBookshelfStore } from '@/stores/bookshelf'

const SETTINGS_KEY = 'legado:reader-settings'

const defaultSettings: ReaderSettings = {
  fontSizeRem: 1.0625,
  lineHeight: 1.9,
  surface: 'paper',
  font: 'serif',
  mode: 'scroll',
  bgColor: null,
}

function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...defaultSettings, ...(JSON.parse(raw) as Partial<ReaderSettings>) }
  } catch {
    /* ignore */
  }
  return { ...defaultSettings }
}

export const useReaderStore = defineStore('reader', {
  state: () => ({
    book: null as Book | null,
    chapters: [] as Chapter[],
    /** 当前阅读中的章节（滚动模式=视口顶部所在章，翻页模式=当前页所在章） */
    chapterIndex: 0,
    /** 当前章内进度（0=章首，1=章尾），由视图滚动/翻页时上报 */
    fraction: 0,
    /** 已加载章节的格式化 HTML，按下标缓存，供无缝加载 */
    htmls: {} as Record<number, string>,
    /** 已加载章节的原文（用于按字符折算进度） */
    raws: {} as Record<number, string>,
    loadedStart: -1,
    loadedEnd: -1,
    loading: false,
    error: '' as string,
    settings: loadSettings() as ReaderSettings,
    view: null as HTMLElement | null,
    chromeVisible: true,
    /** 待定位：{ index, pos }（pos 为该章内字符偏移，恢复/跳转后由视图滚动并清空） */
    restore: null as { index: number; pos: number } | null,
    inflight: {} as Record<number, Promise<void>>,
  }),
  getters: {
    chapter(state) {
      return state.chapters[state.chapterIndex]
    },
    chapterLabel(state) {
      return `${state.chapterIndex + 1} / ${state.chapters.length}`
    },
    loadedIndices(state): number[] {
      const list: number[] = []
      for (let i = state.loadedStart; i <= state.loadedEnd; i++) {
        if (i >= 0 && state.htmls[i] !== undefined) list.push(i)
      }
      return list
    },
    /** 整本书阅读进度：当前章进度折算进总章数 */
    bookProgress(state): number {
      const total = state.chapters.length
      if (total <= 0) return 0
      return Math.min(1, Math.max(0, (state.chapterIndex + state.fraction) / total))
    },
  },
  actions: {
    async openBook(book: Book) {
      this.book = book
      this.error = ''
      this.loading = true
      this.chapters = []
      this.chapterIndex = 0
      this.fraction = 0
      this.htmls = {}
      this.raws = {}
      this.loadedStart = -1
      this.loadedEnd = -1
      this.restore = null
      try {
        this.chapters = await getChapterList(book.bookUrl)
        this.chapterIndex = Math.min(
          Math.max(0, book.durChapterIndex || 0),
          Math.max(0, this.chapters.length - 1),
        )
        this.setRestore(this.chapterIndex, book.durChapterPos || 0)
        await this.ensureWindow(this.chapterIndex, 1)
      } catch (e) {
        this.error = (e as Error).message
      } finally {
        this.loading = false
      }
    },

    /** 确保某章已加载（缓存 + 去重），返回该章加载完成 */
    async ensureLoaded(index: number): Promise<void> {
      if (!this.book || index < 0 || index >= this.chapters.length) return
      if (this.htmls[index] !== undefined) return
      if (index in this.inflight) return this.inflight[index]
      const p = (async () => {
        this.loading = true
        this.error = ''
        try {
          const raw = await getBookContent(this.book!.bookUrl, index)
          this.raws[index] = raw
          this.htmls[index] = formatContent(raw, this.book!.bookUrl)
          if (this.loadedStart < 0 || index < this.loadedStart) this.loadedStart = index
          if (index > this.loadedEnd) this.loadedEnd = index
        } catch (e) {
          this.error = (e as Error).message
        } finally {
          this.loading = false
          delete this.inflight[index]
        }
      })()
      this.inflight[index] = p
      return p
    },

    /** 确保 [center-lookahead, center+lookahead] 章节都已加载 */
    async ensureWindow(center: number, lookahead = 1) {
      const lo = Math.max(0, center - lookahead)
      const hi = Math.min(this.chapters.length - 1, center + lookahead)
      const jobs: Promise<void>[] = []
      for (let i = lo; i <= hi; i++) jobs.push(this.ensureLoaded(i))
      await Promise.all(jobs)
    },

    /** 卸载下标 < index 的所有章节（滚动模式滑过即卸，控制 DOM 长度） */
    unloadBefore(index: number) {
      if (index <= this.loadedStart) return
      for (let i = this.loadedStart; i < index; i++) {
        delete this.htmls[i]
        delete this.raws[i]
      }
      this.loadedStart = Math.max(index, 0)
    },

    setReadingPosition(index: number, fraction: number) {
      if (index < 0 || index >= this.chapters.length) return
      const f = Math.min(1, Math.max(0, fraction))
      if (index !== this.chapterIndex || Math.abs(f - this.fraction) > 0.0001) {
        this.chapterIndex = index
        this.fraction = f
      }
    },

    setRestore(index: number, pos: number) {
      this.restore = { index, pos }
    },
    clearRestore() {
      this.restore = null
    },

    jumpTo(index: number) {
      if (index < 0 || index >= this.chapters.length) return
      this.setReadingPosition(index, 0)
      this.setRestore(index, 0)
      void this.ensureWindow(index, 1)
    },
    nextChapter() {
      this.jumpTo(this.chapterIndex + 1)
    },
    prevChapter() {
      this.jumpTo(this.chapterIndex - 1)
    },
    retry() {
      if (this.htmls[this.chapterIndex] === undefined) void this.ensureLoaded(this.chapterIndex)
    },

    async saveProgress() {
      if (!this.book) return
      const idx = this.chapterIndex
      const raw = this.raws[idx]
      const durChapterPos = raw ? Math.floor(this.fraction * raw.length) : 0
      const chapter = this.chapters[idx]
      try {
        await saveBookProgress({
          name: this.book.name,
          author: this.book.author,
          durChapterIndex: idx,
          durChapterPos,
          durChapterTitle: chapter?.title ?? this.book.durChapterTitle,
          durChapterTime: Date.now(),
        })
        const shelf = useBookshelfStore()
        if (shelf.books.some((b) => b.bookUrl === this.book!.bookUrl)) {
          shelf.updateBookLocal({
            ...this.book,
            durChapterIndex: idx,
            durChapterPos,
            durChapterTitle: chapter?.title ?? null,
            durChapterTime: Date.now(),
          })
        }
      } catch {
        /* 进度保存失败不打断阅读 */
      }
    },

    setView(el: HTMLElement | null) {
      this.view = el
    },
    setChromeVisible(v: boolean) {
      if (this.chromeVisible !== v) this.chromeVisible = v
    },
    updateSettings(patch: Partial<ReaderSettings>) {
      this.settings = { ...this.settings, ...patch }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
    },
  },
})
