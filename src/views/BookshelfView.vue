<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useBookshelfStore } from '@/stores/bookshelf'
import BookCard from '@/components/bookshelf/BookCard.vue'
import type { Book } from '@/types'

const router = useRouter()
const shelf = useBookshelfStore()
const { filteredBooks, groups, activeGroupId, loading, error, books } = storeToRefs(shelf)

const searchInput = ref('')
const confirming = ref<Book | null>(null)
const deleting = ref(false)

onMounted(() => {
  void shelf.loadBooks()
  void shelf.loadGroups()
})

function openBook(book: Book) {
  void router.push({ name: 'reader', params: { url: encodeURIComponent(book.bookUrl) } })
}

function setGroup(id: number) {
  shelf.activeGroupId = id
}

async function confirmDelete() {
  if (!confirming.value) return
  deleting.value = true
  try {
    await shelf.removeBook(confirming.value)
  } finally {
    deleting.value = false
    confirming.value = null
  }
}
</script>

<template>
  <div class="bookshelf">
    <div class="bookshelf__toolbar">
      <div class="bookshelf__chips">
        <v-chip
          :variant="activeGroupId < 0 ? 'flat' : 'tonal'"
          :color="activeGroupId < 0 ? 'primary' : undefined"
          class="m3-interactive"
          @click="setGroup(-1)"
        >
          全部
        </v-chip>
        <v-chip
          v-for="g in groups"
          :key="g.groupId"
          :variant="activeGroupId === g.groupId ? 'flat' : 'tonal'"
          :color="activeGroupId === g.groupId ? 'primary' : undefined"
          class="m3-interactive"
          @click="setGroup(g.groupId)"
        >
          {{ g.groupName }}
        </v-chip>
      </div>
      <v-spacer />
      <v-text-field
        v-model="searchInput"
        class="bookshelf__search"
        prepend-inner-icon="mdi-magnify"
        placeholder="搜索书名或作者"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        @update:model-value="shelf.filter = $event"
      />
    </div>

    <div v-if="loading && books.length === 0" class="bookshelf__state">
      <v-progress-circular indeterminate color="primary" size="40" />
      <span class="bookshelf__state-text">正在加载书架…</span>
    </div>

    <div v-else-if="error && books.length === 0" class="bookshelf__state">
      <v-icon icon="mdi-server-off-outline" size="48" color="error" />
      <span class="m3-headline-small bookshelf__state-title">无法连接后端</span>
      <span class="bookshelf__state-text">{{ error }}</span>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" class="m3-interactive" @click="shelf.loadBooks(true)">
        重试
      </v-btn>
    </div>

    <div v-else-if="filteredBooks.length === 0" class="bookshelf__state">
      <v-icon icon="mdi-book-open-blank-variant-outline" size="48" color="on-surface-variant" />
      <span class="m3-headline-small bookshelf__state-title">书架上还没有书</span>
      <span class="bookshelf__state-text">从搜索页找到小说，点击「加入书架」</span>
      <v-btn variant="tonal" prepend-icon="mdi-magnify" class="m3-interactive" @click="router.push('/search')">
        去搜索
      </v-btn>
    </div>

    <div v-else class="bookshelf__grid">
      <BookCard
        v-for="book in filteredBooks"
        :key="book.bookUrl"
        :book="book"
        @open="openBook"
        @delete="confirming = $event"
      />
    </div>

    <v-dialog
      :model-value="!!confirming"
      max-width="420"
      persistent
      @update:model-value="confirming = $event ? confirming : null"
    >
      <v-card rounded="xl">
        <v-card-title class="m3-title-medium">删除书籍</v-card-title>
        <v-card-text>
          确定从书架删除《{{ confirming?.name }}》吗？不会影响书源。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirming = null">取消</v-btn>
          <v-btn color="error" variant="tonal" :loading="deleting" @click="confirmDelete">
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.bookshelf {
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px clamp(16px, 4vw, 32px) 48px;
}

.bookshelf__toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.bookshelf__chips {
  display: flex;
  gap: 8px;
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

.bookshelf__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 96px 0;
  color: var(--md-sys-color-on-surface-variant);
}

.bookshelf__state-title {
  color: var(--md-sys-color-on-surface);
}

.bookshelf__state-text {
  font-size: var(--md-sys-typescale-body-medium-size);
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
</style>
