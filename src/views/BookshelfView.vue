<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useBookshelfStore } from '@/stores/bookshelf'
import BookCard from '@/components/bookshelf/BookCard.vue'
import AppDialog from '@/components/app/AppDialog.vue'
import type { Book } from '@/types'

const router = useRouter()
const shelf = useBookshelfStore()
const { filteredBooks, groups, activeGroupId, loading, error, books } = storeToRefs(shelf)

const deleteOpen = ref(false)
const confirming = ref<Book | null>(null)
const deleting = ref(false)

onMounted(() => {
  void shelf.loadBooks()
  void shelf.loadGroups()
})

function openBook(book: Book) {
  void router.push({ path: `/book/${encodeURIComponent(book.bookUrl)}` })
}

function setGroup(id: number) {
  shelf.activeGroupId = id
}

function askDelete(book: Book) {
  confirming.value = book
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!confirming.value) return
  deleting.value = true
  try {
    await shelf.removeBook(confirming.value)
  } finally {
    deleting.value = false
    deleteOpen.value = false
    confirming.value = null
  }
}
</script>

<template>
  <div class="view-wrap bookshelf">
    <div class="view-head">
      <div class="view-head__titles">
        <h2 class="view-head__title">书架</h2>
        <p class="view-head__sub">
          共 <span class="mono">{{ books.length }}</span> 本
        </p>
      </div>
      <div class="head-actions">
        <button
          type="button"
          class="micl-button-text-m"
          :disabled="loading"
          @click="shelf.loadBooks(true)"
        >
          <i class="mdi mdi-refresh micl-button__icon" aria-hidden="true" />
          刷新
        </button>
      </div>
    </div>

    <div class="bookshelf__toolbar">
      <fieldset class="micl-chips">
        <button
          type="button"
          class="micl-button--toggle micl-chip-filter"
          :aria-pressed="activeGroupId < 0 ? 'true' : 'false'"
          @click="setGroup(-1)"
        >
          全部
        </button>
        <button
          v-for="g in groups"
          :key="g.groupId"
          type="button"
          class="micl-button--toggle micl-chip-filter"
          :aria-pressed="activeGroupId === g.groupId ? 'true' : 'false'"
          @click="setGroup(g.groupId)"
        >
          {{ g.groupName }}
        </button>
      </fieldset>

      <div class="spacer" />

      <div class="micl-textfield-outlined bookshelf__search">
        <label for="bookshelf-search">搜索书名或作者</label>
        <input
          id="bookshelf-search"
          type="search"
          v-model="shelf.filter"
          placeholder="书名 / 作者 / 分类"
        />
      </div>
    </div>

    <div v-if="loading && books.length === 0" class="bookshelf__grid" aria-hidden="true">
      <div v-for="n in 12" :key="n" class="book-card-skel">
        <div class="book-card-skel__cover" />
        <div class="book-card-skel__line" />
        <div class="book-card-skel__line book-card-skel__line--short" />
        <div class="book-card-skel__bar" />
      </div>
      <span class="sr-only">正在加载书架…</span>
    </div>

    <div v-else-if="error && books.length === 0" class="empty-state">
      <i class="mdi mdi-server-off-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__title">无法连接后端</span>
      <span class="empty-state__hint">{{ error }}</span>
      <button type="button" class="micl-button-tonal-m" @click="shelf.loadBooks(true)">
        <i class="mdi mdi-refresh micl-button__icon" aria-hidden="true" />
        重试
      </button>
    </div>

    <div v-else-if="filteredBooks.length === 0" class="empty-state">
      <i class="mdi mdi-book-open-blank-variant-outline empty-state__icon" aria-hidden="true" />
      <span class="empty-state__title">书架上还没有书</span>
      <span class="empty-state__hint">从搜索页找到小说，点击「加入书架」</span>
      <button type="button" class="micl-button-tonal-m" @click="router.push('/search')">
        <i class="mdi mdi-magnify micl-button__icon" aria-hidden="true" />
        去搜索
      </button>
    </div>

    <div v-else class="bookshelf__grid">
      <BookCard
        v-for="book in filteredBooks"
        :key="book.bookUrl"
        :book="book"
        @open="openBook"
        @delete="askDelete"
      />
    </div>

    <AppDialog
      :open="deleteOpen"
      :title="'删除书籍'"
      :supporting="`确定从书架删除《${confirming?.name ?? ''}》吗？不会影响书源。`"
      @update:open="deleteOpen = $event"
    >
      <template #actions>
        <button type="button" class="micl-button-text-m" @click="deleteOpen = false">取消</button>
        <button
          type="button"
          class="micl-button-text-m"
          :disabled="deleting"
          @click="confirmDelete"
        >
          删除
        </button>
      </template>
    </AppDialog>
  </div>
</template>

<style scoped>
.bookshelf__toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.bookshelf__search {
  max-width: 320px;
  min-width: 200px;
}

.bookshelf__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 24px 18px;
}

/* 骨架屏：与 BookCard 同构的占位块，微光脉动由 .book-card-skel::after 提供 */
.book-card-skel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.book-card-skel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgb(255 255 255 / 0.3) 45%,
    transparent 60%
  );
  background-size: 200% 100%;
  animation: skel-shimmer 1.6s var(--md-sys-motion-easing-standard) infinite;
  pointer-events: none;
}

[data-theme='dark'] .book-card-skel::after {
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgb(255 255 255 / 0.12) 45%,
    transparent 60%
  );
}

.book-card-skel__cover {
  aspect-ratio: 2 / 3;
  width: 100%;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-high);
}

.book-card-skel__line {
  height: 12px;
  width: 100%;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-highest);
}

.book-card-skel__line--short {
  width: 60%;
}

.book-card-skel__bar {
  height: 4px;
  width: 60%;
  margin-top: 2px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-highest);
}

@keyframes skel-shimmer {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -120% 0;
  }
}

@media (max-width: 600px) {
  .bookshelf__grid {
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 16px 12px;
  }

  .bookshelf__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .bookshelf__search {
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .book-card-skel::after {
    display: none;
  }
}
</style>
