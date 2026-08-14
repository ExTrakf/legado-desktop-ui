<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSourceStore } from '@/stores/source'
import { saveBookSource } from '@/api/sources'
import { addLocalBook, importJsSource } from '@/api/imports'
import AppDialog from '@/components/app/AppDialog.vue'
import AppSnackbar from '@/components/app/AppSnackbar.vue'
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
  <div class="view-wrap source-view">
    <div class="view-head">
      <div class="view-head__titles">
        <h2 class="view-head__title">书源管理</h2>
        <p class="view-head__sub">
          已启用 <span class="mono">{{ enabledCount }}</span> / {{ sources.length }} 个书源
        </p>
      </div>
      <div class="head-actions">
        <button type="button" class="micl-button-text-m" :disabled="loading" @click="store.load(true)">
          <i class="mdi mdi-refresh micl-button__icon" aria-hidden="true" />
          刷新
        </button>
        <button type="button" class="micl-button-text-m" @click="openJsImport">
          <i class="mdi mdi-import micl-button__icon" aria-hidden="true" />
          导入 JS 源
        </button>
        <button
          type="button"
          class="micl-button-text-m"
          :disabled="localImporting"
          @click="pickLocalBook"
        >
          <i class="mdi mdi-file-plus-outline micl-button__icon" aria-hidden="true" />
          导入本地书
        </button>
        <button type="button" class="micl-button-filled-m" @click="openAdd">
          <i class="mdi mdi-plus micl-button__icon" aria-hidden="true" />
          新增书源
        </button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".txt,.epub"
      hidden
      @change="onLocalFile"
    />

    <div class="micl-textfield-outlined filter-field">
      <label for="source-filter">筛选书源</label>
      <input id="source-filter" type="search" v-model="keyword" placeholder="名称 / 分组 / 地址" />
    </div>

    <div v-if="loading && sources.length === 0" class="empty-state">
      <progress class="micl-circular-progress" aria-label="正在加载书源" />
    </div>

    <div v-else-if="error && sources.length === 0" class="empty-state">
      <i class="mdi mdi-server-off-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__hint">{{ error }}</span>
      <button type="button" class="micl-button-tonal-m" @click="store.load(true)">重试</button>
    </div>

    <div v-else-if="sources.length === 0" class="empty-state">
      <i class="mdi mdi-source-branch-off-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__hint">还没有书源</span>
    </div>

    <div v-else class="card-list">
      <div
        v-for="s in filtered()"
        :key="s.bookSourceUrl"
        class="micl-card-filled card-row"
      >
        <i
          :class="s.enabled ? 'mdi mdi-source-branch' : 'mdi mdi-source-branch-off-outline'"
          :style="s.enabled ? 'color: var(--md-sys-color-primary)' : ''"
          style="font-size: 24px"
          aria-hidden="true"
        />
        <div class="card-row__main">
          <div class="card-row__title text-truncate">
            {{ s.bookSourceName }}
          </div>
          <div class="card-row__sub mono text-truncate">
            {{ s.bookSourceUrl }}
            <template v-if="s.bookSourceGroup"> · {{ s.bookSourceGroup }}</template>
          </div>
        </div>
        <div class="card-row__actions">
          <button
            type="button"
            class="micl-iconbutton-standard-xs"
            :aria-label="`调试 ${s.bookSourceName}`"
            @click="openDebug(s)"
          >
            <i class="mdi mdi-bug-outline" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="micl-iconbutton-standard-xs"
            :aria-label="`删除 ${s.bookSourceName}`"
            @click="confirming = s"
          >
            <i class="mdi mdi-delete-outline" aria-hidden="true" />
          </button>
          <input
            type="checkbox"
            class="micl-switch"
            role="switch"
            :id="`src-sw-${s.bookSourceUrl}`"
            :checked="s.enabled"
            :aria-label="`${s.enabled ? '停用' : '启用'} ${s.bookSourceName}`"
            @change="onToggle(s, !!($event.target as HTMLInputElement).checked)"
          />
        </div>
      </div>
    </div>

    <AppDialog :open="addOpen" title="新增书源" @update:open="addOpen = $event">
      <div class="form-stack">
        <div class="micl-textfield-filled">
          <label for="src-name">名称</label>
          <input id="src-name" type="text" v-model="addForm.bookSourceName" />
        </div>
        <div class="micl-textfield-filled">
          <label for="src-url">地址</label>
          <input id="src-url" type="url" class="mono" v-model="addForm.bookSourceUrl" placeholder="https://example.com" />
        </div>
        <div class="micl-textfield-filled">
          <label for="src-group">分组（可选）</label>
          <input id="src-group" type="text" v-model="addForm.bookSourceGroup" />
        </div>
        <div class="micl-textfield-filled">
          <label for="src-comment">注释（可选）</label>
          <textarea id="src-comment" rows="2" v-model="addForm.bookSourceComment" />
        </div>
      </div>
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="addOpen = false">取消</button>
        <button type="button" class="micl-button-filled-m" :disabled="adding" @click="confirmAdd">
          保存
        </button>
      </template>
    </AppDialog>

    <AppDialog :open="jsOpen" title="导入 JS 书源" @update:open="jsOpen = $event">
      <div class="form-stack">
        <div class="micl-textfield-filled">
          <label for="js-script">JS 书源脚本（text/plain）</label>
          <textarea id="js-script" class="mono" rows="10" v-model="jsScript" />
        </div>
        <div class="micl-textfield-filled">
          <label for="js-url">打开源地址（可选）</label>
          <input id="js-url" type="text" class="mono" v-model="jsUrl" placeholder="留空表示新建" />
        </div>
      </div>
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="jsOpen = false">取消</button>
        <button type="button" class="micl-button-filled-m" :disabled="jsImporting" @click="confirmJsImport">
          导入
        </button>
      </template>
    </AppDialog>

    <AppDialog
      :open="!!confirming"
      :title="'删除书源'"
      :supporting="`确定删除书源「${confirming?.bookSourceName ?? ''}」吗？`"
      @update:open="confirming = $event ? confirming : null"
    >
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="confirming = null">取消</button>
        <button type="button" class="micl-button-text-m" @click="confirmDelete">删除</button>
      </template>
    </AppDialog>

    <DebugSheet
      v-model="debugOpen"
      title="书源调试"
      path="/bookSourceDebug"
      :tag="debugTag"
      key-hint="搜索词或书籍地址"
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
