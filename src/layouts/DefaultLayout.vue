<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { storeToRefs } from 'pinia'
import { navItems } from '@/components/navigation/navItems'
import { useThemeStore } from '@/stores/theme'
import { useThemeControl } from '@/composables/useTheme'

const route = useRoute()
const display = useDisplay()
const themeStore = useThemeStore()
const { name } = storeToRefs(themeStore)
const { toggle } = useThemeControl()

const drawer = ref(false)

const isDesktop = display.lgAndUp
const isTablet = computed(() => display.mdAndUp.value && !display.lgAndUp.value)

watch(
  () => route.fullPath,
  () => {
    drawer.value = false
  },
)

function toggleTheme() {
  toggle()
}
</script>

<template>
  <v-layout class="default-layout">
    <v-app-bar
      class="default-layout__bar"
      elevation="0"
      :border="true"
    >
      <v-app-bar-nav-icon
        v-if="!isDesktop"
        icon="mdi-menu"
        @click="drawer = !drawer"
      />
      <v-app-bar-title class="default-layout__bar-title">
        {{ route.meta.title as string }}
      </v-app-bar-title>
      <v-spacer />
      <v-btn
        :icon="name === 'dark' ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
        variant="text"
        :aria-label="name === 'dark' ? '切换浅色' : '切换深色'"
        @click="toggleTheme"
      />
    </v-app-bar>

    <v-navigation-drawer
      v-if="isDesktop"
      permanent
      class="default-layout__drawer"
    >
      <div class="default-layout__drawer-brand m3-headline-small">
        开源阅读
      </div>
      <v-list nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          class="m3-interactive"
          rounded="xl"
        />
      </v-list>
    </v-navigation-drawer>

    <v-navigation-rail
      v-else-if="isTablet"
      permanent
      class="default-layout__rail"
    >
      <v-list nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :icon="item.icon"
          :title="item.title"
          class="m3-interactive"
        />
      </v-list>
    </v-navigation-rail>

    <v-navigation-drawer
      v-if="!isDesktop && drawer"
      temporary
      class="default-layout__mobile-drawer"
      @update:model-value="drawer = $event"
    >
      <v-list nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          class="m3-interactive"
          rounded="xl"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main class="default-layout__main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>
  </v-layout>
</template>

<style scoped>
.default-layout__bar {
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
}

.default-layout__bar-title {
  font-family: var(--md-ref-typeface-display);
  font-weight: 600;
}

.default-layout__drawer {
  background: var(--md-sys-color-surface-container);
}

.default-layout__drawer-brand {
  padding: 20px 24px 8px;
  color: var(--md-sys-color-on-surface);
}

.default-layout__rail {
  background: var(--md-sys-color-surface-container);
}

.default-layout__main {
  background: var(--md-sys-color-surface);
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
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>
