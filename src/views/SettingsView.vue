<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'
import { useThemeControl } from '@/composables/useTheme'
import { useReaderStore } from '@/stores/reader'
import { useAuthStore } from '@/stores/auth'
import { cacheBookStop, getReadConfig, restoreDefaultData, saveReadConfig } from '@/api/system'
import AppDialog from '@/components/app/AppDialog.vue'
import AppSnackbar from '@/components/app/AppSnackbar.vue'
import type { ReaderSettings } from '@/types'

const themeStore = useThemeStore()
const { name } = storeToRefs(themeStore)
const { setTheme } = useThemeControl()
const reader = useReaderStore()
const auth = useAuthStore()
const { tokenRequired, backendOnline, healthChecked, token } = storeToRefs(auth)

const tokenInput = ref(auth.token)
const applying = ref(false)
const snackbar = ref('')

const restoreOpen = ref(false)
const restoreTypes = ref<string[]>([])
const restoring = ref(false)
const restoringAll = ref(false)

const syncing = ref(false)
const syncDirection = ref<'save' | 'load'>('save')

const cacheStopping = ref(false)

onMounted(() => {
  void auth.checkBackend()
})

const restoreOptions = [
  { value: 'txtTocRule', label: 'TXT 目录规则' },
  { value: 'dictRule', label: '词典规则' },
  { value: 'rssSource', label: '订阅源' },
  { value: 'httpTTS', label: 'HTTP 朗读' },
]

function openRestore() {
  restoreTypes.value = []
  restoreOpen.value = true
}

function toggleRestoreType(value: string, checked: boolean) {
  restoreTypes.value = checked
    ? [...new Set([...restoreTypes.value, value])]
    : restoreTypes.value.filter((t) => t !== value)
}

async function confirmRestore() {
  const all = restoreTypes.value.length === 0
  if (all) restoringAll.value = true
  else restoring.value = true
  try {
    const types = all ? undefined : restoreTypes.value
    await restoreDefaultData(types)
    snackbar.value = all ? '已恢复全部默认数据' : '已恢复所选默认数据'
    restoreOpen.value = false
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    restoringAll.value = false
    restoring.value = false
  }
}

async function syncReaderConfig(direction: 'save' | 'load') {
  syncDirection.value = direction
  syncing.value = true
  try {
    if (direction === 'save') {
      const config: { version: number } & ReaderSettings = { version: 1, ...reader.settings }
      await saveReadConfig(config)
      snackbar.value = '阅读配置已保存到后端'
    } else {
      const cfg = (await getReadConfig()) as (Partial<ReaderSettings> & { version?: number }) | null
      if (!cfg) {
        snackbar.value = '后端还没有已保存的阅读配置'
        return
      }
      const patch: Partial<ReaderSettings> = {}
      if (typeof cfg.fontSizeRem === 'number') patch.fontSizeRem = cfg.fontSizeRem
      if (typeof cfg.lineHeight === 'number') patch.lineHeight = cfg.lineHeight
      if (cfg.surface === 'paper' || cfg.surface === 'green' || cfg.surface === 'ink') patch.surface = cfg.surface
      if (cfg.font === 'serif' || cfg.font === 'sans') patch.font = cfg.font
      if (Object.keys(patch).length === 0) {
        snackbar.value = '后端配置不是有效的阅读设置'
        return
      }
      reader.updateSettings(patch)
      snackbar.value = '已从后端恢复阅读配置'
    }
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    syncing.value = false
  }
}

async function stopCache() {
  cacheStopping.value = true
  try {
    await cacheBookStop()
    snackbar.value = '已停止缓存任务'
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    cacheStopping.value = false
  }
}

async function applyToken() {
  applying.value = true
  try {
    await auth.applyToken(tokenInput.value.trim())
    snackbar.value = '令牌已下发到后端并保存'
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    applying.value = false
  }
}

async function clearToken() {
  tokenInput.value = ''
  try {
    await auth.clear()
    snackbar.value = '令牌已清除'
  } catch (e) {
    snackbar.value = (e as Error).message
  }
}

const surfaces = [
  { value: 'paper', label: '浅色青白' },
  { value: 'green', label: '护眼绿' },
  { value: 'ink', label: '夜间黑' },
] as const
</script>

