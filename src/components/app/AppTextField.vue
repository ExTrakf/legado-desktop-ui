<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    placeholder?: string
    prependIcon?: string
    type?: string
    hint?: string
    clearable?: boolean
    autofocus?: boolean
  }>(),
  { type: 'text' },
)

defineEmits<{ 'update:modelValue': [string]; enter: [string] }>()
</script>

<template>
  <v-text-field
    class="app-text-field"
    :model-value="modelValue"
    :label="label"
    :placeholder="placeholder"
    :prepend-icon="prependIcon"
    :type="type"
    :hint="hint"
    :clearable="clearable"
    :autofocus="autofocus"
    variant="outlined"
    density="comfortable"
    hide-details="auto"
    @update:model-value="$emit('update:modelValue', $event)"
    @keydown.enter="$emit('enter', modelValue)"
  />
</template>

<style scoped>
.app-text-field :deep(.v-field) {
  border-radius: var(--md-sys-shape-corner-medium);
}
</style>
