import { contentImageUrl } from '@/api/books'

/**
 * 把后端正文文本转成安全 HTML：
 * - 文本按 \n 分段成 <p>
 * - <img> 标签的 src 改写为后端图片代理地址（避免直连源站 CORS/防盗链）
 * - 其余内容一律 HTML 转义
 */
export function formatContent(content: string, bookUrl: string): string {
  const imgTagRe = /<img\s+[^>]*?src=["']([^"']+)["'][^>]*>/gi
  const images: { placeholder: string; src: string }[] = []
  let text = content.replace(imgTagRe, (_raw, src: string) => {
    const placeholder = `\u0000IMG${images.length}\u0000`
    images.push({ placeholder, src })
    return placeholder
  })

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const html = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')

  return html.replace(/\u0000IMG(\d+)\u0000/g, (_, idx: string) => {
    const img = images[Number(idx)]
    if (!img) return ''
    return `<img src="${escapeHtml(contentImageUrl(bookUrl, img.src))}" loading="lazy" alt="" referrerpolicy="no-referrer">`
  })
}
