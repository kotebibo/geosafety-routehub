export type UpdatesVariant = 'panel' | 'modal'

export interface FileAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  path?: string
  uploaded_at?: string
}

export interface AggregatedFile extends FileAttachment {
  source: string // column name or "Comment attachment"
}

export interface MentionSuggestion {
  id: string
  name: string
  email?: string
}

export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export const REACTION_EMOJIS = [
  { key: 'thumbs_up', emoji: '👍' },
  { key: 'heart', emoji: '❤️' },
  { key: 'fire', emoji: '🔥' },
  { key: 'clap', emoji: '👏' },
  { key: 'eyes', emoji: '👀' },
  { key: 'check', emoji: '✅' },
  { key: 'laugh', emoji: '😂' },
  { key: 'thinking', emoji: '🤔' },
]
