'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useToast } from '@/components/ui-monday/Toast'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import {
  AnnouncementCard,
  AnnouncementDetailModal,
  CreateAnnouncementModal,
} from '@/features/announcements/components'
import { Megaphone, Plus, AlertTriangle } from 'lucide-react'
import type { Announcement } from '@/types/announcement'

export default function NewsPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const { announcements, isLoading, markAsRead, refetch } = useAnnouncements()
  const { showToast } = useToast()

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/announcements/${deleteTarget}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Delete failed')
      }
      showToast('განცხადება წაშლილია', 'success')
      setDeleteTarget(null)
      refetch()
    } catch (error: any) {
      showToast(error.message || 'შეცდომა წაშლისას', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Loading skeleton
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="animate-pulse">
              <div className="h-7 w-64 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-96 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-full bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded" />
                  <div className="flex gap-4 mt-3">
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                    <div className="h-3 w-20 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="სიახლეები და განცხადებები"
        description="კომპანიის მნიშვნელოვანი სიახლეები და შეტყობინებები"
        action={
          isAdmin
            ? {
                label: 'ახალი განცხადება',
                onClick: () => setShowCreateModal(true),
                icon: <Plus className="w-5 h-5" />,
              }
            : undefined
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {announcements.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              განცხადებები არ არის
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {isAdmin
                ? 'შექმენით პირველი განცხადება ზემოთ "ახალი განცხადება" ღილაკით'
                : 'ახალი განცხადებები და სიახლეები გამოჩნდება აქ'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onClick={() => setSelectedAnnouncement(announcement)}
                onDelete={isAdmin ? (id) => setDeleteTarget(id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedAnnouncement && (
        <AnnouncementDetailModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
          onMarkRead={markAsRead}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateAnnouncementModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">განცხადების წაშლა</h3>
                <p className="text-sm text-gray-500">ეს მოქმედება შეუქცევადია</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                გაუქმება
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'იშლება...' : 'წაშლა'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
