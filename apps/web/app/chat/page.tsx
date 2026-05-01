'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  RotateCcw,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UIMessage } from 'ai'

const SUGGESTED_QUESTIONS = [
  'რამდენი აქტიური კომპანია გვაქვს?',
  'რა ბორდები არის სპეციალისტების სამუშაო სივრცეში?',
  'HACCP ბორდზე რამდენი ჩანაწერია?',
  'ბოლო ბანკის ტრანზაქციები მაჩვენე',
  'ანა სანაძის კლიენტები მაჩვენე',
  'რამდენი შეუთანხმებელი გადახდაა?',
]

const TOOL_FRIENDLY_NAMES: Record<string, string> = {
  find_company: 'კომპანიის ძიება',
  list_companies: 'კომპანიების სია',
  count_board_items: 'ბორდის ჩანაწერების რაოდენობა',
  list_board_items: 'ბორდის ჩანაწერები',
  list_workspaces_and_boards: 'სამუშაო სივრცეები',
  get_bank_transactions: 'ბანკის ტრანზაქციები',
  get_payment_stats: 'გადახდების სტატისტიკა',
  list_inspectors: 'სპეციალისტები',
  get_specialist_workload: 'სპეციალისტის დატვირთვა',
  get_service_types: 'სერვისის ტიპები',
  search_board_items: 'ჩანაწერების ძიება',
}

interface ToolCallDisplayProps {
  toolName: string
  input: Record<string, unknown>
  output?: unknown
}

function ToolCallDisplay({ toolName, input, output }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-1.5 rounded-md border border-gray-200 bg-gray-50 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-gray-500 hover:text-gray-700"
      >
        <Wrench className="h-3 w-3 shrink-0" />
        <span className="font-medium">{TOOL_FRIENDLY_NAMES[toolName] || toolName}</span>
        <span className="text-gray-400">
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
        <pre className="max-h-60 overflow-auto border-t border-gray-200 p-2.5 text-[11px] text-gray-600">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  )
}

function MessageContent({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          return (
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

export default function ChatPage() {
  const router = useRouter()
  const { isAdmin, isDispatcher, loading: authLoading } = useAuth()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')

  const { messages, sendMessage, status, setMessages } = useChat()

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (!authLoading && !isAdmin && !isDispatcher) {
      router.push('/')
    }
  }, [authLoading, isAdmin, isDispatcher, router])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return
    setInputValue('')
    sendMessage({ text })
  }

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
            <Bot className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">RouteHub ასისტენტი</h1>
            <p className="text-xs text-gray-500">დასვით კითხვა კომპანიის მონაცემებზე</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              ახალი ჩატი
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
              <Sparkles className="h-8 w-8 text-indigo-500" />
            </div>
            <h2 className="mb-2 text-lg font-medium text-gray-800">რით შემიძლია დაგეხმაროთ?</h2>
            <p className="mb-8 max-w-md text-center text-sm text-gray-500">
              შეგიძლიათ მკითხოთ კომპანიების, ბორდების, გადახდების, სპეციალისტების და სხვა
              მონაცემების შესახებ.
            </p>
            <div className="grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={cn('flex gap-3', message.role === 'user' && 'justify-end')}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                    <Bot className="h-4 w-4 text-indigo-600" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-4 py-2.5 text-sm',
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  )}
                >
                  <MessageContent message={message} />
                </div>
                {message.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                  <Bot className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="rounded-xl bg-gray-100 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <form
          onSubmit={e => {
            e.preventDefault()
            handleSend(inputValue)
          }}
          className="mx-auto flex max-w-3xl gap-2"
        >
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="დასვით კითხვა..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
