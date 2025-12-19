/**
 * LocationManager Component
 * Manages multiple locations/branches for a company
 */

'use client'

import { useState } from 'react'
import { 
  Plus, 
  MapPin, 
  Star, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Building2,
  Phone,
  Mail,
  FileText
} from 'lucide-react'
import type { LocationFormData } from '@/types/company'

interface LocationManagerProps {
  locations: LocationFormData[]
  onChange: (locations: LocationFormData[]) => void
  disabled?: boolean
}

const emptyLocation: LocationFormData = {
  name: '',
  address: '',
  lat: null,
  lng: null,
  is_primary: false,
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  notes: '',
}

export default function LocationManager({ 
  locations, 
  onChange, 
  disabled = false 
}: LocationManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingData, setEditingData] = useState<LocationFormData | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newLocation, setNewLocation] = useState<LocationFormData>({ ...emptyLocation })

  // Add a new location
  const handleAdd = () => {
    if (!newLocation.name.trim() || !newLocation.address.trim()) {
      alert('გთხოვთ შეავსოთ სახელი და მისამართი')
      return
    }

    const isPrimary = locations.length === 0 ? true : newLocation.is_primary
    
    // If this is primary, unset others
    let updatedLocations = locations
    if (isPrimary) {
      updatedLocations = locations.map(loc => ({ ...loc, is_primary: false }))
    }

    onChange([...updatedLocations, { ...newLocation, is_primary: isPrimary }])
    setNewLocation({ ...emptyLocation })
    setIsAdding(false)
  }

  // Start editing a location
  const handleEditStart = (index: number) => {
    setEditingIndex(index)
    setEditingData({ ...locations[index] })
  }

  // Save edited location
  const handleEditSave = () => {
    if (editingIndex === null || !editingData) return
    
    if (!editingData.name.trim() || !editingData.address.trim()) {
      alert('გთხოვთ შეავსოთ სახელი და მისამართი')
      return
    }

    let updatedLocations = [...locations]
    
    // If setting as primary, unset others
    if (editingData.is_primary) {
      updatedLocations = updatedLocations.map((loc, i) => ({
        ...loc,
        is_primary: i === editingIndex
      }))
    }
    
    updatedLocations[editingIndex] = editingData
    onChange(updatedLocations)
    setEditingIndex(null)
    setEditingData(null)
  }

  // Cancel editing
  const handleEditCancel = () => {
    setEditingIndex(null)
    setEditingData(null)
  }

  // Delete a location
  const handleDelete = (index: number) => {
    if (locations.length === 1) {
      alert('კომპანიას უნდა ჰქონდეს მინიმუმ ერთი ლოკაცია')
      return
    }

    const wasIsPrimary = locations[index].is_primary
    const newLocations = locations.filter((_, i) => i !== index)
    
    // If deleted was primary, make first one primary
    if (wasIsPrimary && newLocations.length > 0) {
      newLocations[0].is_primary = true
    }
    
    onChange(newLocations)
  }

  // Set a location as primary
  const handleSetPrimary = (index: number) => {
    const updatedLocations = locations.map((loc, i) => ({
      ...loc,
      is_primary: i === index
    }))
    onChange(updatedLocations)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">ლოკაციები / ფილიალები</h3>
          <span className="text-sm text-gray-500">({locations.length})</span>
        </div>
        {!disabled && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            დამატება
          </button>
        )}
      </div>

      {/* Location List */}
      <div className="space-y-3">
        {locations.map((location, index) => (
          <div
            key={location.id || index}
            className={`border rounded-lg p-4 ${
              location.is_primary 
                ? 'border-yellow-400 bg-yellow-50' 
                : 'border-gray-200 bg-white'
            }`}
          >
            {editingIndex === index && editingData ? (
              // Edit Mode
              <LocationForm
                data={editingData}
                onChange={setEditingData}
                onSave={handleEditSave}
                onCancel={handleEditCancel}
                showPrimaryToggle={!location.is_primary}
              />
            ) : (
              // View Mode
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {location.is_primary && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                    <span className="font-medium text-gray-900">{location.name}</span>
                    {location.is_primary && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                        მთავარი
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5" />
                    {location.address}
                  </div>
                  {location.contact_phone && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <Phone className="w-3.5 h-3.5" />
                      {location.contact_phone}
                    </div>
                  )}
                </div>
                
                {!disabled && (
                  <div className="flex items-center gap-1">
                    {!location.is_primary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(index)}
                        className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                        title="მთავარად დაყენება"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEditStart(index)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="რედაქტირება"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="წაშლა"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {locations.length === 0 && !isAdding && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">ლოკაციები არ არის დამატებული</p>
            <p className="text-sm text-gray-500 mb-4">
              დაამატეთ მინიმუმ ერთი ლოკაცია კომპანიისთვის
            </p>
            {!disabled && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                პირველი ლოკაციის დამატება
              </button>
            )}
          </div>
        )}

        {/* Add New Location Form */}
        {isAdding && (
          <div className="border-2 border-blue-300 border-dashed rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium text-gray-900 mb-3">ახალი ლოკაცია</h4>
            <LocationForm
              data={newLocation}
              onChange={setNewLocation}
              onSave={handleAdd}
              onCancel={() => {
                setIsAdding(false)
                setNewLocation({ ...emptyLocation })
              }}
              showPrimaryToggle={locations.length > 0}
            />
          </div>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        <Star className="w-3 h-3 inline text-yellow-500 fill-yellow-500" /> მთავარი ლოკაცია 
        გამოჩნდება როგორც ნაგულისხმევი მისამართი. თუ კომპანიას აქვს მხოლოდ ერთი ლოკაცია, 
        ის ავტომატურად იქნება მთავარი.
      </p>
    </div>
  )
}

// Sub-component for location form (used in both add and edit modes)
interface LocationFormProps {
  data: LocationFormData
  onChange: (data: LocationFormData) => void
  onSave: () => void
  onCancel: () => void
  showPrimaryToggle?: boolean
}

function LocationForm({ data, onChange, onSave, onCancel, showPrimaryToggle = true }: LocationFormProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            სახელი *
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder="მაგ: მთავარი ოფისი, ფილიალი #1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            მისამართი *
          </label>
          <input
            type="text"
            value={data.address}
            onChange={(e) => onChange({ ...data, address: e.target.value })}
            placeholder="მაგ: რუსთაველის გამზ. 12"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Contact Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            საკონტაქტო პირი
          </label>
          <input
            type="text"
            value={data.contact_name || ''}
            onChange={(e) => onChange({ ...data, contact_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Contact Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ტელეფონი
          </label>
          <input
            type="tel"
            value={data.contact_phone || ''}
            onChange={(e) => onChange({ ...data, contact_phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          შენიშვნა
        </label>
        <input
          type="text"
          value={data.notes || ''}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="დამატებითი ინფორმაცია"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Primary Toggle & Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        {showPrimaryToggle ? (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.is_primary}
              onChange={(e) => onChange({ ...data, is_primary: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
            />
            <span className="text-sm text-gray-700">მთავარი ლოკაცია</span>
          </label>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
            გაუქმება
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Check className="w-4 h-4" />
            შენახვა
          </button>
        </div>
      </div>
    </div>
  )
}
