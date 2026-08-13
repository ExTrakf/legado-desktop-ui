<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { clearCookies, getCookies, setCookie, type CookiePair } from '@/api/cookies'
import AppDialog from '@/components/app/AppDialog.vue'
import AppSnackbar from '@/components/app/AppSnackbar.vue'

const cookies = ref<CookiePair[]>([])
const loading = ref(false)
const error = ref('')
const snackbar = ref('')

const editOpen = ref(false)
const editUrl = ref('')
const editCookie = ref('')
const editingIndex = ref(-1)
const saving = ref(false)

const clearingAll = ref(false)

onMounted(() => {
  void load()
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    cookies.value = await getCookies()
  } catch (e) {
    error.value = (e as Error).message
    if ((e as Error).message.includes('令牌')) snackbar.value = '请先在设置中配置令牌'
  } finally {
    loading.value = false
  }
}

function openNew() {
  editingIndex.value = -1
  editUrl.value = ''
  editCookie.value = ''
  editOpen.value = true
}

function openEdit(i: number) {
  editingIndex.value = i
  editUrl.value = cookies.value[i].url
  editCookie.value = cookies.value[i].cookie
  editOpen.value = true
}

async function confirmSave() {
  if (!editUrl.value.trim()) {
    snackbar.value = '地址不能为空'
    return
  }
  saving.value = true
  try {
    await setCookie(editUrl.value.trim(), editCookie.value)
    snackbar.value = 'Cookie 已保存'
    editOpen.value = false
    await load()
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

async function removeOne(c: CookiePair) {
  try {
    await clearCookies(c.url)
    cookies.value = cookies.value.filter((x) => x.url !== c.url)
    snackbar.value = `已清除 ${c.url} 的 Cookie`
  } catch (e) {
    snackbar.value = (e as Error).message
  }
}

async function clearAll() {
  clearingAll.value = true
  try {
    await clearCookies('')
    cookies.value = []
    snackbar.value = '已清空全部 Cookie'
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    clearingAll.value = false
  }
}
</script>

<template>
  <div class="view-wrap cookie-view">
    <div class="view-head">
      <div class="view-head__titles">
        <h2 class="view-head__title">Cookie 管理</h2>
        <p class="view-head__sub">
          共 <span class="mono">{{ cookies.length }}</span> 条持久化 Cookie
        </p>
      </div>
      <div class="head-actions">
        <button type="button" class="micl-button-text-m" :disabled="loading" @click="load">
          <i class="mdi mdi-refresh micl-button__icon" aria-hidden="true" />
          刷新
        </button>
        <button type="button" class="micl-button-filled-m" @click="openNew">
          <i class="mdi mdi-plus micl-button__icon" aria-hidden="true" />
          新增 / 更新
        </button>
        <button
          type="button"
          class="micl-button-text-m"
          :disabled="cookies.length === 0 || clearingAll"
          @click="clearAll"
        >
          <i class="mdi mdi-cookie-off-outline micl-button__icon" aria-hidden="true" />
          清空全部
        </button>
      </div>
    </div>

    <div v-if="loading && cookies.length === 0" class="empty-state">
      <progress class="micl-circular-progress" aria-label="正在加载 Cookie" />
    </div>

    <div v-else-if="error && cookies.length === 0" class="empty-state">
      <i class="mdi mdi-server-off-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__hint">{{ error }}</span>
      <button type="button" class="micl-button-tonal-m" @click="load">重试</button>
    </div>

    <div v-else-if="cookies.length === 0" class="empty-state">
      <i class="mdi mdi-cookie-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__hint">还没有 Cookie</span>
    </div>

    <div v-else class="card-list">
      <div v-for="(c, i) in cookies" :key="c.url" class="micl-card-filled card-row">
        <i class="mdi mdi-cookie" style="font-size: 28px; color: var(--md-sys-color-primary)" aria-hidden="true" />
        <div class="card-row__main">
          <div class="card-row__title mono text-truncate">{{ c.url }}</div>
          <div class="card-row__sub mono text-truncate">{{ c.cookie }}</div>
        </div>
        <div class="card-row__actions">
          <button
            type="button"
            class="micl-iconbutton-standard-s"
            :aria-label="`编辑 ${c.url}`"
            @click="openEdit(i)"
          >
            <i class="mdi mdi-pencil-outline" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="micl-iconbutton-standard-s"
            :aria-label="`清除 ${c.url}`"
            @click="removeOne(c)"
          >
            <i class="mdi mdi-delete-outline" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <AppDialog
      :open="editOpen"
      :title="editingIndex >= 0 ? '更新 Cookie' : '新增 Cookie'"
      @update:open="editOpen = $event"
    >
      <div class="form-stack">
        <div class="micl-textfield-filled">
          <label for="cookie-url">站点地址</label>
          <input id="cookie-url" type="url" class="mono" v-model="editUrl" placeholder="https://example.com" />
        </div>
        <div class="micl-textfield-filled">
          <label for="cookie-value">Cookie 串</label>
          <textarea id="cookie-value" class="mono" rows="3" v-model="editCookie" placeholder="k=v; k2=v2" />
        </div>
        <p class="field-hint">Cookie 需为完整的 "k=v; k2=v2" 格式。</p>
      </div>
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="editOpen = false">取消</button>
        <button type="button" class="micl-button-filled-m" :disabled="saving" @click="confirmSave">
          保存
        </button>
      </template>
    </AppDialog>

    <AppSnackbar :open="!!snackbar" @update:open="snackbar = ''">
      {{ snackbar }}
    </AppSnackbar>
  </div>
</template>

<style scoped>
.cookie-view {
  max-width: 820px;
}
</style>
