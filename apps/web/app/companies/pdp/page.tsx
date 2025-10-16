/**
 * Personal Data Protection Companies Dashboard
 * Shows all companies with PDP compliance tracking
 */

'use client';

import { ComplianceDashboard } from '@/components/compliance';

export default function PDPCompaniesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ComplianceDashboard />
      </div>
    </div>
  );
}
