<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { navItems } from '@/components/navigation/navItems'
import { useThemeStore } from '@/stores/theme'
import { useThemeControl } from '@/composables/useTheme'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useBookshelfStore } from '@/stores/bookshelf'
import { addLocalBook } from '@/api/imports'
import AppSnackbar from '@/components/app/AppSnackbar.vue'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const { name } = themeStore
const { toggle } = useThemeControl()

const isDesktop = useMediaQuery('(min-width: 960px)')
const drawerOpen = ref(false)
const scrolled = ref(false)
const mainEl = ref<HTMLElement | null>(null)
let scrollRaf = 0

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
    mainEl.value?.scrollTo({ top: 0 })
  },
)

function onMainScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    const el = mainEl.value
    scrolled.value = !!el && el.scrollTop > 8
  })
}

onBeforeUnmount(() => {
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  document.removeEventListener('pointerdown', onOutsideDown)
  window.removeEventListener('keydown', onMenuKeydown)
})

const pageTitle = computed(() => (route.meta.title as string) ?? '')
const backTo = computed(() => (route.meta.back as string) ?? '')

/* 顶栏折叠菜单（从按钮处弹出的卡片列表） */
const shelf = useBookshelfStore()
const moreBtn = ref<HTMLElement | null>(null)
const moreOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const snackbar = ref('')

const hasMoreActions = computed(() => route.path === '/bookshelf')

const moreItems = computed(() => {
  if (route.path !== '/bookshelf') return []
  return [
    { key: 'local', label: '添加本地书籍', icon: 'mdi-file-plus-outline', action: pickLocalBook },
  ]
})

function pickLocalBook() {
  moreOpen.value = false
  fileInput.value?.click()
}

async function onLocalFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    await addLocalBook(file.name, file)
    snackbar.value = `已导入本地书籍：${file.name}`
    void shelf.loadBooks(true)
  } catch (err) {
    snackbar.value = (err as Error).message
  } finally {
    input.value = ''
  }
}

function onOutsideDown(e: PointerEvent) {
  if (moreBtn.value && !moreBtn.value.contains(e.target as Node)) moreOpen.value = false
}

function onMenuKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') moreOpen.value = false
}

watch(moreOpen, (v) => {
  if (v) {
    document.addEventListener('pointerdown', onOutsideDown)
    window.addEventListener('keydown', onMenuKeydown)
  } else {
    document.removeEventListener('pointerdown', onOutsideDown)
    window.removeEventListener('keydown', onMenuKeydown)
  }
})

function isActive(to: string) {
  return route.path === to || (to !== '/' && route.path.startsWith(to))
}

/** 移动端底部导航只放前 4 个高频入口，其余走汉堡菜单 */
const bottomItems = computed(() => navItems.slice(0, 4))
</script>

<template>
  <div class="app-shell">
    <header
      class="micl-appbar app-shell__bar"
      :class="{ 'app-shell__bar--scrolled': scrolled }"
    >
      <div class="micl-appbar__leading">
        <button
          v-if="backTo"
          type="button"
          class="micl-iconbutton-standard-m"
          aria-label="返回"
          @click="router.push(backTo)"
        >
          <i class="mdi mdi-arrow-left" aria-hidden="true" />
        </button>
        <button
          v-else-if="!isDesktop"
          type="button"
          class="micl-iconbutton-standard-m"
          aria-label="打开导航菜单"
          @click="drawerOpen = !drawerOpen"
        >
          <i class="mdi mdi-menu" aria-hidden="true" />
        </button>
        <span v-else class="app-shell__brand" aria-hidden="true">
          <i class="mdi mdi-book-open-page-variant" />
        </span>
      </div>
      <div class="micl-appbar__headline">
        <h1 class="app-shell__bar-title">{{ pageTitle }}</h1>
      </div>
      <div class="micl-appbar__trailing">
        <button
          type="button"
          class="micl-iconbutton-standard-m"
          :aria-label="name === 'dark' ? '切换浅色主题' : '切换深色主题'"
          @click="toggle"
        >
          <i :class="name === 'dark' ? 'mdi mdi-white-balance-sunny' : 'mdi mdi-weather-night'" aria-hidden="true" />
        </button>
        <div v-if="hasMoreActions" class="app-shell__more">
          <button
            ref="moreBtn"
            type="button"
            class="micl-iconbutton-standard-m"
            :aria-label="'更多操作'"
            :aria-expanded="moreOpen ? 'true' : 'false'"
            @click="moreOpen = !moreOpen"
          >
            <i class="mdi mdi-dots-horizontal" aria-hidden="true" />
          </button>
          <transition name="pop">
            <div v-if="moreOpen" class="app-shell__menu" role="menu">
              <button
                v-for="item in moreItems"
                :key="item.key"
                type="button"
                class="app-shell__menu-item"
                role="menuitem"
                @click="item.action()"
              >
                <i :class="`mdi ${item.icon}`" aria-hidden="true" />
                {{ item.label }}
              </button>
            </div>
          </transition>
        </div>
      </div>
    </header>

    <input ref="fileInput" type="file" accept=".txt,.epub" hidden @change="onLocalFile" />

    <div class="app-shell__body">
      <div
        class="app-shell__scrim"
        :class="{ 'app-shell__scrim--open': drawerOpen }"
        aria-hidden="true"
        @click="drawerOpen = false"
      />
      <nav
        class="micl-navigationrail nav-rail"
        :class="{ 'nav-rail--open': drawerOpen }"
        aria-label="主导航"
      >
        <div class="micl-navigationrail__content" role="menu">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="micl-navigationrail__item"
            role="menuitem"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            @click="drawerOpen = false"
          >
            <span class="micl-navigationrail__icon" aria-hidden="true">
              <i :class="`mdi ${item.icon}`" />
            </span>
            <span class="micl-navigationrail__text">{{ item.title }}</span>
          </router-link>
        </div>
      </nav>

      <main ref="mainEl" class="app-shell__main" @scroll="onMainScroll">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <nav class="micl-navigationbar nav-bar" aria-label="底部导航">
      <div class="micl-navigationbar__content" role="menu">
        <router-link
          v-for="item in bottomItems"
          :key="item.to"
          :to="item.to"
          class="micl-navigationbar__item"
          role="menuitem"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          <span class="micl-navigationbar__icon" aria-hidden="true">
            <i :class="`mdi ${item.icon}`" />
          </span>
          <span class="micl-navigationbar__text">{{ item.title }}</span>
        </router-link>
      </div>
    </nav>

    <AppSnackbar :open="!!snackbar" @update:open="snackbar = ''">
      {{ snackbar }}
    </AppSnackbar>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--md-sys-color-surface);
}

