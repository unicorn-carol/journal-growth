import type { TagDTO } from '@/types/insight'
import type { TagKind } from '@/types/entry'
import { PRESET_EMOTION, PRESET_THINKING } from '@/mocks/entries'
import { EMOTION_COLORS, colorForTag } from '@/utils/tagColors'

function delay(ms = 100) {
  return new Promise((r) => setTimeout(r, ms))
}

const EMOTION_SHAPE: Record<string, string | null> = {
  平静: 'calm_wave',
  喜悦: 'joy_blob',
  安心: 'calm_wave',
  焦虑: 'anxious_fuzz',
  疲惫: 'low_mud',
  迷茫: 'anxious_fuzz',
  紧张: 'anxious_fuzz',
}

const tagStore: TagDTO[] = [
  ...PRESET_THINKING.map((t, i) => ({
    ...t,
    color: colorForTag(t.name, null, 'thinking'),
    shape: null,
    sort_order: (i + 1) * 10,
    is_system_default: true,
  })),
  ...PRESET_EMOTION.map((t, i) => {
    return {
      ...t,
      color: EMOTION_COLORS[t.name] ?? colorForTag(t.name, null, 'emotion'),
      shape: EMOTION_SHAPE[t.name] ?? null,
      sort_order: i + 1,
      is_system_default: true,
    }
  }),
]

export async function mockListTags(kind?: TagKind): Promise<{ items: TagDTO[] }> {
  await delay()
  const items = kind ? tagStore.filter((t) => t.kind === kind) : [...tagStore]
  return { items: structuredClone(items) }
}

export async function mockCreateTag(input: {
  kind: TagKind
  name: string
  color?: string | null
  shape?: string | null
}): Promise<TagDTO> {
  await delay()
  const name = input.name.trim()
  if (!name) {
    const err = new Error('标签名不能为空') as Error & { code: number }
    err.code = 40001
    throw err
  }
  if (tagStore.some((t) => t.kind === input.kind && t.name === name)) {
    const err = new Error('同名标签已存在') as Error & { code: number }
    err.code = 40001
    throw err
  }
  const tag: TagDTO = {
    id: crypto.randomUUID(),
    kind: input.kind,
    name,
    color: input.color ?? colorForTag(name, null, input.kind),
    shape: input.shape ?? (input.kind === 'emotion' ? (EMOTION_SHAPE[name] ?? null) : null),
    sort_order: 1000 + tagStore.length,
    is_system_default: false,
  }
  tagStore.push(tag)
  return structuredClone(tag)
}

export async function mockUpdateTag(
  id: string,
  patch: Partial<Pick<TagDTO, 'name' | 'color' | 'shape' | 'sort_order'>>,
): Promise<TagDTO> {
  await delay()
  const tag = tagStore.find((t) => t.id === id)
  if (!tag) {
    const err = new Error('标签不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (tagStore.some((t) => t.id !== id && t.kind === tag.kind && t.name === name)) {
      const err = new Error('同名标签已存在') as Error & { code: number }
      err.code = 40001
      throw err
    }
    tag.name = name
  }
  if (patch.color !== undefined) tag.color = patch.color
  if (patch.shape !== undefined) tag.shape = patch.shape
  if (patch.sort_order !== undefined) tag.sort_order = patch.sort_order
  return structuredClone(tag)
}

export async function mockDeleteTag(id: string): Promise<{ ok: true }> {
  await delay()
  const idx = tagStore.findIndex((t) => t.id === id)
  if (idx < 0) {
    const err = new Error('标签不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  tagStore.splice(idx, 1)
  return { ok: true }
}
