/**
 * Create New Company Page
 * Allows creating a company with multiple locations
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X } from 'lucide-react';
import { companiesService } from '@/services/companies.service';
import LocationManager from '@/features/companies/components/LocationManager';
import type { LocationFormData, CompanyLocationInput } from '@/types/company';

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Company basic info
  const [formData, setFormData] = useState({
    name: '',
    type: 'commercial',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    priority: 'medium',
    status: 'active',
    notes: '',
  });

  // Locations state
  const [locations, setLocations] = useState<LocationFormData[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate: at least one location required
    if (locations.length === 0) {
      alert('გთხოვთ დაამატოთ მინიმუმ ერთი ლოკაცია');
      return;
    }

    // Validate: must have a primary location
    if (!locations.some(loc => loc.is_primary)) {
      alert('გთხოვთ აირჩიოთ მთავარი ლოკაცია');
      return;
    }

    setLoading(true);

    try {
      // Prepare locations for API
      const locationsForApi: CompanyLocationInput[] = locations.map(loc => ({
        name: loc.name,
        address: loc.address,
        lat: loc.lat,
        lng: loc.lng,
        is_primary: loc.is_primary,
        contact_name: loc.contact_name || null,
        contact_phone: loc.contact_phone || null,
        contact_email: loc.contact_email || null,
        notes: loc.notes || null,
      }));

      // Create company with locations
      await companiesService.createWithLocations(
        {
          name: formData.name,
          type: formData.type,
          priority: formData.priority,
          status: formData.status,
        },
        locationsForApi
      );

      alert('კომპანია წარმატებით შეიქმნა!');
      router.push('/companies');
    } catch (error: any) {
      console.error('Error creating company:', error);
      alert('შეცდომა: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ახალი კომპანიის დამატება</h1>
          <p className="text-gray-600 mt-1">შეავსეთ ყველა საჭირო ველი</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">ძირითადი ინფორმაცია</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  დასახელება *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ტიპი
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="commercial">კომერციული</option>
                  <option value="residential">საცხოვრებელი</option>
                  <option value="industrial">ინდუსტრიული</option>
                  <option value="healthcare">ჯანდაცვა</option>
                  <option value="education">განათლება</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  პრიორიტეტი
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">დაბალი</option>
                  <option value="medium">საშუალო</option>
                  <option value="high">მაღალი</option>
                </select>
              </div>
            </div>
          </div>

          {/* Locations Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <LocationManager
              locations={locations}
              onChange={setLocations}
            />
          </div>

          {/* Contact Information (Company-level, optional) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              საკონტაქტო ინფორმაცია
              <span className="text-sm font-normal text-gray-500 ml-2">(არასავალდებულო)</span>
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  საკონტაქტო პირი
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ტელეფონი
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ელ. ფოსტა
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  შენიშვნები
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-8">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {loading ? 'მიმდინარეობს შენახვა...' : 'შენახვა'}
            </button>
            
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
            >
              <X size={20} />
              გაუქმება
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
