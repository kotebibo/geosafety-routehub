'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect, useCallback, useMemo, memo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '@/contexts/AuthContext'
import {
  Send,
  Bot,
  Loader2,
  Sparkles,
  Wrench,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Square,
  Trash2,
  MessageSquare,
  SquarePen,
  LayoutGrid,
  FolderKanban,
  ArrowLeft,
  History,
  Copy,
  Check,
  RotateCcw,
  Pin,
  Pencil,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatSkeleton } from '@/features/chat/components/ChatSkeleton'
import { ChatChart } from '@/features/chat/components/ChatChart'
import { parseFollowups } from '@/lib/chat/followups'
import { hastTableToRows, downloadRowsAsCsv, downloadRowsAsXlsx } from '@/lib/chat/table-export'
import { boardCrudService } from '@/features/boards/services/board-crud.service'
import { workspaceService } from '@/features/workspaces/services/workspace.service'
import type { UIMessage } from 'ai'

const SUGGESTED_QUESTION_KEYS = [
  'chat.suggestions.monthlyRevenue',
  'chat.suggestions.debtors',
  'chat.suggestions.unpaidInvoices',
  'chat.suggestions.revenueTrend',
  'chat.suggestions.unvisited',
  'chat.suggestions.activeCompanies',
] as const

const TOOL_FRIENDLY_NAME_KEYS: Record<string, string> = {
  find_company: 'chat.tools.findCompany',
  list_companies: 'chat.tools.listCompanies',
  find_board: 'chat.tools.findBoard',
  get_board_details: 'chat.tools.getBoardDetails',
  count_board_items: 'chat.tools.countBoardItems',
  list_board_items: 'chat.tools.listBoardItems',
  list_workspaces_and_boards: 'chat.tools.listWorkspacesAndBoards',
  get_bank_transactions: 'chat.tools.getBankTransactions',
  get_payment_stats: 'chat.tools.getPaymentStats',
  list_inspectors: 'chat.tools.listInspectors',
  get_specialist_workload: 'chat.tools.getSpecialistWorkload',
  get_service_types: 'chat.tools.getServiceTypes',
  search_board_items: 'chat.tools.searchBoardItems',
  get_revenue_summary: 'chat.tools.getRevenueSummary',
  get_debtors: 'chat.tools.getDebtors',
  get_unpaid_invoices: 'chat.tools.getUnpaidInvoices',
  get_company_financials: 'chat.tools.getCompanyFinancials',
  get_expiring_contracts: 'chat.tools.getExpiringContracts',
  get_checkin_stats: 'chat.tools.getCheckinStats',
  list_recent_checkins: 'chat.tools.listRecentCheckins',
  get_unvisited_companies: 'chat.tools.getUnvisitedCompanies',
}

interface Conversation {
  id: string
  title: string | null
  pinned: boolean
  updated_at: string
}

/** Pinned first, then most recently active. */
function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)
  )
}

interface Attachment {
  type: 'board' | 'workspace'
  id: string
  name: string
}

interface AttachOption {
  type: 'board' | 'workspace'
  id: string
  name: string
  detail?: string
}

/** True when a fenced code block's language is `chart` (the AI chart protocol). */
function isChartCode(className?: string): boolean {
  return !!className?.split(' ').includes('language-chart')
}

/** True for the model's ```followups suggestion block. */
function isFollowupsCode(className?: string): boolean {
  return !!className?.split(' ').includes('language-followups')
}

/** Languages whose fenced blocks render as widgets — unwrap their <pre>. */
const WIDGET_LANGUAGES = ['language-chart', 'language-followups']

const REMARK_PLUGINS = [remarkGfm]

