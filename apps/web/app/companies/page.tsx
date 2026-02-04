'use client'

import { useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader, LoadingSpinner, StatCard, EmptyState, DataTable } from '@/shared/components/ui'
import type { Column } from '@/shared/components/ui'
import { useCompanies } from '@/features/companies/hooks'
import { Building2, Plus, Search, MapPin, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

interface Company {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

export default function CompaniesPage() {
  const router = useRouter()
  const {
    companies,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    deleteCompany,
    pagination,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
  } = useCompanies(50)

  const handleDelete = useCallback(async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`დარწმუნებული ხართ, რომ გსურთ ${name}-ის წაშლა?`)) {
      try {
        await deleteCompany(id)
        alert('კომპანია წაიშალა')
      } catch {
        alert('წაშლისას დაფიქსირდა შეცდომა')
      }
    }
  }, [deleteCompany])

  const columns = useMemo<Column<Company>[]>(() => [
    {
      id: 'name',
      header: 'კომპანია',
      accessorKey: 'name',
      sortable: true,
      cell: ({ value }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <span className="font-medium text-gray-900">{value as string}</span>
        </div>
      ),
    },
    {
      id: 'address',
      header: 'მისამართი',
      accessorKey: 'address',
      sortable: true,
      cell: ({ value }) => (
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>{value as string}</span>
        </div>
      ),
    },
    {
      id: 'coordinates',
      header: 'კოორდინატები',
      accessorFn: (row) =>
        row.lat && row.lng
          ? `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}`
          : null,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      width: 100,
      cell: ({ row }) => (
        <button
          onClick={(e) => handleDelete(row.id, row.name, e)}
          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          წაშლა
        </button>
      ),
    },
  ], [handleDelete])

  // Calculate display range
  const startItem = (pagination.page - 1) * pagination.pageSize + 1
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total)

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
            value={pagination.total}
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
            label="გვერდი"
            value={`${pagination.page} / ${pagination.totalPages || 1}`}
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
        ) : pagination.total === 0 && !loading ? (
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
          <>
            <DataTable
              data={companies}
              columns={columns}
              loading={loading}
              onRowClick={(row) => router.push(`/companies/${row.id}`)}
              caption="კომპანიების სია"
            />

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                {/* Page size selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">გვერდზე:</span>
                  <select
                    value={pagination.pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Page info */}
                <div className="text-sm text-gray-600">
                  {startItem}-{endItem} სულ {pagination.total}-დან
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevPage}
                    disabled={pagination.page === 1}
                    className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {generatePageNumbers(pagination.page, pagination.totalPages).map((pageNum, idx) => (
                      pageNum === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
                      ) : (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum as number)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            pagination.page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    ))}
                  </div>

                  <button
                    onClick={nextPage}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Helper function to generate page numbers with ellipsis
function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = []
  const delta = 2 // Number of pages to show on each side of current page

  if (totalPages <= 7) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)

    // Add ellipsis or pages after first
    if (currentPage > delta + 2) {
      pages.push('...')
    } else {
      for (let i = 2; i < currentPage - delta; i++) {
        pages.push(i)
      }
    }

    // Pages around current
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      pages.push(i)
    }

    // Add ellipsis or pages before last
    if (currentPage < totalPages - delta - 1) {
      pages.push('...')
    } else {
      for (let i = currentPage + delta + 1; i < totalPages; i++) {
        pages.push(i)
      }
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages)
    }
  }

  return pages
}
