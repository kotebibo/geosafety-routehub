'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function NewInspectorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialty: '',
    role: 'officer',
    zone: '',
    status: 'active',
    working_hours_start: '08:00',
    working_hours_end: '17:00',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        working_hours: {
          start: formData.working_hours_start,
          end: formData.working_hours_end,
        },
      }

      const response = await fetch('/api/inspectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to create inspector')

      alert('ოფიცერი წარმატებით შეიქმნა!')
      router.push('/inspectors')
    } catch (error) {
      console.error('Error creating inspector:', error)
      alert('შეცდომა ოფიცრის შექმნისას')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-secondary p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/inspectors"
            className="inline-flex items-center text-monday-primary hover:text-monday-primary-hover mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            უკან ოფიცრებზე
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">ახალი ოფიცერი</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-bg-primary rounded-lg shadow-sm p-6">
          {/* Basic Information */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">ძირითადი ინფორმაცია</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  სახელი და გვარი *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                  placeholder="მაგ: გიორგი მელაძე"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  ელ-ფოსტა *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                  placeholder="giorgi@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">ტელეფონი</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                  placeholder="+995 555 123 456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">ზონა</label>
                <input
                  type="text"
                  value={formData.zone}
                  onChange={e => setFormData({ ...formData, zone: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                  placeholder="მაგ: ვაკე-საბურთალო"
                />
              </div>
            </div>
          </div>

          {/* Specialty & Role */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">სპეციალობა და როლი</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  სპეციალობა *
                </label>
                <select
                  required
                  value={formData.specialty}
                  onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                >
                  <option value="">აირჩიეთ სპეციალობა</option>
                  <option value="fire_safety">სახანძრო უსაფრთხოება</option>
                  <option value="health">ჯანდაცვა</option>
                  <option value="building_code">სამშენებლო კოდექსი</option>
                  <option value="electrical">ელექტრო უსაფრთხოება</option>
                  <option value="environmental">გარემოსდაცვა</option>
                  <option value="plumbing">სანტექნიკა</option>
                  <option value="hvac">ვენტილაცია</option>
                  <option value="general">ზოგადი</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">როლი *</label>
                <select
                  required
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                >
                  <option value="officer">ოფიცერი</option>
                  <option value="dispatcher">დისპეტჩერი</option>
                  <option value="manager">მენეჯერი</option>
                  <option value="admin">ადმინისტრატორი</option>
                </select>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">სამუშაო საათები</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  დაწყება *
                </label>
                <input
                  type="time"
                  required
                  value={formData.working_hours_start}
                  onChange={e => setFormData({ ...formData, working_hours_start: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  დასრულება *
                </label>
                <input
                  type="time"
                  required
                  value={formData.working_hours_end}
                  onChange={e => setFormData({ ...formData, working_hours_end: e.target.value })}
                  className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">სტატუსი</h2>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-border-medium rounded-lg focus:ring-2 focus:ring-monday-primary focus:border-transparent"
            >
              <option value="active">აქტიური</option>
              <option value="inactive">არააქტიური</option>
              <option value="on_leave">შვებულებაში</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Link
              href="/inspectors"
              className="px-4 py-2 text-text-primary bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors"
            >
              გაუქმება
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'შენახვა...' : 'ოფიცრის შექმნა'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
