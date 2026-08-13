<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'
import { useThemeControl } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'

const themeStore = useThemeStore()
const { hydrate } = useThemeControl()
const { name } = storeToRefs(themeStore)
const auth = useAuthStore()

onMounted(() => {
  hydrate()
  void auth.checkBackend()
})
</script>

<template>
  <v-app :theme="name">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </v-app>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-standard),
    transform var(--md-sys-motion-duration-medium) var(--md-sys-motion-easing-emphasized);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
