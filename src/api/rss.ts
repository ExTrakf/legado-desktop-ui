import { request } from './http'
import type { RssSource } from '@/types'

/** 全部订阅源（空列表后端返回错误 → 转空数组） */
export async function getRssSources(): Promise<RssSource[]> {
  try {
    return await request<RssSource[]>('/getRssSources')
  } catch (e) {
    if ((e as Error).message.includes('源列表为空')) return []
    throw e
  }
}

/** 查询单个订阅源 */
export async function getRssSource(url: string): Promise<RssSource> {
  return request<RssSource>('/getRssSource', { query: { url } })
}

/** 保存单个订阅源（写路由，令牌保护） */
export async function saveRssSource(source: RssSource): Promise<void> {
  await request<string>('/saveRssSource', { method: 'POST', body: source })
}

/** 批量保存订阅源 */
export async function saveRssSources(sources: RssSource[]): Promise<void> {
  await request<string>('/saveRssSources', { method: 'POST', body: sources })
}

/** 删除订阅源（写路由，令牌保护） */
export async function deleteRssSources(sources: RssSource[]): Promise<void> {
  await request<string>('/deleteRssSources', { method: 'POST', body: sources })
}
