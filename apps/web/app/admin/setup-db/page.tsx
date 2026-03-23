'use client'

import { useState } from 'react'
import { Database, CheckCircle } from 'lucide-react'

export default function SetupPDPDatabasePage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-bg-primary rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">PDP Database Setup</h1>
            <p className="text-text-secondary">Database tables for PDP onboarding</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="font-semibold text-green-800 mb-2">✅ Migration File Created</h2>
          <p className="text-sm text-green-700">
            Run this SQL migration in your Supabase dashboard:
          </p>
          <code className="block mt-2 p-2 bg-bg-primary rounded text-xs">
            supabase/migrations/20250115_add_pdp_phases_table.sql
          </code>
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="font-semibold">To apply the migration:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go to your Supabase Dashboard</li>
            <li>Navigate to SQL Editor</li>
            <li>Copy the migration file content</li>
            <li>Run the SQL query</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
