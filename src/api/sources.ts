import { request } from './http'
import type { BookSource } from '@/types'

/** 全部书源（空列表后端返回错误 → 转空数组） */
export async function getBookSources(): Promise<BookSource[]> {
  try {
    return await request<BookSource[]>('/getBookSources')
  } catch (e) {
    if ((e as Error).message.includes('设备源列表为空')) return []
    throw e
  }
}

/** 保存单个书源（写路由，令牌保护） */
export async function saveBookSource(source: BookSource): Promise<void> {
  await request<string>('/saveBookSource', { method: 'POST', body: source })
}

/** 删除书源（写路由，令牌保护） */
export async function deleteBookSources(sources: BookSource[]): Promise<void> {
  await request<string>('/deleteBookSources', { method: 'POST', body: sources })
}
