'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Shield } from 'lucide-react';

export default function SetupPDPServicesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // The 5 PDP service types/phases
  const pdpServiceTypes = [
    {
      name: 'Personal Data Initial Assessment',
      name_ka: 'პერსონალური მონაცემები - პირველადი შეფასება',
      description: 'Evaluate current data protection practices',
      description_ka: 'მონაცემთა დაცვის არსებული პრაქტიკის შეფასება',
      required_inspector_type: 'personal_data',
      default_frequency_days: 30,
      regulatory_requirement: true,
      is_active: true,
      sort_order: 1
    },
    {
      name: 'Personal Data Documentation',
      name_ka: 'პერსონალური მონაცემები - დოკუმენტაცია', 
      description: 'Review and prepare documentation',
      description_ka: 'დოკუმენტაციის განხილვა და მომზადება',
      required_inspector_type: 'personal_data',
      default_frequency_days: 45,
      regulatory_requirement: true,
      is_active: true,
      sort_order: 2
    },    {
      name: 'Data Protection Implementation',
      name_ka: 'მონაცემთა დაცვა - დანერგვა',
      description: 'Implementation of data protection measures',
      description_ka: 'მონაცემთა დაცვის ზომების დანერგვა',
      required_inspector_type: 'personal_data',
      default_frequency_days: 60,
      regulatory_requirement: true,
      is_active: true,
      sort_order: 3
    },
    {
      name: 'Personal Data Training',
      name_ka: 'პერსონალური მონაცემები - ტრენინგი',
      description: 'Staff training on data protection',
      description_ka: 'პერსონალის ტრენინგი მონაცემთა დაცვაზე',
      required_inspector_type: 'personal_data',
      default_frequency_days: 90,
      regulatory_requirement: true,
      is_active: true,
      sort_order: 4
    },
    {
      name: 'Personal Data Certification',
      name_ka: 'პერსონალური მონაცემები - სერტიფიცირება',
      description: 'Final audit and certification',
      description_ka: 'საბოლოო აუდიტი და სერტიფიცირება',
      required_inspector_type: 'personal_data',
      default_frequency_days: 365,
      regulatory_requirement: true,
      is_active: true,
      sort_order: 5
    }
  ];
  async function addServiceTypes() {
    setLoading(true);
    setMessage('');
    setResults([]);
    
    try {
      // First check existing service types
      const { data: existing } = await supabase
        .from('service_types')
        .select('*')
        .ilike('name', '%personal%data%')
        .order('sort_order');
      
      if (existing && existing.length > 0) {
        setMessage(`Found ${existing.length} existing PDP service types`);
        setResults(existing);
        setLoading(false);
        return;
      }
      
      // Insert all service types
      const { data, error } = await supabase
        .from('service_types')
        .insert(pdpServiceTypes)
        .select();
      
      if (error) {
        setMessage(`Error: ${error.message}`);
        console.error('Error inserting service types:', error);
        return;
      }
      
      setMessage(`✅ Successfully added ${data?.length || 0} PDP service types!`);
      setResults(data || []);
      
    } catch (error) {
      setMessage(`Failed: ${error}`);
      console.error('Failed to add service types:', error);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Setup PDP Service Types</h1>
            <p className="text-gray-600">Add the 5 Personal Data Protection service phases</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-2">This will add:</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>პირველადი შეფასება (Initial Assessment)</li>
            <li>დოკუმენტაცია (Documentation)</li>
            <li>დანერგვა (Implementation)</li>
            <li>ტრენინგი (Training)</li>
            <li>სერტიფიცირება (Certification)</li>
          </ol>
        </div>

        <button
          onClick={addServiceTypes}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add PDP Service Types'}
        </button>

        {message && (
          <div className={`mt-4 p-4 rounded-lg ${
            message.includes('Error') || message.includes('Failed') 
              ? 'bg-red-50 text-red-700' 
              : 'bg-green-50 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Service Types:</h3>
            <div className="space-y-2">
              {results.map((st: any) => (
                <div key={st.id} className="p-3 bg-gray-50 rounded">
                  <div className="font-medium">{st.name_ka}</div>
                  <div className="text-sm text-gray-600">{st.name}</div>
                  <div className="text-xs text-gray-500">
                    Frequency: {st.default_frequency_days} days | Order: {st.sort_order}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}