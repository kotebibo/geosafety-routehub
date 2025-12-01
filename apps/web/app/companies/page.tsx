'use client'

import { useRouter } from 'next/navigation'
import { PageHeader, LoadingSpinner, StatCard, EmptyState } from '@/shared/components/ui'
import { CompanyTable } from '@/features/companies/components'
import { useCompanies } from '@/features/companies/hooks'
import { Building2, Plus, Search } from 'lucide-react'

export default function CompaniesPage() {
  const router = useRouter()
  const {
    companies,
    allCompanies,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    deleteCompany,
  } = useCompanies()

  if (loading) {
    return <LoadingSpinner message="კომპანიების ჩატვირთვა..." />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">დაფიქსირდა შეცდომა</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            თავიდან ცდა
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="კომპანიები"
        description="ყველა რეგისტრირებული კომპანია"
        action={{
          label: 'ახალი კომპანია',
          onClick: () => router.push('/companies/new'),
          icon: <Plus className="w-5 h-5" />,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="სულ კომპანიები"
            value={allCompanies.length}
            icon={Building2}
            color="blue"
          />
          <StatCard
            label="ნაჩვენები"
            value={companies.length}
            icon={Search}
            color="green"
          />
          <StatCard
            label="გაფილტრული"
            value={allCompanies.length - companies.length}
            icon={Building2}
            color="amber"
          />
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ძებნა სახელით ან მისამართით..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Companies Table */}
        {companies.length === 0 && searchTerm ? (
          <EmptyState
            icon={<Search className="w-16 h-16" />}
            title="შედეგები არ მოიძებნა"
            description={`"${searchTerm}" მოთხოვნით კომპანიები არ მოიძებნა`}
            action={{
              label: 'გასუფთავება',
              onClick: () => setSearchTerm(''),
            }}
          />
        ) : allCompanies.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-16 h-16" />}
            title="კომპანიები არ არის"
            description="დაამატეთ პირველი კომპანია"
            action={{
              label: 'ახალი კომპანია',
              onClick: () => router.push('/companies/new'),
            }}
          />
        ) : (
          <CompanyTable
            companies={companies}
            onDelete={deleteCompany}
          />
        )}
      </div>
    </div>
  )
}
