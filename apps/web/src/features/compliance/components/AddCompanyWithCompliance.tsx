/**
 * Add Company with Personal Data Protection Compliance
 * Allows selecting between new company (5 phases) or existing company (already certified)
 */

'use client';

import { useState } from 'react';
import { Calendar, CheckCircle, Circle, Building2, ArrowRight } from 'lucide-react';
import { COMPLIANCE_PHASES } from '@/types/compliance';

interface AddCompanyWithComplianceProps {
  onSubmit: (data: {
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
  }) => Promise<void>;
  onCancel: () => void;
}

export function AddCompanyWithCompliance({ onSubmit, onCancel }: AddCompanyWithComplianceProps) {
  const [companyType, setCompanyType] = useState<'new' | 'existing'>('new');
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    contact_email: ''
  });
  
  const [phaseDates, setPhaseDates] = useState<Record<number, string>>({});
  const [nextCheckupDate, setNextCheckupDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit({
        company: companyData,
        compliance: {
          isNew: companyType === 'new',
          phaseDates: companyType === 'new' ? phaseDates : undefined,
          nextCheckupDate: companyType === 'existing' ? nextCheckupDate : undefined,
        }
      });
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white p-4 border-b">
        <h2 className="text-2xl font-bold">კომპანიის დამატება - პერსონალურ მონაცემთა დაცვა</h2>
        <p className="text-gray-600 mt-1">Personal Data Protection Service</p>
      </div>

      {/* Company Type Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">კომპანიის ტიპი</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setCompanyType('new')}
            className={`p-6 rounded-lg border-2 transition-all ${
              companyType === 'new' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center mb-3">
              <Circle className="w-10 h-10 text-blue-500" />
            </div>
            <div className="font-semibold text-lg mb-1">ახალი კომპანია</div>
            <div className="text-sm text-gray-600">
              საჭიროებს 5 ფაზის გავლას
            </div>
            <div className="text-xs text-gray-500 mt-2">
              New company - requires 5 phases
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => setCompanyType('existing')}
            className={`p-6 rounded-lg border-2 transition-all ${
              companyType === 'existing' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center mb-3">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div className="font-semibold text-lg mb-1">არსებული კომპანია</div>
            <div className="text-sm text-gray-600">
              უკვე სერტიფიცირებული
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Existing company - already certified
            </div>
          </button>
        </div>
      </div>

      {/* Company Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          კომპანიის ინფორმაცია
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              კომპანიის სახელი <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={companyData.name}
              onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="შეიყვანეთ კომპანიის სახელი"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              მისამართი <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={companyData.address}
              onChange={(e) => setCompanyData({...companyData, address: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="შეიყვანეთ მისამართი"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                საკონტაქტო პირი
              </label>
              <input
                type="text"
                value={companyData.contact_person}
                onChange={(e) => setCompanyData({...companyData, contact_person: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="სახელი და გვარი"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ტელეფონი
              </label>
              <input
                type="tel"
                value={companyData.contact_phone}
                onChange={(e) => setCompanyData({...companyData, contact_phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+995 XXX XX XX XX"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ელ. ფოსტა
            </label>
            <input
              type="email"
              value={companyData.contact_email}
              onChange={(e) => setCompanyData({...companyData, contact_email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>
        </div>
      </div>

      {/* Phase Planning for New Companies */}
      {companyType === 'new' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            ფაზების დაგეგმვა
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            განსაზღვრეთ თითოეული ფაზის დასრულების დაგეგმილი თარიღი
          </p>
          <div className="space-y-4">
            {COMPLIANCE_PHASES.map((phase) => (
              <div key={phase.number} className="flex items-center gap-4 p-4 border rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">{phase.number}</span>
                </div>
                <div className="flex-grow">
                  <div className="font-medium text-gray-900">{phase.nameKa}</div>
                  <div className="text-sm text-gray-600">{phase.descriptionKa}</div>
                </div>
                <div className="flex-shrink-0">
                  <input
                    type="date"
                    value={phaseDates[phase.number] || ''}
                    onChange={(e) => setPhaseDates({
                      ...phaseDates,
                      [phase.number]: e.target.value
                    })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>რჩევა:</strong> ფაზებს შორის რეკომენდებული ინტერვალი არის 2-3 კვირა
            </p>
          </div>
        </div>
      )}

      {/* Next Checkup for Existing Companies */}
      {companyType === 'existing' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            შემდეგი შემოწმება
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              შემდეგი შემოწმების თარიღი
            </label>
            <input
              type="date"
              value={nextCheckupDate}
              onChange={(e) => setNextCheckupDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-600 mt-2">
              📅 სერტიფიცირებული კომპანიები საჭიროებენ რეგულარულ შემოწმებას ყოველ 3 თვეში
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end bg-white p-4 border-t sticky bottom-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          გაუქმება
        </button>
        <button
          type="submit"
          disabled={loading || !companyData.name || !companyData.address}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              მიმდინარეობს...
            </>
          ) : (
            <>
              დამატება
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
