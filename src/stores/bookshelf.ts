import { defineStore } from 'pinia'
import type { Book, BookGroup } from '@/types'
import { getBookshelf, getBookGroups, deleteBook, saveBook } from '@/api/books'

export const useBookshelfStore = defineStore('bookshelf', {
  state: () => ({
    books: [] as Book[],
    groups: [] as BookGroup[],
    loading: false,
    loaded: false,
    error: '' as string,
    filter: '' as string,
    activeGroupId: -1 as number,
  }),
  getters: {
    filteredBooks(state) {
      const kw = state.filter.trim().toLowerCase()
      return state.books.filter((b) => {
        // Book.group 是位掩码：一书可属多组，须用按位与判定
        if (state.activeGroupId >= 0 && (b.group & state.activeGroupId) === 0) return false
        if (!kw) return true
        return (
          (b.name ?? '').toLowerCase().includes(kw) ||
          (b.author ?? '').toLowerCase().includes(kw) ||
          (b.kind ?? '').toLowerCase().includes(kw)
        )
      })
    },
  },
  actions: {
    async loadBooks(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      this.error = ''
      try {
        this.books = await getBookshelf()
        this.loaded = true
      } catch (e) {
        this.error = (e as Error).message
      } finally {
        this.loading = false
      }
    },
    async loadGroups() {
      try {
        this.groups = await getBookGroups()
      } catch {
        this.groups = []
      }
    },
    async removeBook(book: Book) {
      await deleteBook(book)
      this.books = this.books.filter((b) => b.bookUrl !== book.bookUrl)
    },
    async addBook(book: Book) {
      await saveBook(book)
      if (!this.books.some((b) => b.bookUrl === book.bookUrl)) {
        this.books.unshift(book)
      }
      this.loaded = false
    },
    updateBookLocal(book: Book) {
      const i = this.books.findIndex((b) => b.bookUrl === book.bookUrl)
      if (i >= 0) this.books[i] = book
      else this.books.unshift(book)
    },
  },
})
