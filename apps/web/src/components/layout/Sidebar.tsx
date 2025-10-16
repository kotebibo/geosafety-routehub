'use client'

import { useState } from 'react'
import { X, Route, Users, Calendar, BarChart3, Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  selectedRoute?: string | null
  onRouteSelect?: (routeId: string) => void
}

const menuItems = [
  {
    icon: Route,
    label: 'Routes',
    href: '/routes',
    badge: '3 active'
  },
  {
    icon: Users,
    label: 'Inspectors',
    href: '/inspectors',
    badge: '8 online'
  },
  {
    icon: Calendar,
    label: 'Schedule',
    href: '/schedule'
  },
  {
    icon: BarChart3,
    label: 'Analytics',
    href: '/analytics'
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/settings'
  }
]

export function Sidebar({ isOpen, onClose, selectedRoute, onRouteSelect }: SidebarProps) {
  const [activeItem, setActiveItem] = useState('Routes')

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative h-full bg-white border-r w-64 z-50 transition-transform duration-200",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b flex items-center justify-between px-4">
          <h2 className="font-semibold">Navigation</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Create New Button */}
        <div className="p-4">
          <Button className="w-full" variant="default">
            <Plus className="h-4 w-4 mr-2" />
            New Route
          </Button>
        </div>

        {/* Navigation Menu */}
        <nav className="px-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveItem(item.label)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg",
                "hover:bg-gray-100 transition-colors",
                activeItem === item.label && "bg-blue-50 text-blue-600"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Active Routes Section */}
        <div className="mt-8 px-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">
            Today's Routes
          </h3>
          <div className="space-y-2">
            {['Route #1', 'Route #2', 'Route #3'].map((route) => (
              <button
                key={route}
                onClick={() => onRouteSelect?.(route)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm",
                  "hover:bg-gray-100 transition-colors",
                  selectedRoute === route && "bg-blue-50 text-blue-600"
                )}
              >
                <div className="flex justify-between items-center">
                  <span>{route}</span>
                  <span className="text-xs text-gray-500">12 stops</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  John Smith • In Progress
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}