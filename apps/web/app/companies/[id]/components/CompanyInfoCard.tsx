'use client'

import { useTranslations } from 'next-intl'
import { FileText, Shield, AlertTriangle, User, Phone, Mail, Calendar } from 'lucide-react'

interface Company {
  id: string
  name: string
  address?: string | null
  type: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  priority: string | null
  status: string | null
  notes: string | null
  created_at?: string | null
}

interface CompanyInfoCardProps {
  company: Company
}

export function CompanyInfoCard({ company }: CompanyInfoCardProps) {
  const t = useTranslations()

  const priorityConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    high: {
      label: t('companies.detail.priorityHigh'),
      bg: 'bg-red-50',
      text: 'text-red-700',
      dot: 'bg-red-500',
    },
    medium: {
      label: t('companies.detail.priorityMedium'),
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    low: {
      label: t('companies.detail.priorityLow'),
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
  }

  const priority = priorityConfig[company.priority ?? 'low'] || priorityConfig.low

  return (
    <div className="bg-bg-primary border border-border-light rounded-xl mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-border-light flex items-center gap-2">
        <FileText className="w-4.5 h-4.5 text-text-tertiary" />
        <h2 className="font-semibold text-text-primary">{t('companies.detail.basicInfo')}</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          <InfoField
            icon={<Shield className="w-4 h-4" />}
            label={t('companies.detail.type')}
            value={company.type || '\u2014'}
          />
          <InfoField
            icon={<AlertTriangle className="w-4 h-4" />}
            label={t('companies.detail.priority')}
            badge={
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                {priority.label}
              </span>
            }
          />
          {company.contact_name && (
            <InfoField
              icon={<User className="w-4 h-4" />}
              label={t('companies.detail.contactPerson')}
              value={company.contact_name}
            />
          )}
          {company.contact_phone && (
            <InfoField
              icon={<Phone className="w-4 h-4" />}
              label={t('companies.detail.phone')}
              value={company.contact_phone}
              href={`tel:${company.contact_phone}`}
            />
          )}
          {company.contact_email && (
            <InfoField
              icon={<Mail className="w-4 h-4" />}
              label={t('companies.detail.email')}
              value={company.contact_email}
              href={`mailto:${company.contact_email}`}
            />
          )}
          {company.created_at && (
            <InfoField
              icon={<Calendar className="w-4 h-4" />}
              label={t('companies.detail.dateAdded')}
              value={new Date(company.created_at).toLocaleDateString('ka-GE')}
            />
          )}
        </div>
        {company.notes && (
          <div className="mt-5 pt-5 border-t border-border-light">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1.5">
              {t('companies.detail.notes')}
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">{company.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Reusable info field component
interface InfoFieldProps {
  icon: React.ReactNode
  label: string
  value?: string
  badge?: React.ReactNode
  href?: string
}

function InfoField({ icon, label, value, badge, href }: InfoFieldProps) {
  return (
    <div>
      <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      {badge ||
        (href ? (
          <a href={href} className="text-sm font-medium text-monday-primary hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-text-primary">{value}</p>
        ))}
    </div>
  )
}
