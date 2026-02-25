import type { Metadata, Viewport } from 'next'
import { Poppins, Figtree, Noto_Sans_Georgian } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster, MondayLayout } from '@/shared/components/ui'
import { ErrorBoundary } from '@/shared/components/feedback'
import { PWARegister } from '@/shared/components/PWARegister'
// import { WebVitalsTracker } from '@/components/WebVitalsTracker' // Temporarily disabled

// Monday.com Design System Fonts - optimized for faster initial load
// Only load essential weights (400 regular, 500 medium, 600 semibold)
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-brand',
  display: 'swap',
})

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-product',
  display: 'swap',
})

// Georgian font - loaded with optional display for non-blocking
const georgian = Noto_Sans_Georgian({
  subsets: ['georgian'],
  weight: ['400', '500', '600'],
  variable: '--font-georgian',
  display: 'optional', // Won't block render, falls back to system font if slow
})

export const metadata: Metadata = {
  title: 'GeoSafety RouteHub - Intelligent Route Optimization',
  description: 'Professional route optimization and field management system for safety inspectors',
  keywords: ['route optimization', 'field management', 'inspection', 'GeoSafety'],
  authors: [{ name: 'GeoSafety' }],
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#6161FF', // Monday.com primary color
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} ${poppins.variable} ${georgian.variable} font-product`}>
        <ErrorBoundary>
          <Providers>
            <MondayLayout>
              {children}
              <Toaster />
              <PWARegister />
              {/* <WebVitalsTracker /> */}
            </MondayLayout>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
