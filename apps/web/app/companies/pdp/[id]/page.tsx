/**
 * Personal Data Protection Company Detail Page
 * Shows compliance phase progress
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, MapPin, Phone, Mail, User } from 'lucide-react';
import { PhaseProgressTracker } from '@/components/compliance';
import { companiesService } from '@/services/companies.service';

interface Company {
  id: string;
  name: string;
  address: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  [key: string]: any;
}

export default function PDPCompanyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();
  }, [params.id]);

  const loadCompany = async () => {
    try {
      const data = await companiesService.getById(params.id);
      setCompany(data);
    } catch (error) {
      console.error('Error loading company:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">კომპანია ვერ მოიძებნა</h2>
          <button
            onClick={() => router.push('/companies/pdp')}
            className="text-blue-600 hover:text-blue-700"
          >
            უკან დაბრუნება
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/companies/pdp')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>უკან დაბრუნება</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
                  <p className="text-sm text-gray-500">პერსონალურ მონაცემთა დაცვა</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">მისამართი</div>
                    <div className="text-sm text-gray-600">{company.address}</div>
                  </div>
                </div>

                {company.contact_name && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">საკონტაქტო პირი</div>
                      <div className="text-sm text-gray-600">{company.contact_name}</div>
                    </div>
                  </div>
                )}

                {company.contact_phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">ტელეფონი</div>
                      <div className="text-sm text-gray-600">{company.contact_phone}</div>
                    </div>
                  </div>
                )}

                {company.contact_email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">ელ. ფოსტა</div>
                      <div className="text-sm text-gray-600">{company.contact_email}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compliance Progress */}
          <div className="lg:col-span-2">
            <PhaseProgressTracker 
              companyId={company.id} 
              companyName={company.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
