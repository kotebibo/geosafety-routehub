/**
 * Feature Flags Configuration
 *
 * Control which features are enabled in the application.
 * This allows us to launch with only Personal Data Protection Service
 * and easily enable other services in the future.
 */

// Service Types Available
export const SERVICES = {
  PERSONAL_DATA_PROTECTION: 'personal_data_protection',
  FIRE_SAFETY: 'fire_safety',
  LABOR_SAFETY: 'labor_safety',
  FOOD_SAFETY: 'food_safety',
  ENVIRONMENTAL: 'environmental',
} as const

// Feature Flags
export const FEATURE_FLAGS = {
  // SERVICE FEATURES
  // Set to true to enable, false to hide from UI
  ENABLE_PERSONAL_DATA_PROTECTION: true, // ✅ ENABLED for launch
  ENABLE_FIRE_SAFETY: false, // 🔒 DISABLED (future)
  ENABLE_LABOR_SAFETY: false, // 🔒 DISABLED (future)
  ENABLE_FOOD_SAFETY: false, // 🔒 DISABLED (future)
  ENABLE_ENVIRONMENTAL: false, // 🔒 DISABLED (future)

  // MULTI-SERVICE FEATURES
  // These will be needed when we have multiple services
  ENABLE_SERVICE_SELECTOR: false, // Show service type dropdown
  ENABLE_SERVICE_FILTERING: false, // Filter by service type
  ENABLE_MULTI_SERVICE_ROUTES: false, // Routes with multiple service types

  // UI FEATURES
  ENABLE_ANALYTICS_DASHBOARD: true, // Analytics page
  ENABLE_INSPECTOR_APP: true, // Inspector mobile view
  ENABLE_ROUTE_OPTIMIZATION: true, // Route optimization
  ENABLE_COMPANY_ASSIGNMENTS: true, // Assign companies to inspectors

  // ADVANCED FEATURES (Future)
  ENABLE_BULK_OPERATIONS: false, // Bulk company operations
  ENABLE_ADVANCED_FILTERS: false, // Advanced filtering
  ENABLE_CUSTOM_REPORTS: false, // Custom report generation
  ENABLE_API_ACCESS: false, // External API access
} as const

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature]
}

// Helper to check if a service is enabled
export function isServiceEnabled(service: string): boolean {
  switch (service) {
    case SERVICES.PERSONAL_DATA_PROTECTION:
      return FEATURE_FLAGS.ENABLE_PERSONAL_DATA_PROTECTION
    case SERVICES.FIRE_SAFETY:
      return FEATURE_FLAGS.ENABLE_FIRE_SAFETY
    case SERVICES.LABOR_SAFETY:
      return FEATURE_FLAGS.ENABLE_LABOR_SAFETY
    case SERVICES.FOOD_SAFETY:
      return FEATURE_FLAGS.ENABLE_FOOD_SAFETY
    case SERVICES.ENVIRONMENTAL:
      return FEATURE_FLAGS.ENABLE_ENVIRONMENTAL
    default:
      return false
  }
}

// Get list of enabled services
export function getEnabledServices(): string[] {
  return Object.values(SERVICES).filter(service => isServiceEnabled(service))
}

// Check if multi-service mode is needed
export function isMultiServiceMode(): boolean {
  return getEnabledServices().length > 1
}

// Get primary service (when only one is enabled)
export function getPrimaryService(): string | null {
  const enabled = getEnabledServices()
  return enabled.length === 1 ? enabled[0] : null
}

// Service Display Names (Georgian)
export const SERVICE_NAMES: Record<string, { ka: string; en: string }> = {
  [SERVICES.PERSONAL_DATA_PROTECTION]: {
    ka: 'პერსონალურ მონაცემთა დაცვა',
    en: 'Personal Data Protection',
  },
  [SERVICES.FIRE_SAFETY]: {
    ka: 'ხანძარუსაფრთხოება',
    en: 'Fire Safety',
  },
  [SERVICES.LABOR_SAFETY]: {
    ka: 'შრომის უსაფრთხოება',
    en: 'Labor Safety',
  },
  [SERVICES.FOOD_SAFETY]: {
    ka: 'საკვების უსაფრთხოება',
    en: 'Food Safety',
  },
  [SERVICES.ENVIRONMENTAL]: {
    ka: 'გარემოს დაცვა',
    en: 'Environmental Protection',
  },
}

// Get service name in Georgian
export function getServiceName(service: string, lang: 'ka' | 'en' = 'ka'): string {
  return SERVICE_NAMES[service]?.[lang] || service
}

// Configuration for current deployment
export const DEPLOYMENT_CONFIG = {
  // Single service mode for launch
  isSingleServiceMode: true,
  primaryService: SERVICES.PERSONAL_DATA_PROTECTION,
  primaryServiceName: SERVICE_NAMES[SERVICES.PERSONAL_DATA_PROTECTION].ka,

  // Brand name (can be customized per service)
  appName: 'RouteHub',
  appNameFull: 'RouteHub - პერსონალურ მონაცემთა დაცვის სამსახური',

  // Hide/show UI elements
  showServiceSelector: false, // Hide service dropdown
  showServiceInCompanyList: false, // Hide service column
  showServiceInRoutes: false, // Hide service in route cards
  showMultiServiceDashboard: false, // Hide multi-service analytics
}

// Type exports
export type FeatureFlag = keyof typeof FEATURE_FLAGS
export type ServiceType = (typeof SERVICES)[keyof typeof SERVICES]
