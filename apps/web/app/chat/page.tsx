'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '@/contexts/AuthContext'
import {
  Send,
  Bot,
  User,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatSkeleton } from '@/features/chat/components/ChatSkeleton'
import { boardCrudService } from '@/features/boards/services/board-crud.service'
import { workspaceService } from '@/features/workspaces/services/workspace.service'
import type { UIMessage } from 'ai'

const SUGGESTED_QUESTION_KEYS = [
  'chat.suggestions.monthlyRevenue',
  'chat.suggestions.debtors',
  'chat.suggestions.unpaidInvoices',
  'chat.suggestions.activeCompanies',
  'chat.suggestions.specialistBoards',
  'chat.suggestions.bankTransactions',
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
}

interface Conversation {
  id: string
  title: string | null
  updated_at: string
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

function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="chat-markdown space-y-2 leading-relaxed [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border-light bg-bg-primary px-2 py-1 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border-light px-2 py-1">{children}</td>
          ),
          code: ({ children }) => (
            <code className="rounded bg-bg-primary px-1 py-0.5 text-xs">{children}</code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

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

function MessageContent({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          return message.role === 'assistant' ? (
            <MarkdownContent key={i} text={part.text} />
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
  const { isAdmin, loading: authLoading } = useAuth()
  const scrollRef = useRef<HTMLDivElement>(null)
  const attachRef = useRef<HTMLDivElement>(null)

  const [inputValue, setInputValue] = useState('')
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID())
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)

  const { messages, sendMessage, status, setMessages, stop } = useChat()

  const isLoading = status === 'submitted' || status === 'streaming'

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
      setMessages((data.messages || []) as UIMessage[])
      setConversationId(id)
      setAttachments([])
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
      {/* Conversation history */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border-light md:flex">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-text-primary">{t('chat.history.title')}</span>
          <button
            onClick={handleNewChat}
            title={t('chat.header.newChat')}
            className="rounded-md p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          >
            <SquarePen className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-xs text-text-tertiary">{t('chat.history.empty')}</p>
          ) : (
            conversations.map(conversation => (
              <div
                key={conversation.id}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                  conversation.id === conversationId
                    ? 'bg-monday-primary/10 text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                )}
              >
                <button
                  onClick={() => handleOpenConversation(conversation.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{conversation.title || '…'}</span>
                </button>
                <button
                  onClick={() => handleDeleteConversation(conversation.id)}
                  title={t('chat.history.delete')}
                  className="hidden shrink-0 rounded p-1 text-text-tertiary hover:text-red-500 group-hover:block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-border-light bg-bg-primary px-6 py-4">
          <div className="flex items-center gap-3">
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
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
                .map(message => (
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
                        'max-w-[80%] rounded-xl px-4 py-2.5 text-sm',
                        message.role === 'user'
                          ? 'bg-monday-primary text-white'
                          : 'bg-bg-secondary text-text-primary'
                      )}
                    >
                      {message.role === 'user' && <MessageAttachments message={message} />}
                      <MessageContent message={message} />
                    </div>
                    {message.role === 'user' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-tertiary">
                        <User className="h-4 w-4 text-text-secondary" />
                      </div>
                    )}
                  </div>
                ))}
              {isLoading &&
                !(
                  messages[messages.length - 1]?.role === 'assistant' &&
                  hasRenderableParts(messages[messages.length - 1])
                ) && <ThinkingIndicator label={t('chat.thinking')} />}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border-light bg-bg-primary px-6 py-4">
          <div className="mx-auto max-w-3xl">
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
