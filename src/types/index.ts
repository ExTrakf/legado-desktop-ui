/** 与 legado-desktop 后端 API 契约对齐的类型（camelCase 与后端实体一致） */

export interface ApiResponse<T = unknown> {
  isSuccess: boolean
  errorMsg: string
  data: T | null
}

export type ReadingSurface = 'paper' | 'green' | 'ink'
export type ReadingFont = 'serif' | 'sans'

export interface ReaderSettings {
  fontSizeRem: number
  lineHeight: number
  surface: ReadingSurface
  font: ReadingFont
}

export interface BookGroup {
  groupId: number
  groupName: string
  cover: string | null
  order: number
  enableRefresh: boolean
  show: boolean
  bookSort: number
  onlyUpdateRead: boolean
}

export interface ReadConfig {
  reverseToc: boolean
  pageAnim?: number | null
  reSegment: boolean
  imageStyle?: string | null
  useReplaceRule?: boolean | null
  delTag: number
  ttsEngine?: string | null
  splitLongChapter: boolean
  readSimulating: boolean
  startDate?: string | null
  startChapter?: number | null
  dailyChapters: number
  openCredits: number
  closeCredits: number
  playMode: number
  playSpeed: number
  useGlobalAudioSkip: boolean
}

export interface Book {
  bookUrl: string
  tocUrl: string
  origin: string
  originName: string
  name: string
  author: string
  kind: string | null
  customTag?: string | null
  coverUrl: string | null
  customCoverUrl?: string | null
  intro: string | null
  customIntro?: string | null
  charset?: string | null
  type: number
  group: number
  latestChapterTitle: string | null
  latestChapterTime: number
  lastCheckTime: number
  lastCheckCount: number
  totalChapterNum: number
  durChapterTitle: string | null
  durChapterIndex: number
  durVolumeIndex: number
  chapterInVolumeIndex: number
  durChapterPos: number
  durChapterTime: number
  wordCount: string | null
  canUpdate: boolean
  order: number
  originOrder: number
  variable: string | null
  readConfig?: ReadConfig | null
  syncTime: number
}

export interface Chapter {
  url: string
  title: string
  isVolume: boolean
  baseUrl: string
  bookUrl: string
  index: number
  isVip: boolean
  isPay: boolean
  tag: string | null
  wordCount: string | null
}

export interface BookProgress {
  name: string
  author: string
  durChapterIndex: number
  durChapterPos: number
  durChapterTitle: string | null
  durChapterTime: number
}

export interface SearchBook {
  name: string
  author: string
  kind: string | null
  bookUrl: string
  origin: string
  originName: string
  type: number
  wordCount: string | null
  latestChapterTitle: string | null
  coverUrl: string | null
  intro: string | null
  tocUrl: string
  originOrder: number
  variable: string | null
}

export interface BookSource {
  bookSourceUrl: string
  bookSourceName: string
  bookSourceGroup?: string | null
  bookSourceType: number
  bookUrlPattern?: string | null
  customOrder: number
  enabled: boolean
  enabledExplore: boolean
  jsLib?: string | null
  enabledCookieJar?: boolean | null
  concurrentRate?: string | null
  header?: string | null
  loginUrl?: string | null
  loginUi?: string | null
  loginCheckJs?: string | null
  coverDecodeJs?: string | null
  bookSourceComment?: string | null
  variableComment?: string | null
  lastUpdateTime: number
  respondTime: number
  weight: number
  exploreUrl?: string | null
  searchUrl?: string | null
  ruleExplore?: unknown
  ruleSearch?: unknown
  ruleBookInfo?: unknown
  ruleToc?: unknown
  ruleContent?: unknown
  ruleReview?: unknown
  mainJs?: string | null
  eventListener: boolean
  customButton: boolean
}

/** RSS 订阅源（后端 RssSource 实体） */
export interface RssSource {
  sourceUrl: string
  sourceName: string
  sourceIcon?: string | null
  sourceGroup?: string | null
  sourceComment?: string | null
  enabled: boolean
  variableComment?: string | null
  jsLib?: string | null
  enabledCookieJar?: boolean | null
  concurrentRate?: string | null
  header?: string | null
  loginUrl?: string | null
  loginUi?: string | null
  loginCheckJs?: string | null
  coverDecodeJs?: string | null
  sortUrl?: string | null
  singleUrl?: boolean
  articleStyle?: number
  ruleArticles?: string | null
  ruleNextPage?: string | null
  ruleTitle?: string | null
  rulePubDate?: string | null
  ruleDescription?: string | null
  ruleImage?: string | null
  ruleLink?: string | null
  ruleContent?: string | null
  contentWhitelist?: string | null
  contentBlacklist?: string | null
  shouldOverrideUrlLoading?: string | null
  style?: string | null
  enableJs?: boolean
  loadWithBaseUrl?: boolean
  injectJs?: string | null
  preloadJs?: string | null
  startHtml?: string | null
  startStyle?: string | null
  startJs?: string | null
  showWebLog?: boolean
  lastUpdateTime: number
  customOrder: number
  type?: number
  preload?: boolean
  cacheFirst?: boolean
  searchUrl?: string | null
}

/** 替换规则（后端 ReplaceRule 实体） */
export interface ReplaceRule {
  id: number
  name: string
  group?: string | null
  pattern: string
  replacement: string
  scope?: string | null
  scopeTitle: boolean
  scopeContent: boolean
  excludeScope?: string | null
  isEnabled: boolean
  isRegex: boolean
  timeoutMillisecond: number
  order: number
}

/** HTTP 日志摘要（GET /getHttpLogs） */
export interface HttpLogSummary {
  id: number
  time: number
  method: string
  url: string
  statusCode: number
  duration: number
  error: string | null
}

/** HTTP 日志完整记录（GET /getHttpLog） */
export interface HttpLogRecord extends HttpLogSummary {
  path: string
  requestHeaders: string
  requestBody: string
  responseHeaders: string
  responseBody: string
}

/** 后端健康信息（GET /api/health） */
export interface HealthInfo {
  service: string
  version: string
  status: string
}
