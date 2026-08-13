import { defineStore } from 'pinia'
import type { ReplaceRule } from '@/types'
import { deleteReplaceRule, getReplaceRules, saveReplaceRule } from '@/api/replace'

function createRule(): ReplaceRule {
  return {
    id: Date.now(),
    name: '',
    group: null,
    pattern: '',
    replacement: '',
    scope: null,
    scopeTitle: false,
    scopeContent: true,
    excludeScope: null,
    isEnabled: true,
    isRegex: true,
    timeoutMillisecond: 3000,
    order: -2147483648, // Int.MIN_VALUE：后端 saveRule 遇此值自动分配 maxOrder+1
  }
}

export const useReplaceStore = defineStore('replace', {
  state: () => ({
    rules: [] as ReplaceRule[],
    loading: false,
    loaded: false,
    error: '' as string,
  }),
  getters: {
    enabledCount(state) {
      return state.rules.filter((r) => r.isEnabled).length
    },
  },
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      this.error = ''
      try {
        this.rules = await getReplaceRules()
        this.loaded = true
      } catch (e) {
        this.error = (e as Error).message
      } finally {
        this.loading = false
      }
    },
    /** 保存后以后端列表为准（契约：写路由成功不设 isSuccess，需回查核对） */
    async save(rule: ReplaceRule) {
      await saveReplaceRule(rule)
      this.rules = await getReplaceRules()
    },
    /** 删除后回查列表核对生效 */
    async remove(rule: ReplaceRule) {
      await deleteReplaceRule(rule)
      this.rules = await getReplaceRules()
    },
    /** 切换启用（整体保存该规则） */
    async toggle(rule: ReplaceRule, enabled: boolean) {
      const updated = { ...rule, isEnabled: enabled }
      this.rules = this.rules.map((r) => (r.id === rule.id ? updated : r))
      try {
        await this.save(updated)
      } catch (e) {
        this.rules = this.rules.map((r) => (r.id === rule.id ? rule : r))
        this.error = (e as Error).message
        throw e
      }
    },
    fresh(): ReplaceRule {
      return createRule()
    },
  },
})
