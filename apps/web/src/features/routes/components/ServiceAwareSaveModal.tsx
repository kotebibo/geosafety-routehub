'use client'

import { useState } from 'react'
import { X, Save, Calendar, Clock, User } from 'lucide-react'
import { DEPLOYMENT_CONFIG } from '@/config/features'
import { FeatureGate } from '@/components/FeatureGate'

interface CompanyService {
  id: string
  company_id: string
  service_type_id: string
  company: {
    id: string
    name: string
    lat: number
    lng: number
  }
}

interface RouteStop {
  company: {
    id: string
    name: string
    lat: number
    lng: number
  }
  position: number
  distance?: number
}

interface ServiceAwareSaveModalProps {
  isOpen: boolean
  onClose: () => void
  route: RouteStop[]
  routeGeometry?: number[][]
  serviceTypeId: string
  inspectorId: string
  selectedServices: CompanyService[]
  onSaveSuccess: () => void
}

export function ServiceAwareSaveModal({
  isOpen,
  onClose,
  route,
  routeGeometry,
  serviceTypeId,
  inspectorId,
  selectedServices,
  onSaveSuccess,
}: ServiceAwareSaveModalProps) {
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('08:00')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const totalDistance = route.reduce((sum, stop) => sum + (stop.distance || 0), 0)

  const handleSave = async () => {
    if (!name.trim()) {
      alert('გთხოვთ შეიყვანოთ მარშრუტის სახელი')
      return
    }

    setSaving(true)

    try {
      // Prepare stops with company service IDs
      const stops = route.map(stop => {
        const service = selectedServices.find(s => s.company_id === stop.company.id)
        return {
          companyId: stop.company.id,
          companyServiceId: service?.id, // Link to specific service
          position: stop.position,
          distanceFromPrevious: stop.distance || 0,
        }
      })

      const response = await fetch('/api/routes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date,
          inspectorId,
          serviceTypeId, // NEW: Include service type
          startTime,
          totalDistance,
          optimizationType: 'hybrid',
          routeGeometry,
          stops,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save route')
      }

      alert('✅ მარშრუტი წარმატებით შეინახა!\n\nინსპექციის თარიღები განახლდა.')
      onSaveSuccess()
      onClose()
    } catch (error) {
      console.error('Save error:', error)
      alert('❌ შეცდომა მარშრუტის შენახვისას')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Save className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">მარშრუტის შენახვა</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Route Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              მარშრუტის სახელი *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="მაგ: თბილისი - სახანძრო ინსპექცია"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              თარიღი *
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              დაწყების დრო
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Route Stats */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-gray-900 mb-2">მარშრუტის დეტალები</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">გაჩერებები:</span>
              <span className="font-semibold text-gray-900">{route.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">სრული მანძილი:</span>
              <span className="font-semibold text-gray-900">{totalDistance.toFixed(1)} კმ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ინსპექტორი:</span>
              <span className="font-semibold text-gray-900">
                <User className="w-3 h-3 inline mr-1" />
                არჩეული
              </span>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>შენიშვნა:</strong> მარშრუტის შენახვისას ავტომატურად განახლდება:
            </p>
            <ul className="text-xs text-blue-700 mt-2 ml-4 list-disc space-y-1">
              <li>ბოლო ინსპექციის თარიღი</li>
              <li>შემდეგი ინსპექციის თარიღი</li>
              <li>ინსპექტორის დანიშვნა</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            გაუქმება
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Save className="w-5 h-5" />
            {saving ? 'შენახვა...' : 'შენახვა'}
          </button>
        </div>
      </div>
    </div>
  )
}