.app-shell__bar {
  position: sticky;
  top: 12px;
  z-index: 10;
  margin-inline: 16px;
  margin-block-start: 12px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container);
  box-shadow: var(--md-sys-elevation-level2);
  transition:
    background-color var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard),
    box-shadow var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);
}

.app-shell__bar--scrolled {
  background: var(--md-sys-color-surface-container-high);
  box-shadow: var(--md-sys-elevation-level3);
}

/* 顶栏折叠菜单：从按钮处弹出的卡片列表 */
.app-shell__more {
  position: relative;
  display: inline-flex;
}

.app-shell__menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 60;
  min-width: 208px;
  padding: 8px;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  box-shadow: var(--md-sys-elevation-level3);
}

.app-shell__menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: var(--md-sys-shape-corner-extra-small);
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font: inherit;
  font-size: var(--md-sys-typescale-body-medium-size);
  text-align: left;
  cursor: pointer;
}

.app-shell__menu-item:hover,
.app-shell__menu-item:focus-visible {
  background: var(--md-sys-color-surface-container-high);
}

.app-shell__menu-item i {
  font-size: 20px;
  color: var(--md-sys-color-on-surface-variant);
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized),
    transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(-6px);
  transform-origin: top right;
}

.pop-enter-to,
.pop-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
  transform-origin: top right;
}

.app-shell__brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 32px;
  block-size: 32px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-size: 20px;
}

.app-shell__bar-title {
  font-family: var(--md-ref-typeface-display);
  font-size: var(--md-sys-typescale-title-large-size);
  line-height: var(--md-sys-typescale-title-large-line-height);
  font-weight: 600;
  color: var(--md-sys-color-on-surface-container);
}

.app-shell__body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}

.app-shell__main {
  flex: 1 1 auto;
  min-width: 0;
  overflow-y: auto;
  height: 100%;
}

/* 桌面：静态 rail；移动：默认移出屏幕，汉堡打开时滑入 */
.nav-rail {
  flex: 0 0 auto;
  --md-comp-nav-rail-collapsed-top-space: 8px;
  margin-inline: 0;
  block-size: 100%;
}

.app-shell__scrim {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: var(--md-sys-color-scrim);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);
}

.app-shell__scrim--open {
  opacity: 0.4;
  pointer-events: auto;
}

/* 全局 border-box 会压扁 icon 的内容盒（24px + 16px 内边距），导致图标右偏；
   恢复 content-box 让 icon 在 56px 指示条内居中 */
.nav-rail :deep(.micl-navigationrail__icon),
.nav-rail :deep(.micl-navigationrail__text) {
  box-sizing: content-box;
}

/* 底部导航同理：图标在 64px 指示胶囊内右偏，恢复 content-box 居中 */
.nav-bar :deep(.micl-navigationbar__icon),
.nav-bar :deep(.micl-navigationbar__text) {
  box-sizing: content-box;
}

@media (max-width: 959px) {
  .nav-rail {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 30;
    transform: translateX(-100%);
    transition: transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
    box-shadow: var(--md-sys-elevation-level2);
  }

  .nav-rail--open {
    transform: translateX(0);
  }
}

@media (min-width: 960px) {
  .app-shell__scrim {
    display: none;
  }

  .nav-bar {
    display: none;
  }
}

.fade-enter-active {
  transition:
    opacity var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized),
    transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
}

.fade-leave-active {
  transition: opacity var(--md-sys-motion-duration-short) var(--md-sys-motion-easing-standard);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .app-shell__bar {
    transition: none;
  }

  .app-shell__scrim {
    transition: none;
  }

  .nav-rail,
  .fade-enter-active,
  .fade-leave-active,
  .pop-enter-active,
  .pop-leave-active {
    transition: none;
  }
}
</style>
