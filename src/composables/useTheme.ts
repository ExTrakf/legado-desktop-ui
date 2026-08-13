import { useTheme } from 'vuetify'
import { useThemeStore } from '@/stores/theme'

export type AppTheme = 'light' | 'dark'

/**
 * 主题控制：store 是唯一数据源。
 * 任何切换同时更新 Vuetify 组件主题、<html data-theme>（驱动 CSS 层 M3 token）
 * 与持久化 store，避免三处状态漂移。
 */
export function useThemeControl() {
  const theme = useTheme()
  const store = useThemeStore()

  function applyDataTheme(name: AppTheme) {
    document.documentElement.setAttribute('data-theme', name)
    document.documentElement.style.colorScheme = name
  }

  function setTheme(name: AppTheme) {
    store.set(name)
    theme.global.name.value = name
    applyDataTheme(name)
  }

  function toggle() {
    setTheme(store.name === 'dark' ? 'light' : 'dark')
  }

  /** 应用 store 中已持久化的主题（App 挂载时调用一次） */
  function hydrate() {
    const name = store.name
    theme.global.name.value = name
    applyDataTheme(name)
  }

  return { theme, setTheme, toggle, hydrate }
}
