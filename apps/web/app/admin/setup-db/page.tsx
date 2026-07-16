'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Database, CheckCircle } from 'lucide-react'

export default function SetupPDPDatabasePage() {
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-bg-primary rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-8 h-8 text-monday-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t('admin.setupDb.pageTitle')}</h1>
            <p className="text-text-secondary">{t('admin.setupDb.pageDescription')}</p>
          </div>
        </div>

        <div className="bg-color-success/10 border border-color-success/30 rounded-lg p-4">
          <h2 className="font-semibold text-color-success mb-2">
            {t('admin.setupDb.migrationCreated')}
          </h2>
          <p className="text-sm text-color-success">{t('admin.setupDb.runMigrationInstruction')}</p>
          <code className="block mt-2 p-2 bg-bg-primary rounded text-xs">
            supabase/migrations/20250115_add_pdp_phases_table.sql
          </code>
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="font-semibold">{t('admin.setupDb.applyMigrationTitle')}</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>{t('admin.setupDb.step1')}</li>
            <li>{t('admin.setupDb.step2')}</li>
            <li>{t('admin.setupDb.step3')}</li>
            <li>{t('admin.setupDb.step4')}</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
