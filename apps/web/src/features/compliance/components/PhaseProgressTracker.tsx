/**
 * Phase Progress Tracker
 * Shows the 5-phase progress for a company
 */

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, Calendar, FileText } from 'lucide-react';
import { COMPLIANCE_PHASES, PDPCompliancePhase } from '@/types/compliance';
import { complianceService } from '@/services/compliance.service';

interface PhaseProgressTrackerProps {
  companyId: string;
  companyName?: string;
}

export function PhaseProgressTracker({ companyId, companyName }: PhaseProgressTrackerProps) {
  const [compliance, setCompliance] = useState<PDPCompliancePhase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompliance();
  }, [companyId]);

  const loadCompliance = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: err } = await complianceService.getCompanyCompliance(companyId);
      
      if (err) {
        setError('Failed to load compliance data');
        console.error(err);
      } else {
        setCompliance(data);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin text-4xl">⏳</div>
        </div>
      </div>
    );
  }

  if (error || !compliance) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-600">
          {error || 'No compliance data found'}
        </div>
      </div>
    );
  }

  const completedPhases = COMPLIANCE_PHASES.filter(phase => 
    compliance[`phase_${phase.number}_completed` as keyof PDPCompliancePhase]
  ).length;

  const progressPercentage = (completedPhases / 5) * 100;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Compliance Progress</h3>
            {companyName && <p className="text-sm text-gray-600">{companyName}</p>}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{Math.round(progressPercentage)}%</div>
            <div className="text-xs text-gray-500">{completedPhases} of 5 phases</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Phases List */}
      <div className="p-6 space-y-4">
        {COMPLIANCE_PHASES.map((phase) => {
          const isCompleted = compliance[`phase_${phase.number}_completed` as keyof PDPCompliancePhase] as boolean;
          const date = compliance[`phase_${phase.number}_date` as keyof PDPCompliancePhase] as string | undefined;
          const notes = compliance[`phase_${phase.number}_notes` as keyof PDPCompliancePhase] as string | undefined;
          
          return (
            <div 
              key={phase.number} 
              className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                isCompleted 
                  ? 'border-green-200 bg-green-50' 
                  : date
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-7 h-7 text-green-600" />
                ) : date ? (
                  <Clock className="w-7 h-7 text-blue-600" />
                ) : (
                  <Circle className="w-7 h-7 text-gray-400" />
                )}
              </div>
              
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">
                    ფაზა {phase.number}: {phase.nameKa}
                  </span>
                  {isCompleted && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      დასრულებული
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-2">{phase.descriptionKa}</div>
                
                {date && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {isCompleted ? 'დასრულდა: ' : 'დაგეგმილია: '}
                      {new Date(date).toLocaleDateString('ka-GE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                
                {notes && (
                  <div className="flex items-start gap-2 text-sm text-gray-600 mt-2 p-2 bg-white rounded border">
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{notes}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Certification Info */}
      {compliance.compliance_status === 'certified' && compliance.certification_date && (
        <div className="p-6 border-t bg-green-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <div className="font-semibold text-green-900">სერტიფიცირებული</div>
              <div className="text-sm text-green-700">
                სერტიფიკატის თარიღი: {new Date(compliance.certification_date).toLocaleDateString('ka-GE')}
              </div>
              {compliance.certificate_number && (
                <div className="text-xs text-green-600 mt-1">
                  სერტიფიკატის ნომერი: {compliance.certificate_number}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next Checkup */}
      {compliance.next_checkup_date && (
        <div className="p-6 border-t bg-blue-50">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <div className="font-medium text-blue-900">შემდეგი შემოწმება</div>
              <div className="text-sm text-blue-700">
                {new Date(compliance.next_checkup_date).toLocaleDateString('ka-GE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
