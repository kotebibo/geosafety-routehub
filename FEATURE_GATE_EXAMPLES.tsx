/**
 * Example: Applying Feature Gates to Components
 * 
 * This file shows practical examples of how to update your existing
 * components to work with single-service mode
 */

// ============================================
// EXAMPLE 1: Company Form - Hide Service Selector
// ============================================

// BEFORE (shows service selector always)
function CompanyForm() {
  return (
    <form>
      <Input label="Company Name" />
      <Input label="Address" />
      
      <Select label="Service Type">
        <option value="personal_data">Personal Data Protection</option>
        <option value="fire_safety">Fire Safety</option>
        <option value="labor_safety">Labor Safety</option>
      </Select>
    </form>
  )
}

// AFTER (hides service selector in single service mode)
import { FeatureGate } from '@/components/FeatureGate'
import { DEPLOYMENT_CONFIG, getEnabledServices, getServiceName } from '@/config/features'

function CompanyForm() {
  // Automatically use primary service in single-service mode
  const defaultService = DEPLOYMENT_CONFIG.isSingleServiceMode 
    ? DEPLOYMENT_CONFIG.primaryService 
    : undefined

  return (
    <form>
      <Input label="Company Name" />
      <Input label="Address" />
      
      {/* Only show selector in multi-service mode */}
      <FeatureGate feature="ENABLE_SERVICE_SELECTOR">
        <Select label="Service Type" defaultValue={defaultService}>
          {getEnabledServices().map(service => (
            <option key={service} value={service}>
              {getServiceName(service, 'ka')}
            </option>
          ))}
        </Select>
      </FeatureGate>
      
      {/* Hidden field in single-service mode */}
      {DEPLOYMENT_CONFIG.isSingleServiceMode && (
        <input type="hidden" name="serviceType" value={defaultService} />
      )}
    </form>
  )
}

// ============================================
// EXAMPLE 2: Company Table - Hide Service Column
// ============================================

