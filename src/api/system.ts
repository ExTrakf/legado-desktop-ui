import { request } from './http'
import type { HealthInfo } from '@/types'

/** 存活检查 */
export async function getHealth(): Promise<HealthInfo> {
  return request<HealthInfo>('/api/health', { auth: false })
}

/** 恢复默认数据：types 为空 = 全部；可选 txtTocRule/dictRule/rssSource/httpTTS（令牌保护） */
export async function restoreDefaultData(types?: string[]): Promise<string> {
  return request<string>('/restoreDefaultData', {
    method: 'POST',
    body: types ? { types } : {},
  })
}

/** 缓存书籍章节（body {bookUrl, start?, end?}，无令牌保护） */
export async function cacheBook(bookUrl: string, start?: number, end?: number): Promise<void> {
  await request<string>('/cacheBook', {
    method: 'POST',
    body: { bookUrl, start, end },
    auth: false,
  })
}

/** 停止缓存 */
export async function cacheBookStop(): Promise<void> {
  await request<string>('/cacheBookStop', { method: 'POST', auth: false })
}

/** 移除某本书的缓存队列 */
export async function cacheBookRemove(bookUrl: string): Promise<void> {
  await request<string>('/cacheBookRemove', { method: 'POST', body: { bookUrl }, auth: false })
}

/** 保存 Web 阅读配置（body 为任意 JSON，后端原样存储） */
export async function saveReadConfig(config: unknown): Promise<void> {
  await request<string>('/saveReadConfig', { method: 'POST', body: config, auth: false })
}

/** 读取 Web 阅读配置；未配置时后端返回"没有配置" → 返回 null */
export async function getReadConfig(): Promise<unknown | null> {
  try {
    const raw = await request<string>('/getReadConfig', { auth: false })
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return raw
    }
  } catch (e) {
    if ((e as Error).message.includes('没有配置')) return null
    throw e
  }
}