<template>
  <div class="view-wrap settings-view">
    <h2 class="view-head__title">设置</h2>

    <div class="micl-card-filled settings-card">
      <div class="settings-card__row">
        <i
          class="mdi mdi-laptop settings-card__icon"
          :style="backendOnline ? 'color: var(--md-sys-color-primary)' : 'color: var(--md-sys-color-error)'"
          aria-hidden="true"
        />
        <div class="settings-card__main">
          <div class="settings-card__title">后端连接</div>
          <div class="settings-card__sub mono">127.0.0.1:2323</div>
        </div>
        <span class="settings-card__chip" :class="backendOnline ? 'settings-card__chip--ok' : 'settings-card__chip--bad'">
          {{ healthChecked ? (backendOnline ? '在线' : '离线') : '检测中…' }}
        </span>
      </div>
      <p v-if="!backendOnline && healthChecked" class="settings-card__hint">
        无法连接后端，请先启动 legado-desktop 后端服务。
      </p>
    </div>

    <div class="micl-card-filled settings-card">
      <div class="settings-card__row">
        <i class="mdi mdi-shield-lock-outline settings-card__icon" aria-hidden="true" />
        <div class="settings-card__main">
          <div class="settings-card__title">Web 书源令牌</div>
          <div class="settings-card__sub">
            书源写入/搜索等接口的访问令牌
            <template v-if="healthChecked">（{{ tokenRequired ? '当前必填' : '当前无需令牌' }}）</template>
          </div>
        </div>
      </div>
      <div class="settings-card__body">
        <div class="micl-textfield-filled settings-token__field">
          <label for="token-input">令牌</label>
          <input
            id="token-input"
            type="password"
            v-model="tokenInput"
            placeholder="留空表示清除"
            autocomplete="off"
          />
        </div>
        <div class="settings-token__actions">
          <button
            type="button"
            class="micl-button-tonal-m"
            :disabled="!tokenInput.trim() || applying"
            @click="applyToken"
          >
            <i class="mdi mdi-check micl-button__icon" aria-hidden="true" />
            应用令牌
          </button>
          <button
            type="button"
            class="micl-button-text-m"
            :disabled="!token"
            @click="clearToken"
          >
            <i class="mdi mdi-delete-outline micl-button__icon" aria-hidden="true" />
            清除
          </button>
        </div>
        <p class="field-hint">应用令牌会同时写入前端本地并下发到后端（POST /setJsSourceToken）。</p>
      </div>
    </div>

    <div class="micl-card-filled settings-card">
      <div class="settings-card__row">
        <i class="mdi mdi-white-balance-sunny settings-card__icon" aria-hidden="true" />
        <div class="settings-card__main">
          <div class="settings-card__title">外观</div>
          <div class="settings-card__sub">应用整体主题</div>
        </div>
        <div class="settings-card__trailing">
          <input
            type="checkbox"
            class="micl-switch"
            role="switch"
            id="theme-switch"
            :checked="name === 'dark'"
            :aria-label="`当前${name === 'dark' ? '深色' : '浅色'}主题`"
            @change="setTheme(($event.target as HTMLInputElement).checked ? 'dark' : 'light')"
          />
        </div>
      </div>
    </div>

    <div class="micl-card-filled settings-card">
      <div class="settings-card__row">
        <i class="mdi mdi-format-color-fill settings-card__icon" aria-hidden="true" />
        <div class="settings-card__main">
          <div class="settings-card__title">阅读默认</div>
          <div class="settings-card__sub">新开书籍的阅读外观</div>
        </div>
      </div>
      <div class="settings-card__body">
        <div
          v-for="s in surfaces"
          :key="s.value"
          class="settings-radio"
          role="radio"
          :aria-checked="reader.settings.surface === s.value"
          tabindex="0"
          @click="reader.updateSettings({ surface: s.value })"
          @keydown.enter="reader.updateSettings({ surface: s.value })"
          @keydown.space.prevent="reader.updateSettings({ surface: s.value })"
        >
          <input
            type="radio"
            class="micl-radio"
            name="surface"
            :id="`surface-${s.value}`"
            :value="s.value"
            :checked="reader.settings.surface === s.value"
            :aria-label="s.label"
            @change="reader.updateSettings({ surface: ($event.target as HTMLInputElement).value as never })"
          />
          <label :for="`surface-${s.value}`">{{ s.label }}</label>
        </div>
      </div>
    </div>

    <div class="micl-card-filled settings-card">
      <div class="settings-card__row">
        <i class="mdi mdi-cloud-sync-outline settings-card__icon" aria-hidden="true" />
        <div class="settings-card__main">
          <div class="settings-card__title">阅读配置同步</div>
          <div class="settings-card__sub">把阅读外观保存到后端，或从后端恢复</div>
        </div>
      </div>
      <div class="settings-card__body settings-card__actions">
        <button
          type="button"
          class="micl-button-tonal-m"
          :disabled="syncing && syncDirection === 'save'"
          @click="syncReaderConfig('save')"
        >
          <i class="mdi mdi-cloud-upload-outline micl-button__icon" aria-hidden="true" />
          保存到后端
        </button>
        <button
          type="button"
          class="micl-button-tonal-m"
          :disabled="syncing && syncDirection === 'load'"
          @click="syncReaderConfig('load')"
        >
          <i class="mdi mdi-cloud-download-outline micl-button__icon" aria-hidden="true" />
          从后端恢复
        </button>
      </div>
    </div>

    <div class="micl-card-filled settings-card">
      <div class="settings-card__row">
        <i class="mdi mdi-database-arrow-down-outline settings-card__icon" aria-hidden="true" />
        <div class="settings-card__main">
          <div class="settings-card__title">恢复默认数据</div>
          <div class="settings-card__sub">重置 TXT 目录规则 / 词典 / 订阅源 / HTTP 朗读 为内置默认值</div>
        </div>
      </div>
      <div class="settings-card__body settings-card__actions">
        <button type="button" class="micl-button-tonal-m" @click="openRestore">
          <i class="mdi mdi-restore micl-button__icon" aria-hidden="true" />
          恢复默认
        </button>
      </div>
    </div>

    <div class="micl-card-filled settings-card">
      <div class="settings-card__row">
        <i class="mdi mdi-download-multiple-outline settings-card__icon" aria-hidden="true" />
        <div class="settings-card__main">
          <div class="settings-card__title">缓存管理</div>
          <div class="settings-card__sub">阅读器中点「缓存」图标可缓存整本书；这里可停止进行中的任务</div>
        </div>
      </div>
      <div class="settings-card__body settings-card__actions">
        <button type="button" class="micl-button-tonal-m" :disabled="cacheStopping" @click="stopCache">
          <i class="mdi mdi-stop-circle-outline micl-button__icon" aria-hidden="true" />
          停止缓存
        </button>
      </div>
    </div>

    <AppDialog
      :open="restoreOpen"
      title="恢复默认数据"
      :supporting="'不勾选任何项 = 恢复全部；否则仅恢复勾选项。此操作会覆盖现有数据。'"
      @update:open="restoreOpen = $event"
    >
      <div
        v-for="opt in restoreOptions"
        :key="opt.value"
        class="settings-check"
      >
        <input
          type="checkbox"
          class="micl-checkbox"
          :id="`restore-${opt.value}`"
          :checked="restoreTypes.includes(opt.value)"
          @change="toggleRestoreType(opt.value, !!($event.target as HTMLInputElement).checked)"
        />
        <label :for="`restore-${opt.value}`">{{ opt.label }}</label>
      </div>
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="restoreOpen = false">取消</button>
        <button
          type="button"
          class="micl-button-text-m"
          :disabled="restoring || restoringAll"
          @click="confirmRestore"
        >
          恢复
        </button>
      </template>
    </AppDialog>

    <AppSnackbar :open="!!snackbar" @update:open="snackbar = ''">
      {{ snackbar }}
    </AppSnackbar>
  </div>
</template>

<style scoped>
.settings-view {
  max-width: 720px;
}

.settings-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-card__row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.settings-card__icon {
  font-size: 28px;
  color: var(--md-sys-color-on-surface-variant);
}

.settings-card__main {
  flex: 1;
  min-width: 0;
}

.settings-card__title {
  font-family: var(--md-ref-typeface-display);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.settings-card__sub {
  margin-top: 2px;
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.settings-card__hint {
  margin: 0;
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-error);
}

.settings-card__chip {
  font-size: var(--md-sys-typescale-label-medium-size);
  padding: 4px 12px;
  border-radius: 999px;
}

.settings-card__chip--ok {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.settings-card__chip--bad {
  background: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.settings-card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.settings-card__actions {
  flex-direction: row;
  flex-wrap: wrap;
}

.settings-token__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.settings-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.settings-check {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
</style>