// BEFORE (shows service column always)
function CompanyTable({ companies }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Address</th>
          <th>Service Type</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {companies.map(company => (
          <tr key={company.id}>
            <td>{company.name}</td>
            <td>{company.address}</td>
            <td>{company.serviceType}</td>
            <td><Button>Edit</Button></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// AFTER (hides service column in single service mode)
import { DEPLOYMENT_CONFIG } from '@/config/features'

function CompanyTable({ companies }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Address</th>
          {DEPLOYMENT_CONFIG.showServiceInCompanyList && <th>Service Type</th>}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {companies.map(company => (
          <tr key={company.id}>
            <td>{company.name}</td>
            <td>{company.address}</td>
            {DEPLOYMENT_CONFIG.showServiceInCompanyList && (
              <td>{company.serviceType}</td>
            )}
            <td><Button>Edit</Button></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================
// EXAMPLE 3: Route Card - Hide Service Badge
// ============================================

// BEFORE (shows service badge always)
function RouteCard({ route }) {
  return (
    <div className="card">
      <h3>{route.name}</h3>
      <Badge>{route.serviceType}</Badge>
      <p>{route.stopCount} stops</p>
    </div>
  )
}

// AFTER (hides service badge in single service mode)
import { FeatureGate } from '@/components/FeatureGate'

function RouteCard({ route }) {
  return (
    <div className="card">
      <h3>{route.name}</h3>
      
      <FeatureGate feature="ENABLE_SERVICE_SELECTOR">
        <Badge>{route.serviceType}</Badge>
      </FeatureGate>
      
      <p>{route.stopCount} stops</p>
    </div>
  )
}

// ============================================
// EXAMPLE 4: Dashboard - Conditional Analytics
// ============================================

// BEFORE (shows multi-service breakdown)
function Dashboard() {
  return (
    <div>
      <h2>Analytics by Service</h2>
      <ServiceBreakdownChart />
    </div>
  )
}

// AFTER (shows appropriate analytics based on mode)
import { FeatureGate, FeatureGateInverse } from '@/components/FeatureGate'
import { DEPLOYMENT_CONFIG } from '@/config/features'

function Dashboard() {
  return (
    <div>
      {/* Multi-service mode */}
      <FeatureGate feature="ENABLE_SERVICE_SELECTOR">
        <h2>Analytics by Service</h2>
        <ServiceBreakdownChart />
      </FeatureGate>
      
      {/* Single-service mode */}
      <FeatureGateInverse feature="ENABLE_SERVICE_SELECTOR">
        <h2>{DEPLOYMENT_CONFIG.primaryServiceName} - Analytics</h2>
        <SingleServiceChart />
      </FeatureGateInverse>
    </div>
  )
}

// ============================================
// EXAMPLE 5: Filter Component
// ============================================

// BEFORE (shows all filters)
function CompanyFilters() {
  return (
    <div className="filters">
      <Input placeholder="Search..." />
      <Select label="Status" />
      <Select label="Service Type" />
      <Select label="Priority" />
    </div>
  )
}

// AFTER (hides service filter in single service mode)
import { FeatureGate } from '@/components/FeatureGate'

function CompanyFilters() {
  return (
    <div className="filters">
      <Input placeholder="Search..." />
      <Select label="Status" />
      
      <FeatureGate feature="ENABLE_SERVICE_FILTERING">
        <Select label="Service Type" />
      </FeatureGate>
      
      <Select label="Priority" />
    </div>
  )
}

// ============================================
// EXAMPLE 6: Navigation Menu
// ============================================

// BEFORE (shows services link)
function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/companies">Companies</Link>
      <Link href="/routes">Routes</Link>
      <Link href="/services">Services</Link>
      <Link href="/inspectors">Inspectors</Link>
    </nav>
  )
}

// AFTER (hides services link in single service mode)
import { FeatureGate } from '@/components/FeatureGate'

function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/companies">Companies</Link>
      <Link href="/routes">Routes</Link>
      
      <FeatureGate feature="ENABLE_SERVICE_SELECTOR">
        <Link href="/services">Services</Link>
      </FeatureGate>
      
      <Link href="/inspectors">Inspectors</Link>
    </nav>
  )
}

// ============================================
// EXAMPLE 7: Page Title with Service Name
// ============================================

// BEFORE (generic title)
function CompaniesPage() {
  return (
    <div>
      <h1>Companies</h1>
      {/* content */}
    </div>
  )
}

// AFTER (shows service name in single-service mode)
import { DEPLOYMENT_CONFIG } from '@/config/features'

function CompaniesPage() {
  const pageTitle = DEPLOYMENT_CONFIG.isSingleServiceMode
    ? `${DEPLOYMENT_CONFIG.primaryServiceName} - კომპანიები`
    : 'კომპანიები'

  return (
    <div>
      <h1>{pageTitle}</h1>
      {/* content */}
    </div>
  )
}

// ============================================
// EXAMPLE 8: Route Builder with Auto Service
// ============================================

// BEFORE (user selects service)
function RouteBuilder() {
  const [serviceType, setServiceType] = useState('')
  
  return (
    <div>
      <Select 
        value={serviceType} 
        onChange={(e) => setServiceType(e.target.value)}
      >
        <option value="">Select Service</option>
        <option value="personal_data">Personal Data</option>
        <option value="fire_safety">Fire Safety</option>
      </Select>
    </div>
  )
}

// AFTER (auto-selects in single service mode)
import { DEPLOYMENT_CONFIG, getEnabledServices, getServiceName } from '@/config/features'
import { FeatureGate } from '@/components/FeatureGate'

function RouteBuilder() {
  // Auto-select primary service in single-service mode
  const [serviceType, setServiceType] = useState(
    DEPLOYMENT_CONFIG.isSingleServiceMode 
      ? DEPLOYMENT_CONFIG.primaryService 
      : ''
  )
  
  return (
    <div>
      <FeatureGate feature="ENABLE_SERVICE_SELECTOR">
        <Select 
          value={serviceType} 
          onChange={(e) => setServiceType(e.target.value)}
        >
          <option value="">აირჩიეთ სერვისი</option>
          {getEnabledServices().map(service => (
            <option key={service} value={service}>
              {getServiceName(service, 'ka')}
            </option>
          ))}
        </Select>
      </FeatureGate>
      
      <FeatureGateInverse feature="ENABLE_SERVICE_SELECTOR">
        <div className="text-sm text-gray-600">
          სერვისი: {DEPLOYMENT_CONFIG.primaryServiceName}
        </div>
      </FeatureGateInverse>
    </div>
  )
}

export default RouteBuilder
