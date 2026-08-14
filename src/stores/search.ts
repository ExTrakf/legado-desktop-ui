import { defineStore } from 'pinia'
import type { SearchBook } from '@/types'
import { searchBooks, type SearchEvent, type SearchHandle } from '@/api/search'

export interface SourceGroup {
  originName: string
  books: SearchBook[]
  done: boolean
}

export const useSearchStore = defineStore('search', {
  state: () => ({
    keyword: '',
    groups: [] as SourceGroup[],
    running: false,
    error: '' as string,
    authError: false,
    _handle: null as SearchHandle | null,
  }),
  getters: {
    total(state) {
      return state.groups.reduce((n, g) => n + g.books.length, 0)
    },
  },
  actions: {
    async start(keyword: string) {
      this.stop()
      const kw = keyword.trim()
      if (!kw) return
      this.keyword = kw
      this.groups = []
      this.error = ''
      this.authError = false
      this.running = true

      this._handle = searchBooks(kw, (ev: SearchEvent) => {
        switch (ev.type) {
          case 'batch': {
            const existing = this.groups.find((g) => g.originName === ev.originName)
            if (existing) existing.books.push(...ev.books)
            else this.groups.push({ originName: ev.originName, books: ev.books, done: false })
            break
          }
          case 'authError':
            this.authError = true
            this.error = '连接失败：请确认后端已启动，且 Web 书源访问令牌已正确配置（「设置」页）'
            this.running = false
            break
          case 'error':
            this.error = ev.message
            this.running = false
            break
          case 'done':
            for (const g of this.groups) g.done = true
            this.running = false
            break
        }
      })
    },
    stop() {
      if (this._handle) {
        try {
          this._handle.close()
        } catch {
          /* ignore */
        }
        this._handle = null
      }
      this.running = false
    },
  },
})
