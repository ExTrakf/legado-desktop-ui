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
    chapterIndex: 0,
    contentHtml: '' as string,
    contentRaw: '' as string,
    loading: false,
    error: '' as string,
    settings: loadSettings() as ReaderSettings,
    view: null as HTMLElement | null,
    chromeVisible: true,
    restoring: false,
  }),
  getters: {
    chapter(state) {
      return state.chapters[state.chapterIndex]
    },
    chapterLabel(state) {
      return `${state.chapterIndex + 1} / ${state.chapters.length}`
    },
    progressFraction(state): number {
      const el = state.view
      if (!el || el.scrollHeight <= el.clientHeight) return 0
      return el.scrollTop / (el.scrollHeight - el.clientHeight)
    },
  },
  actions: {
    async openBook(book: Book) {
      this.book = book
      this.error = ''
      this.loading = true
      this.chapters = []
      this.chapterIndex = 0
      try {
        this.chapters = await getChapterList(book.bookUrl)
        this.chapterIndex = Math.min(
          Math.max(0, book.durChapterIndex || 0),
          Math.max(0, this.chapters.length - 1),
        )
        await this.loadContent()
      } catch (e) {
        this.error = (e as Error).message
      } finally {
        this.loading = false
      }
    },
    async loadContent() {
      if (!this.book) return
      this.loading = true
      this.error = ''
      try {
        const raw = await getBookContent(this.book.bookUrl, this.chapterIndex)
        this.contentRaw = raw
        this.contentHtml = formatContent(raw, this.book.bookUrl)
      } catch (e) {
        this.error = (e as Error).message
      } finally {
        this.loading = false
      }
    },
    async nextChapter() {
      if (this.chapterIndex >= this.chapters.length - 1) return
      this.chapterIndex += 1
      this.view?.scrollTo({ top: 0 })
      await this.loadContent()
      await this.saveProgress()
    },
    async prevChapter() {
      if (this.chapterIndex <= 0) return
      this.chapterIndex -= 1
      this.view?.scrollTo({ top: 0 })
      await this.loadContent()
      await this.saveProgress()
    },
    async jumpTo(index: number) {
      if (index < 0 || index >= this.chapters.length) return
      this.chapterIndex = index
      this.view?.scrollTo({ top: 0 })
      await this.loadContent()
      await this.saveProgress()
    },
    async saveProgress() {
      if (!this.book) return
      const el = this.view
      const fraction = el && el.scrollHeight > el.clientHeight
        ? el.scrollTop / (el.scrollHeight - el.clientHeight)
        : 0
      const chapter = this.chapters[this.chapterIndex]
      const durChapterPos = this.contentRaw
        ? Math.floor(fraction * this.contentRaw.length)
        : 0
      try {
        await saveBookProgress({
          name: this.book.name,
          author: this.book.author,
          durChapterIndex: this.chapterIndex,
          durChapterPos,
          durChapterTitle: chapter?.title ?? this.book.durChapterTitle,
          durChapterTime: Date.now(),
        })
        const shelf = useBookshelfStore()
        if (shelf.books.some((b) => b.bookUrl === this.book!.bookUrl)) {
          shelf.updateBookLocal({
            ...this.book,
            durChapterIndex: this.chapterIndex,
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
