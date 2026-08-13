<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRssStore } from '@/stores/rss'
import { saveRssSource } from '@/api/rss'
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
  <div class="rss-view">
    <div class="rss-view__head">
      <div>
        <h2 class="m3-headline-small rss-view__title">订阅源管理</h2>
        <p class="rss-view__subtitle">
          已启用 <span class="m3-mono">{{ enabledCount }}</span> / {{ sources.length }} 个订阅源
        </p>
      </div>
      <v-spacer />
      <v-btn
        variant="tonal"
        prepend-icon="mdi-refresh"
        :loading="loading"
        class="m3-interactive"
        @click="store.load(true)"
      >
        刷新
      </v-btn>
      <v-btn
        variant="flat"
        color="primary"
        prepend-icon="mdi-plus"
        class="m3-interactive"
        @click="openAdd"
      >
        新增订阅源
      </v-btn>
    </div>

    <v-text-field
      v-model="keyword"
      prepend-inner-icon="mdi-magnify"
      placeholder="筛选订阅源"
      variant="outlined"
      density="compact"
      hide-details
      class="rss-view__search"
    />

    <div v-if="loading && sources.length === 0" class="rss-view__state">
      <v-progress-circular indeterminate color="primary" size="36" />
    </div>

    <div v-else-if="error && sources.length === 0" class="rss-view__state">
      <v-icon icon="mdi-server-off-outline" size="40" color="error" />
      <span>{{ error }}</span>
      <v-btn variant="tonal" @click="store.load(true)">重试</v-btn>
    </div>

    <div v-else-if="sources.length === 0" class="rss-view__state">
      <v-icon icon="mdi-rss" size="40" color="on-surface-variant" />
      <span>还没有订阅源</span>
    </div>

    <div v-else class="rss-view__list">
      <v-card
        v-for="s in filtered()"
        :key="s.sourceUrl"
        class="rss-view__item"
        rounded="lg"
      >
        <v-card-item>
          <template #prepend>
            <v-icon
              :icon="s.enabled ? 'mdi-rss' : 'mdi-rss-off'"
              :color="s.enabled ? 'primary' : 'on-surface-variant'"
              size="28"
            />
          </template>
          <v-card-title class="text-truncate">{{ s.sourceName }}</v-card-title>
          <v-card-subtitle class="text-truncate m3-mono">
            {{ s.sourceUrl }}
            <template v-if="s.sourceGroup"> · {{ s.sourceGroup }}</template>
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-bug-outline"
              variant="text"
              :aria-label="`调试 ${s.sourceName}`"
              @click="openDebug(s)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              :aria-label="`删除 ${s.sourceName}`"
              @click="confirming = s"
            />
            <v-switch
              :model-value="s.enabled"
              color="primary"
              hide-details
              :aria-label="`${s.enabled ? '停用' : '启用'} ${s.sourceName}`"
              @update:model-value="onToggle(s, !!$event)"
            />
          </template>
        </v-card-item>
      </v-card>
    </div>

    <v-dialog
      :model-value="addOpen"
      max-width="480"
      persistent
      @update:model-value="addOpen = $event"
    >
      <v-card rounded="xl">
        <v-card-title class="m3-title-medium">新增订阅源</v-card-title>
        <v-card-text class="rss-view__add">
          <v-text-field
            v-model="addForm.sourceName"
            label="名称"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-text-field
            v-model="addForm.sourceUrl"
            label="地址"
            placeholder="https://example.com/feed.xml"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-text-field
            v-model="addForm.sourceGroup"
            label="分组（可选）"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addOpen = false">取消</v-btn>
          <v-btn color="primary" variant="tonal" :loading="adding" @click="confirmAdd">
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="!!confirming"
      max-width="420"
      persistent
      @update:model-value="confirming = $event ? confirming : null"
    >
      <v-card rounded="xl">
        <v-card-title class="m3-title-medium">删除订阅源</v-card-title>
        <v-card-text>确定删除订阅源「{{ confirming?.sourceName }}」吗？</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirming = null">取消</v-btn>
          <v-btn color="error" variant="tonal" @click="confirmDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <DebugSheet
      v-model="debugOpen"
      title="订阅源调试"
      path="/rssSourceDebug"
      :tag="debugTag"
    />

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
.rss-view {
  max-width: 820px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 32px) 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rss-view__head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.rss-view__title {
  color: var(--md-sys-color-on-surface);
}

.rss-view__subtitle {
  margin: 4px 0 0;
  font-size: var(--md-sys-typescale-body-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.rss-view__search {
  max-width: 360px;
}

.rss-view__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 0;
  color: var(--md-sys-color-on-surface-variant);
}

.rss-view__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rss-view__item {
  background: var(--md-sys-color-surface-container-low);
}

.rss-view__add {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
