<script setup lang="ts">
type Variant = 'flat' | 'text' | 'elevated' | 'outlined' | 'plain' | 'tonal'
type Size = 'small' | 'default' | 'large'

withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    color?: string
    disabled?: boolean
    block?: boolean
    prependIcon?: string
    appendIcon?: string
    icon?: string
  }>(),
  {
    variant: 'flat',
    size: 'default',
  },
)

defineEmits<{ click: [MouseEvent] }>()
</script>

<template>
  <v-btn
    class="app-btn m3-interactive"
    :variant="variant"
    :size="size"
    :color="color"
    :disabled="disabled"
    :block="block"
    :prepend-icon="prependIcon"
    :append-icon="appendIcon"
    :icon="icon"
    @click="$emit('click', $event)"
  >
    <slot />
  </v-btn>
</template>
