'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useToast } from '@/components/ui-monday/Toast'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { NewsSkeleton } from '@/features/news/components/NewsSkeleton'
import {
  AnnouncementCard,
  AnnouncementDetailModal,
  CreateAnnouncementModal,
} from '@/features/announcements/components'
import { Megaphone, Plus, AlertTriangle } from 'lucide-react'
import type { Announcement } from '@/types/announcement'

export default function NewsPage() {
  const t = useTranslations()
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
      showToast(t('news.toast.deleteSuccess'), 'success')
      setDeleteTarget(null)
      refetch()
    } catch (error: any) {
      showToast(error.message || t('news.toast.deleteError'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Loading skeleton
  if (authLoading || isLoading) {
    return <NewsSkeleton />
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      <PageHeader
        title={t('news.pageTitle')}
        description={t('news.pageDescription')}
        action={
          isAdmin
            ? {
                label: t('news.newAnnouncement'),
                onClick: () => setShowCreateModal(true),
                icon: <Plus className="w-5 h-5" />,
              }
            : undefined
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {announcements.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-text-tertiary" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              {t('news.empty.title')}
            </h3>
            <p className="text-sm text-text-secondary max-w-sm mx-auto">
              {isAdmin ? t('news.empty.adminHint') : t('news.empty.userHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(announcement => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onClick={() => setSelectedAnnouncement(announcement)}
                onDelete={isAdmin ? id => setDeleteTarget(id) : undefined}
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
      {deleteTarget &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !deleting && setDeleteTarget(null)}
            />
            <div className="relative bg-bg-primary rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">
                    {t('news.deleteModal.title')}
                  </h3>
                  <p className="text-sm text-text-secondary">{t('news.deleteModal.warning')}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? t('news.deleteModal.deleting') : t('common.delete')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
