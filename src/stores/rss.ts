import { defineStore } from 'pinia'
import type { RssSource } from '@/types'
import { deleteRssSources, getRssSources, saveRssSource } from '@/api/rss'

export const useRssStore = defineStore('rss', {
  state: () => ({
    sources: [] as RssSource[],
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
        this.sources = await getRssSources()
        this.loaded = true
      } catch (e) {
        this.error = (e as Error).message
      } finally {
        this.loading = false
      }
    },
    /** 切换启用状态（整体保存该源） */
    async toggle(url: string, enabled: boolean) {
      const s = this.sources.find((x) => x.sourceUrl === url)
      if (!s) return
      const updated = { ...s, enabled }
      this.sources = this.sources.map((x) => (x.sourceUrl === url ? updated : x))
      try {
        await saveRssSource(updated)
      } catch (e) {
        this.sources = this.sources.map((x) => (x.sourceUrl === url ? s : x))
        this.error = (e as Error).message
        throw e
      }
    },
    async remove(source: RssSource) {
      await deleteRssSources([source])
      this.sources = this.sources.filter((x) => x.sourceUrl !== source.sourceUrl)
    },
  },
})
