'use client'

import { useEffect } from 'react'

export default function InspectorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Inspector error:', error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center bg-bg-secondary p-8">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          ინსპექტორის გვერდის ჩატვირთვა ვერ მოხერხდა
        </h2>
        <p className="text-text-secondary mb-6">
          მოხდა შეცდომა მონაცემების ჩატვირთვისას. გთხოვთ სცადოთ თავიდან.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors"
        >
          თავიდან ცდა
        </button>
      </div>
    </div>
  )
}
