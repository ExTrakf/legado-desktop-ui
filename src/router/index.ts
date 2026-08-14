import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        { path: '', redirect: '/bookshelf' },
        {
          path: 'bookshelf',
          name: 'bookshelf',
          component: () => import('@/views/BookshelfView.vue'),
          meta: { title: '书架' },
        },
        {
          path: 'search',
          name: 'search',
          component: () => import('@/views/SearchView.vue'),
          meta: { title: '搜索' },
        },
        {
          path: 'source',
          name: 'source',
          component: () => import('@/views/SourceView.vue'),
          meta: { title: '书源' },
        },
        {
          path: 'rss',
          name: 'rss',
          component: () => import('@/views/RssView.vue'),
          meta: { title: '订阅源' },
        },
        {
          path: 'replace',
          name: 'replace',
          component: () => import('@/views/ReplaceRuleView.vue'),
          meta: { title: '替换规则' },
        },
        {
          path: 'httplog',
          name: 'httplog',
          component: () => import('@/views/HttpLogView.vue'),
          meta: { title: 'HTTP 日志' },
        },
        {
          path: 'cookies',
          name: 'cookies',
          component: () => import('@/views/CookieView.vue'),
          meta: { title: 'Cookie' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '设置' },
        },
        {
          path: 'book/:url/detail',
          name: 'book-detail',
          component: () => import('@/views/BookDetailView.vue'),
          meta: { title: '书籍详情', back: '/bookshelf' },
        },
      ],
    },
    {
      path: '/book/:url',
      component: () => import('@/layouts/ReaderLayout.vue'),
      children: [
        {
          path: '',
          name: 'reader',
          component: () => import('@/views/ReaderView.vue'),
          meta: { title: '阅读' },
        },
      ],
    },
  ],
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title as string} · 开源阅读` : '开源阅读'
})

export default router
