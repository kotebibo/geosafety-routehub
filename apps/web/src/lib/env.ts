/**
 * Environment Variables Configuration
 * 
 * This file provides type-safe access to environment variables
 * and validates them at runtime.
 */

// Validation helper
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getOptionalEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue
}

// Public environment variables (exposed to browser)
export const env = {
  // Supabase
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  },
  
  // Application
  app: {
    url: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    env: getEnvVar('NODE_ENV', 'development'),
  },
  
  // Maps
  map: {
    provider: getEnvVar('NEXT_PUBLIC_MAP_PROVIDER', 'openstreetmap'),
    mapboxToken: getOptionalEnvVar('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN'),
  },
  
  // Analytics
  analytics: {
    sentryDsn: getOptionalEnvVar('NEXT_PUBLIC_SENTRY_DSN'),
    gaId: getOptionalEnvVar('NEXT_PUBLIC_GA_ID'),
  },
  
  // Feature flags
  features: {
    enableMockData: getOptionalEnvVar('NEXT_PUBLIC_ENABLE_MOCK_DATA') === 'true',
    enableDebugMode: getOptionalEnvVar('NEXT_PUBLIC_ENABLE_DEBUG_MODE') === 'true',
    enablePerformanceLogging: getOptionalEnvVar('NEXT_PUBLIC_ENABLE_PERFORMANCE_LOGGING') === 'true',
  },
} as const

// Server-only environment variables (NEVER exposed to browser)
export const serverEnv = {
  supabase: {
    serviceKey: getEnvVar('SUPABASE_SERVICE_KEY'),
  },
  
  sentry: {
    authToken: getOptionalEnvVar('SENTRY_AUTH_TOKEN'),
    org: getOptionalEnvVar('SENTRY_ORG'),
    project: getOptionalEnvVar('SENTRY_PROJECT'),
  },
  
  rateLimit: {
    maxRequests: parseInt(getOptionalEnvVar('RATE_LIMIT_MAX_REQUESTS', '100')),
    windowMs: parseInt(getOptionalEnvVar('RATE_LIMIT_WINDOW_MS', '900000')),
  },
  
  session: {
    secret: getOptionalEnvVar('SESSION_SECRET'),
    maxAge: parseInt(getOptionalEnvVar('SESSION_MAX_AGE', '604800000')),
  },
} as const

// Type exports
export type Environment = typeof env
export type ServerEnvironment = typeof serverEnv

// Validate environment on load (only in production)
if (env.app.env === 'production') {
  console.log('✅ Environment variables validated successfully')
}
