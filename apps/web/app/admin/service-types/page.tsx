/**
 * Service Types Management Page
 * Admin page to manage all service types
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { DEPLOYMENT_CONFIG } from '@/config/features';
import { useRouter } from 'next/navigation';

interface ServiceType {
  id: string;
  name: string;
  name_ka: string;
  description: string;
  required_inspector_type: string;
  default_frequency_days: number;
  is_active: boolean;
}

const INSPECTOR_TYPES = [
  { value: 'fire_safety', label: 'Fire Safety Specialist', label_ka: 'სახანძრო უსაფრთხოება' },
  { value: 'health', label: 'Health Inspector', label_ka: 'ჯანმრთელობა' },
  { value: 'building', label: 'Building Inspector', label_ka: 'სამშენებლო' },
  { value: 'electrical', label: 'Electrical Inspector', label_ka: 'ელექტრო' },
  { value: 'food_safety', label: 'Food Safety Inspector', label_ka: 'სურსათის უსაფრთხოება' },
  { value: 'environmental', label: 'Environmental Inspector', label_ka: 'გარემოსდაცვა' },
  { value: 'occupational', label: 'Occupational Safety Inspector', label_ka: 'შრომის უსაფრთხოება' },
  { value: 'general', label: 'General Inspector', label_ka: 'ზოგადი' },
];

export default function ServiceTypesPage() {
  const router = useRouter();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<ServiceType>>({
    name: '',
    name_ka: '',
    description: '',
    required_inspector_type: 'general',
    default_frequency_days: 90,
    is_active: true,
  });
  
  // Redirect if in single-service mode
  useEffect(() => {
    if (DEPLOYMENT_CONFIG.isSingleServiceMode) {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    fetchServiceTypes();
  }, [supabase]);

  async function fetchServiceTypes() {
    if (!supabase) return;
    try {
      const response = await fetch('/api/service-types');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      if (editingId) {
        // Update existing
        const response = await fetch('/api/service-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...formData }),
        });

        if (!response.ok) throw new Error('Failed to update');
      } else {
        // Create new
        const response = await fetch('/api/service-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error('Failed to create');
      }

      await fetchServiceTypes();
      resetForm();
    } catch (error) {
      console.error('Error saving service type:', error);
      alert('შეცდომა შენახვისას');
    }
  }

  async function handleDelete(id: string) {
    if (!supabase) return;
    if (!confirm('დარწმუნებული ხართ რომ გსურთ წაშლა?')) return;
    try {
      const response = await fetch(`/api/service-types?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');
      await fetchServiceTypes();
    } catch (error) {
      console.error('Error deleting service type:', error);
      alert('შეცდომა წაშლისას');
    }
  }

  function startEdit(serviceType: ServiceType) {
    setEditingId(serviceType.id);
    setFormData(serviceType);
    setIsAddingNew(false);
  }

  function startAdd() {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData({
      name: '',
      name_ka: '',
      description: '',
      required_inspector_type: 'general',
      default_frequency_days: 90,
      is_active: true,
    });
  }

  function resetForm() {
    setEditingId(null);
    setIsAddingNew(false);
    setFormData({
      name: '',
      name_ka: '',
      description: '',
      required_inspector_type: 'general',
      default_frequency_days: 90,
      is_active: true,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">სერვისის ტიპები</h1>
          <p className="text-gray-600 mt-1">მართეთ ინსპექტირების სერვისების ტიპები</p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          ახალი სერვისი
        </button>
      </div>

      {(isAddingNew || editingId) && (
        <div className="bg-white border-2 border-blue-500 rounded-lg p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'რედაქტირება' : 'ახალი სერვისის დამატება'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                დასახელება (English)
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                დასახელება (ქართული)
              </label>
              <input
                type="text"
                value={formData.name_ka || ''}
                onChange={(e) => setFormData({ ...formData, name_ka: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                აღწერა
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                საჭირო ინსპექტორის ტიპი
              </label>
              <select
                value={formData.required_inspector_type || 'general'}
                onChange={(e) => setFormData({ ...formData, required_inspector_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {INSPECTOR_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label_ka}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                სიხშირე (დღეები)
              </label>
              <input
                type="number"
                value={formData.default_frequency_days || 90}
                onChange={(e) => setFormData({ ...formData, default_frequency_days: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="1"
              />
            </div>
            <div className="col-span-2 flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                აქტიური
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Save size={18} />
              შენახვა
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              <X size={18} />
              გაუქმება
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                სერვისი
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                აღწერა
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ინსპექტორის ტიპი
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                სიხშირე
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                სტატუსი
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {serviceTypes.map((st) => (
              <tr key={st.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{st.name_ka}</div>
                  <div className="text-sm text-gray-500">{st.name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{st.description}</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {INSPECTOR_TYPES.find(t => t.value === st.required_inspector_type)?.label_ka}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{st.default_frequency_days} დღე</td>
                <td className="px-6 py-4">
                  {st.is_active ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      აქტიური
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      არააქტიური
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(st)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(st.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {serviceTypes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            სერვისები არ მოიძებნა
          </div>
        )}
      </div>
    </div>
  );
}
