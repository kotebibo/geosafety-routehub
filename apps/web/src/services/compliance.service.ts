/**
 * Personal Data Protection Compliance Service
 * Manages the 5-phase onboarding process for new companies
 */

import { createClient } from '@/lib/supabase';
import { PDPCompliancePhase, PDPComplianceOverview } from '@/types/compliance';

// Helper to get supabase client with current auth state
const getDb = () => createClient();

export const complianceService = {
  /**
   * Get compliance status for a specific company
   */
  async getCompanyCompliance(companyId: string) {
    const { data, error } = await (getDb()
      .from('pdp_compliance_phases') as any)
      .select('*')
      .eq('company_id', companyId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching compliance:', error);
      return { data: null, error };
    }
    
    return { data: data as PDPCompliancePhase | null, error: null };
  },

  /**
   * Create new compliance record
   * @param companyId - Company UUID
   * @param isNew - Whether company is new (needs 5 phases) or existing (already certified)
   * @param phaseDates - Optional planned dates for each phase
   */
  async createCompliance(
    companyId: string,
    isNew: boolean,
    phaseDates?: Record<number, string>
  ) {
    const complianceData: any = {
      company_id: companyId,
      compliance_status: isNew ? 'new' : 'active',
    };

    if (isNew && phaseDates) {
      // Set planned dates for new companies
      for (let i = 1; i <= 5; i++) {
        if (phaseDates[i]) {
          complianceData[`phase_${i}_date`] = phaseDates[i];
        }
      }
    } else if (!isNew) {
      // Mark all phases as completed for existing companies
      const today = new Date().toISOString().split('T')[0];
      for (let i = 1; i <= 5; i++) {
        complianceData[`phase_${i}_completed`] = true;
        complianceData[`phase_${i}_date`] = today;
      }
      complianceData.certification_date = today;
      complianceData.compliance_status = 'active';
      
      // Set next checkup date (90 days from now)
      const nextCheckup = new Date();
      nextCheckup.setDate(nextCheckup.getDate() + 90);
      complianceData.next_checkup_date = nextCheckup.toISOString().split('T')[0];
    }

    const { data, error } = await (getDb()
      .from('pdp_compliance_phases') as any)
      .insert(complianceData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating compliance:', error);
    }
    
    return { data: data as PDPCompliancePhase | null, error };
  },

  /**
   * Update a specific phase
   */
  async updatePhase(
    companyId: string,
    phase: number,
    updates: { date?: string; completed?: boolean; notes?: string }
  ) {
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (updates.date !== undefined) {
      updateData[`phase_${phase}_date`] = updates.date;
    }
    if (updates.completed !== undefined) {
      updateData[`phase_${phase}_completed`] = updates.completed;
    }
    if (updates.notes !== undefined) {
      updateData[`phase_${phase}_notes`] = updates.notes;
    }

    // Check if all phases are completed
    const { data: current } = await this.getCompanyCompliance(companyId);
    if (current && updates.completed) {
      const allCompleted = [1, 2, 3, 4, 5].every(i => 
        i === phase ? true : current[`phase_${i}_completed` as keyof typeof current]
      );
      
      if (allCompleted) {
        updateData.compliance_status = 'certified';
        updateData.certification_date = new Date().toISOString().split('T')[0];
        // Set next checkup
        const nextCheckup = new Date();
        nextCheckup.setDate(nextCheckup.getDate() + 90);
        updateData.next_checkup_date = nextCheckup.toISOString().split('T')[0];
      } else {
        updateData.compliance_status = 'in_progress';
      }
    }

    const { data, error } = await (getDb()
      .from('pdp_compliance_phases') as any)
      .update(updateData)
      .eq('company_id', companyId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating phase:', error);
    }
    
    return { data: data as PDPCompliancePhase | null, error };
  },

  /**
   * Get all companies with their compliance status
   */
  async getAllCompliance() {
    const { data, error } = await (getDb()
      .from('pdp_compliance_overview') as any)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all compliance:', error);
    }
    
    return { data: data as PDPComplianceOverview[] | null, error };
  },

  /**
   * Get companies with pending phases
   */
  async getPendingPhases() {
    const { data, error } = await (getDb()
      .from('pdp_compliance_overview') as any)
      .select('*')
      .in('compliance_status', ['new', 'in_progress'])
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching pending phases:', error);
    }
    
    return { data: data as PDPComplianceOverview[] | null, error };
  },

  /**
   * Get companies with upcoming checkups
   */
  async getUpcomingCheckups(daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const { data, error } = await (getDb()
      .from('pdp_compliance_overview') as any)
      .select('*')
      .eq('compliance_status', 'active')
      .lte('next_checkup_date', futureDate.toISOString().split('T')[0])
      .order('next_checkup_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching upcoming checkups:', error);
    }
    
    return { data: data as PDPComplianceOverview[] | null, error };
  },

  /**
   * Update next checkup date
   */
  async updateCheckupDate(companyId: string, nextDate: string) {
    const { data, error } = await (getDb()
      .from('pdp_compliance_phases') as any)
      .update({
        next_checkup_date: nextDate,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating checkup date:', error);
    }
    
    return { data: data as PDPCompliancePhase | null, error };
  }
};
