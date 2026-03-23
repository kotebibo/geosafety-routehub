/**
 * Save Route Modal - FIXED VERSION
 * Dialog for saving optimized routes with proper z-index
 */

'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface SaveRouteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    name: string
    date: string
    inspectorId?: string
    startTime: string
  }) => Promise<void>
  defaultName?: string
}

export function SaveRouteModal({ isOpen, onClose, onSave, defaultName = '' }: SaveRouteModalProps) {
  const [name, setName] = useState(defaultName)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    // Reset form when modal opens with new defaultName
    if (isOpen && defaultName) {
      setName(defaultName)
      setDate(new Date().toISOString().split('T')[0])
      setStartTime('09:00')
    }
  }, [isOpen, defaultName])

  const handleSave = async () => {
    if (!name || !date) {
      alert('გთხოვთ შეავსოთ სახელი და თარიღი')
      return
    }

    setSaving(true)
    try {
      await onSave({ name, date, startTime })
      onClose()
    } catch (error) {
      console.error('Save failed:', error)
      alert('შენახვა ვერ მოხერხდა')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999]" style={{ position: 'fixed', zIndex: 9999 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="bg-bg-primary rounded-lg shadow-2xl p-6 w-full max-w-md pointer-events-auto"
          style={{ position: 'relative', zIndex: 10000 }}
        >
          <h2 className="text-xl font-bold text-text-primary mb-4">მარშრუტის შენახვა</h2>

          <div className="space-y-4">
            {/* Route Name */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                მარშრუტის სახელი *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="მაგ: თბილისი - ცენტრი"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">თარიღი *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                დაწყების დრო
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-border-medium text-text-primary rounded-lg font-semibold hover:bg-bg-hover disabled:opacity-50 transition-colors"
            >
              გაუქმება
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '⏳ შენახვა...' : '💾 შენახვა'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Use portal to render modal at the root of the document
  return createPortal(modalContent, document.body)
}
