'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-red-500 mb-4">500</h1>
            {/* global-error replaces the root layout, so no i18n provider is available — text is bilingual inline */}
            <h2 className="text-2xl font-semibold text-text-primary mb-2">
              დაფიქსირდა შეცდომა / An error occurred
            </h2>
            <p className="text-text-secondary mb-8">
              მოულოდნელი შეცდომა დაფიქსირდა. გთხოვთ სცადოთ თავიდან.
              <br />
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center px-6 py-3 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors"
            >
              თავიდან ცდა / Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
