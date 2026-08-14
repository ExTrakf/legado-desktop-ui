<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRssStore } from '@/stores/rss'
import { saveRssSource } from '@/api/rss'
import AppDialog from '@/components/app/AppDialog.vue'
import AppSnackbar from '@/components/app/AppSnackbar.vue'
import DebugSheet from '@/components/app/DebugSheet.vue'
import type { RssSource } from '@/types'

const store = useRssStore()
const { sources, enabledCount, loading, error } = storeToRefs(store)

const keyword = ref('')
const confirming = ref<RssSource | null>(null)
const snackbar = ref('')

const addOpen = ref(false)
const addForm = ref({ sourceName: '', sourceUrl: '', sourceGroup: '' })
const adding = ref(false)

const debugOpen = ref(false)
const debugTag = ref('')

onMounted(() => {
  void store.load()
})

function filtered() {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return sources.value
  return sources.value.filter(
    (s) =>
      s.sourceName.toLowerCase().includes(kw) ||
      (s.sourceGroup ?? '').toLowerCase().includes(kw) ||
      s.sourceUrl.toLowerCase().includes(kw),
  )
}

async function onToggle(s: RssSource, enabled: boolean) {
  try {
    await store.toggle(s.sourceUrl, enabled)
  } catch (e) {
    snackbar.value = (e as Error).message
  }
}

function openAdd() {
  addForm.value = { sourceName: '', sourceUrl: '', sourceGroup: '' }
  addOpen.value = true
}

async function confirmAdd() {
  if (!addForm.value.sourceName.trim() || !addForm.value.sourceUrl.trim()) {
    snackbar.value = '名称与地址不能为空'
    return
  }
  adding.value = true
  try {
    await saveRssSource({
      sourceUrl: addForm.value.sourceUrl.trim(),
      sourceName: addForm.value.sourceName.trim(),
      sourceGroup: addForm.value.sourceGroup.trim() || null,
      sourceIcon: '',
      enabled: true,
      lastUpdateTime: Date.now(),
      customOrder: 0,
    })
    snackbar.value = '已添加订阅源'
    addOpen.value = false
    await store.load(true)
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    adding.value = false
  }
}

function openDebug(s: RssSource) {
  debugTag.value = s.sourceUrl
  debugOpen.value = true
}

async function confirmDelete() {
  if (!confirming.value) return
  try {
    await store.remove(confirming.value)
    snackbar.value = `已删除订阅源：${confirming.value.sourceName}`
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    confirming.value = null
  }
}
</script>

<template>
  <div class="view-wrap rss-view">
    <div class="view-head">
      <div class="view-head__titles">
        <h2 class="view-head__title">订阅源管理</h2>
        <p class="view-head__sub">
          已启用 <span class="mono">{{ enabledCount }}</span> / {{ sources.length }} 个订阅源
        </p>
      </div>
      <div class="head-actions">
        <button type="button" class="micl-button-text-m" :disabled="loading" @click="store.load(true)">
          <i class="mdi mdi-refresh micl-button__icon" aria-hidden="true" />
          刷新
        </button>
        <button type="button" class="micl-button-filled-m" @click="openAdd">
          <i class="mdi mdi-plus micl-button__icon" aria-hidden="true" />
          新增订阅源
        </button>
      </div>
    </div>

    <div class="micl-textfield-outlined filter-field">
      <label for="rss-filter">筛选订阅源</label>
      <input id="rss-filter" type="search" v-model="keyword" placeholder="名称 / 分组 / 地址" />
    </div>

    <div v-if="loading && sources.length === 0" class="empty-state">
      <progress class="micl-circular-progress" aria-label="正在加载订阅源" />
    </div>

    <div v-else-if="error && sources.length === 0" class="empty-state">
      <i class="mdi mdi-server-off-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__hint">{{ error }}</span>
      <button type="button" class="micl-button-tonal-m" @click="store.load(true)">重试</button>
    </div>

    <div v-else-if="sources.length === 0" class="empty-state">
      <i class="mdi mdi-rss empty-state__icon" aria-hidden="true" />
      <span class="empty-state__hint">还没有订阅源</span>
    </div>

    <div v-else class="card-list">
      <div
        v-for="s in filtered()"
        :key="s.sourceUrl"
        class="micl-card-filled card-row"
      >
        <i
          :class="s.enabled ? 'mdi mdi-rss' : 'mdi mdi-rss-off'"
          :style="s.enabled ? 'color: var(--md-sys-color-primary)' : ''"
          style="font-size: 24px"
          aria-hidden="true"
        />
        <div class="card-row__main">
          <div class="card-row__title text-truncate">
            {{ s.sourceName }}
          </div>
          <div class="card-row__sub mono text-truncate">
            {{ s.sourceUrl }}
            <template v-if="s.sourceGroup"> · {{ s.sourceGroup }}</template>
          </div>
        </div>
        <div class="card-row__actions">
          <button
            type="button"
            class="micl-iconbutton-standard-xs"
            :aria-label="`调试 ${s.sourceName}`"
            @click="openDebug(s)"
          >
            <i class="mdi mdi-bug-outline" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="micl-iconbutton-standard-xs"
            :aria-label="`删除 ${s.sourceName}`"
            @click="confirming = s"
          >
            <i class="mdi mdi-delete-outline" aria-hidden="true" />
          </button>
          <input
            type="checkbox"
            class="micl-switch"
            role="switch"
            :id="`rss-sw-${s.sourceUrl}`"
            :checked="s.enabled"
            :aria-label="`${s.enabled ? '停用' : '启用'} ${s.sourceName}`"
            @change="onToggle(s, !!($event.target as HTMLInputElement).checked)"
          />
        </div>
      </div>
    </div>

    <AppDialog :open="addOpen" title="新增订阅源" @update:open="addOpen = $event">
      <div class="form-stack">
        <div class="micl-textfield-filled">
          <label for="rss-name">名称</label>
          <input id="rss-name" type="text" v-model="addForm.sourceName" />
        </div>
        <div class="micl-textfield-filled">
          <label for="rss-url">地址</label>
          <input id="rss-url" type="url" class="mono" v-model="addForm.sourceUrl" placeholder="https://example.com/feed.xml" />
        </div>
        <div class="micl-textfield-filled">
          <label for="rss-group">分组（可选）</label>
          <input id="rss-group" type="text" v-model="addForm.sourceGroup" />
        </div>
      </div>
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="addOpen = false">取消</button>
        <button type="button" class="micl-button-filled-m" :disabled="adding" @click="confirmAdd">
          保存
        </button>
      </template>
    </AppDialog>

    <AppDialog
      :open="!!confirming"
      :title="'删除订阅源'"
      :supporting="`确定删除订阅源「${confirming?.sourceName ?? ''}」吗？`"
      @update:open="confirming = $event ? confirming : null"
    >
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="confirming = null">取消</button>
        <button type="button" class="micl-button-text-m" @click="confirmDelete">删除</button>
      </template>
    </AppDialog>

    <DebugSheet
      v-model="debugOpen"
      title="订阅源调试"
      path="/rssSourceDebug"
      :tag="debugTag"
    />

    <AppSnackbar :open="!!snackbar" @update:open="snackbar = ''">
      {{ snackbar }}
    </AppSnackbar>
  </div>
</template>

<style scoped>
.filter-field {
  margin: 0;
}
</style>
