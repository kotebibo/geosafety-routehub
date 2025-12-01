import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusPillVariants = cva(
  'inline-flex items-center justify-center rounded-full font-medium transition-all duration-fast',
  {
    variants: {
      status: {
        done: 'bg-status-done text-white',
        working: 'bg-status-working text-[var(--monday-dark)]',
        stuck: 'bg-status-stuck text-white',
        default: 'bg-status-default text-white',
        // RouteHub-specific statuses
        enroute: 'bg-status-enroute text-white',
        arrived: 'bg-status-arrived text-[var(--monday-dark)]',
        inspecting: 'bg-status-inspecting text-white',
        delayed: 'bg-[var(--status-delayed)] text-white',
        // Route-specific statuses
        'not-started': 'bg-[var(--route-not-started)] text-white',
        planned: 'bg-[var(--route-planned)] text-white',
        active: 'bg-[var(--route-active)] text-[var(--monday-dark)]',
        completed: 'bg-[var(--route-completed)] text-white',
        cancelled: 'bg-[var(--route-cancelled)] text-white',
        paused: 'bg-[var(--color-purple)] text-white',
      },
      size: {
        xs: 'px-2 py-0.5 text-xs min-w-[50px] h-5',
        sm: 'px-2.5 py-1 text-xs min-w-[60px] h-6',
        md: 'px-3 py-1.5 text-sm min-w-[80px] h-7',
        lg: 'px-4 py-2 text-sm min-w-[100px] h-9',
      },
      interactive: {
        true: 'cursor-pointer hover:opacity-90 hover:shadow-md active:scale-95',
      },
    },
    defaultVariants: {
      status: 'default',
      size: 'sm',
    },
  }
)

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusPillVariants> {
  label?: string
  icon?: React.ReactNode
  onStatusChange?: (status: string) => void
}

const StatusPill = React.forwardRef<HTMLDivElement, StatusPillProps>(
  (
    {
      className,
      status,
      size,
      interactive,
      label,
      icon,
      onStatusChange,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (interactive && onStatusChange) {
        onStatusChange(status || 'default')
      }
      onClick?.(e)
    }

    return (
      <div
        ref={ref}
        className={cn(statusPillVariants({ status, size, interactive, className }))}
        onClick={handleClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {icon && <span className="inline-flex mr-1 shrink-0">{icon}</span>}
        <span className="font-medium truncate">{label || children}</span>
      </div>
    )
  }
)

StatusPill.displayName = 'StatusPill'

export { StatusPill, statusPillVariants }

// Helper function to get status display name
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    done: 'Done',
    working: 'Working',
    stuck: 'Stuck',
    default: 'Not Started',
    enroute: 'En Route',
    arrived: 'Arrived',
    inspecting: 'Inspecting',
    delayed: 'Delayed',
    'not-started': 'Not Started',
    planned: 'Planned',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    paused: 'Paused',
  }
  return labels[status] || status
}

// Helper function to get status color for custom styling
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    done: 'var(--status-done)',
    working: 'var(--status-working)',
    stuck: 'var(--status-stuck)',
    default: 'var(--status-default)',
    enroute: 'var(--status-enroute)',
    arrived: 'var(--status-arrived)',
    inspecting: 'var(--status-inspecting)',
    delayed: 'var(--status-delayed)',
    'not-started': 'var(--route-not-started)',
    planned: 'var(--route-planned)',
    active: 'var(--route-active)',
    completed: 'var(--route-completed)',
    cancelled: 'var(--route-cancelled)',
    paused: 'var(--color-purple)',
  }
  return colors[status] || colors.default
}
