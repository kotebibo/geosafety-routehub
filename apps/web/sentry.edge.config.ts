import * as Sentry from '@sentry/nextjs'

// This file configures the initialization of Sentry for edge runtime
// The config you add here will be used whenever middleware or an edge route handles a request
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
})
