import { WS_URL, getToken } from './http'
import type { SearchBook } from '@/types'

export type SearchEvent =
  | { type: 'batch'; originName: string; books: SearchBook[] }
  | { type: 'progress'; searched: number; total: number }
  | { type: 'done'; hasMore: boolean }
  | { type: 'error'; message: string }
  | { type: 'authError' }

export interface SearchHandle {
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
 * 多源搜索（WS /searchBook）：
 * - 客户端发送 { "key": "..." }
 * - 服务端每个源完成时推送一批 JSON 数组（SearchBook[]）
 * - 全部结束以 NormalClosure("Search finish") 关闭
 * - 鉴权：Sec-WebSocket-Protocol: "legado, legado.token.<base64url(token)>"
 */
export function searchBooks(
  key: string,
  onEvent: (event: SearchEvent) => void,
): SearchHandle {
  const token = getToken()
  const protocols = token ? ['legado', `legado.token.${base64UrlEncode(token)}`] : ['legado']
  const ws = new WebSocket(`${WS_URL}/searchBook`, protocols)

  let opened = false
  // 手动关闭后不再向调用方上报任何事件，
  // 否则旧 socket 的异步 onclose/onerror 会污染紧接着开始的下一场搜索。
  let manuallyClosed = false

  ws.onopen = () => {
    if (manuallyClosed) return
    opened = true
    ws.send(JSON.stringify({ key }))
  }

  ws.onmessage = (ev) => {
    if (manuallyClosed || typeof ev.data !== 'string') return
    let parsed: unknown
    try {
      parsed = JSON.parse(ev.data)
    } catch {
      return
    }
    if (Array.isArray(parsed)) {
      const books = parsed as SearchBook[]
      if (books.length > 0) {
        const originName = books[0]?.originName ?? ''
        onEvent({ type: 'batch', originName, books })
      }
    }
  }

  ws.onerror = () => {
    if (manuallyClosed) return
    onEvent({ type: 'error', message: '搜索连接失败，请检查后端与令牌' })
  }

  ws.onclose = (ev) => {
    if (manuallyClosed) return
    // 握手被 403 拒绝（令牌未配置/不匹配）：浏览器侧表现为从未 open + 异常关闭
    if (!opened && ev.code === 1006) {
      onEvent({ type: 'authError' })
      return
    }
    if (ev.code === 1003 || ev.code === 1008) {
      onEvent({ type: 'authError' })
      return
    }
    if (ev.code === 1000 || ev.code === 1006) {
      onEvent({ type: 'done', hasMore: false })
    }
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
