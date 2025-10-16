/**
 * Personal Data Protection Compliance Types
 * Tracks 5-phase onboarding process for new companies
 */

export type ComplianceStatus = 'new' | 'in_progress' | 'certified' | 'active';

export interface PDPCompliancePhase {
  id: string;
  company_id: string;
  compliance_status: ComplianceStatus;
  
  // Phase 1: Initial Assessment
  phase_1_date?: string | null;
  phase_1_completed: boolean;
  phase_1_notes?: string | null;
  
  // Phase 2: Documentation
  phase_2_date?: string | null;
  phase_2_completed: boolean;
  phase_2_notes?: string | null;
  
  // Phase 3: Implementation
  phase_3_date?: string | null;
  phase_3_completed: boolean;
  phase_3_notes?: string | null;
  
  // Phase 4: Training
  phase_4_date?: string | null;
  phase_4_completed: boolean;
  phase_4_notes?: string | null;
  
  // Phase 5: Certification
  phase_5_date?: string | null;
  phase_5_completed: boolean;
  phase_5_notes?: string | null;
  
  certification_date?: string | null;
  certificate_number?: string | null;
  next_checkup_date?: string | null;
  checkup_interval_days: number;
  
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface PDPComplianceOverview extends PDPCompliancePhase {
  company_name: string;
  company_address: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  current_phase_status: string;
  phases_completed: number;
  progress_percentage: number;
}

export interface PhaseInfo {
  number: number;
  name: string;
  nameKa: string;
  description: string;
  descriptionKa: string;
}

export const COMPLIANCE_PHASES: PhaseInfo[] = [
  { 
    number: 1, 
    name: 'Initial Assessment', 
    nameKa: 'პირველადი შეფასება',
    description: 'Evaluate current data protection practices',
    descriptionKa: 'მონაცემთა დაცვის არსებული პრაქტიკის შეფასება'
  },
  { 
    number: 2, 
    name: 'Documentation', 
    nameKa: 'დოკუმენტაცია',
    description: 'Prepare required documentation and policies',
    descriptionKa: 'საჭირო დოკუმენტაციის და პოლიტიკების მომზადება'
  },
  { 
    number: 3, 
    name: 'Implementation', 
    nameKa: 'დანერგვა',
    description: 'Implement data protection measures',
    descriptionKa: 'მონაცემთა დაცვის ზომების დანერგვა'
  },
  { 
    number: 4, 
    name: 'Training', 
    nameKa: 'ტრენინგი',
    description: 'Train staff on data protection procedures',
    descriptionKa: 'პერსონალის ტრენინგი მონაცემთა დაცვის პროცედურებზე'
  },
  { 
    number: 5, 
    name: 'Certification', 
    nameKa: 'სერტიფიცირება',
    description: 'Final audit and certification',
    descriptionKa: 'საბოლოო აუდიტი და სერტიფიცირება'
  }
];
