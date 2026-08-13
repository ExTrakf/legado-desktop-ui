<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  /** 显示时长（毫秒） */
  duration?: number
}>()

const emit = defineEmits<{
  'update:open': [boolean]
}>()

const el = ref<HTMLElement | null>(null)

watch(
  () => props.open,
  (v) => {
    const node = el.value
    if (!node) return
    if (v && !node.matches(':popover-open')) node.showPopover()
    else if (!v && node.matches(':popover-open')) node.hidePopover()
  },
)

function onToggle(e: Event) {
  const ev = e as ToggleEvent
  if (ev.newState === 'closed') emit('update:open', false)
}
</script>

<template>
  <div
    ref="el"
    class="micl-snackbar"
    popover="manual"
    :data-micldelay="duration ?? 2500"
    role="status"
    aria-atomic="true"
    @toggle="onToggle"
  >
    <span class="micl-snackbar__supporting-text">
      <slot />
    </span>
  </div>
</template>
