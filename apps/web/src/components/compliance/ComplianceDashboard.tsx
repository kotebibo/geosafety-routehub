/**
 * Compliance Dashboard
 * Overview of all companies' Personal Data Protection compliance status
 */

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Calendar, Search, Filter } from 'lucide-react';
import { PDPComplianceOverview } from '@/types/compliance';
import { complianceService } from '@/services/compliance.service';

export function ComplianceDashboard() {
  const [companies, setCompanies] = useState<PDPComplianceOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'certified'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCompanies();
  }, [filter]);

  const loadCompanies = async () => {
    setLoading(true);
    
    try {
      let data;
      if (filter === 'pending') {
        const result = await complianceService.getPendingPhases();
        data = result.data;
      } else {
        const result = await complianceService.getAllCompliance();
        data = result.data;
        if (filter === 'certified' && data) {
          data = data.filter(c => c.compliance_status === 'certified' || c.compliance_status === 'active');
        }
      }
      
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.company_address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return { text: 'ახალი', color: 'bg-gray-100 text-gray-800', icon: Clock };
      case 'in_progress':
        return { text: 'მიმდინარე', color: 'bg-blue-100 text-blue-800', icon: Clock };
      case 'certified':
      case 'active':
        return { text: 'სერტიფიცირებული', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      default:
        return { text: status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">პერსონალურ მონაცემთა დაცვა - კომპლაენსი</h2>
        
        {/* Search & Filter */}
        <div className="flex gap-4 mb-4">
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ძებნა კომპანიის სახელით ან მისამართით..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ყველა ({companies.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              მიმდინარე
            </button>
            <button
              onClick={() => setFilter('certified')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'certified'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              სერტიფიცირებული
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{companies.length}</div>
            <div className="text-sm text-gray-600">სულ კომპანიები</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">
              {companies.filter(c => c.compliance_status === 'in_progress' || c.compliance_status === 'new').length}
            </div>
            <div className="text-sm text-blue-700">მიმდინარე ფაზები</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              {companies.filter(c => c.compliance_status === 'certified' || c.compliance_status === 'active').length}
            </div>
            <div className="text-sm text-green-700">სერტიფიცირებული</div>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        {filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-2">
              <AlertCircle className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600">კომპანიები არ მოიძებნა</p>
          </div>
        ) : (
          filteredCompanies.map((company) => {
            const statusBadge = getStatusBadge(company.compliance_status);
            const StatusIcon = statusBadge.icon;
            
            return (
              <div key={company.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {company.company_name}
                      </h3>
                      <p className="text-sm text-gray-600">{company.company_address}</p>
                      {company.contact_person && (
                        <p className="text-sm text-gray-500 mt-1">
                          📞 {company.contact_person}
                          {company.contact_phone && ` • ${company.contact_phone}`}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusBadge.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusBadge.text}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {company.current_phase_status}
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        {company.progress_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${company.progress_percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {company.phases_completed} / 5 ფაზა დასრულებული
                      </span>
                    </div>
                  </div>

                  {/* Next Checkup */}
                  {company.next_checkup_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>
                        შემდეგი შემოწმება: {' '}
                        <strong>
                          {new Date(company.next_checkup_date).toLocaleDateString('ka-GE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
