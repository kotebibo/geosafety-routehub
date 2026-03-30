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
            <h2 className="text-2xl font-semibold text-text-primary mb-2">დაფიქსირდა შეცდომა</h2>
            <p className="text-text-secondary mb-8">
              მოულოდნელი შეცდომა დაფიქსირდა. გთხოვთ სცადოთ თავიდან.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center px-6 py-3 bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover transition-colors"
            >
              თავიდან ცდა
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
