export interface NavItem {
  title: string
  icon: string
  to: string
}

export const navItems: NavItem[] = [
  { title: '书架', icon: 'mdi-bookshelf', to: '/bookshelf' },
  { title: '搜索', icon: 'mdi-magnify', to: '/search' },
  { title: '书源', icon: 'mdi-source-branch', to: '/source' },
  { title: '订阅源', icon: 'mdi-rss', to: '/rss' },
  { title: '替换规则', icon: 'mdi-find-replace', to: '/replace' },
  { title: 'HTTP 日志', icon: 'mdi-file-document-outline', to: '/httplog' },
  { title: 'Cookie', icon: 'mdi-cookie-outline', to: '/cookies' },
  { title: '设置', icon: 'mdi-cog-outline', to: '/settings' },
]
