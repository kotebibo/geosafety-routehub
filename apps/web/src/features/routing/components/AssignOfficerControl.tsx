'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { UserCog, Check, X, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui-monday/Toast'
import { useOfficers } from '../hooks/useOfficers'
import { useAssignOfficer } from '../hooks/useAssignOfficer'
import type { Board } from '@/types/board'

interface AssignOfficerControlProps {
  board: Board
}

export function AssignOfficerControl({ board }: AssignOfficerControlProps) {
  const t = useTranslations()
  const { showToast } = useToast()
  const { data: officers = [] } = useOfficers()
  const { assignedOfficerId, assign, unassign, isSaving } = useAssignOfficer(board)

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const assignedName = useMemo(() => {
    const o = officers.find(o => o.id === assignedOfficerId)
    return o?.full_name || o?.email || null
  }, [officers, assignedOfficerId])

  const handleAssign = async (id: string) => {
    try {
      await assign(id)
      showToast(t('routing.officerAssigned'), 'success')
      setOpen(false)
    } catch {
      showToast(t('routing.officerAssignFailed'), 'error')
    }
  }
  const handleUnassign = async () => {
    try {
      await unassign()
      showToast(t('routing.officerUnassigned'), 'success')
      setOpen(false)
    } catch {
      showToast(t('routing.officerAssignFailed'), 'error')
    }
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          setOpen(v => !v)
        }}
        title={t('routing.assignOfficer')}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors max-w-[160px]',
          assignedOfficerId
            ? 'bg-monday-primary/10 text-monday-primary border border-monday-primary/30 hover:bg-monday-primary/20'
            : 'bg-bg-tertiary text-text-tertiary hover:bg-bg-hover'
        )}
      >
        <UserCog className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="hidden sm:inline truncate">
          {assignedName || t('routing.assignOfficer')}
        </span>
      </button>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 z-50 w-60 bg-bg-primary rounded-lg border border-monday-primary shadow-lg py-1 max-h-72 overflow-y-auto"
        >
          <p className="px-3 py-1.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">
            {t('routing.assignOfficer')}
          </p>
          {officers.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-tertiary">{t('routing.noOfficers')}</p>
          ) : (
            officers.map(o => {
              const active = o.id === assignedOfficerId
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={isSaving}
                  onClick={() => (active ? handleUnassign() : handleAssign(o.id))}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors hover:bg-bg-hover disabled:opacity-50',
                    active && 'text-monday-primary'
                  )}
                >
                  <span className="w-5 h-5 rounded-full bg-monday-primary/15 text-monday-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {(o.full_name || o.email).charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-left">{o.full_name || o.email}</span>
                  {active &&
                    (isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    ))}
                </button>
              )
            })
          )}
          {assignedOfficerId && (
            <>
              <div className="my-1 border-t border-border-light" />
              <button
                type="button"
                disabled={isSaving}
                onClick={handleUnassign}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                {t('routing.unassignOfficer')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