function FollowupChips({ source, onSend }: { source: string; onSend?: (text: string) => void }) {
  const questions = useMemo(() => parseFollowups(source), [source])
  if (!questions || !onSend) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {questions.map(question => (
        <button
          key={question}
          onClick={() => onSend(question)}
          className="rounded-full border border-monday-primary/30 px-3 py-1 text-left text-xs text-monday-primary transition-colors hover:bg-monday-primary/10"
        >
          {question}
        </button>
      ))}
    </div>
  )
}

// Memoized, with a stable `components` object: recreating the renderers on
// every parent re-render (e.g. each keystroke in the input) would make React
// treat them as new component types and remount the whole tree — charts
// included, replaying their animations.
const MarkdownContent = memo(function MarkdownContent({
  text,
  streaming,
  showFollowups,
  onFollowup,
}: {
  text: string
  streaming?: boolean
  /** Render the ```followups block as chips (last assistant message only). */
  showFollowups?: boolean
  onFollowup?: (text: string) => void
}) {
  const t = useTranslations()
  const components = useMemo<Components>(
    () => ({
      a: ({ href, children }) =>
        href?.startsWith('/') ? (
          <Link href={href} className="text-monday-primary underline hover:opacity-80">
            {children}
          </Link>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-monday-primary underline hover:opacity-80"
          >
            {children}
          </a>
        ),
      table: ({ node, children }) => {
        const exportRows = (format: 'csv' | 'xlsx') => {
          const rows = hastTableToRows(node)
          if (!rows.length) return
          const filename = `routehub-table-${new Date().toISOString().slice(0, 10)}.${format}`
          if (format === 'csv') downloadRowsAsCsv(rows, filename)
          else downloadRowsAsXlsx(rows, filename)
        }
        const exportButtonClass =
          'rounded border border-border-light bg-bg-primary px-1.5 py-0.5 text-[10px] font-medium text-text-secondary hover:text-text-primary'
        return (
          <div className="group/table relative overflow-x-auto pt-1">
            <div className="absolute right-0 top-0 z-10 flex gap-1 md:opacity-0 md:transition-opacity md:group-hover/table:opacity-100">
              <button
                type="button"
                onClick={() => exportRows('csv')}
                title={t('chat.exportCsv')}
                className={exportButtonClass}
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() => exportRows('xlsx')}
                title={t('chat.exportXlsx')}
                className={exportButtonClass}
              >
                XLSX
              </button>
            </div>
            <table className="w-full border-collapse text-xs">{children}</table>
          </div>
        )
      },
      th: ({ children }) => (
        <th className="border border-border-light bg-bg-primary px-2 py-1 text-left font-medium">
          {children}
        </th>
      ),
      td: ({ children }) => <td className="border border-border-light px-2 py-1">{children}</td>,
      pre: ({ node, children }) => {
        // Chart/followup blocks render as widgets, not preformatted text —
        // unwrap the <pre> so their divs aren't nested inside it.
        const codeChild = node?.children?.[0]
        if (
          codeChild?.type === 'element' &&
          Array.isArray(codeChild.properties?.className) &&
          codeChild.properties.className.some(
            c => typeof c === 'string' && WIDGET_LANGUAGES.includes(c)
          )
        ) {
          return <>{children}</>
        }
        return (
          <pre className="overflow-x-auto rounded-md bg-bg-primary p-2.5 text-xs">{children}</pre>
        )
      },
      code: ({ className, children }) => {
        const source = Array.isArray(children) ? children.join('') : String(children ?? '')
        if (isChartCode(className)) {
          return <ChatChart source={source} streaming={streaming} />
        }
        if (isFollowupsCode(className)) {
          return showFollowups ? <FollowupChips source={source} onSend={onFollowup} /> : null
        }
        return <code className="rounded bg-bg-primary px-1 py-0.5 text-xs">{children}</code>
      },
    }),
    [streaming, showFollowups, onFollowup, t]
  )

  return (
    <div className="chat-markdown space-y-2 leading-relaxed [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
})

interface ToolCallDisplayProps {
  toolName: string
  input: Record<string, unknown>
  output?: unknown
}

