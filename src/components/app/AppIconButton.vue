<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string
    size?: 'small' | 'default' | 'large'
    color?: string
    variant?: 'flat' | 'text' | 'tonal'
    label?: string
  }>(),
  { size: 'default', variant: 'text' },
)

defineEmits<{ click: [MouseEvent] }>()
</script>

<template>
  <v-btn
    class="app-icon-btn m3-interactive"
    :icon="icon"
    :size="size"
    :color="color"
    :variant="variant"
    :aria-label="label"
    @click="$emit('click', $event)"
  />
</template>
