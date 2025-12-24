# Testing Strategy Improvement Plan

## Overview
Establish a comprehensive testing strategy that ensures code quality, prevents regressions, and provides confidence for refactoring.

## Current State Analysis

### Strengths
- Vitest + React Testing Library setup
- Basic smoke tests for critical components
- Mock utilities for Supabase responses
- Test data generators (mockCompany, mockInspector, etc.)

### Pain Points
- Low overall test coverage
- Missing integration tests
- No E2E testing framework
- Inconsistent test patterns
- Missing accessibility tests
- No visual regression tests

## Testing Pyramid

```
        /\
       /E2E\        <- 10% (Critical user flows)
      /------\
     /  Int.  \     <- 20% (Service/API integration)
    /----------\
   /    Unit    \   <- 70% (Components, hooks, utils)
  /--------------\
```

## Improvement Areas

### 1. Unit Testing Strategy

#### 1.1 Component Testing Pattern
```typescript
// __tests__/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })

    it('renders with different variants', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-primary')

      rerender(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-secondary')
    })

    it('renders as disabled', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Interactions', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<Button onClick={handleClick}>Click me</Button>)
      await user.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(<Button disabled onClick={handleClick}>Click me</Button>)
      await user.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has accessible name', () => {
      render(<Button>Submit</Button>)
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    })

    it('supports aria-label', () => {
      render(<Button aria-label="Close dialog">X</Button>)
      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
    })
  })
})
```

#### 1.2 Hook Testing Pattern
```typescript
// __tests__/hooks/useDebounce.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500))
    expect(result.current).toBe('hello')
  })

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 500 } }
    )

    rerender({ value: 'world', delay: 500 })
    expect(result.current).toBe('hello')

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('world')
  })

  it('cancels pending updates on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'hello' } }
    )

    rerender({ value: 'world' })
    unmount()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('hello')
  })
})
```

#### 1.3 Service Testing Pattern
```typescript
// __tests__/services/companies.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { companiesService } from '@/services/companies.service'
import { mockSupabaseResponse, mockCompany } from '../test-utils'

// Mock Supabase
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}))

describe('companiesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('fetches all companies ordered by name', async () => {
      const companies = [mockCompany({ name: 'A Corp' }), mockCompany({ name: 'Z Corp' })]
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseResponse(companies)),
        }),
      })

      const result = await companiesService.getAll()

      expect(mockFrom).toHaveBeenCalledWith('companies')
      expect(result).toEqual(companies)
    })

    it('throws on database error', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(
            mockSupabaseResponse(null, { message: 'Database error' })
          ),
        }),
      })

      await expect(companiesService.getAll()).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('fetches company by id', async () => {
      const company = mockCompany()
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse(company)),
          }),
        }),
      })

      const result = await companiesService.getById('company-1')

      expect(result).toEqual(company)
    })
  })
})
```

### 2. Integration Testing

#### 2.1 API Route Testing
```typescript
// __tests__/integration/api/inspectors.test.ts
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer } from 'http'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/inspectors/route'

// Create test request helper
function createRequest(
  method: string,
  url: string,
  body?: object,
  headers?: Record<string, string>
): NextRequest {
  const request = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return request
}

describe('Inspectors API', () => {
  describe('GET /api/inspectors', () => {
    it('returns list of inspectors', async () => {
      const request = createRequest('GET', '/api/inspectors')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('filters by status', async () => {
      const request = createRequest('GET', '/api/inspectors?status=active')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.every((i: any) => i.status === 'active')).toBe(true)
    })
  })

  describe('POST /api/inspectors', () => {
    it('creates inspector with valid data', async () => {
      const request = createRequest('POST', '/api/inspectors', {
        name: 'New Inspector',
        email: 'new@test.com',
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('rejects invalid data', async () => {
      const request = createRequest('POST', '/api/inspectors', {
        name: '', // Invalid: empty name
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })
})
```

#### 2.2 React Query Integration Testing
```typescript
// __tests__/integration/hooks/useCompanies.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCompanies } from '@/features/companies/hooks/useCompanies'
import { mockCompany } from '../../test-utils'

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useCompanies', () => {
  it('fetches and returns companies', async () => {
    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeDefined()
  })

  it('handles filters', async () => {
    const { result } = renderHook(
      () => useCompanies({ status: 'active' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data?.every(c => c.status === 'active')).toBe(true)
  })
})
```

### 3. E2E Testing with Playwright

#### 3.1 Playwright Setup
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

#### 3.2 E2E Test Examples
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/companies')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('allows login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login')

    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
  })
})

// e2e/boards.spec.ts
test.describe('Boards', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('can view board with items', async ({ page }) => {
    await page.goto('/boards/routes')

    // Wait for board to load
    await expect(page.locator('[data-testid="board-table"]')).toBeVisible()

    // Check items are displayed
    await expect(page.locator('[data-testid="board-item"]').first()).toBeVisible()
  })

  test('can add new item', async ({ page }) => {
    await page.goto('/boards/routes')

    await page.click('[data-testid="add-item-button"]')
    await page.fill('[data-testid="item-name-input"]', 'New Test Item')
    await page.click('[data-testid="save-item-button"]')

    await expect(page.locator('text=New Test Item')).toBeVisible()
  })

  test('can edit cell inline', async ({ page }) => {
    await page.goto('/boards/routes')

    // Double-click to edit
    await page.dblclick('[data-testid="board-item"] [data-testid="text-cell"]')

    // Type new value
    await page.fill('[data-testid="cell-input"]', 'Updated Value')
    await page.press('[data-testid="cell-input"]', 'Enter')

    await expect(page.locator('text=Updated Value')).toBeVisible()
  })
})
```

### 4. Accessibility Testing

#### 4.1 axe-core Integration
```typescript
// __tests__/a11y/components.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

