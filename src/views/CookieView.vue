<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { clearCookies, getCookies, setCookie, type CookiePair } from '@/api/cookies'

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
  <div class="cookie-view">
    <div class="cookie-view__head">
      <div>
        <h2 class="m3-headline-small cookie-view__title">Cookie 管理</h2>
        <p class="cookie-view__subtitle">
          共 <span class="m3-mono">{{ cookies.length }}</span> 条持久化 Cookie
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
      <v-btn
        variant="flat"
        color="primary"
        prepend-icon="mdi-plus"
        class="m3-interactive"
        @click="openNew"
      >
        新增 / 更新
      </v-btn>
      <v-btn
        variant="tonal"
        color="error"
        prepend-icon="mdi-cookie-off-outline"
        :loading="clearingAll"
        :disabled="cookies.length === 0"
        @click="clearAll"
      >
        清空全部
      </v-btn>
    </div>

    <div v-if="loading && cookies.length === 0" class="cookie-view__state">
      <v-progress-circular indeterminate color="primary" size="36" />
    </div>

    <div v-else-if="error && cookies.length === 0" class="cookie-view__state">
      <v-icon icon="mdi-server-off-outline" size="40" color="error" />
      <span>{{ error }}</span>
      <v-btn variant="tonal" @click="load">重试</v-btn>
    </div>

    <div v-else-if="cookies.length === 0" class="cookie-view__state">
      <v-icon icon="mdi-cookie-outline" size="40" color="on-surface-variant" />
      <span>还没有 Cookie</span>
    </div>

    <div v-else class="cookie-view__list">
      <v-card
        v-for="(c, i) in cookies"
        :key="c.url"
        class="cookie-view__item"
        rounded="lg"
      >
        <v-card-item>
          <template #prepend>
            <v-icon icon="mdi-cookie" color="primary" size="28" />
          </template>
          <v-card-title class="cookie-view__url m3-mono text-truncate">{{ c.url }}</v-card-title>
          <v-card-subtitle class="cookie-view__cookie m3-mono text-truncate">
            {{ c.cookie }}
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              :aria-label="`编辑 ${c.url}`"
              @click="openEdit(i)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              :aria-label="`清除 ${c.url}`"
              @click="removeOne(c)"
            />
          </template>
        </v-card-item>
      </v-card>
    </div>

    <v-dialog
      :model-value="editOpen"
      max-width="560"
      persistent
      @update:model-value="editOpen = $event"
    >
      <v-card rounded="xl">
        <v-card-title class="m3-title-medium">
          {{ editingIndex >= 0 ? '更新 Cookie' : '新增 Cookie' }}
        </v-card-title>
        <v-card-text class="cookie-view__form">
          <v-text-field
            v-model="editUrl"
            label="站点地址"
            placeholder="https://example.com"
            variant="outlined"
            density="comfortable"
            hide-details
            class="m3-mono"
          />
          <v-textarea
            v-model="editCookie"
            label="Cookie 串"
            placeholder="k=v; k2=v2"
            variant="outlined"
            density="comfortable"
            hide-details
            rows="3"
            class="m3-mono"
          />
          <p class="cookie-view__hint">Cookie 需为完整的 "k=v; k2=v2" 格式。</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="editOpen = false">取消</v-btn>
          <v-btn color="primary" variant="tonal" :loading="saving" @click="confirmSave">
            保存
          </v-btn>
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
.cookie-view {
  max-width: 820px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 32px) 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cookie-view__head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cookie-view__title {
  color: var(--md-sys-color-on-surface);
}

.cookie-view__subtitle {
  margin: 4px 0 0;
  font-size: var(--md-sys-typescale-body-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.cookie-view__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 0;
  color: var(--md-sys-color-on-surface-variant);
}

.cookie-view__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cookie-view__item {
  background: var(--md-sys-color-surface-container-low);
}

.cookie-view__url {
  font-size: var(--md-sys-typescale-body-medium-size);
}

.cookie-view__cookie {
  font-size: var(--md-sys-typescale-label-medium-size);
}

.cookie-view__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cookie-view__hint {
  margin: 0;
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-on-surface-variant);
}
</style>
