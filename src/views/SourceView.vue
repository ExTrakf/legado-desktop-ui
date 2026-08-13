<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSourceStore } from '@/stores/source'
import { saveBookSource } from '@/api/sources'
import { addLocalBook, importJsSource } from '@/api/imports'
import DebugSheet from '@/components/app/DebugSheet.vue'
import type { BookSource } from '@/types'

const store = useSourceStore()
const { sources, enabledCount, loading, error } = storeToRefs(store)

const keyword = ref('')
const confirming = ref<BookSource | null>(null)
const snackbar = ref('')

const addOpen = ref(false)
const addForm = ref({ bookSourceName: '', bookSourceUrl: '', bookSourceGroup: '', bookSourceComment: '' })
const adding = ref(false)

const jsOpen = ref(false)
const jsScript = ref('')
const jsUrl = ref('')
const jsImporting = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)
const localImporting = ref(false)

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
      s.bookSourceName.toLowerCase().includes(kw) ||
      (s.bookSourceGroup ?? '').toLowerCase().includes(kw) ||
      s.bookSourceUrl.toLowerCase().includes(kw),
  )
}

async function onToggle(s: BookSource, enabled: boolean) {
  try {
    await store.toggle(s.bookSourceUrl, enabled)
  } catch (e) {
    snackbar.value = (e as Error).message
  }
}

function openAdd() {
  addForm.value = { bookSourceName: '', bookSourceUrl: '', bookSourceGroup: '', bookSourceComment: '' }
  addOpen.value = true
}

async function confirmAdd() {
  if (!addForm.value.bookSourceName.trim() || !addForm.value.bookSourceUrl.trim()) {
    snackbar.value = '名称与地址不能为空'
    return
  }
  adding.value = true
  try {
    await saveBookSource({
      bookSourceUrl: addForm.value.bookSourceUrl.trim(),
      bookSourceName: addForm.value.bookSourceName.trim(),
      bookSourceGroup: addForm.value.bookSourceGroup.trim() || null,
      bookSourceComment: addForm.value.bookSourceComment.trim() || null,
      bookSourceType: 0,
      customOrder: 0,
      enabled: true,
      enabledExplore: true,
      lastUpdateTime: Date.now(),
      respondTime: 180000,
      weight: 0,
      eventListener: false,
      customButton: false,
    })
    snackbar.value = '已添加书源'
    addOpen.value = false
    await store.load(true)
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    adding.value = false
  }
}

function openJsImport() {
  jsScript.value = ''
  jsUrl.value = ''
  jsOpen.value = true
}

async function confirmJsImport() {
  if (!jsScript.value.trim()) {
    snackbar.value = '请粘贴 JS 书源脚本'
    return
  }
  jsImporting.value = true
  try {
    const src = await importJsSource(jsScript.value, jsUrl.value.trim() || undefined)
    snackbar.value = `已导入书源：${src.bookSourceName}`
    jsOpen.value = false
    await store.load(true)
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    jsImporting.value = false
  }
}

function pickLocalBook() {
  fileInput.value?.click()
}

async function onLocalFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  localImporting.value = true
  try {
    await addLocalBook(file.name, file)
    snackbar.value = `已导入本地书籍：${file.name}`
  } catch (err) {
    snackbar.value = (err as Error).message
  } finally {
    localImporting.value = false
    input.value = ''
  }
}

function openDebug(s: BookSource) {
  debugTag.value = s.bookSourceUrl
  debugOpen.value = true
}

async function confirmDelete() {
  if (!confirming.value) return
  try {
    await store.remove(confirming.value)
    snackbar.value = `已删除书源：${confirming.value.bookSourceName}`
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    confirming.value = null
  }
}
</script>

