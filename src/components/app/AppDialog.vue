<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  /** 标题 */
  title?: string
  /** 辅助说明（可选） */
  supporting?: string
}>()

const emit = defineEmits<{
  'update:open': [boolean]
}>()

const dlg = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (v) => {
    const el = dlg.value
    if (!el) return
    if (v && !el.open) el.showModal()
    else if (!v && el.open) el.close()
  },
)

function onClose() {
  emit('update:open', false)
}

/** 点击遮罩关闭 */
function onBackdrop(e: MouseEvent) {
  if (e.target === dlg.value) emit('update:open', false)
}
</script>

<template>
  <dialog
    ref="dlg"
    class="micl-dialog"
    aria-labelledby="app-dialog-title"
    @close="onClose"
    @click="onBackdrop"
  >
    <slot name="headline">
      <div class="micl-dialog__headline">
        <h2 id="app-dialog-title">{{ title }}</h2>
        <span v-if="supporting" class="micl-dialog__supporting-text">{{ supporting }}</span>
      </div>
    </slot>
    <div v-if="$slots.default" class="micl-dialog__content">
      <slot />
    </div>
    <div v-if="$slots.actions" class="micl-dialog__actions">
      <slot name="actions" />
    </div>
  </dialog>
</template>
