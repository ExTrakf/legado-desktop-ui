import { getToken, request, setToken } from './http'

/** 查询令牌是否必填（无缓存） */
export async function getTokenRequired(): Promise<boolean> {
  return request<boolean>('/getJsSourceApiTokenRequired', { auth: false })
}

/** 运行时下发/清除后端令牌（body {"token":"..."}，空串=清除；无需令牌） */
export async function applyTokenToBackend(token: string): Promise<void> {
  await request<string>('/setJsSourceToken', {
    method: 'POST',
    body: { token },
    auth: false,
  })
}

/** 本地保存令牌（前端鉴权用） */
export function saveLocalToken(token: string) {
  setToken(token)
}

/** 读取本地令牌 */
export function readLocalToken(): string {
  return getToken()
}
