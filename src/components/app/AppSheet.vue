<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{ 'update:modelValue': [boolean] }>()
</script>

<template>
  <v-bottom-sheet
    :model-value="modelValue"
    :scrim="true"
    transition="bottom-sheet-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-sheet
      class="app-sheet"
      rounded="t-xl"
    >
      <div class="app-sheet__handle" />
      <slot />
    </v-sheet>
  </v-bottom-sheet>
</template>

<style scoped>
.app-sheet {
  background: var(--md-sys-color-surface-container);
  padding-bottom: env(safe-area-inset-bottom);
}

.app-sheet__handle {
  width: 32px;
  height: 4px;
  margin: 8px auto 4px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-outline-variant);
}
</style>
