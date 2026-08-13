import { request } from './http'
import type { ReplaceRule } from '@/types'

/**
 * 全部替换规则。
 * 注意契约：后端 /getReplaceRules 的 data 是 JSON 字符串，需二次解析。
 */
export async function getReplaceRules(): Promise<ReplaceRule[]> {
  const raw = await request<string>('/getReplaceRules')
  try {
    const parsed = JSON.parse(raw) as ReplaceRule[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * 保存/新增规则（写路由，令牌保护）。
 * 契约：成功路径不设 isSuccess（恒 false 且 errorMsg 为空），以 allowEmptyError 兼容；
 * 调用方应随后 getReplaceRules() 核对。
 */
export async function saveReplaceRule(rule: ReplaceRule): Promise<void> {
  await request<string>('/saveReplaceRule', { method: 'POST', body: rule, allowEmptyError: true })
}

/** 删除规则（同 saveReplaceRule 的成功语义） */
export async function deleteReplaceRule(rule: ReplaceRule): Promise<void> {
  await request<string>('/deleteReplaceRule', { method: 'POST', body: rule, allowEmptyError: true })
}

/** 测试规则：body {rule, text}，返回替换后的文本 */
export async function testReplaceRule(rule: ReplaceRule, text: string): Promise<string> {
  return request<string>('/testReplaceRule', { method: 'POST', body: { rule, text } })
}
