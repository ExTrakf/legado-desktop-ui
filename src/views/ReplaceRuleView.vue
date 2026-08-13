<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useReplaceStore } from '@/stores/replace'
import { testReplaceRule } from '@/api/replace'
import type { ReplaceRule } from '@/types'

const store = useReplaceStore()
const { rules, enabledCount, loading, error } = storeToRefs(store)

const keyword = ref('')
const confirming = ref<ReplaceRule | null>(null)
const snackbar = ref('')

const editOpen = ref(false)
const form = ref<ReplaceRule>(store.fresh())
const saving = ref(false)

const testText = ref('')
const testResult = ref('')
const testing = ref(false)

onMounted(() => {
  void store.load()
})

function filtered() {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return rules.value
  return rules.value.filter(
    (r) =>
      r.name.toLowerCase().includes(kw) ||
      (r.group ?? '').toLowerCase().includes(kw) ||
      r.pattern.toLowerCase().includes(kw),
  )
}

function openNew() {
  form.value = store.fresh()
  testText.value = ''
  testResult.value = ''
  editOpen.value = true
}

function openEdit(r: ReplaceRule) {
  form.value = { ...r }
  testText.value = ''
  testResult.value = ''
  editOpen.value = true
}

async function confirmSave() {
  if (!form.value.pattern.trim()) {
    snackbar.value = '替换内容不能为空'
    return
  }
  saving.value = true
  try {
    await store.save(form.value)
    snackbar.value = '已保存替换规则'
    editOpen.value = false
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

async function onToggle(r: ReplaceRule, enabled: boolean) {
  try {
    await store.toggle(r, enabled)
  } catch (e) {
    snackbar.value = (e as Error).message
  }
}

async function runTest() {
  testing.value = true
  testResult.value = ''
  try {
    testResult.value = await testReplaceRule(form.value, testText.value)
  } catch (e) {
    testResult.value = (e as Error).message
  } finally {
    testing.value = false
  }
}

async function confirmDelete() {
  if (!confirming.value) return
  try {
    await store.remove(confirming.value)
    snackbar.value = '已删除替换规则'
  } catch (e) {
    snackbar.value = (e as Error).message
  } finally {
    confirming.value = null
  }
}
</script>

<template>
  <div class="replace-view">
    <div class="replace-view__head">
      <div>
        <h2 class="m3-headline-small replace-view__title">替换规则</h2>
        <p class="replace-view__subtitle">
          已启用 <span class="m3-mono">{{ enabledCount }}</span> / {{ rules.length }} 条规则
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
        @click="openNew"
      >
        新增规则
      </v-btn>
    </div>

    <v-text-field
      v-model="keyword"
      prepend-inner-icon="mdi-magnify"
      placeholder="筛选规则"
      variant="outlined"
      density="compact"
      hide-details
      class="replace-view__search"
    />

    <div v-if="loading && rules.length === 0" class="replace-view__state">
      <v-progress-circular indeterminate color="primary" size="36" />
    </div>

    <div v-else-if="error && rules.length === 0" class="replace-view__state">
      <v-icon icon="mdi-server-off-outline" size="40" color="error" />
      <span>{{ error }}</span>
      <v-btn variant="tonal" @click="store.load(true)">重试</v-btn>
    </div>

    <div v-else-if="rules.length === 0" class="replace-view__state">
      <v-icon icon="mdi-find-replace" size="40" color="on-surface-variant" />
      <span>还没有替换规则</span>
    </div>

    <div v-else class="replace-view__list">
      <v-card
        v-for="r in filtered()"
        :key="r.id"
        class="replace-view__item"
        rounded="lg"
      >
        <v-card-item>
          <template #prepend>
            <v-icon
              :icon="r.isEnabled ? 'mdi-find-replace' : 'mdi-find-replace'"
              :color="r.isEnabled ? 'primary' : 'on-surface-variant'"
              size="28"
            />
          </template>
          <v-card-title class="replace-view__name">
            {{ r.name || '(未命名)' }}
            <template v-if="r.group">
              <v-chip size="x-small" variant="tonal" class="replace-view__group">
                {{ r.group }}
              </v-chip>
            </template>
          </v-card-title>
          <v-card-subtitle class="replace-view__pattern m3-mono text-truncate">
            {{ r.pattern || '（空）' }}
            <template v-if="!r.isRegex"> · 普通</template>
          </v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              :aria-label="`编辑 ${r.name}`"
              @click="openEdit(r)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              :aria-label="`删除 ${r.name}`"
              @click="confirming = r"
            />
            <v-switch
              :model-value="r.isEnabled"
              color="primary"
              hide-details
              :aria-label="`${r.isEnabled ? '停用' : '启用'} ${r.name}`"
              @update:model-value="onToggle(r, !!$event)"
            />
          </template>
        </v-card-item>
      </v-card>
    </div>

    <v-dialog
      :model-value="editOpen"
      max-width="640"
      persistent
      scrollable
      @update:model-value="editOpen = $event"
    >
      <v-card rounded="xl">
        <v-card-title class="m3-title-medium">编辑替换规则</v-card-title>
        <v-divider />
        <v-card-text class="replace-view__editor">
          <div class="replace-view__row">
            <v-text-field
              v-model="form.name"
              label="名称"
              variant="outlined"
              density="comfortable"
              hide-details
            />
            <v-text-field
              v-model="form.group"
              label="分组（可选）"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>
          <div class="replace-view__switches">
            <v-switch
              v-model="form.isEnabled"
              label="启用"
              color="primary"
              hide-details
            />
            <v-switch
              v-model="form.isRegex"
              label="正则表达式"
              color="primary"
              hide-details
            />
            <v-switch
              v-model="form.scopeContent"
              label="作用于正文"
              color="primary"
              hide-details
            />
            <v-switch
              v-model="form.scopeTitle"
              label="作用于标题"
              color="primary"
              hide-details
            />
          </div>
          <v-text-field
            v-model="form.pattern"
            label="替换内容（pattern）"
            variant="outlined"
            density="comfortable"
            hide-details
            class="m3-mono"
          />
          <v-text-field
            v-model="form.replacement"
            label="替换为（replacement）"
            variant="outlined"
            density="comfortable"
            hide-details
            class="m3-mono"
          />
          <div class="replace-view__row">
            <v-text-field
              v-model="form.scope"
              label="作用范围（可选，正则）"
              variant="outlined"
              density="comfortable"
              hide-details
            />
            <v-text-field
              v-model="form.excludeScope"
              label="排除范围（可选，正则）"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>
          <v-text-field
            v-model.number="form.timeoutMillisecond"
            label="超时（毫秒）"
            type="number"
            variant="outlined"
            density="comfortable"
            hide-details
          />

          <v-divider class="replace-view__divider" />

          <div class="replace-view__test-head">
            <span class="m3-label-large">测试</span>
            <v-spacer />
            <v-btn
              variant="tonal"
              prepend-icon="mdi-flask-outline"
              :loading="testing"
              :disabled="!form.pattern.trim()"
              class="m3-interactive"
              @click="runTest"
            >
              运行测试
            </v-btn>
          </div>
          <v-textarea
            v-model="testText"
            label="测试文本"
            variant="outlined"
            density="comfortable"
            hide-details
            rows="4"
            class="m3-mono"
          />
          <v-textarea
            :model-value="testResult"
            label="替换结果"
            variant="outlined"
            density="comfortable"
            readonly
            hide-details
            rows="4"
            class="replace-view__result m3-mono"
          />
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

    <v-dialog
      :model-value="!!confirming"
      max-width="420"
      persistent
      @update:model-value="confirming = $event ? confirming : null"
    >
      <v-card rounded="xl">
        <v-card-title class="m3-title-medium">删除替换规则</v-card-title>
        <v-card-text>确定删除规则「{{ confirming?.name }}」吗？</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirming = null">取消</v-btn>
          <v-btn color="error" variant="tonal" @click="confirmDelete">删除</v-btn>
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
.replace-view {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 32px) 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.replace-view__head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.replace-view__title {
  color: var(--md-sys-color-on-surface);
}

.replace-view__subtitle {
  margin: 4px 0 0;
  font-size: var(--md-sys-typescale-body-medium-size);
  color: var(--md-sys-color-on-surface-variant);
}

.replace-view__search {
  max-width: 360px;
}

.replace-view__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 0;
  color: var(--md-sys-color-on-surface-variant);
}

.replace-view__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.replace-view__item {
  background: var(--md-sys-color-surface-container-low);
}

.replace-view__name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.replace-view__group {
  text-transform: none;
}

.replace-view__pattern {
  font-size: var(--md-sys-typescale-label-medium-size);
}

.replace-view__editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.replace-view__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.replace-view__switches {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.replace-view__divider {
  margin: 4px 0;
}

.replace-view__test-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.replace-view__result {
  color: var(--md-sys-color-on-surface-variant);
}

@media (max-width: 600px) {
  .replace-view__row {
    grid-template-columns: 1fr;
  }
}
</style>
