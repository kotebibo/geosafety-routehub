/**
 * Create New Company Page
 * Allows creating a company with PDP onboarding phases
 */

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import PDPOnboardingManager from '@/components/PDPOnboardingManager';
import { Save, X } from 'lucide-react';

interface PDPPhase {
  phase: number;
  name: string;
  name_ka: string;
  scheduled_date?: string;
  completed_date?: string;
  inspector_id?: string;
  notes?: string;
}

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pdpPhases, setPdpPhases] = useState<PDPPhase[]>([]);
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'commercial',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    priority: 'medium',
    status: 'active',
    notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    setLoading(true);

    try {
      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert(formData)
        .select()
        .single();

      if (companyError) throw companyError;

      // Save PDP phases
      if (pdpPhases.length > 0) {
        const phasesToSave = pdpPhases.map(phase => ({
          company_id: company.id,
          phase: phase.phase,
          scheduled_date: phase.scheduled_date,
          completed_date: phase.completed_date,
          inspector_id: phase.inspector_id,
          notes: phase.notes,
          current_phase: currentPhase
        }));

        const { error: phaseError } = await supabase
          .from('company_pdp_phases')
          .insert(phasesToSave);

        if (phaseError) {
          console.error('Error saving phases:', phaseError);
        }
      }

      // Also create a default PDP service entry
      const { error: serviceError } = await supabase
        .from('company_services')
        .insert({
          company_id: company.id,
          service_type_id: 'pdp-default', // You'll need to get the actual PDP service type ID
          inspection_frequency_days: 90,
          priority: formData.priority,
          next_inspection_date: pdpPhases[0]?.scheduled_date || null,
          assigned_inspector_id: pdpPhases[0]?.inspector_id || null
        });

      if (serviceError) {
        console.error('Error creating service:', serviceError);
      }

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ახალი კომპანიის დამატება</h1>
        <p className="text-gray-600 mt-1">შეავსეთ ყველა საჭირო ველი</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                მისამართი *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">საკონტაქტო ინფორმაცია</h2>
          
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

        {/* PDP Onboarding Phases */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            პერსონალურ მონაცემთა დაცვა - ონბორდინგი
          </h2>
          <PDPOnboardingManager
            onPhaseChange={(phases, phase) => {
              setPdpPhases(phases);
              setCurrentPhase(phase);
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
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
  );
}
