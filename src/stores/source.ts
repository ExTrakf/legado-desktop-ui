import { defineStore } from 'pinia'
import type { BookSource } from '@/types'
import { deleteBookSources, getBookSources, saveBookSource } from '@/api/sources'

export const useSourceStore = defineStore('source', {
  state: () => ({
    sources: [] as BookSource[],
    loading: false,
    loaded: false,
    error: '' as string,
  }),
  getters: {
    enabledCount(state) {
      return state.sources.filter((s) => s.enabled).length
    },
  },
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      this.error = ''
      try {
        this.sources = await getBookSources()
        this.loaded = true
      } catch (e) {
        this.error = (e as Error).message
      } finally {
        this.loading = false
      }
    },
    /** 切换启用状态（整体保存该源） */
    async toggle(url: string, enabled: boolean) {
      const s = this.sources.find((x) => x.bookSourceUrl === url)
      if (!s) return
      const updated = { ...s, enabled }
      this.sources = this.sources.map((x) => (x.bookSourceUrl === url ? updated : x))
      try {
        await saveBookSource(updated)
      } catch (e) {
        this.sources = this.sources.map((x) => (x.bookSourceUrl === url ? s : x))
        this.error = (e as Error).message
        throw e
      }
    },
    async remove(source: BookSource) {
      await deleteBookSources([source])
      this.sources = this.sources.filter((x) => x.bookSourceUrl !== source.bookSourceUrl)
    },
  },
})
