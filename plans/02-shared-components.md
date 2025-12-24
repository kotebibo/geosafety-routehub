# Shared Components Library Improvement Plan

## Overview
Establish a cohesive, well-documented component library that provides consistent UI patterns across the application.

## Current State Analysis

### Existing Components
```
shared/components/
├── ui/
│   ├── DataTable/          # New reusable table
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   ├── Select.tsx
│   ├── StatusPill.tsx
│   ├── LoadingSpinner.tsx
│   ├── EmptyState.tsx
│   ├── PageHeader.tsx
│   ├── StatCard.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── MondayLayout.tsx
└── feedback/
    ├── ErrorBoundary.tsx
    └── PageSkeleton.tsx
```

### Pain Points
- Inconsistent component APIs
- Missing documentation
- Duplicate patterns in features
- No visual component catalog
- Incomplete TypeScript types

## Improvement Areas

### 1. Component Standardization

#### 1.1 Establish Component Template
```typescript
// Template for all shared components
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const componentVariants = cva(
  'base-classes-here',
  {
    variants: {
      variant: {
        default: '',
        primary: '',
        secondary: '',
      },
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ComponentProps
  extends ComponentPropsWithoutRef<'div'>,
    VariantProps<typeof componentVariants> {
  /** Component-specific props with JSDoc */
}

export const Component = forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(componentVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)

Component.displayName = 'Component'
```

#### 1.2 Create Missing Core Components
```typescript
// Components to add:
- Card / CardHeader / CardContent / CardFooter
- Modal / Dialog
- Tabs / TabList / Tab / TabPanel
- Accordion / AccordionItem
- Avatar / AvatarGroup
- Tooltip
- Popover
- Alert / AlertTitle / AlertDescription
- Progress / ProgressBar
- Skeleton variants
- Breadcrumb
- Pagination
```

### 2. Design Token System

#### 2.1 Create Token Constants
```typescript
// lib/design-tokens.ts
export const tokens = {
  colors: {
    // Brand colors
    primary: {
      50: '#e6f1ff',
      100: '#b3d4ff',
      // ... full scale
      500: '#0073ea', // Monday blue
      // ...
      900: '#001f4d',
    },
    // Semantic colors
    success: { /* green scale */ },
    warning: { /* yellow scale */ },
    error: { /* red scale */ },
    // Neutral colors
    gray: { /* gray scale */ },
  },
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    // ...
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
  typography: {
    fontFamily: {
      sans: 'Figtree, system-ui, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
    },
  },
} as const
```

#### 2.2 Tailwind Integration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        monday: {
          primary: '#0073ea',
          'primary-hover': '#0060c2',
          // ... from tokens
        },
        // Semantic aliases
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
      },
    },
  },
}
```

### 3. Component Documentation

#### 3.1 Storybook Setup
```bash
# Install Storybook
npx storybook@latest init

# Configure for Next.js
npm install @storybook/nextjs --save-dev
```

#### 3.2 Story Template
```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Primary button component for user actions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'ghost', 'destructive'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: {
    children: 'Button',
  },
}

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="default">Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
}
```

### 4. Form Components

#### 4.1 Form Field Wrapper
```typescript
// components/ui/FormField.tsx
interface FormFieldProps {
  label: string
  name: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({
  label,
  name,
  error,
  hint,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="text-sm font-medium text-text-primary"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-text-tertiary">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
```

#### 4.2 Form Integration with React Hook Form
```typescript
// hooks/useFormField.ts
import { useFormContext } from 'react-hook-form'

export function useFormField(name: string) {
  const { register, formState: { errors } } = useFormContext()

  return {
    register: register(name),
    error: errors[name]?.message as string | undefined,
  }
}
```

### 5. Feedback Components

#### 5.1 Toast System Enhancement
```typescript
// Already have toast, but enhance with:
interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
}

// Usage
toast({
  title: 'Route saved',
  description: 'Your route has been saved successfully.',
  variant: 'success',
  action: {
    label: 'View',
    onClick: () => router.push('/routes'),
  },
})
```

#### 5.2 Confirmation Dialog
```typescript
// components/ui/ConfirmDialog.tsx
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
}

// Hook for easy usage
function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve })
    })
  }

  return { confirm, ConfirmDialog: () => <Dialog state={state} /> }
}

// Usage
const { confirm } = useConfirm()
const confirmed = await confirm({
  title: 'Delete item?',
  description: 'This action cannot be undone.',
  variant: 'destructive',
})
```

### 6. Data Display Components

#### 6.1 Enhance DataTable
```typescript
// Add to DataTable:
- Column resizing
- Column visibility toggle
- Row expansion
- Inline editing
- Export functionality
- Keyboard navigation
```

#### 6.2 Create Chart Components
```typescript
// Using recharts or similar
- BarChart
- LineChart
- PieChart
- AreaChart
- Gauge/Progress
```

## New Folder Structure

```
shared/
├── components/
│   ├── ui/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── DataTable/
│   │   ├── Modal/
│   │   ├── Tabs/
│   │   └── ... (all UI components)
│   ├── forms/
│   │   ├── FormField.tsx
│   │   ├── FormSection.tsx
│   │   └── index.ts
│   ├── feedback/
│   │   ├── Toast/
│   │   ├── Alert/
│   │   ├── ConfirmDialog/
│   │   └── index.ts
│   ├── layout/
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   ├── PageLayout/
│   │   └── index.ts
│   └── data-display/
│       ├── StatCard/
│       ├── EmptyState/
│       ├── Charts/
│       └── index.ts
├── hooks/
│   ├── useMediaQuery.ts
│   ├── useLocalStorage.ts
│   ├── useDebounce.ts
│   ├── useClickOutside.ts
│   └── index.ts
├── lib/
│   ├── design-tokens.ts
│   └── utils.ts
└── types/
    └── index.ts
```

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. Set up design tokens
2. Create component template
3. Standardize existing components

### Phase 2: Core Components (Week 2-3)
1. Add missing core components (Modal, Tabs, etc.)
2. Create form components
3. Enhance feedback components

### Phase 3: Documentation (Week 4)
1. Set up Storybook
2. Write stories for all components
3. Add JSDoc comments

### Phase 4: Testing (Week 5)
1. Add unit tests for all components
2. Add accessibility tests
3. Add visual regression tests

## Success Metrics

| Metric | Target |
|--------|--------|
| Component coverage | 100% documented |
| Storybook stories | All components |
| Test coverage | >80% |
| Accessibility score | 100% |
| Bundle size per component | <5KB |
