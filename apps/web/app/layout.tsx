import type { Metadata, Viewport } from 'next'
import { Poppins, Figtree, Noto_Sans_Georgian } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster, MondayLayout } from '@/shared/components/ui'
import { ErrorBoundary } from '@/shared/components/feedback'
// import { WebVitalsTracker } from '@/components/WebVitalsTracker' // Temporarily disabled

// Monday.com Design System Fonts
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-brand',
  display: 'swap',
})

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-product',
  display: 'swap',
})

const georgian = Noto_Sans_Georgian({
  subsets: ['latin', 'georgian'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-georgian',
  display: 'swap',
})

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
              {/* <WebVitalsTracker /> */}
            </MondayLayout>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
