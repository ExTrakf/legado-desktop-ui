<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getHttpLog, getHttpLogs } from '@/api/httpLog'
import AppDialog from '@/components/app/AppDialog.vue'
import AppSnackbar from '@/components/app/AppSnackbar.vue'
import type { HttpLogRecord, HttpLogSummary } from '@/types'

const logs = ref<HttpLogSummary[]>([])
const recording = ref(false)
const loading = ref(false)
const error = ref('')
const snackbar = ref('')

const detailOpen = ref(false)
const detail = ref<HttpLogRecord | null>(null)
const detailLoading = ref(false)

onMounted(() => {
  void load()
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await getHttpLogs(50)
    logs.value = res.logs
    recording.value = res.recording
  } catch (e) {
    error.value = (e as Error).message
    if ((e as Error).message.includes('令牌')) snackbar.value = '请先在设置中配置令牌'
  } finally {
    loading.value = false
  }
}

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return 'var(--md-sys-color-primary)'
  if (code >= 400) return 'var(--md-sys-color-error)'
  return 'var(--md-sys-color-on-surface-variant)'
}

function timeText(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

async function openDetail(id: number) {
  detailLoading.value = true
  detailOpen.value = true
  detail.value = null
  try {
    detail.value = await getHttpLog(id)
  } catch (e) {
    snackbar.value = (e as Error).message
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}
</script>

<template>
  <div class="view-wrap httplog-view">
    <div class="view-head">
      <div class="view-head__titles">
        <h2 class="view-head__title">HTTP 日志</h2>
        <p class="view-head__sub">
          最近请求记录 · 最多保留 50 条
          <span class="httplog-view__recording" :style="recording ? 'color: var(--md-sys-color-primary)' : ''">
            <i :class="recording ? 'mdi mdi-radar' : 'mdi mdi-radar-off'" aria-hidden="true" />
            {{ recording ? '记录中' : '未记录' }}
          </span>
        </p>
      </div>
      <div class="head-actions">
        <button type="button" class="micl-button-text-m" :disabled="loading" @click="load">
          <i class="mdi mdi-refresh micl-button__icon" aria-hidden="true" />
          刷新
        </button>
      </div>
    </div>

    <div v-if="loading && logs.length === 0" class="empty-state">
      <progress class="micl-circular-progress" aria-label="正在加载日志" />
    </div>

    <div v-else-if="error && logs.length === 0" class="empty-state">
      <i class="mdi mdi-server-off-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__hint">{{ error }}</span>
      <button type="button" class="micl-button-tonal-m" @click="load">重试</button>
    </div>

    <div v-else-if="logs.length === 0" class="empty-state">
      <i class="mdi mdi-file-document-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__hint">暂无 HTTP 记录</span>
    </div>

    <div v-else class="card-list">
      <div
        v-for="l in logs"
        :key="l.id"
        class="micl-card-filled card-row clickable"
        role="button"
        tabindex="0"
        @click="openDetail(l.id)"
        @keydown.enter="openDetail(l.id)"
      >
        <span class="httplog-view__method mono" :style="{ color: statusColor(l.statusCode) }">{{ l.method }}</span>
        <div class="card-row__main">
          <div class="card-row__title mono text-truncate">{{ l.url }}</div>
          <div class="card-row__sub mono">
            #{{ l.id }} · {{ timeText(l.time) }} · {{ l.duration }}ms
            <template v-if="l.error"> · {{ l.error }}</template>
          </div>
        </div>
        <span class="httplog-view__code mono" :style="{ color: statusColor(l.statusCode) }">{{ l.statusCode }}</span>
      </div>
    </div>

    <AppDialog :open="detailOpen" title="HTTP 详情" @update:open="detailOpen = $event">
      <div v-if="detailLoading" class="httplog-view__detail-loading">
        <progress class="micl-circular-progress" aria-label="正在加载详情" />
      </div>
      <template v-else-if="detail">
        <p class="httplog-view__detail-line mono">{{ detail.method }} {{ detail.url }}</p>
        <p class="httplog-view__detail-meta mono">
          {{ timeText(detail.time) }} · {{ detail.duration }}ms
        </p>
        <template v-if="detail.requestHeaders || detail.requestBody">
          <h4 class="httplog-view__detail-section">Request</h4>
          <pre v-if="detail.requestHeaders" class="httplog-view__pre mono">{{ detail.requestHeaders }}</pre>
          <pre v-if="detail.requestBody" class="httplog-view__pre mono">{{ detail.requestBody }}</pre>
        </template>
        <template v-if="detail.responseHeaders || detail.responseBody">
          <h4 class="httplog-view__detail-section">Response</h4>
          <pre v-if="detail.responseHeaders" class="httplog-view__pre mono">{{ detail.responseHeaders }}</pre>
          <pre v-if="detail.responseBody" class="httplog-view__pre mono">{{ detail.responseBody }}</pre>
        </template>
        <template v-if="detail.error">
          <h4 class="httplog-view__detail-section">Error</h4>
          <pre class="httplog-view__pre httplog-view__pre--error mono">{{ detail.error }}</pre>
        </template>
      </template>
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="detailOpen = false">关闭</button>
      </template>
    </AppDialog>

    <AppSnackbar :open="!!snackbar" @update:open="snackbar = ''">
      {{ snackbar }}
    </AppSnackbar>
  </div>
</template>

<style scoped>
.httplog-view {
  max-width: 860px;
}

.httplog-view__recording {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--md-sys-typescale-label-medium-size);
}

.httplog-view__method {
  font-size: var(--md-sys-typescale-label-medium-size);
  flex: 0 0 auto;
}

.httplog-view__code {
  font-size: var(--md-sys-typescale-label-medium-size);
  flex: 0 0 auto;
}

.httplog-view__detail-loading {
  display: grid;
  place-items: center;
  padding: 48px 0;
}

.httplog-view__detail-line {
  margin: 0 0 4px;
  color: var(--md-sys-color-on-surface);
  word-break: break-all;
}

.httplog-view__detail-meta {
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.httplog-view__detail-section {
  margin: 16px 0 8px;
  color: var(--md-sys-color-on-surface);
}

.httplog-view__pre {
  margin: 0 0 8px;
  padding: 10px 12px;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  font-size: var(--md-sys-typescale-body-small-size);
  line-height: 1.6;
  color: var(--md-sys-color-on-surface-variant);
  white-space: pre-wrap;
  word-break: break-all;
  overflow: hidden;
}

.httplog-view__pre--error {
  color: var(--md-sys-color-error);
}
</style>
