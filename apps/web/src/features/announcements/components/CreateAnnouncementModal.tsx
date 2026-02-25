'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Megaphone, Send } from 'lucide-react'
import { useToast } from '@/components/ui-monday/Toast'
import type { AnnouncementPriority } from '@/types/announcement'

interface CreateAnnouncementModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function CreateAnnouncementModal({ onClose, onSuccess }: CreateAnnouncementModalProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<AnnouncementPriority>('normal')

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      showToast('გთხოვთ შეავსოთ ყველა ველი', 'warning')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), priority }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to create announcement')
      }

      showToast('განცხადება წარმატებით გამოქვეყნდა', 'success')
      onSuccess()
      onClose()
    } catch (error: any) {
      showToast(error.message || 'შეცდომა', 'error')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#6161FF]/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-[#6161FF]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">ახალი განცხადება</h2>
              <p className="text-xs text-gray-500">ყველა მომხმარებელი მიიღებს შეტყობინებას</p>
            </div>
          </div>
          <button
            onClick={() => !loading && onClose()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              სათაური
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6161FF]/40 focus:border-[#6161FF]"
              placeholder="განცხადების სათაური"
              maxLength={200}
              autoFocus
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              პრიორიტეტი
            </label>
            <div className="flex gap-2">
              {([
                { value: 'normal', label: 'ჩვეულებრივი', style: 'border-gray-300 bg-white text-gray-700' },
                { value: 'important', label: 'მნიშვნელოვანი', style: 'border-amber-300 bg-amber-50 text-amber-700' },
                { value: 'urgent', label: 'სასწრაფო', style: 'border-red-300 bg-red-50 text-red-700' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`px-3.5 py-2 text-sm font-medium rounded-lg border transition-all ${
                    priority === opt.value
                      ? `${opt.style} ring-2 ring-offset-1 ring-[#6161FF]/30`
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              შინაარსი
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6161FF]/40 focus:border-[#6161FF] resize-none"
              placeholder="განცხადების ტექსტი..."
              rows={8}
              maxLength={5000}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {content.length} / 5000
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => !loading && onClose()}
              className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              გაუქმება
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#6161FF] text-white text-sm font-medium rounded-lg hover:bg-[#4f4fd9] transition-colors disabled:opacity-50"
              disabled={loading}
            >
              <Send className="w-4 h-4" />
              {loading ? 'იგზავნება...' : 'გამოქვეყნება'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
