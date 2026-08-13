import { request } from './http'
import type { HttpLogRecord, HttpLogSummary } from '@/types'

export interface HttpLogsResult {
  recording: boolean
  logs: HttpLogSummary[]
}

/** HTTP 日志列表（令牌保护） */
export async function getHttpLogs(limit = 50): Promise<HttpLogsResult> {
  return request<HttpLogsResult>('/getHttpLogs', { query: { limit } })
}

/** HTTP 日志详情（令牌保护） */
export async function getHttpLog(id: number): Promise<HttpLogRecord> {
  return request<HttpLogRecord>('/getHttpLog', { query: { id } })
}
