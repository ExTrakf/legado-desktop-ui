import { BASE_URL, ApiError, getToken } from './http'
import type { BookSource } from '@/types'

/**
 * 导入 JS 书源（POST /saveJsSource）。
 * 契约：Content-Type 必须为 text/plain、Content-Length ≤ 1 MiB、令牌保护。
 */
export async function importJsSource(script: string, openedSourceUrl?: string): Promise<BookSource> {
  const url = new URL('/saveJsSource', BASE_URL)
  if (openedSourceUrl) url.searchParams.set('openedSourceUrl', openedSourceUrl)
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'text/plain' }
  if (token) headers['x-legado-token'] = token

  let resp: Response
  try {
    resp = await fetch(url.toString(), { method: 'POST', headers, body: script })
  } catch {
    throw new ApiError('无法连接后端服务，请确认 legado-desktop 已在运行')
  }
  const text = await resp.text()
  let parsed: { isSuccess: boolean; errorMsg: string; data: BookSource | null }
  try {
    parsed = JSON.parse(text) as typeof parsed
  } catch {
    throw new ApiError(text || `HTTP ${resp.status}`)
  }
  if (!parsed.isSuccess) throw new ApiError(parsed.errorMsg || 'JS 源导入失败')
  return parsed.data as BookSource
}

/**
 * 导入本地书籍（POST /addLocalBook，multipart/form-data）。
 * 字段：fileName 参数 + fileData 文件域；后端按文件名安全校验。
 */
export async function addLocalBook(fileName: string, fileData: Blob): Promise<boolean> {
  const form = new FormData()
  form.append('fileName', fileName)
  form.append('fileData', fileData, fileName)
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['x-legado-token'] = token

  let resp: Response
  try {
    resp = await fetch(`${BASE_URL}/addLocalBook`, { method: 'POST', headers, body: form })
  } catch {
    throw new ApiError('无法连接后端服务，请确认 legado-desktop 已在运行')
  }
  const text = await resp.text()
  let parsed: { isSuccess: boolean; errorMsg: string; data: boolean | null }
  try {
    parsed = JSON.parse(text) as typeof parsed
  } catch {
    throw new ApiError(text || `HTTP ${resp.status}`)
  }
  if (!parsed.isSuccess) throw new ApiError(parsed.errorMsg || '本地书籍导入失败')
  return true
}