function ToolCallDisplay({ toolName, input, output }: ToolCallDisplayProps) {
  const t = useTranslations()
  const [expanded, setExpanded] = useState(false)
  const nameKey = TOOL_FRIENDLY_NAME_KEYS[toolName]

  return (
    <div className="my-1.5 rounded-md border border-border-light bg-bg-primary text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-text-secondary hover:text-text-primary"
      >
        <Wrench className="h-3 w-3 shrink-0" />
        <span className="font-medium">{nameKey ? t(nameKey) : toolName}</span>
        <span className="truncate text-text-tertiary">
          (
          {Object.entries(input)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join(', ')}
          )
        </span>
        <span className="ml-auto">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>
      {expanded && output != null && (
        <pre className="max-h-60 overflow-auto border-t border-border-light p-2.5 text-[11px] text-text-secondary">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  )
}

interface ConversationListProps {
  conversations: Conversation[]
  activeId: string
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onNewChat: () => void
  onRename: (id: string, title: string) => void
  onTogglePin: (conversation: Conversation) => void
  /** When set, shows a close button (used inside the mobile drawer). */
  onClose?: () => void
}

/** Conversation history list — shared by the desktop sidebar and mobile drawer. */
function ConversationList({
  conversations,
  activeId,
  onOpen,
  onDelete,
  onNewChat,
  onRename,
  onTogglePin,
  onClose,
}: ConversationListProps) {
  const t = useTranslations()
  const [search, setSearch] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const query = search.trim().toLowerCase()
  const visible = query
    ? conversations.filter(c => (c.title || '').toLowerCase().includes(query))
    : conversations

  const commitRename = (id: string) => {
    setRenamingId(null)
    const title = renameValue.trim()
    if (title) onRename(id, title)
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-text-primary">{t('chat.history.title')}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewChat}
            title={t('chat.header.newChat')}
            className="rounded-md p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          >
            <SquarePen className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title={t('common.close')}
              className="rounded-md p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {conversations.length > 0 && (
        <div className="px-3 pb-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('chat.history.search')}
            className="w-full rounded-md border border-border-light bg-bg-primary px-2.5 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-tertiary focus:border-border-focus"
          />
        </div>
      )}
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {visible.length === 0 ? (
          <p className="px-2 py-4 text-xs text-text-tertiary">
            {conversations.length === 0 ? t('chat.history.empty') : t('chat.attach.noResults')}
          </p>
        ) : (
          visible.map(conversation => (
            <div
              key={conversation.id}
              className={cn(
                'group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                conversation.id === activeId
                  ? 'bg-monday-primary/10 text-text-primary'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              )}
            >
              {renamingId === conversation.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(conversation.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(conversation.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="w-full rounded border border-border-focus bg-bg-primary px-1.5 py-1 text-sm text-text-primary outline-none"
                />
              ) : (
                <>
                  <button
                    onClick={() => onOpen(conversation.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
                  >
                    {conversation.pinned ? (
                      <Pin className="h-3.5 w-3.5 shrink-0 text-monday-primary" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{conversation.title || '…'}</span>
                  </button>
                  {/* Touch screens have no hover — keep the menu visible below md. */}
                  <button
                    onClick={() => setMenuId(menuId === conversation.id ? null : conversation.id)}
                    className="shrink-0 rounded p-1.5 text-text-tertiary hover:text-text-primary md:hidden md:group-hover:block"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                  {menuId === conversation.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                      <div className="absolute right-1 top-8 z-40 w-40 rounded-lg border border-border-light bg-bg-primary py-1 shadow-lg">
                        <button
                          onClick={() => {
                            setMenuId(null)
                            onTogglePin(conversation)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
                        >
                          <Pin className="h-3.5 w-3.5 text-text-secondary" />
                          {conversation.pinned ? t('chat.history.unpin') : t('chat.history.pin')}
                        </button>
                        <button
                          onClick={() => {
                            setMenuId(null)
                            setRenameValue(conversation.title || '')
                            setRenamingId(conversation.id)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-bg-hover"
                        >
                          <Pencil className="h-3.5 w-3.5 text-text-secondary" />
                          {t('chat.history.rename')}
                        </button>
                        <button
                          onClick={() => {
                            setMenuId(null)
                            onDelete(conversation.id)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-500 hover:bg-bg-hover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('chat.history.delete')}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </>
  )
}

/** A message is worth rendering only once it has visible text or a tool call. */
function hasRenderableParts(message: UIMessage): boolean {
  return message.parts.some(
    part => (part.type === 'text' && part.text.trim().length > 0) || part.type === 'dynamic-tool'
  )
}

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-monday-primary/10">
        <Bot className="h-4 w-4 text-monday-primary" />
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-bg-secondary px-4 py-3">
        <span className="flex gap-1">
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        <span className="text-xs text-text-tertiary">{label}</span>
      </div>
    </div>
  )
}

function MessageAttachments({ message }: { message: UIMessage }) {
  const attachments = (message.metadata as { attachments?: Attachment[] } | undefined)?.attachments
  if (!attachments?.length) return null
  return (
    <div className="mb-1.5 flex flex-wrap gap-1">
      {attachments.map(attachment => (
        <span
          key={attachment.id}
          className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px]"
        >
          {attachment.type === 'board' ? (
            <LayoutGrid className="h-3 w-3" />
          ) : (
            <FolderKanban className="h-3 w-3" />
          )}
          {attachment.name}
        </span>
      ))}
    </div>
  )
}

/** Message text without the machine-facing chart/followups blocks. */
function messagePlainText(message: UIMessage): string {
  return message.parts
    .filter(part => part.type === 'text')
    .map(part => (part as { text: string }).text)
    .join('\n\n')
    .replace(/```(?:chart|followups)[\s\S]*?(?:```|$)/g, '')
    .trim()
}

interface AssistantActionsProps {
  message: UIMessage
  canRetry: boolean
  onRetry: () => void
}

function AssistantActions({ message, canRetry, onRetry }: AssistantActionsProps) {
  const t = useTranslations()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messagePlainText(message))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard may be unavailable (http, permissions) — nothing to do
    }
  }

  return (
    <div className="mt-1 flex items-center gap-1">
      <button
        onClick={handleCopy}
        title={copied ? t('chat.copied') : t('chat.copy')}
        className="rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      {canRetry && (
        <button
          onClick={onRetry}
          title={t('chat.retry')}
          className="rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

interface MessageContentProps {
  message: UIMessage
  streaming?: boolean
  isLast?: boolean
  onFollowup?: (text: string) => void
}

function MessageContent({ message, streaming, isLast, onFollowup }: MessageContentProps) {
  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          return message.role === 'assistant' ? (
            <MarkdownContent
              key={i}
              text={part.text}
              streaming={streaming}
              showFollowups={isLast}
              onFollowup={onFollowup}
            />
          ) : (
            <div key={i} className="whitespace-pre-wrap leading-relaxed">
              {part.text}
            </div>
          )
        }
        if (part.type === 'dynamic-tool') {
          return (
            <ToolCallDisplay
              key={i}
              toolName={part.toolName}
              input={part.input as Record<string, unknown>}
              output={part.state === 'output-available' ? part.output : undefined}
            />
          )
        }
        return null
      })}
    </>
  )
}

interface AttachMenuProps {
  onSelect: (option: AttachOption) => void
  onClose: () => void
}

interface PickerBoard {
  id: string
  name: string
  workspaceId: string | null
  workspaceName: string | null
}

interface PickerWorkspace {
  id: string
  name: string
}

function AttachMenu({ onSelect, onClose }: AttachMenuProps) {
  const t = useTranslations()
  // Board flow drills down: workspaces first, then that workspace's boards —
  // but typing in the search always searches boards globally.
  const [step, setStep] = useState<'type' | 'workspace' | 'boardWorkspaces' | 'boardList'>('type')
  const [boards, setBoards] = useState<PickerBoard[]>([])
  const [workspaces, setWorkspaces] = useState<PickerWorkspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<PickerWorkspace | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const loadData = async (nextStep: 'workspace' | 'boardWorkspaces') => {
    setStep(nextStep)
    setSearch('')
    setLoading(true)
    try {
      const [allBoards, allWorkspaces] = await Promise.all([
        boardCrudService.getBoards(),
        workspaceService.getWorkspaces(),
      ])
      setBoards(
        allBoards.map(b => {
          const ws = (b as { workspace?: { id?: string; name?: string } }).workspace
          return {
            id: b.id,
            name: b.name,
            workspaceId: ws?.id || null,
            workspaceName: ws?.name || null,
          }
        })
      )
      setWorkspaces(allWorkspaces.map(w => ({ id: w.id, name: w.name })))
    } catch (err) {
      console.error('Failed to load attach options:', err)
      setBoards([])
      setWorkspaces([])
    } finally {
      setLoading(false)
    }
  }

  const pickBoard = (board: PickerBoard) => {
    onSelect({ type: 'board', id: board.id, name: board.name })
    onClose()
  }

  const query = search.trim().toLowerCase()

  const goBack = () => {
    setSearch('')
    if (step === 'boardList') setStep('boardWorkspaces')
    else setStep('type')
  }

  const boardRow = (board: PickerBoard, showWorkspace: boolean) => (
    <button
      key={board.id}
      onClick={() => pickBoard(board)}
      className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-text-primary hover:bg-bg-hover"
    >
      <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
      <span className="truncate">{board.name}</span>
      {showWorkspace && board.workspaceName && (
        <span className="ml-auto shrink-0 text-xs text-text-tertiary">{board.workspaceName}</span>
      )}
    </button>
  )

  let listContent: ReactNode
  if (loading) {
    listContent = (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
      </div>
    )
  } else if (step === 'workspace') {
    const filtered = workspaces.filter(w => w.name.toLowerCase().includes(query))
    listContent = filtered.length ? (
      filtered.map(ws => (
        <button
          key={ws.id}
          onClick={() => {
            onSelect({ type: 'workspace', id: ws.id, name: ws.name })
            onClose()
          }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-text-primary hover:bg-bg-hover"
        >
          <FolderKanban className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
          <span className="truncate">{ws.name}</span>
        </button>
      ))
    ) : (
      <p className="px-3 py-2 text-xs text-text-tertiary">{t('chat.attach.noResults')}</p>
    )
  } else if (step === 'boardWorkspaces') {
    if (query) {
      // Global board search across all workspaces
      const filtered = boards.filter(b => b.name.toLowerCase().includes(query))
      listContent = filtered.length ? (
        filtered.map(b => boardRow(b, true))
      ) : (
        <p className="px-3 py-2 text-xs text-text-tertiary">{t('chat.attach.noResults')}</p>
      )
    } else {
      listContent = workspaces.length ? (
        workspaces.map(ws => (
          <button
            key={ws.id}
            onClick={() => {
              setSelectedWorkspace(ws)
              setSearch('')
              setStep('boardList')
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-text-primary hover:bg-bg-hover"
          >
            <FolderKanban className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
            <span className="truncate">{ws.name}</span>
            <span className="ml-auto shrink-0 text-xs text-text-tertiary">
              {boards.filter(b => b.workspaceId === ws.id).length}
            </span>
          </button>
        ))
      ) : (
        <p className="px-3 py-2 text-xs text-text-tertiary">{t('chat.attach.noResults')}</p>
      )
    }
  } else if (step === 'boardList') {
    const scoped = boards.filter(b => b.workspaceId === selectedWorkspace?.id)
    const filtered = query ? scoped.filter(b => b.name.toLowerCase().includes(query)) : scoped
    listContent = filtered.length ? (
      filtered.map(b => boardRow(b, false))
    ) : (
      <p className="px-3 py-2 text-xs text-text-tertiary">{t('chat.attach.noResults')}</p>
    )
  }

  return (
    <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-lg border border-border-light bg-bg-primary shadow-lg">
      {step === 'type' ? (
        <div className="p-1.5">
          <button
            onClick={() => loadData('boardWorkspaces')}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-bg-hover"
          >
            <LayoutGrid className="h-4 w-4 text-text-secondary" />
            {t('chat.attach.board')}
          </button>
          <button
            onClick={() => loadData('workspace')}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-bg-hover"
          >
            <FolderKanban className="h-4 w-4 text-text-secondary" />
            {t('chat.attach.workspace')}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5 border-b border-border-light p-2">
            <button onClick={goBack} className="rounded p-1 text-text-secondary hover:bg-bg-hover">
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            {step === 'boardList' && selectedWorkspace && (
              <span className="max-w-[80px] shrink-0 truncate text-xs text-text-tertiary">
                {selectedWorkspace.name}
              </span>
            )}
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('chat.attach.searchPlaceholder')}
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">{listContent}</div>
        </div>
      )}
    </div>
  )
}

export default function ChatPage() {
  const t = useTranslations()
  const router = useRouter()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const scrollRef = useRef<HTMLDivElement>(null)
  const attachRef = useRef<HTMLDivElement>(null)

  const [inputValue, setInputValue] = useState('')
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID())
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { messages, sendMessage, status, setMessages, stop, regenerate, error, clearError } =
    useChat()

  const isLoading = status === 'submitted' || status === 'streaming'
  const lastUserMessageId = [...messages].reverse().find(m => m.role === 'user')?.id

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations')
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch {
      // list refresh is best-effort
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/')
    }
  }, [authLoading, isAdmin, router])

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchConversations()
    }
  }, [authLoading, isAdmin, fetchConversations])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // When a response finishes streaming, the conversation was persisted — refresh the list.
  useEffect(() => {
    if (status === 'ready' && messages.length > 0) {
      fetchConversations()
    }
  }, [status, messages.length, fetchConversations])

  // Close the mobile history drawer with Escape.
  useEffect(() => {
    if (!historyOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHistoryOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [historyOpen])

  // Close the attach menu on outside click.
  useEffect(() => {
    if (!attachMenuOpen) return
    const onClick = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [attachMenuOpen])

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return
    setInputValue('')
    clearError()
    sendMessage(
      {
        text,
        // Shown on the message bubble and persisted with history.
        metadata: attachments.length ? { attachments } : undefined,
      },
      {
        body: {
          conversationId,
          attachments: attachments.map(({ type, id }) => ({ type, id })),
        },
      }
    )
  }

  // Stable identity for the memoized markdown renderer (follow-up chips).
  const handleSendRef = useRef(handleSend)
  handleSendRef.current = handleSend
  const handleFollowup = useCallback((text: string) => handleSendRef.current(text), [])

  const handleRetry = () => {
    if (isLoading) return
    clearError()
    regenerate({
      body: {
        conversationId,
        attachments: attachments.map(({ type, id }) => ({ type, id })),
      },
    })
  }

  /** Put the last question back into the input and rewind the conversation to it. */
  const handleEditMessage = (messageId: string) => {
    if (isLoading) return
    const index = messages.findIndex(m => m.id === messageId)
    if (index === -1) return
    const message = messages[index]
    const meta = (message.metadata as { attachments?: Attachment[] } | undefined)?.attachments
    setInputValue(messagePlainText(message))
    setMessages(messages.slice(0, index))
    if (meta?.length) setAttachments(meta)
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(crypto.randomUUID())
    setAttachments([])
  }

  const handleOpenConversation = async (id: string) => {
    if (id === conversationId || isLoading) return
    setLoadingConversation(true)
    try {
      const res = await fetch(`/api/chat/conversations/${id}`)
      if (!res.ok) return
      const data = await res.json()
      const loaded = (data.messages || []) as UIMessage[]
      setMessages(loaded)
      setConversationId(id)
      // Restore the board/workspace context the conversation was using, so
      // continuing the thread keeps the same grounding.
      const lastWithAttachments = [...loaded]
        .reverse()
        .find(
          m =>
            m.role === 'user' &&
            (m.metadata as { attachments?: Attachment[] } | undefined)?.attachments?.length
        )
      setAttachments(
        (lastWithAttachments?.metadata as { attachments?: Attachment[] } | undefined)
          ?.attachments || []
      )
    } catch (err) {
      console.error('Failed to load conversation:', err)
    } finally {
      setLoadingConversation(false)
    }
  }

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (id === conversationId) {
        handleNewChat()
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  const handleRenameConversation = async (id: string, title: string) => {
    setConversations(prev => prev.map(c => (c.id === id ? { ...c, title } : c)))
    try {
      await fetch(`/api/chat/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
    } catch (err) {
      console.error('Failed to rename conversation:', err)
    }
  }

  const handleTogglePin = async (conversation: Conversation) => {
    const pinned = !conversation.pinned
    setConversations(prev =>
      sortConversations(prev.map(c => (c.id === conversation.id ? { ...c, pinned } : c)))
    )
    try {
      await fetch(`/api/chat/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned }),
      })
    } catch (err) {
      console.error('Failed to pin conversation:', err)
    }
  }

  const handleAttach = (option: AttachOption) => {
    setAttachments(prev =>
      prev.some(a => a.id === option.id)
        ? prev
        : [...prev, { type: option.type, id: option.id, name: option.name }]
    )
  }

  if (authLoading) {
    return <ChatSkeleton />
  }

  return (
    <div className="flex h-full bg-bg-primary">
      {/* Conversation history — desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border-light md:flex">
        <ConversationList
          conversations={conversations}
          activeId={conversationId}
          onOpen={handleOpenConversation}
          onDelete={handleDeleteConversation}
          onNewChat={handleNewChat}
          onRename={handleRenameConversation}
          onTogglePin={handleTogglePin}
        />
      </aside>

      {/* Conversation history — mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden',
          historyOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setHistoryOpen(false)}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border-light bg-bg-primary shadow-xl transition-transform duration-200 md:hidden',
          historyOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <ConversationList
          conversations={conversations}
          activeId={conversationId}
          onOpen={id => {
            setHistoryOpen(false)
            handleOpenConversation(id)
          }}
          onDelete={handleDeleteConversation}
          onNewChat={() => {
            setHistoryOpen(false)
            handleNewChat()
          }}
          onRename={handleRenameConversation}
          onTogglePin={handleTogglePin}
          onClose={() => setHistoryOpen(false)}
        />
      </aside>

      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-border-light bg-bg-primary px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              title={t('chat.history.title')}
              className="-ml-1 rounded-md p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary md:hidden"
            >
              <History className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-monday-primary/10">
              <Bot className="h-5 w-5 text-monday-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">{t('chat.header.title')}</h1>
              <p className="text-xs text-text-secondary">{t('chat.header.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
          {loadingConversation ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-monday-primary/10">
                <Sparkles className="h-8 w-8 text-monday-primary" />
              </div>
              <h2 className="mb-2 text-lg font-medium text-text-primary">
                {t('chat.empty.title')}
              </h2>
              <p className="mb-8 max-w-md text-center text-sm text-text-secondary">
                {t('chat.empty.description')}
              </p>
              <div className="grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTED_QUESTION_KEYS.map((key, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(t(key))}
                    className="rounded-lg border border-border-light px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:border-monday-primary/40 hover:bg-monday-primary/10"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages
                .filter(m => m.role === 'user' || hasRenderableParts(m))
                .map(message => {
                  const isLastMessage = message.id === messages[messages.length - 1]?.id
                  return (
                    <div
                      key={message.id}
                      className={cn('flex gap-3', message.role === 'user' && 'justify-end')}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-monday-primary/10">
                          <Bot className="h-4 w-4 text-monday-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'flex max-w-[80%] flex-col',
                          message.role === 'user' && 'items-end'
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-xl px-4 py-2.5 text-sm',
                            message.role === 'user'
                              ? 'bg-monday-primary text-white'
                              : 'bg-bg-secondary text-text-primary'
                          )}
                        >
                          {message.role === 'user' && <MessageAttachments message={message} />}
                          <MessageContent
                            message={message}
                            streaming={isLoading && isLastMessage}
                            isLast={isLastMessage}
                            onFollowup={handleFollowup}
                          />
                        </div>
                        {message.role === 'assistant' && !(isLoading && isLastMessage) && (
                          <AssistantActions
                            message={message}
                            canRetry={isLastMessage && !isLoading}
                            onRetry={handleRetry}
                          />
                        )}
                        {message.role === 'user' &&
                          message.id === lastUserMessageId &&
                          !isLoading && (
                            <button
                              onClick={() => handleEditMessage(message.id)}
                              title={t('common.edit')}
                              className="mt-1 rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                      </div>
                      {/* Same avatar as the navbar: initial on the brand color. */}
                      {message.role === 'user' && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-monday-primary text-xs font-medium text-white">
                          {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  )
                })}
              {isLoading &&
                !(
                  messages[messages.length - 1]?.role === 'assistant' &&
                  hasRenderableParts(messages[messages.length - 1])
                ) && <ThinkingIndicator label={t('chat.thinking')} />}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border-light bg-bg-primary px-4 py-3 md:px-6 md:py-4">
          <div className="mx-auto max-w-3xl">
            {error && !isLoading && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
                <span>{t('chat.error')}</span>
                <button
                  onClick={handleRetry}
                  className="flex shrink-0 items-center gap-1 font-medium hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t('chat.retry')}
                </button>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachments.map(attachment => (
                  <span
                    key={attachment.id}
                    className="flex items-center gap-1.5 rounded-full border border-border-light bg-bg-secondary px-2.5 py-1 text-xs text-text-primary"
                  >
                    {attachment.type === 'board' ? (
                      <LayoutGrid className="h-3 w-3 text-text-secondary" />
                    ) : (
                      <FolderKanban className="h-3 w-3 text-text-secondary" />
                    )}
                    {attachment.name}
                    <button
                      onClick={() =>
                        setAttachments(prev => prev.filter(a => a.id !== attachment.id))
                      }
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSend(inputValue)
              }}
              className="flex gap-2"
            >
              <div ref={attachRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAttachMenuOpen(open => !open)}
                  title={t('chat.attach.label')}
                  className={cn(
                    'flex h-full items-center rounded-lg border border-border-medium px-3 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary',
                    attachMenuOpen && 'bg-bg-hover text-text-primary'
                  )}
                >
                  <Plus className="h-4 w-4" />
                </button>
                {attachMenuOpen && (
                  <AttachMenu onSelect={handleAttach} onClose={() => setAttachMenuOpen(false)} />
                )}
              </div>
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={t('chat.inputPlaceholder')}
                className="flex-1 rounded-lg border border-border-medium bg-bg-primary px-4 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-border-focus focus:ring-1 focus:ring-border-focus"
                disabled={isLoading}
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  title={t('chat.stop')}
                  className="flex items-center gap-2 rounded-lg bg-monday-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-monday-primary-hover"
                >
                  <Square className="h-3.5 w-3.5" fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="flex items-center gap-2 rounded-lg bg-monday-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-monday-primary-hover disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
