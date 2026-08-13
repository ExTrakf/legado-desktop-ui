<script setup lang="ts">
defineProps<{
  modelValue: boolean
  maxWidth?: string | number
}>()

defineEmits<{ 'update:modelValue': [boolean] }>()
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth ?? 560"
    :scrim="true"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #default>
      <v-card
        class="app-dialog"
        rounded="xl"
        elevation="0"
      >
        <v-card-title class="app-dialog__title m3-title-medium">
          <slot name="title" />
        </v-card-title>
        <v-card-text class="app-dialog__body">
          <slot />
        </v-card-text>
        <v-card-actions class="app-dialog__actions">
          <slot name="actions" />
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<style scoped>
.app-dialog {
  background: var(--md-sys-color-surface-container-high);
}

.app-dialog__title {
  color: var(--md-sys-color-on-surface);
}

.app-dialog__body {
  color: var(--md-sys-color-on-surface-variant);
}

.app-dialog__actions {
  padding-bottom: 16px;
}
</style>
