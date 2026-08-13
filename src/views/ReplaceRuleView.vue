<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useReplaceStore } from '@/stores/replace'
import { testReplaceRule } from '@/api/replace'
import AppDialog from '@/components/app/AppDialog.vue'
import AppSnackbar from '@/components/app/AppSnackbar.vue'
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
  <div class="view-wrap replace-view">
    <div class="view-head">
      <div class="view-head__titles">
        <h2 class="view-head__title">替换规则</h2>
        <p class="view-head__sub">
          已启用 <span class="mono">{{ enabledCount }}</span> / {{ rules.length }} 条规则
        </p>
      </div>
      <div class="head-actions">
        <button type="button" class="micl-button-text-m" :disabled="loading" @click="store.load(true)">
          <i class="mdi mdi-refresh micl-button__icon" aria-hidden="true" />
          刷新
        </button>
        <button type="button" class="micl-button-filled-m" @click="openNew">
          <i class="mdi mdi-plus micl-button__icon" aria-hidden="true" />
          新增规则
        </button>
      </div>
    </div>

    <div class="micl-textfield-outlined filter-field">
      <label for="rule-filter">筛选规则</label>
      <input id="rule-filter" type="search" v-model="keyword" placeholder="名称 / 分组 / 内容" />
    </div>

    <div v-if="loading && rules.length === 0" class="empty-state">
      <progress class="micl-circular-progress" aria-label="正在加载规则" />
    </div>

    <div v-else-if="error && rules.length === 0" class="empty-state">
      <i class="mdi mdi-server-off-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__hint">{{ error }}</span>
      <button type="button" class="micl-button-tonal-m" @click="store.load(true)">重试</button>
    </div>

    <div v-else-if="rules.length === 0" class="empty-state">
      <i class="mdi mdi-find-replace empty-state__icon" aria-hidden="true" />
      <span class="empty-state__hint">还没有替换规则</span>
    </div>

    <div v-else class="card-list">
      <div
        v-for="r in filtered()"
        :key="r.id"
        class="micl-card-filled card-row"
      >
        <i
          class="mdi mdi-find-replace"
          :style="r.isEnabled ? 'color: var(--md-sys-color-primary)' : ''"
          style="font-size: 28px"
          aria-hidden="true"
        />
        <div class="card-row__main">
          <div class="card-row__title text-truncate">
            {{ r.name || '(未命名)' }}
            <template v-if="r.group">
              <span class="mono rule-group">{{ r.group }}</span>
            </template>
          </div>
          <div class="card-row__sub mono text-truncate">
            {{ r.pattern || '（空）' }}
            <template v-if="!r.isRegex"> · 普通</template>
          </div>
        </div>
        <div class="card-row__actions">
          <button
            type="button"
            class="micl-iconbutton-standard-s"
            :aria-label="`编辑 ${r.name}`"
            @click="openEdit(r)"
          >
            <i class="mdi mdi-pencil-outline" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="micl-iconbutton-standard-s"
            :aria-label="`删除 ${r.name}`"
            @click="confirming = r"
          >
            <i class="mdi mdi-delete-outline" aria-hidden="true" />
          </button>
          <input
            type="checkbox"
            class="micl-switch"
            role="switch"
            :id="`rule-sw-${r.id}`"
            :checked="r.isEnabled"
            :aria-label="`${r.isEnabled ? '停用' : '启用'} ${r.name}`"
            @change="onToggle(r, !!($event.target as HTMLInputElement).checked)"
          />
        </div>
      </div>
    </div>

    <AppDialog :open="editOpen" title="编辑替换规则" @update:open="editOpen = $event">
      <div class="form-stack">
        <div class="form-row">
          <div class="micl-textfield-filled">
            <label for="rule-name">名称</label>
            <input id="rule-name" type="text" v-model="form.name" />
          </div>
          <div class="micl-textfield-filled">
            <label for="rule-group">分组（可选）</label>
            <input id="rule-group" type="text" v-model="form.group" />
          </div>
        </div>

        <div class="switch-row">
          <div class="switch-row__item">
            <input type="checkbox" class="micl-switch" role="switch" id="rule-enabled" v-model="form.isEnabled" />
            <label for="rule-enabled">启用</label>
          </div>
          <div class="switch-row__item">
            <input type="checkbox" class="micl-switch" role="switch" id="rule-regex" v-model="form.isRegex" />
            <label for="rule-regex">正则表达式</label>
          </div>
          <div class="switch-row__item">
            <input type="checkbox" class="micl-switch" role="switch" id="rule-scope-content" v-model="form.scopeContent" />
            <label for="rule-scope-content">作用于正文</label>
          </div>
          <div class="switch-row__item">
            <input type="checkbox" class="micl-switch" role="switch" id="rule-scope-title" v-model="form.scopeTitle" />
            <label for="rule-scope-title">作用于标题</label>
          </div>
        </div>

        <div class="micl-textfield-filled">
          <label for="rule-pattern">替换内容（pattern）</label>
          <input id="rule-pattern" type="text" class="mono" v-model="form.pattern" />
        </div>
        <div class="micl-textfield-filled">
          <label for="rule-replacement">替换为（replacement）</label>
          <input id="rule-replacement" type="text" class="mono" v-model="form.replacement" />
        </div>
        <div class="form-row">
          <div class="micl-textfield-filled">
            <label for="rule-scope">作用范围（可选，正则）</label>
            <input id="rule-scope" type="text" class="mono" v-model="form.scope" />
          </div>
          <div class="micl-textfield-filled">
            <label for="rule-exclude">排除范围（可选，正则）</label>
            <input id="rule-exclude" type="text" class="mono" v-model="form.excludeScope" />
          </div>
        </div>
        <div class="micl-textfield-filled">
          <label for="rule-timeout">超时（毫秒）</label>
          <input id="rule-timeout" type="number" class="mono" v-model.number="form.timeoutMillisecond" />
        </div>

        <hr class="micl-divider" />

        <div class="replace-view__test-head">
          <span class="replace-view__test-title">测试</span>
          <div class="spacer" />
          <button
            type="button"
            class="micl-button-tonal-m"
            :disabled="!form.pattern.trim() || testing"
            @click="runTest"
          >
            <i class="mdi mdi-flask-outline micl-button__icon" aria-hidden="true" />
            运行测试
          </button>
        </div>
        <div class="micl-textfield-filled">
          <label for="rule-test-text">测试文本</label>
          <textarea id="rule-test-text" class="mono" rows="4" v-model="testText" />
        </div>
        <div class="micl-textfield-filled">
          <label for="rule-test-result">替换结果</label>
          <textarea id="rule-test-result" class="mono" rows="4" :value="testResult" readonly />
        </div>
      </div>
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="editOpen = false">取消</button>
        <button type="button" class="micl-button-filled-m" :disabled="saving" @click="confirmSave">
          保存
        </button>
      </template>
    </AppDialog>

    <AppDialog
      :open="!!confirming"
      :title="'删除替换规则'"
      :supporting="`确定删除规则「${confirming?.name ?? ''}」吗？`"
      @update:open="confirming = $event ? confirming : null"
    >
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="confirming = null">取消</button>
        <button type="button" class="micl-button-text-m" @click="confirmDelete">删除</button>
      </template>
    </AppDialog>

    <AppSnackbar :open="!!snackbar" @update:open="snackbar = ''">
      {{ snackbar }}
    </AppSnackbar>
  </div>
</template>

<style scoped>
.filter-field {
  margin: 0;
}

.rule-group {
  font-size: var(--md-sys-typescale-label-medium-size);
  color: var(--md-sys-color-on-surface-variant);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 999px;
  padding: 0 8px;
}

.switch-row__item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.replace-view__test-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.replace-view__test-title {
  font-family: var(--md-ref-typeface-display);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}
</style>
