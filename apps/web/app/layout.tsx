import type { Metadata, Viewport } from 'next'
import { Poppins, Figtree } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster, MondayLayout, TooltipProvider } from '@/shared/components/ui'
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

// FiraGO - Georgian font with full Unicode support, self-hosted
const firaGO = localFont({
  src: [
    { path: '../public/fonts/FiraGO-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/FiraGO-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/FiraGO-SemiBold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-georgian',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RouteHub - Intelligent Route Optimization',
  description: 'Professional route optimization and field management system for safety officers',
  keywords: ['route optimization', 'field management', 'inspection', 'RouteHub'],
  authors: [{ name: 'RouteHub' }],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} ${poppins.variable} ${firaGO.variable} font-product`}>
        <ErrorBoundary>
          <Providers>
            <TooltipProvider>
              <MondayLayout>
                {children}
                <Toaster />
                <PWARegister />
                {/* <WebVitalsTracker /> */}
              </MondayLayout>
            </TooltipProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
