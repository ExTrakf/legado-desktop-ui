<script setup lang="ts">
import type { VNode } from 'vue'

defineProps<{
  title?: string
  subtitle?: string
  image?: string
  elevation?: number
  width?: string | number
  append?: VNode
}>()
</script>

<template>
  <v-card
    class="app-card"
    :elevation="elevation ?? 0"
    :width="width"
    rounded="lg"
  >
    <slot name="media">
      <v-img
        v-if="image"
        :src="image"
        cover
        class="app-card__media"
      >
        <slot name="media-overlay" />
      </v-img>
    </slot>
    <template v-if="title || subtitle || $slots.default">
      <v-card-item>
        <v-card-title v-if="title" class="app-card__title text-truncate">
          {{ title }}
        </v-card-title>
        <v-card-subtitle v-if="subtitle" class="app-card__subtitle text-truncate">
          {{ subtitle }}
        </v-card-subtitle>
        <slot />
      </v-card-item>
    </template>
  </v-card>
</template>

<style scoped>
.app-card {
  background: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.app-card__media {
  border-radius: inherit;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.app-card__title {
  font-family: var(--md-ref-typeface-display);
  font-weight: 600;
}

.app-card__subtitle {
  color: var(--md-sys-color-on-surface-variant);
}
</style>
