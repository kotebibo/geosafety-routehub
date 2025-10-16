/**
 * Add New Personal Data Protection Company
 * With compliance phase tracking
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddCompanyWithCompliance } from '@/components/compliance';
import { companiesService } from '@/services/companies.service';
import { complianceService } from '@/services/compliance.service';
import { ArrowLeft } from 'lucide-react';

export default function NewPDPCompanyPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: {
    company: {
      name: string;
      address: string;
      lat?: number;
      lng?: number;
      contact_person?: string;
      contact_phone?: string;
      contact_email?: string;
    };
    compliance: {
      isNew: boolean;
      phaseDates?: Record<number, string>;
      nextCheckupDate?: string;
    };
  }) => {
    try {
      setError(null);

      // Step 1: Create the company
      console.log('Creating company:', data.company);
      
      const company = await companiesService.create({
        name: data.company.name,
        address: data.company.address,
        lat: data.company.lat || 0,
        lng: data.company.lng || 0,
        contact_name: data.company.contact_person,
        contact_phone: data.company.contact_phone,
        contact_email: data.company.contact_email,
      });

      if (!company || !company.id) {
        throw new Error('Failed to create company');
      }

      console.log('Company created:', company.id);

      // Step 2: Create compliance tracking
      const complianceResult = await complianceService.createCompliance(
        company.id,
        data.compliance.isNew,
        data.compliance.phaseDates
      );

      if (complianceResult.error) {
        console.error('Compliance creation error:', complianceResult.error);
        throw new Error('Failed to create compliance tracking');
      }

      console.log('Compliance created:', complianceResult.data);

      // Step 3: Navigate to the company detail page
      alert('კომპანია წარმატებით დაემატა!');
      router.push(`/companies/${company.id}`);
      
    } catch (err: any) {
      console.error('Error creating company:', err);
      setError(err.message || 'დაფიქსირდა შეცდომა');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>უკან დაბრუნება</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span className="text-xl">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AddCompanyWithCompliance
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
