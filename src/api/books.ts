import { BASE_URL, request } from './http'
import type { Book, BookGroup, BookProgress, Chapter } from '@/types'

/** 书架全部书籍（空书架后端返回错误 → 前端转空数组） */
export async function getBookshelf(): Promise<Book[]> {
  try {
    return await request<Book[]>('/getBookshelf')
  } catch (e) {
    if ((e as Error).message.includes('还没有添加小说')) return []
    throw e
  }
}

export async function getBookGroups(): Promise<BookGroup[]> {
  return request<BookGroup[]>('/getBookGroups')
}

/** 保存/更新书籍（POST 实体 JSON） */
export async function saveBook(book: Book): Promise<void> {
  await request<string>('/saveBook', { method: 'POST', body: book, auth: false })
}

export async function deleteBook(book: Book): Promise<void> {
  await request<string>('/deleteBook', { method: 'POST', body: book, auth: false })
}

/** 刷新目录（服务端拉取最新章节列表并入库） */
export async function refreshToc(bookUrl: string): Promise<Chapter[]> {
  return request<Chapter[]>('/refreshToc', { query: { url: bookUrl } })
}

/** 获取目录（缺目录时后端自动刷新） */
export async function getChapterList(bookUrl: string): Promise<Chapter[]> {
  return request<Chapter[]>('/getChapterList', { query: { url: bookUrl } })
}

/** 获取正文（data 为纯文本，含 \n 与可能的 <img>） */
export async function getBookContent(bookUrl: string, index: number): Promise<string> {
  return request<string>('/getBookContent', { query: { url: bookUrl, index } })
}

/** 保存阅读进度（auth=false：后端该路由不设令牌保护） */
export async function saveBookProgress(progress: BookProgress): Promise<void> {
  await request<string>('/saveBookProgress', { method: 'POST', body: progress, auth: false })
}

/** 封面代理：后端抓取/返回封面字节 */
export function coverUrl(path: string): string {
  return `${BASE_URL}/cover?path=${encodeURIComponent(path)}`
}

/** 正文图片代理 */
export function contentImageUrl(bookUrl: string, src: string, width = 640): string {
  return `${BASE_URL}/image?url=${encodeURIComponent(bookUrl)}&path=${encodeURIComponent(src)}&width=${width}`
}
