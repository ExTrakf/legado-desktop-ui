import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

/**
 * Vuetify 只负责工程与组件交互；视觉完全由 M3 Tokens 驱动。
 * 这里把 CSS 变量映射进 Vuetify theme（JS 侧同步读取）。
 */

function readColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    `--md-sys-color-${name}`,
  )
  return value.trim() || fallback
}

function buildColors(theme: 'light' | 'dark') {
  const fallback = theme === 'light'
    ? { primary: '#006a68', secondary: '#4a6362', tertiary: '#4a607b', error: '#ba1a1a' }
    : { primary: '#4ddad6', secondary: '#b0ccca', tertiary: '#b2c8e8', error: '#ffb4ab' }
  return {
    primary: readColor('primary', fallback.primary),
    'on-primary': readColor('on-primary', theme === 'light' ? '#ffffff' : '#003736'),
    'primary-container': readColor('primary-container', theme === 'light' ? '#6ff7f3' : '#00504e'),
    'on-primary-container': readColor('on-primary-container', theme === 'light' ? '#00201f' : '#6ff7f3'),
    secondary: readColor('secondary', fallback.secondary),
    tertiary: readColor('tertiary', fallback.tertiary),
    error: readColor('error', fallback.error),
    'error-container': readColor('error-container', theme === 'light' ? '#ffdad6' : '#93000a'),
    surface: readColor('surface', theme === 'light' ? '#fafdfc' : '#191c1c'),
    'surface-dim': readColor('surface-dim', theme === 'light' ? '#d8dada' : '#101414'),
    'surface-bright': readColor('surface-bright', theme === 'light' ? '#f7faf9' : '#363a39'),
    'surface-container-lowest': readColor('surface-container-lowest', theme === 'light' ? '#ffffff' : '#0b0f0f'),
    'surface-container-low': readColor('surface-container-low', theme === 'light' ? '#f2f4f3' : '#191c1c'),
    'surface-container': readColor('surface-container', theme === 'light' ? '#eceeed' : '#1d2020'),
    'surface-container-high': readColor('surface-container-high', theme === 'light' ? '#e6e9e8' : '#272b2a'),
    'surface-container-highest': readColor('surface-container-highest', theme === 'light' ? '#e0e3e2' : '#323535'),
    'on-surface': readColor('on-surface', theme === 'light' ? '#191c1c' : '#e0e3e2'),
    'on-surface-variant': readColor('on-surface-variant', theme === 'light' ? '#3f4948' : '#bec9c7'),
    'on-surface-muted': readColor('on-surface-variant', theme === 'light' ? '#3f4948' : '#bec9c7'),
    outline: readColor('outline', theme === 'light' ? '#6f7978' : '#889392'),
    'outline-variant': readColor('outline-variant', theme === 'light' ? '#bec9c7' : '#3f4948'),
    'inverse-surface': readColor('inverse-surface', theme === 'light' ? '#2d3131' : '#e0e3e2'),
    'inverse-on-surface': readColor('inverse-on-surface', theme === 'light' ? '#eff1f0' : '#2d3131'),
    info: '#2196f3',
    success: '#2e7d32',
    warning: '#f57c00',
  }
}

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: { colors: buildColors('light'), dark: false },
      dark: { colors: buildColors('dark'), dark: true },
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  defaults: {
    VBtn: { rounded: 'pill' },
    VCard: { rounded: 'lg' },
  },
})
