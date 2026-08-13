import { defineStore } from 'pinia'
import { applyTokenToBackend, getTokenRequired, readLocalToken, saveLocalToken } from '@/api/settings'
import { getHealth } from '@/api/system'

/** 后端令牌与鉴权状态 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: readLocalToken(),
    tokenRequired: true,
    backendOnline: false,
    healthChecked: false,
  }),
  actions: {
    async checkBackend() {
      this.healthChecked = true
      try {
        await getHealth()
        this.backendOnline = true
      } catch {
        this.backendOnline = false
        return
      }
      // 令牌必填查询失败不判定离线（仅影响提示文案）
      try {
        this.tokenRequired = await getTokenRequired()
      } catch {
        /* ignore */
      }
    },
    setLocalToken(token: string) {
      this.token = token
      saveLocalToken(token)
    },
    /** 同时写入前端本地 + 下发到后端 */
    async applyToken(token: string) {
      await applyTokenToBackend(token)
      this.setLocalToken(token)
    },
    /** 同步清除后端令牌（POST /setJsSourceToken {"token":""}）与本地缓存 */
    async clear() {
      await applyTokenToBackend('')
      this.token = ''
      saveLocalToken('')
    },
  },
})
