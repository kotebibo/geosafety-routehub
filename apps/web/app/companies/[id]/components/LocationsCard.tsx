'use client'

import { MapPin, Edit2, Save, X, User, Phone, Mail } from 'lucide-react'
import { LocationManager } from '@/features/companies/components/LocationManager'
import type { CompanyLocation, LocationFormData } from '@/types/company'

interface LocationsCardProps {
  locations: CompanyLocation[]
  editingLocations: boolean
  editableLocations: LocationFormData[]
  saving: boolean
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  onEditableLocationsChange: (locations: LocationFormData[]) => void
}

export function LocationsCard({
  locations,
  editingLocations,
  editableLocations,
  saving,
  onStartEdit,
  onSave,
  onCancel,
  onEditableLocationsChange,
}: LocationsCardProps) {
  return (
    <div className="bg-bg-primary border border-border-light rounded-xl mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4.5 h-4.5 text-text-tertiary" />
          <h2 className="font-semibold text-text-primary">
            {'\u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D4\u10D1\u10D8'}
          </h2>
          <span className="text-xs text-text-tertiary font-medium bg-bg-tertiary px-1.5 py-0.5 rounded">
            {locations.length}
          </span>
        </div>
        {!editingLocations && (
          <button
            onClick={onStartEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {'\u10E0\u10D4\u10D3\u10D0\u10E5\u10E2\u10D8\u10E0\u10D4\u10D1\u10D0'}
          </button>
        )}
      </div>

      <div className="p-6">
        {editingLocations ? (
          <div>
            <LocationManager locations={editableLocations} onChange={onEditableLocationsChange} />
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border-light">
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-monday-primary text-white text-sm font-medium rounded-lg hover:bg-monday-primary-hover disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving
                  ? '\u10D8\u10DC\u10D0\u10EE\u10D4\u10D1\u10D0...'
                  : '\u10E8\u10D4\u10DC\u10D0\u10EE\u10D5\u10D0'}
              </button>
              <button
                onClick={onCancel}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm text-text-secondary hover:bg-bg-hover rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                {'\u10D2\u10D0\u10E3\u10E5\u10DB\u10D4\u10D1\u10D0'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.length === 0 ? (
              <div className="text-center py-10">
                <MapPin className="w-10 h-10 text-text-disabled mx-auto mb-3" />
                <p className="text-sm text-text-tertiary mb-4">
                  {
                    '\u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D4\u10D1\u10D8 \u10D0\u10E0 \u10D0\u10E0\u10D8\u10E1 \u10D3\u10D0\u10DB\u10D0\u10E2\u10D4\u10D1\u10E3\u10DA\u10D8'
                  }
                </p>
                <button
                  onClick={onStartEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  {
                    '\u10DA\u10DD\u10D9\u10D0\u10EA\u10D8\u10D8\u10E1 \u10D3\u10D0\u10DB\u10D0\u10E2\u10D4\u10D1\u10D0'
                  }
                </button>
              </div>
            ) : (
              locations.map(location => (
                <div
                  key={location.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    location.is_primary
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-border-light bg-bg-secondary/50 hover:bg-bg-secondary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        location.is_primary ? 'bg-amber-100' : 'bg-bg-tertiary'
                      }`}
                    >
                      <MapPin
                        className={`w-4 h-4 ${location.is_primary ? 'text-amber-600' : 'text-text-tertiary'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-text-primary text-sm">
                          {location.name}
                        </span>
                        {location.is_primary && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                            {'\u10DB\u10D7\u10D0\u10D5\u10D0\u10E0\u10D8'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-tertiary">{location.address}</p>
                      {(location.contact_phone ||
                        location.contact_email ||
                        location.contact_name) && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
                          {location.contact_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {location.contact_name}
                            </span>
                          )}
                          {location.contact_phone && (
                            <a
                              href={`tel:${location.contact_phone}`}
                              className="flex items-center gap-1 hover:text-text-secondary"
                            >
                              <Phone className="w-3 h-3" />
                              {location.contact_phone}
                            </a>
                          )}
                          {location.contact_email && (
                            <a
                              href={`mailto:${location.contact_email}`}
                              className="flex items-center gap-1 hover:text-text-secondary"
                            >
                              <Mail className="w-3 h-3" />
                              {location.contact_email}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
