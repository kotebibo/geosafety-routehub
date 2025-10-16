import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import Navigation from '@/components/Navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
// import { WebVitalsTracker } from '@/components/WebVitalsTracker' // Temporarily disabled

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GeoSafety RouteHub - Intelligent Route Optimization',
  description: 'Professional route optimization and field management system for safety inspectors',
  keywords: ['route optimization', 'field management', 'inspection', 'GeoSafety'],
  authors: [{ name: 'GeoSafety' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563EB',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <Navigation />
            {children}
            <Toaster />
            {/* <WebVitalsTracker /> */}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
