export { useComments } from './useComments'
export { useMentions } from './useMentions'
export { useFileAttachments } from './useFileAttachments'
export { useActivity } from './useActivity'
export { useEscapeClose } from './useEscapeClose'

export { CommentThread } from './CommentThread'
export { ActivityFeed } from './ActivityFeed'
export { CommentInput } from './CommentInput'
export { MentionDropdown } from './MentionDropdown'
export { FilesTab } from './FilesTab'

export {
  getInitials,
  getFileIcon,
  formatFileSize,
  parseAttachment,
  renderContentWithMentions,
  getActivityIcon,
  isPreviewable,
} from './helpers'

export { MAX_FILE_SIZE, REACTION_EMOJIS } from './types'
export type { FileAttachment, AggregatedFile, MentionSuggestion, UpdatesVariant } from './types'
