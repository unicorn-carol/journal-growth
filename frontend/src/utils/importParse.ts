import type { ImportPreviewEntry } from '@/types/import'

const DATE_LINE =
  /^\s*日期[:：]\s*(\d{4})[-年/.](\d{1,2})[-月/.](\d{1,2})日?\s*$/u
const ISO_INLINE = /(\d{4})-(\d{1,2})-(\d{1,2})/
const CN_INLINE = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/

function padDate(y: string, m: string, d: string) {
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function extractDate(lines: string[]): { date: string; inferred: boolean; rest: string[] } {
  const rest = [...lines]
  for (let i = 0; i < Math.min(rest.length, 4); i++) {
    const m = rest[i].match(DATE_LINE)
    if (m) {
      rest.splice(i, 1)
      return { date: padDate(m[1], m[2], m[3]), inferred: false, rest }
    }
  }
  const head = rest.slice(0, 3).join('\n')
  const iso = head.match(ISO_INLINE)
  if (iso) {
    return { date: padDate(iso[1], iso[2], iso[3]), inferred: true, rest }
  }
  const cn = head.match(CN_INLINE)
  if (cn) {
    return { date: padDate(cn[1], cn[2], cn[3]), inferred: true, rest }
  }
  return { date: todayIso(), inferred: true, rest }
}

function splitBlocks(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  // 优先按 --- 分隔
  if (/\n---+\n/.test(`\n${normalized}\n`)) {
    return normalized
      .split(/\n---+\n/)
      .map((b) => b.trim())
      .filter(Boolean)
  }

  // 再按 Markdown 一级标题拆篇
  if (/^#\s+/m.test(normalized)) {
    const parts = normalized.split(/\n(?=#\s+)/)
    return parts.map((b) => b.trim()).filter(Boolean)
  }

  // Word 模板常见：空行分隔多篇（标题单独一行）
  const loose = normalized.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  if (loose.length >= 2) {
    // 尝试把「标题 + 日期 + 正文」三元组合并
    const merged: string[] = []
    let i = 0
    while (i < loose.length) {
      const chunk = [loose[i]]
      if (i + 1 < loose.length && DATE_LINE.test(loose[i + 1])) {
        chunk.push(loose[i + 1])
        i += 1
        if (i + 1 < loose.length && !DATE_LINE.test(loose[i + 1]) && !/^#\s+/.test(loose[i + 1])) {
          chunk.push(loose[i + 1])
          i += 1
        }
      }
      merged.push(chunk.join('\n'))
      i += 1
    }
    if (merged.length >= 2) return merged
  }

  return [normalized]
}

export function parseJournalText(raw: string): ImportPreviewEntry[] {
  const blocks = splitBlocks(raw)
  const entries: ImportPreviewEntry[] = []

  blocks.forEach((block, idx) => {
    const lines = block
      .split('\n')
      .map((l) => l.replace(/\u00a0/g, ' ').trimEnd())
      .filter((l, i, arr) => !(l.trim() === '' && (i === 0 || i === arr.length - 1)))

    if (!lines.length) return

    let title = lines[0].replace(/^#+\s*/, '').trim() || `未命名日记 ${idx + 1}`
    const bodyLines = lines.slice(1)
    const { date, inferred, rest } = extractDate(bodyLines.length ? bodyLines : [])
    // 若第一行其实是日期，修正标题
    if (DATE_LINE.test(lines[0])) {
      const picked = extractDate(lines)
      title = picked.rest[0]?.replace(/^#+\s*/, '').trim() || title
      const body = picked.rest.slice(1).join('\n').trim() || picked.rest.join('\n').trim()
      entries.push({
        temp_id: `t${idx + 1}`,
        title,
        event_date: picked.date,
        date_inferred: picked.inferred,
        excerpt: (body || title).slice(0, 40) + ((body || title).length > 40 ? '……' : ''),
        body: body || title,
      })
      return
    }

    const body = rest.join('\n').trim()
    entries.push({
      temp_id: `t${idx + 1}`,
      title,
      event_date: date,
      date_inferred: inferred,
      excerpt: (body || title).slice(0, 40) + ((body || title).length > 40 ? '……' : ''),
      body: body || title,
    })
  })

  return entries
}

/** 从 docx ArrayBuffer 提取纯文本（按段落换行） */
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  const docXml = await zip.file('word/document.xml')?.async('string')
  if (!docXml) {
    throw Object.assign(new Error('无法读取 Word 正文'), { code: 40001 })
  }

  const paragraphs: string[] = []
  const pRegex = /<w:p[\s\S]*?<\/w:p>/g
  const matches = docXml.match(pRegex) ?? []
  for (const p of matches) {
    const texts: string[] = []
    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g
    let m: RegExpExecArray | null
    while ((m = tRegex.exec(p))) {
      texts.push(
        m[1]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'"),
      )
    }
    paragraphs.push(texts.join(''))
  }
  return paragraphs.join('\n')
}

export async function extractMarkdownFromZip(buffer: ArrayBuffer): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  const mdFiles = Object.keys(zip.files)
    .filter((n) => n.toLowerCase().endsWith('.md') && !zip.files[n].dir)
    .sort()
  if (!mdFiles.length) {
    throw Object.assign(new Error('压缩包内未找到 .md 文件'), { code: 40001 })
  }
  const chunks: string[] = []
  for (const name of mdFiles) {
    const text = await zip.file(name)!.async('string')
    chunks.push(text.trim())
  }
  return chunks.join('\n\n---\n\n')
}

export async function fileToPreviewEntries(file: File): Promise<ImportPreviewEntry[]> {
  const name = file.name.toLowerCase()
  let text = ''

  if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')) {
    text = await file.text()
  } else if (name.endsWith('.docx')) {
    text = await extractDocxText(await file.arrayBuffer())
  } else if (name.endsWith('.zip')) {
    text = await extractMarkdownFromZip(await file.arrayBuffer())
  } else if (!name.includes('.')) {
    text = await file.text()
  } else {
    throw Object.assign(new Error('不支持的文件类型'), { code: 40001 })
  }

  const entries = parseJournalText(text)
  if (!entries.length) {
    throw Object.assign(new Error('未能从文件中解析出日记内容，请按模板整理后重试'), {
      code: 40001,
    })
  }
  return entries
}
