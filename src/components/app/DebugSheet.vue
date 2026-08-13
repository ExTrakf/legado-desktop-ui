<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import AppDialog from '@/components/app/AppDialog.vue'
import { openDebugSocket, type DebugHandle } from '@/api/debug'

const props = defineProps<{
  modelValue: boolean
  title: string
  path: '/bookSourceDebug' | '/rssSourceDebug'
  /** 源地址（tag） */
  tag: string
  /** 调试关键字（书源调试必填；订阅源调试可省略） */
  keyHint?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const key = ref('')
const lines = ref<string[]>([])
const running = ref(false)
const error = ref('')
const finished = ref(false)
let handle: DebugHandle | null = null

const logText = ref<HTMLElement | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      key.value = ''
      lines.value = []
      error.value = ''
      finished.value = false
    } else {
      stop()
    }
  },
)

function scrollToBottom() {
  requestAnimationFrame(() => {
    const el = logText.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function start() {
  if (!props.tag) {
    error.value = '源地址为空，无法调试'
    return
  }
  if (props.path === '/bookSourceDebug' && !key.value.trim()) {
    error.value = '请输入调试关键字（如搜索词或书籍地址）'
    return
  }
  stop()
  lines.value = []
  error.value = ''
  finished.value = false
  running.value = true

  const payload = props.path === '/bookSourceDebug'
    ? { tag: props.tag, key: key.value.trim() }
    : { tag: props.tag }

  handle = openDebugSocket(
    props.path,
    payload,
    (line) => {
      lines.value.push(line)
      scrollToBottom()
    },
    () => {
      running.value = false
      finished.value = true
    },
    (message) => {
      running.value = false
      error.value = message
    },
  )
}

function stop() {
  if (handle) {
    handle.close()
    handle = null
  }
  running.value = false
}

function toggle() {
  if (running.value) stop()
  else start()
}

onBeforeUnmount(stop)
</script>

<template>
  <AppDialog
    :open="modelValue"
    :title="title"
    @update:open="emit('update:modelValue', $event)"
  >
    <div v-if="path === '/bookSourceDebug'" class="debug-sheet__key">
      <div class="micl-textfield-filled">
        <label for="debug-key">调试关键字</label>
        <input
          id="debug-key"
          type="text"
          v-model="key"
          :placeholder="keyHint || '搜索词或书籍地址'"
          :disabled="running"
          @keydown.enter="toggle"
        />
      </div>
    </div>

    <div class="debug-sheet__actions">
      <button
        type="button"
        class="micl-button-tonal-m"
        @click="toggle"
      >
        <i :class="running ? 'mdi mdi-stop micl-button__icon' : 'mdi mdi-play micl-button__icon'" aria-hidden="true" />
        {{ running ? '停止' : '开始调试' }}
      </button>
      <span v-if="finished" class="debug-sheet__done">
        <i class="mdi mdi-check-circle" aria-hidden="true" />
        调试结束
      </span>
    </div>

    <p v-if="error" class="debug-sheet__error">{{ error }}</p>

    <div
      ref="logText"
      class="debug-sheet__log mono"
      :class="{ 'debug-sheet__log--empty': lines.length === 0 }"
    >
      <template v-if="lines.length > 0">
        <p v-for="(l, i) in lines" :key="i">{{ l }}</p>
      </template>
      <span v-else>暂无日志…</span>
    </div>
  </AppDialog>
</template>

<style scoped>
.debug-sheet__key {
  margin-bottom: 12px;
}

.debug-sheet__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.debug-sheet__done {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-primary);
}

.debug-sheet__error {
  margin: 0 0 8px;
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-error);
}

.debug-sheet__log {
  height: 320px;
  overflow-y: auto;
  padding: 12px 14px;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: 1.7;
  color: var(--md-sys-color-on-surface-variant);
  white-space: pre-wrap;
  word-break: break-all;
}

.debug-sheet__log p {
  margin: 0 0 4px;
}

.debug-sheet__log--empty {
  display: grid;
  place-items: center;
  color: var(--md-sys-color-on-surface-variant);
}
</style>
