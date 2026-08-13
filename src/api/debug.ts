import { WS_URL, getToken } from './http'

export interface DebugHandle {
  close: () => void
}

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * 源调试 WebSocket（WS /bookSourceDebug | /rssSourceDebug）：
 * - 连接后发送 { tag, key? }，服务端逐行推送文本日志，结束以 NormalClosure 关闭
 * - 鉴权与搜索一致：Sec-WebSocket-Protocol: "legado, legado.token.<base64url(token)>"
 */
export function openDebugSocket(
  path: '/bookSourceDebug' | '/rssSourceDebug',
  payload: { tag: string; key?: string },
  onLog: (line: string) => void,
  onDone: () => void,
  onError: (message: string) => void,
): DebugHandle {
  const token = getToken()
  const protocols = token ? ['legado', `legado.token.${base64UrlEncode(token)}`] : ['legado']
  const ws = new WebSocket(`${WS_URL}${path}`, protocols)

  let opened = false
  let manuallyClosed = false

  ws.onopen = () => {
    if (manuallyClosed) return
    opened = true
    ws.send(JSON.stringify(payload))
  }

  ws.onmessage = (ev) => {
    if (manuallyClosed || typeof ev.data !== 'string') return
    const line = ev.data
    if (line) onLog(line)
  }

  ws.onerror = () => {
    if (manuallyClosed) return
    onError('调试连接失败，请检查后端与令牌')
  }

  ws.onclose = (ev) => {
    if (manuallyClosed) return
    if (!opened && ev.code === 1006) {
      onError('连接失败：请确认后端已启动，且 Web 书源访问令牌已正确配置')
      return
    }
    onDone()
  }

  return {
    close() {
      manuallyClosed = true
      try {
        ws.close()
      } catch {
        /* ignore */
      }
    },
  }
}
