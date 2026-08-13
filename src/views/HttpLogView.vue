<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getHttpLog, getHttpLogs } from '@/api/httpLog'
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
  if (code >= 200 && code < 300) return 'success'
  if (code >= 400) return 'error'
  return 'on-surface-variant'
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
  <div class="httplog-view">
    <div class="httplog-view__head">
      <div>
        <h2 class="m3-headline-small httplog-view__title">HTTP 日志</h2>
        <p class="httplog-view__subtitle">
          最近请求记录 · 最多保留 50 条
          <v-chip
            size="small"
            variant="tonal"
            :color="recording ? 'primary' : 'default'"
            class="httplog-view__recording"
          >
            <v-icon start :icon="recording ? 'mdi-radar' : 'mdi-radar-off'" size="small" />
            {{ recording ? '记录中' : '未记录' }}
          </v-chip>
        </p>
      </div>
      <v-spacer />
      <v-btn
        variant="tonal"
        prepend-icon="mdi-refresh"
        :loading="loading"
        class="m3-interactive"
        @click="load"
      >
        刷新
      </v-btn>
    </div>

    <div v-if="loading && logs.length === 0" class="httplog-view__state">
      <v-progress-circular indeterminate color="primary" size="36" />
    </div>

    <div v-else-if="error && logs.length === 0" class="httplog-view__state">
      <v-icon icon="mdi-server-off-outline" size="40" color="error" />
      <span>{{ error }}</span>
      <v-btn variant="tonal" @click="load">重试</v-btn>
    </div>

    <div v-else-if="logs.length === 0" class="httplog-view__state">
      <v-icon icon="mdi-file-document-outline" size="40" color="on-surface-variant" />
      <span>暂无 HTTP 记录</span>
    </div>

    <div v-else class="httplog-view__list">
      <v-card
        v-for="l in logs"
        :key="l.id"
        class="httplog-view__item m3-interactive"
        rounded="lg"
        role="button"
        tabindex="0"
        @click="openDetail(l.id)"
        @keydown.enter="openDetail(l.id)"
      >
        <v-card-item>
          <template #prepend>
            <v-chip size="small" variant="tonal" :color="statusColor(l.statusCode)" class="httplog-view__method m3-mono">
              {{ l.method }}
            </v-chip>
          </template>
          <v-card-title class="httplog-view__url m3-mono text-truncate">
            {{ l.url }}
          </v-card-title>
          <v-card-subtitle class="httplog-view__meta m3-mono">
            #{{ l.id }} · {{ timeText(l.time) }} · {{ l.duration }}ms
            <template v-if="l.error"> · {{ l.error }}</template>
          </v-card-subtitle>
          <template #append>
            <v-chip size="small" variant="flat" :color="statusColor(l.statusCode)" class="m3-mono">
              {{ l.statusCode }}
            </v-chip>
          </template>
        </v-card-item>
      </v-card>
    </div>

    <v-dialog
      :model-value="detailOpen"
      max-width="720"
      persistent
      scrollable
      @update:model-value="detailOpen = $event"
    >
      <v-card rounded="xl">
        <v-card-title class="m3-title-medium httplog-view__detail-title">
          HTTP #{{ detail?.id }}
          <v-chip v-if="detail" size="small" variant="tonal" :color="statusColor(detail.statusCode)" class="m3-mono">
            {{ detail.statusCode }}
          </v-chip>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <div v-if="detailLoading" class="httplog-view__detail-loading">
            <v-progress-circular indeterminate color="primary" size="28" />
          </div>
          <template v-else-if="detail">
            <p class="httplog-view__detail-line m3-mono">{{ detail.method }} {{ detail.url }}</p>
            <p class="httplog-view__detail-meta m3-mono">
              {{ timeText(detail.time) }} · {{ detail.duration }}ms
            </p>
            <template v-if="detail.requestHeaders || detail.requestBody">
              <h4 class="httplog-view__detail-section m3-label-large">Request</h4>
              <pre v-if="detail.requestHeaders" class="httplog-view__pre m3-mono">{{ detail.requestHeaders }}</pre>
              <pre v-if="detail.requestBody" class="httplog-view__pre m3-mono">{{ detail.requestBody }}</pre>
            </template>
            <template v-if="detail.responseHeaders || detail.responseBody">
              <h4 class="httplog-view__detail-section m3-label-large">Response</h4>
              <pre v-if="detail.responseHeaders" class="httplog-view__pre m3-mono">{{ detail.responseHeaders }}</pre>
              <pre v-if="detail.responseBody" class="httplog-view__pre m3-mono">{{ detail.responseBody }}</pre>
            </template>
            <template v-if="detail.error">
              <h4 class="httplog-view__detail-section m3-label-large">Error</h4>
              <pre class="httplog-view__pre httplog-view__pre--error m3-mono">{{ detail.error }}</pre>
            </template>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="detailOpen = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      :model-value="!!snackbar"
      :timeout="2500"
      location="bottom"
      @update:model-value="snackbar = $event ? snackbar : ''"
    >
      {{ snackbar }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.httplog-view {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 32px) 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.httplog-view__head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.httplog-view__title {
  color: var(--md-sys-color-on-surface);
}

.httplog-view__subtitle {
  margin: 4px 0 0;
  font-size: var(--md-sys-typescale-body-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.httplog-view__recording {
  margin-left: 6px;
}

.httplog-view__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 0;
  color: var(--md-sys-color-on-surface-variant);
}

.httplog-view__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.httplog-view__item {
  background: var(--md-sys-color-surface-container-low);
  cursor: pointer;
  outline-offset: 2px;
}

.httplog-view__method {
  font-family: var(--md-ref-typeface-mono);
  text-transform: none;
}

.httplog-view__url {
  font-size: var(--md-sys-typescale-body-medium-size);
}

.httplog-view__meta {
  font-size: var(--md-sys-typescale-label-small-size);
}

.httplog-view__detail-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--md-sys-color-on-surface);
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
