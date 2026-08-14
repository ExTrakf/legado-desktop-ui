import { defineStore } from 'pinia'

const THEME_KEY = 'legado:theme'

type ThemeName = 'light' | 'dark'

function load(): ThemeName {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return 'light'
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    name: load() as ThemeName,
  }),
  actions: {
    set(name: ThemeName) {
      this.name = name
      localStorage.setItem(THEME_KEY, name)
    },
  },
})
