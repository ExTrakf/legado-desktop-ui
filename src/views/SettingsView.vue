<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'
import { useThemeControl } from '@/composables/useTheme'
import { useReaderStore } from '@/stores/reader'
import { useAuthStore } from '@/stores/auth'
import { cacheBookStop, getReadConfig, restoreDefaultData, saveReadConfig } from '@/api/system'
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
  <div class="settings-view">
    <h2 class="m3-headline-small settings-view__title">设置</h2>

    <v-card class="settings-view__card" rounded="lg">
      <v-card-item>
        <template #prepend>
          <v-icon
            icon="mdi-laptop"
            size="28"
            :color="backendOnline ? 'primary' : 'error'"
          />
        </template>
        <v-card-title>后端连接</v-card-title>
        <v-card-subtitle class="settings-view__mono">
          127.0.0.1:2323
          <span v-if="healthChecked">
            · {{ backendOnline ? '已连接' : '未连接' }}
          </span>
        </v-card-subtitle>
        <template #append>
          <v-chip
            :color="backendOnline ? 'primary' : 'error'"
            variant="tonal"
            size="small"
          >
            {{ backendOnline ? '在线' : '离线' }}
          </v-chip>
        </template>
      </v-card-item>
      <template v-if="!backendOnline && healthChecked">
        <v-divider />
        <v-list-item
          title="无法连接后端"
          subtitle="请先启动 legado-desktop 后端服务"
        />
      </template>
    </v-card>

    <v-card class="settings-view__card" rounded="lg">
      <v-card-item>
        <template #prepend>
          <v-icon icon="mdi-shield-lock-outline" size="28" color="primary" />
        </template>
        <v-card-title>Web 书源令牌</v-card-title>
        <v-card-subtitle>
          书源写入/搜索等接口的访问令牌
          <template v-if="healthChecked">
            （{{ tokenRequired ? '当前必填' : '当前无需令牌' }}）
          </template>
        </v-card-subtitle>
      </v-card-item>
      <v-divider />
      <div class="settings-view__token">
        <v-text-field
          v-model="tokenInput"
          label="令牌"
          placeholder="留空表示清除"
          :type="token ? 'password' : 'text'"
          variant="outlined"
          density="comfortable"
          hide-details
          autocomplete="off"
        />
        <div class="settings-view__token-actions">
          <v-btn
            variant="tonal"
            prepend-icon="mdi-check"
            :loading="applying"
            :disabled="!tokenInput.trim()"
            class="m3-interactive"
            @click="applyToken"
          >
            应用令牌
          </v-btn>
          <v-btn
            variant="text"
            prepend-icon="mdi-delete-outline"
            :disabled="!token"
            @click="clearToken"
          >
            清除
          </v-btn>
        </div>
        <p class="settings-view__hint">
          应用令牌会同时写入前端本地并下发到后端（POST /setJsSourceToken）。
        </p>
      </div>
    </v-card>

    <v-card class="settings-view__card" rounded="lg">
      <v-card-item>
        <template #prepend>
          <v-icon icon="mdi-white-balance-sunny" size="28" color="primary" />
        </template>
        <v-card-title>外观</v-card-title>
        <v-card-subtitle>应用整体主题</v-card-subtitle>
        <template #append>
          <v-switch
            :model-value="name === 'dark'"
            color="primary"
            hide-details
            :aria-label="`当前${name === 'dark' ? '深色' : '浅色'}主题`"
            @update:model-value="setTheme($event ? 'dark' : 'light')"
          />
        </template>
      </v-card-item>
    </v-card>

    <v-card class="settings-view__card" rounded="lg">
      <v-card-item>
        <template #prepend>
          <v-icon icon="mdi-format-color-fill" size="28" color="primary" />
        </template>
        <v-card-title>阅读默认</v-card-title>
        <v-card-subtitle>新开书籍的阅读外观</v-card-subtitle>
      </v-card-item>
      <v-divider />
      <v-list-item
        v-for="s in surfaces"
        :key="s.value"
        :title="s.label"
        :active="reader.settings.surface === s.value"
      >
        <template #append>
          <v-radio-group
            :model-value="reader.settings.surface"
            hide-details
            @update:model-value="reader.updateSettings({ surface: $event as never })"
          >
            <v-radio
              :value="s.value"
              color="primary"
              :aria-label="s.label"
            />
          </v-radio-group>
        </template>
      </v-list-item>
    </v-card>

    <v-card class="settings-view__card" rounded="lg">
      <v-card-item>
        <template #prepend>
          <v-icon icon="mdi-cloud-sync-outline" size="28" color="primary" />
        </template>
        <v-card-title>阅读配置同步</v-card-title>
        <v-card-subtitle>把阅读外观（底色/字号/行距/字体）保存到后端，或从后端恢复</v-card-subtitle>
      </v-card-item>
      <v-divider />
      <div class="settings-view__row">
        <v-btn
          variant="tonal"
          prepend-icon="mdi-cloud-upload-outline"
          :loading="syncing && syncDirection === 'save'"
          class="m3-interactive"
          @click="syncReaderConfig('save')"
        >
          保存到后端
        </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-cloud-download-outline"
          :loading="syncing && syncDirection === 'load'"
          class="m3-interactive"
          @click="syncReaderConfig('load')"
        >
          从后端恢复
        </v-btn>
      </div>
    </v-card>

    <v-card class="settings-view__card" rounded="lg">
      <v-card-item>
        <template #prepend>
          <v-icon icon="mdi-database-arrow-down-outline" size="28" color="primary" />
        </template>
        <v-card-title>恢复默认数据</v-card-title>
        <v-card-subtitle>重置 TXT 目录规则 / 词典 / 订阅源 / HTTP 朗读 为内置默认值</v-card-subtitle>
      </v-card-item>
      <v-divider />
      <div class="settings-view__row">
        <v-btn
          variant="tonal"
          color="error"
          prepend-icon="mdi-restore"
          class="m3-interactive"
          @click="openRestore"
        >
          恢复默认
        </v-btn>
      </div>
    </v-card>

    <v-card class="settings-view__card" rounded="lg">
      <v-card-item>
        <template #prepend>
          <v-icon icon="mdi-download-multiple-outline" size="28" color="primary" />
        </template>
        <v-card-title>缓存管理</v-card-title>
        <v-card-subtitle>阅读器中点「缓存」图标可缓存整本书；这里可停止进行中的缓存任务</v-card-subtitle>
      </v-card-item>
      <v-divider />
      <div class="settings-view__row">
        <v-btn
          variant="tonal"
          prepend-icon="mdi-stop-circle-outline"
          :loading="cacheStopping"
          class="m3-interactive"
          @click="stopCache"
        >
          停止缓存
        </v-btn>
      </div>
    </v-card>

    <v-dialog
      :model-value="restoreOpen"
      max-width="480"
      persistent
      @update:model-value="restoreOpen = $event"
    >
      <v-card rounded="xl">
        <v-card-title class="m3-title-medium">恢复默认数据</v-card-title>
        <v-card-text>
          <p class="settings-view__dialog-hint">
            不勾选任何项 = 恢复全部；否则仅恢复勾选项。此操作会覆盖现有数据。
          </p>
          <v-checkbox
            v-for="opt in restoreOptions"
            :key="opt.value"
            :model-value="restoreTypes.includes(opt.value)"
            :label="opt.label"
            color="primary"
            hide-details
            @update:model-value="
              restoreTypes = $event
                ? [...new Set([...restoreTypes, opt.value])]
                : restoreTypes.filter((t) => t !== opt.value)
            "
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="restoreOpen = false">取消</v-btn>
          <v-btn
            color="error"
            variant="tonal"
            :loading="restoring || restoringAll"
            @click="confirmRestore"
          >
            恢复
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
.settings-view {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 32px) 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-view__title {
  color: var(--md-sys-color-on-surface);
}

.settings-view__card {
  background: var(--md-sys-color-surface-container-low);
}

.settings-view__mono {
  font-family: var(--md-ref-typeface-mono);
}

.settings-view__token {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-view__token-actions {
  display: flex;
  gap: 8px;
}

.settings-view__hint {
  margin: 0;
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-on-surface-variant);
}

.settings-view__row {
  padding: 16px 20px 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.settings-view__dialog-hint {
  margin: 0 0 8px;
  font-size: var(--md-sys-typescale-body-small-size);
  color: var(--md-sys-color-on-surface-variant);
}
</style>
