<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { navItems } from '@/components/navigation/navItems'
import { useThemeStore } from '@/stores/theme'
import { useThemeControl } from '@/composables/useTheme'
import { useMediaQuery } from '@/composables/useMediaQuery'

const route = useRoute()
const themeStore = useThemeStore()
const { name } = themeStore
const { toggle } = useThemeControl()

const isDesktop = useMediaQuery('(min-width: 960px)')
const drawerOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)

const pageTitle = computed(() => (route.meta.title as string) ?? '')

function isActive(to: string) {
  return route.path === to || (to !== '/' && route.path.startsWith(to))
}

/** 移动端底部导航只放前 4 个高频入口，其余走汉堡菜单 */
const bottomItems = computed(() => navItems.slice(0, 4))
</script>

<template>
  <div class="app-shell">
    <header class="micl-appbar app-shell__bar">
      <div v-if="!isDesktop" class="micl-appbar__leading">
        <button
          type="button"
          class="micl-iconbutton-standard-m"
          aria-label="打开导航菜单"
          @click="drawerOpen = !drawerOpen"
        >
          <i class="mdi mdi-menu" aria-hidden="true" />
        </button>
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
      </div>
    </header>

    <div class="app-shell__body">
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

      <main class="app-shell__main">
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
  top: 0;
  z-index: 10;
  background: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.app-shell__bar-title {
  font-family: var(--md-ref-typeface-display);
  font-weight: 600;
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
  .nav-bar {
    display: none;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nav-rail,
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>
