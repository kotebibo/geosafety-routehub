'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
  className?: string
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 300,
  className,
}: TooltipProps) {
  if (!content) return children

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            'z-[10000] px-2.5 py-1.5 text-xs font-medium text-white bg-[#323338] rounded-md shadow-lg',
            'max-w-[240px] break-words leading-relaxed',
            'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2',
            'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
            className
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[#323338]" width={8} height={4} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider>{children}</TooltipPrimitive.Provider>
}