expect.extend(toHaveNoViolations)

describe('Accessibility', () => {
  describe('Button', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<Button>Click me</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('has no violations when disabled', async () => {
      const { container } = render(<Button disabled>Disabled</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Input', () => {
    it('has no accessibility violations with label', async () => {
      const { container } = render(
        <div>
          <label htmlFor="test">Test Input</label>
          <Input id="test" />
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Select', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(
        <Select
          label="Choose option"
          options={[
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
          ]}
        />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})
```

#### 4.2 Playwright Accessibility Tests
```typescript
// e2e/a11y.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('home page has no critical accessibility issues', async ({ page }) => {
    await page.goto('/')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('board page has no critical accessibility issues', async ({ page }) => {
    await page.goto('/boards/routes')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[data-testid="chart"]') // Charts might have known issues
      .analyze()

    expect(results.violations).toEqual([])
  })
})
```

### 5. Visual Regression Testing

#### 5.1 Playwright Visual Testing
```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: 0.01,
    })
  })

  test('board table matches snapshot', async ({ page }) => {
    await page.goto('/boards/routes')
    await page.waitForSelector('[data-testid="board-table"]')

    const table = page.locator('[data-testid="board-table"]')
    await expect(table).toHaveScreenshot('board-table.png')
  })

  test('responsive layouts', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/companies')
    await expect(page).toHaveScreenshot('companies-mobile.png')

    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page).toHaveScreenshot('companies-desktop.png')
  })
})
```

### 6. Test Data Management

#### 6.1 Factory Functions
```typescript
// __tests__/factories/index.ts
import { faker } from '@faker-js/faker'

export const factories = {
  company: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    address: faker.location.streetAddress(),
    lat: faker.location.latitude(),
    lng: faker.location.longitude(),
    type: faker.helpers.arrayElement(['commercial', 'residential', 'industrial']),
    status: 'active',
    priority: 'medium',
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }),

  inspector: (overrides = {}) => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    full_name: faker.person.fullName(),
    phone: faker.phone.number(),
    role: 'inspector',
    status: 'active',
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }),

  boardItem: (boardId: string, overrides = {}) => ({
    id: faker.string.uuid(),
    board_id: boardId,
    name: faker.lorem.words(3),
    position: faker.number.int({ min: 0, max: 100 }),
    group_id: null,
    data: {},
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }),

  // Collection generators
  companies: (count: number) =>
    Array.from({ length: count }, () => factories.company()),

  inspectors: (count: number) =>
    Array.from({ length: count }, () => factories.inspector()),
}
```

#### 6.2 Test Database Seeding
```typescript
// __tests__/setup/seed.ts
import { createClient } from '@supabase/supabase-js'
import { factories } from '../factories'

const supabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_SERVICE_KEY!
)

export async function seedTestData() {
  // Clear existing data
  await supabase.from('route_stops').delete().neq('id', '')
  await supabase.from('routes').delete().neq('id', '')
  await supabase.from('companies').delete().neq('id', '')
  await supabase.from('inspectors').delete().neq('id', '')

  // Seed test data
  const companies = factories.companies(10)
  const inspectors = factories.inspectors(5)

  await supabase.from('companies').insert(companies)
  await supabase.from('inspectors').insert(inspectors)

  return { companies, inspectors }
}
```

## Test Configuration

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Test Setup File
```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom/vitest'
import { vi, beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// MSW server setup
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
```

## New Folder Structure

```
apps/web/
├── src/
│   └── __tests__/
│       ├── setup.ts
│       ├── test-utils.ts
│       ├── factories/
│       │   └── index.ts
│       ├── mocks/
│       │   ├── handlers.ts
│       │   └── server.ts
│       ├── unit/
│       │   ├── services/
│       │   ├── hooks/
│       │   └── utils/
│       ├── components/
│       │   ├── ui/
│       │   └── features/
│       ├── integration/
│       │   ├── api/
│       │   └── hooks/
│       └── a11y/
├── e2e/
│   ├── auth.spec.ts
│   ├── boards.spec.ts
│   ├── visual.spec.ts
│   └── a11y.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```

## Implementation Priority

### Phase 1: Foundation
1. Improve test utilities and factories
2. Add MSW for API mocking
3. Increase unit test coverage

### Phase 2: Integration
1. Add API route tests
2. Add React Query integration tests
3. Add real-time service tests

### Phase 3: E2E
1. Set up Playwright
2. Add critical flow tests
3. Add visual regression tests

### Phase 4: Accessibility
1. Add axe-core tests
2. Add Playwright a11y tests
3. Integrate into CI

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Unit test coverage | ~20% | >70% |
| Integration test coverage | ~5% | >40% |
| E2E critical paths | 0 | 100% |
| Accessibility score | Unknown | 100% |
| Test execution time | N/A | <2min |

## Dependencies
- vitest (already installed)
- @testing-library/react (already installed)
- @testing-library/user-event
- @playwright/test
- @axe-core/playwright
- jest-axe
- @faker-js/faker
- msw

## CI Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```
