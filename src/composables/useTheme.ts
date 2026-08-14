import { useThemeStore } from '@/stores/theme'

export type AppTheme = 'light' | 'dark'

/**
 * 主题控制：store 是唯一数据源。
 * 切换时更新 <html data-theme>（驱动 M3 token / MICL 组件配色）并持久化。
 */
export function useThemeControl() {
  const store = useThemeStore()

  function applyDataTheme(name: AppTheme) {
    document.documentElement.setAttribute('data-theme', name)
    document.documentElement.style.colorScheme = name
  }

  /** M3 色彩渐变：主题切换时以 View Transitions 做全页 crossfade */
  function crossfade(apply: () => void) {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof doc.startViewTransition !== 'function') {
      apply()
      return
    }
    doc.startViewTransition(apply)
  }

  function setTheme(name: AppTheme) {
    crossfade(() => {
      store.set(name)
      applyDataTheme(name)
    })
  }

  function toggle() {
    setTheme(store.name === 'dark' ? 'light' : 'dark')
  }

  /** 应用 store 中已持久化的主题（App 挂载时调用一次） */
  function hydrate() {
    applyDataTheme(store.name)
  }

  return { setTheme, toggle, hydrate }
}
