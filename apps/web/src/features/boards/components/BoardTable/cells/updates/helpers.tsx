import React from 'react'
import {
  MessageSquare,
  History,
  ArrowRightLeft,
  UserCheck,
  FileEdit,
  PlusCircle,
  File,
  Image,
  FileText,
} from 'lucide-react'

export function getInitials(name: string) {
  const parts = name.split(' ')
  return (
    parts
      .map(p => p.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  )
}

export function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />
  return <File className="w-4 h-4 text-text-secondary" />
}

export function formatFileSize(bytes: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Parse a comment attachment which may be a JSON string or a plain URL string
export function parseAttachment(att: any, idx: number): any {
  let parsed: any = att
  try {
    parsed = typeof att === 'string' ? JSON.parse(att) : att
  } catch {
    // plain URL string
    parsed = { name: `File ${idx + 1}`, url: att, type: '', size: 0 }
  }
  return parsed
}

// Render content with highlighted @mentions
export function renderContentWithMentions(content: string) {
  const mentionRegex = /@([\p{L}\p{N}\s]+?)(?=\s{2}|$|@)/gu
  const parts = content.split(mentionRegex)

  return parts.map((part, index) => {
    // Every odd index is a mention name (captured group)
    if (index % 2 === 1) {
      return (
        <span key={index} className="text-text-link font-medium bg-bg-selected px-1 rounded">
          @{part}
        </span>
      )
    }
    return <span key={index}>{part}</span>
  })
}

export function getActivityIcon(type: string) {
  switch (type) {
    case 'created':
      return <PlusCircle className="w-4 h-4 text-green-500" />
    case 'updated':
      return <FileEdit className="w-4 h-4 text-text-link" />
    case 'status_changed':
      return <ArrowRightLeft className="w-4 h-4 text-orange-500" />
    case 'assigned':
    case 'reassigned':
      return <UserCheck className="w-4 h-4 text-purple-500" />
    case 'comment':
      return <MessageSquare className="w-4 h-4 text-blue-500" />
    default:
      return <History className="w-4 h-4 text-text-secondary" />
  }
}

export function isPreviewable(file: { type: string; name: string }) {
  return (
    file.type.startsWith('image/') ||
    file.type === 'application/pdf' ||
    file.name.endsWith('.docx') ||
    file.name.endsWith('.doc')
  )
}