<template>
  <div class="source-view">
    <div class="source-view__head">
      <div>
        <h2 class="m3-headline-small source-view__title">书源管理</h2>
        <p class="source-view__subtitle">
          已启用 <span class="m3-mono">{{ enabledCount }}</span> / {{ sources.length }} 个书源
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
      <v-btn variant="tonal" prepend-icon="mdi-import" class="m3-interactive" @click="openJsImport">
        导入 JS 源
      </v-btn>
      <v-btn
        variant="tonal"
        prepend-icon="mdi-file-plus-outline"
        :loading="localImporting"
        class="m3-interactive"
        @click="pickLocalBook"
      >
        导入本地书
      </v-btn>
      <v-btn
        variant="flat"
        color="primary"
        prepend-icon="mdi-plus"
        class="m3-interactive"
        @click="openAdd"
      >
        新增书源
      </v-btn>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".txt,.epub"
      hidden
      @change="onLocalFile"
    />

    <v-text-field
      v-model="keyword"
      prepend-inner-icon="mdi-magnify"
      placeholder="筛选书源"
      variant="outlined"
      density="compact"
      hide-details
      class="source-view__search"
    />

    <div v-if="loading && sources.length === 0" class="source-view__state">
      <v-progress-circular indeterminate color="primary" size="36" />
    </div>

    <div v-else-if="error && sources.length === 0" class="source-view__state">
      <v-icon icon="mdi-server-off-outline" size="40" color="error" />
      <span>{{ error }}</span>
      <v-btn variant="tonal" @click="store.load(true)">重试</v-btn>
    </div>

    <div v-else-if="sources.length === 0" class="source-view__state">
      <v-icon icon="mdi-source-branch-off-outline" size="40" color="on-surface-variant" />
      <span>还没有书源</span>
    </div>

    <div v-else class="source-view__list">
      <v-card
        v-for="s in filtered()"
        :key="s.bookSourceUrl"
        class="source-view__item"
        rounded="lg"
      >
        <v-card-item>
          <template #prepend>
            <v-icon
              :icon="s.enabled ? 'mdi-source-branch' : 'mdi-source-branch-off-outline'"
              :color="s.enabled ? 'primary' : 'on-surface-variant'"
              size="28"
            />
          </template>
          <v-card-title class="text-truncate">{{ s.bookSourceName }}</v-card-title>
          <v-card-subtitle class="text-truncate m3-mono">
            {{ s.bookSourceUrl }}
            <template v-if="s.bookSourceGroup"> · {{ s.bookSourceGroup }}</template>
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-bug-outline"
              variant="text"
              :aria-label="`调试 ${s.bookSourceName}`"
              @click="openDebug(s)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              :aria-label="`删除 ${s.bookSourceName}`"
              @click="confirming = s"
            />
            <v-switch
              :model-value="s.enabled"
              color="primary"
              hide-details
              :aria-label="`${s.enabled ? '停用' : '启用'} ${s.bookSourceName}`"
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
        <v-card-title class="m3-title-medium">新增书源</v-card-title>
        <v-card-text class="source-view__form">
          <v-text-field
            v-model="addForm.bookSourceName"
            label="名称"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-text-field
            v-model="addForm.bookSourceUrl"
            label="地址"
            placeholder="https://example.com"
            variant="outlined"
            density="comfortable"
            hide-details
            class="m3-mono"
          />
          <v-text-field
            v-model="addForm.bookSourceGroup"
            label="分组（可选）"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-textarea
            v-model="addForm.bookSourceComment"
            label="注释（可选）"
            variant="outlined"
            density="comfortable"
            hide-details
            rows="2"
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
      :model-value="jsOpen"
      max-width="640"
      persistent
      scrollable
      @update:model-value="jsOpen = $event"
    >
      <v-card rounded="xl">
        <v-card-title class="m3-title-medium">导入 JS 书源</v-card-title>
        <v-card-text class="source-view__form">
          <v-textarea
            v-model="jsScript"
            label="JS 书源脚本（text/plain）"
            variant="outlined"
            density="comfortable"
            hide-details
            rows="10"
            class="m3-mono"
          />
          <v-text-field
            v-model="jsUrl"
            label="打开源地址（可选）"
            placeholder="留空表示新建"
            variant="outlined"
            density="comfortable"
            hide-details
            class="m3-mono"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="jsOpen = false">取消</v-btn>
          <v-btn color="primary" variant="tonal" :loading="jsImporting" @click="confirmJsImport">
            导入
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
        <v-card-title class="m3-title-medium">删除书源</v-card-title>
        <v-card-text>确定删除书源「{{ confirming?.bookSourceName }}」吗？</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirming = null">取消</v-btn>
          <v-btn color="error" variant="tonal" @click="confirmDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <DebugSheet
      v-model="debugOpen"
      title="书源调试"
      path="/bookSourceDebug"
      :tag="debugTag"
      key-hint="搜索词或书籍地址"
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
.source-view {
  max-width: 820px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 32px) 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.source-view__head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.source-view__title {
  color: var(--md-sys-color-on-surface);
}

.source-view__subtitle {
  margin: 4px 0 0;
  font-size: var(--md-sys-typescale-body-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.source-view__search {
  max-width: 360px;
}

.source-view__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 0;
  color: var(--md-sys-color-on-surface-variant);
}

.source-view__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-view__item {
  background: var(--md-sys-color-surface-container-low);
}

.source-view__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
