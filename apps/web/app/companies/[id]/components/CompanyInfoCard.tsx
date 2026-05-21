'use client'

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

const priorityConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  high: {
    label: '\u10DB\u10D0\u10E6\u10D0\u10DA\u10D8',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  medium: {
    label: '\u10E1\u10D0\u10E8\u10E3\u10D0\u10DA\u10DD',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  low: {
    label: '\u10D3\u10D0\u10D1\u10D0\u10DA\u10D8',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
}

interface CompanyInfoCardProps {
  company: Company
}

export function CompanyInfoCard({ company }: CompanyInfoCardProps) {
  const priority = priorityConfig[company.priority ?? 'low'] || priorityConfig.low

  return (
    <div className="bg-bg-primary border border-border-light rounded-xl mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-border-light flex items-center gap-2">
        <FileText className="w-4.5 h-4.5 text-text-tertiary" />
        <h2 className="font-semibold text-text-primary">
          {
            '\u10EB\u10D8\u10E0\u10D8\u10D7\u10D0\u10D3\u10D8 \u10D8\u10DC\u10E4\u10DD\u10E0\u10DB\u10D0\u10EA\u10D8\u10D0'
          }
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          <InfoField
            icon={<Shield className="w-4 h-4" />}
            label={'\u10E2\u10D8\u10DE\u10D8'}
            value={company.type || '\u2014'}
          />
          <InfoField
            icon={<AlertTriangle className="w-4 h-4" />}
            label={'\u10DE\u10E0\u10D8\u10DD\u10E0\u10D8\u10E2\u10D4\u10E2\u10D8'}
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
              label={
                '\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10D0\u10E5\u10E2\u10DD \u10DE\u10D8\u10E0\u10D8'
              }
              value={company.contact_name}
            />
          )}
          {company.contact_phone && (
            <InfoField
              icon={<Phone className="w-4 h-4" />}
              label={'\u10E2\u10D4\u10DA\u10D4\u10E4\u10DD\u10DC\u10D8'}
              value={company.contact_phone}
              href={`tel:${company.contact_phone}`}
            />
          )}
          {company.contact_email && (
            <InfoField
              icon={<Mail className="w-4 h-4" />}
              label={'\u10D4\u10DA. \u10E4\u10DD\u10E1\u10E2\u10D0'}
              value={company.contact_email}
              href={`mailto:${company.contact_email}`}
            />
          )}
          {company.created_at && (
            <InfoField
              icon={<Calendar className="w-4 h-4" />}
              label={
                '\u10D3\u10D0\u10DB\u10D0\u10E2\u10D4\u10D1\u10D8\u10E1 \u10D7\u10D0\u10E0\u10D8\u10E6\u10D8'
              }
              value={new Date(company.created_at).toLocaleDateString('ka-GE')}
            />
          )}
        </div>
        {company.notes && (
          <div className="mt-5 pt-5 border-t border-border-light">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1.5">
              {'\u10E8\u10D4\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10D1\u10D8'}
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
