/**
 * PDP Onboarding Manager Component
 * Manages the 5-phase onboarding process for Personal Data Protection
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface PDPPhase {
  phase: number;
  name: string;
  name_ka: string;
  scheduled_date?: string;
  completed_date?: string;
  inspector_id?: string;
  notes?: string;
}

interface Inspector {
  id: string;
  full_name: string;
}

interface PDPOnboardingManagerProps {
  companyId?: string;
  onPhaseChange?: (phases: PDPPhase[], currentPhase: number) => void;
}

const PHASE_DEFINITIONS = [
  { phase: 1, name: 'Initial Assessment', name_ka: 'პირველადი შეფასება', default_days: 7 },
  { phase: 2, name: 'Documentation', name_ka: 'დოკუმენტაცია', default_days: 14 },
  { phase: 3, name: 'Implementation', name_ka: 'დანერგვა', default_days: 30 },
  { phase: 4, name: 'Training', name_ka: 'ტრენინგი', default_days: 45 },
  { phase: 5, name: 'Certification', name_ka: 'სერტიფიცირება', default_days: 60 }
];

export default function PDPOnboardingManager({ 
  companyId, 
  onPhaseChange 
}: PDPOnboardingManagerProps) {
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [phases, setPhases] = useState<PDPPhase[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInspectors();
    if (companyId) {
      fetchCompanyPhases();
    } else {
      initializePhases();
    }
  }, [companyId]);

  async function fetchInspectors() {
    try {
      const response = await fetch('/api/inspectors');
      if (response.ok) {
        const data = await response.json();
        setInspectors(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching inspectors:', error);
    }
  }

  async function fetchCompanyPhases() {
    try {
      const { data } = await supabase
        .from('company_pdp_phases')
        .select('*')
        .eq('company_id', companyId);

      if (data && data.length > 0) {
        setPhases(data);
        // Find the current phase (first incomplete phase or last phase)
        const incomplete = data.find(p => !p.completed_date);
        setCurrentPhase(incomplete ? incomplete.phase : 5);
      } else {
        initializePhases();
      }
    } catch (error) {
      console.error('Error fetching phases:', error);
      initializePhases();
    }
  }

  function initializePhases() {
    const initialPhases = PHASE_DEFINITIONS.map(def => ({
      phase: def.phase,
      name: def.name,
      name_ka: def.name_ka,
      scheduled_date: undefined,
      completed_date: undefined,
      inspector_id: undefined,
      notes: undefined
    }));
    setPhases(initialPhases);
  }

  function updatePhase(phaseNum: number, updates: Partial<PDPPhase>) {
    const newPhases = phases.map(p => 
      p.phase === phaseNum ? { ...p, ...updates } : p
    );
    setPhases(newPhases);
    
    if (onPhaseChange) {
      onPhaseChange(newPhases, currentPhase);
    }
  }

  function getDefaultDate(phaseNum: number): string {
    const def = PHASE_DEFINITIONS.find(d => d.phase === phaseNum);
    const date = new Date();
    date.setDate(date.getDate() + (def?.default_days || 7));
    return date.toISOString().split('T')[0];
  }

  function getPhaseStatus(phase: PDPPhase) {
    if (phase.completed_date) return 'completed';
    if (phase.phase < currentPhase) return 'skipped';
    if (phase.phase === currentPhase) return 'current';
    return 'pending';
  }

  return (
    <div className="space-y-4">
      {/* Current Phase Selector */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          მიმდინარე ფაზა (Current Onboarding Phase)
        </label>
        <select
          value={currentPhase}
          onChange={(e) => setCurrentPhase(Number(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>არ დაწყებულა (Not Started)</option>
          {PHASE_DEFINITIONS.map(def => (
            <option key={def.phase} value={def.phase}>
              ფაზა {def.phase}: {def.name_ka} ({def.name})
            </option>
          ))}
          <option value={6}>დასრულებული (Completed)</option>
        </select>
        <p className="text-xs text-gray-600 mt-2">
          * აირჩიეთ ფაზა, რომელზეც ამჟამად მუშაობთ ამ კომპანიასთან
        </p>
      </div>

      {/* Phase Schedule Grid */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-4">ფაზების განრიგი (Phase Schedule)</h3>
        
        <div className="space-y-3">
          {phases.map((phase) => {
            const status = getPhaseStatus(phase);
            const def = PHASE_DEFINITIONS.find(d => d.phase === phase.phase);
            
            return (
              <div 
                key={phase.phase}
                className={`border rounded-lg p-4 ${
                  status === 'completed' ? 'bg-green-50 border-green-200' :
                  status === 'current' ? 'bg-blue-50 border-blue-300' :
                  status === 'skipped' ? 'bg-gray-50 border-gray-200' :
                  'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      status === 'completed' ? 'bg-green-600 text-white' :
                      status === 'current' ? 'bg-blue-600 text-white' :
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {phase.phase}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {phase.name_ka}
                      </div>
                      <div className="text-sm text-gray-600">
                        {phase.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {status === 'current' && (
                      <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Scheduled Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      დაგეგმილი თარიღი
                    </label>
                    <input
                      type="date"
                      value={phase.scheduled_date || ''}
                      onChange={(e) => updatePhase(phase.phase, { scheduled_date: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      placeholder={getDefaultDate(phase.phase)}
                    />
                  </div>

                  {/* Inspector */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      ინსპექტორი
                    </label>
                    <select
                      value={phase.inspector_id || ''}
                      onChange={(e) => updatePhase(phase.phase, { inspector_id: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">აირჩიეთ</option>
                      {inspectors.map(inspector => (
                        <option key={inspector.id} value={inspector.id}>
                          {inspector.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Completion Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      დასრულების თარიღი
                    </label>
                    <input
                      type="date"
                      value={phase.completed_date || ''}
                      onChange={(e) => updatePhase(phase.phase, { completed_date: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      disabled={phase.phase > currentPhase}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="შენიშვნები..."
                    value={phase.notes || ''}
                    onChange={(e) => updatePhase(phase.phase, { notes: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {phases.filter(p => p.completed_date).length}
            </div>
            <div className="text-xs text-gray-600">დასრულებული</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {currentPhase > 0 && currentPhase <= 5 ? 1 : 0}
            </div>
            <div className="text-xs text-gray-600">მიმდინარე</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-400">
              {5 - phases.filter(p => p.completed_date).length}
            </div>
            <div className="text-xs text-gray-600">დარჩენილი</div>
          </div>
        </div>
      </div>

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="pdp_current_phase" value={currentPhase} />
      <input type="hidden" name="pdp_phases" value={JSON.stringify(phases)} />
    </div>
  );
}