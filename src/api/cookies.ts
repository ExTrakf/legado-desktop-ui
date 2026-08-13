import { request } from './http'

export interface CookiePair {
  url: string
  cookie: string
}

/** 全部持久化 Cookie（令牌保护） */
export async function getCookies(): Promise<CookiePair[]> {
  return request<CookiePair[]>('/getCookies')
}

/** 写入/更新 Cookie（cookie 为完整 "k=v; k2=v2" 串，令牌保护） */
export async function setCookie(url: string, cookie: string): Promise<void> {
  await request<string>('/setCookie', { method: 'POST', body: { url, cookie } })
}

/** 清除 Cookie：url 为空 = 清空全部（令牌保护） */
export async function clearCookies(url = ''): Promise<void> {
  await request<string>('/clearCookies', { method: 'POST', body: { url } })
}
