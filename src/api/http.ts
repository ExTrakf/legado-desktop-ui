import type { ApiResponse } from '@/types'

/** 后端地址（legado-desktop 默认端口，可被 build 时环境覆盖） */
export const BASE_URL: string =
  (import.meta.env.VITE_LEGADO_BASE_URL as string | undefined) ?? 'http://127.0.0.1:2323'

export const WS_URL: string =
  (import.meta.env.VITE_LEGADO_WS_URL as string | undefined) ?? 'ws://127.0.0.1:2324'

const TOKEN_KEY = 'legado:js-token'

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function setToken(token: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function unwrap<T>(body: ApiResponse<T>): T {
  if (!body.isSuccess) {
    throw new ApiError(body.errorMsg || '请求失败')
  }
  return body.data as T
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  query?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  /** 需要令牌保护的路由默认带 token；显式 false 表示豁免 */
  auth?: boolean
  /**
   * 兼容后端"成功但不设 isSuccess"的写路由（/saveReplaceRule /deleteReplaceRule）：
   * 响应 `{isSuccess:false, errorMsg:""}` 视为成功。
   */
  allowEmptyError?: boolean
  /** 原始请求体（如 JS 源 text/plain），此时 body 应为 string 且不 JSON 序列化 */
  rawBody?: string
  contentType?: string
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, auth = true, allowEmptyError = false, rawBody, contentType } = options
  const url = new URL(path, BASE_URL)

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, String(v))
    }
  }

  const headers: Record<string, string> = {}
  if (rawBody !== undefined) headers['Content-Type'] = contentType ?? 'text/plain'
  else if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers['x-legado-token'] = token
  }

  let resp: Response
  try {
    resp = await fetch(url.toString(), {
      method,
      headers,
      body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('无法连接后端服务，请确认 legado-desktop 已在运行')
  }

  const text = await resp.text()
  let parsed: ApiResponse<T> | null = null
  try {
    parsed = JSON.parse(text) as ApiResponse<T>
  } catch {
    // 非 JSON（如 500 纯文本）
  }

  if (!resp.ok || !parsed || typeof parsed.isSuccess !== 'boolean') {
    const msg = parsed?.errorMsg || text || `HTTP ${resp.status}`
    throw new ApiError(msg)
  }
  // 兼容：写路由成功但未设 isSuccess（errorMsg 为空）
  if (!parsed.isSuccess && allowEmptyError && !parsed.errorMsg) {
    return parsed.data as T
  }
  return unwrap(parsed)
}
