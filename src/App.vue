<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeControl } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'

const { hydrate } = useThemeControl()
const auth = useAuthStore()

onMounted(() => {
  hydrate()
  void auth.checkBackend()
})
</script>

<template>
  <div class="app-root">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style scoped>
.app-root {
  height: 100%;
}

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
