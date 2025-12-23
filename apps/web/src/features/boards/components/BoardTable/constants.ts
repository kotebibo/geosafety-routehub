/**
 * Board table constants and configuration
 * Extracted from MondayBoardTable for maintainability
 */

import { Type, Hash, Calendar, User, MapPin, CheckSquare, Building2, Phone, Shield, Check, Paperclip } from 'lucide-react'
import type { ColumnType, BoardGroup } from '../../types/board'

// Essential column types for quick-add popup
export const ESSENTIAL_COLUMNS: { type: ColumnType; label: string; icon: React.ElementType }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'number', label: 'Numbers', icon: Hash },
  { type: 'status', label: 'Status', icon: CheckSquare },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'person', label: 'Person', icon: User },
]

// All available column types
export const ALL_COLUMN_TYPES: { type: ColumnType; label: string; icon: React.ElementType; description: string }[] = [
  { type: 'text', label: 'Text', icon: Type, description: 'Add text, links, or notes' },
  { type: 'number', label: 'Numbers', icon: Hash, description: 'Add numbers and perform calculations' },
  { type: 'status', label: 'Status', icon: CheckSquare, description: 'Track progress with customizable labels' },
  { type: 'date', label: 'Date', icon: Calendar, description: 'Add dates and deadlines' },
  { type: 'date_range', label: 'Date Range', icon: Calendar, description: 'Add start and end dates' },
  { type: 'person', label: 'Person', icon: User, description: 'Assign people to items' },
  { type: 'location', label: 'Location', icon: MapPin, description: 'Add addresses and coordinates' },
  { type: 'route', label: 'Route', icon: MapPin, description: 'Link to a route' },
  { type: 'company', label: 'Company', icon: Building2, description: 'Link to a company' },
  { type: 'service_type', label: 'Service Type', icon: Shield, description: 'Select a service type' },
  { type: 'checkbox', label: 'Checkbox', icon: Check, description: 'Track completion with a checkbox' },
  { type: 'phone', label: 'Phone', icon: Phone, description: 'Add phone numbers with click-to-call' },
  { type: 'files', label: 'Files', icon: Paperclip, description: 'Attach photos and documents' },
]

// Monday.com color palette for groups
export const MONDAY_GROUP_COLORS = [
  { name: 'bright-blue', value: '#579bfc', bg: 'bg-[#579bfc]', light: 'bg-[#579bfc]/10' },
  { name: 'dark-purple', value: '#a25ddc', bg: 'bg-[#a25ddc]', light: 'bg-[#a25ddc]/10' },
  { name: 'grass-green', value: '#00c875', bg: 'bg-[#00c875]', light: 'bg-[#00c875]/10' },
  { name: 'egg-yolk', value: '#fdab3d', bg: 'bg-[#fdab3d]', light: 'bg-[#fdab3d]/10' },
  { name: 'berry', value: '#e2445c', bg: 'bg-[#e2445c]', light: 'bg-[#e2445c]/10' },
  { name: 'aquamarine', value: '#00d2d2', bg: 'bg-[#00d2d2]', light: 'bg-[#00d2d2]/10' },
  { name: 'peach', value: '#ffadad', bg: 'bg-[#ffadad]', light: 'bg-[#ffadad]/10' },
  { name: 'royal', value: '#784bd1', bg: 'bg-[#784bd1]', light: 'bg-[#784bd1]/10' },
] as const

// Column width constraints
export const MIN_COLUMN_WIDTH = 80
export const MAX_COLUMN_WIDTH = 600
export const DEFAULT_COLUMN_WIDTH = 150

// Default group used when no groups are defined
export const DEFAULT_GROUP: BoardGroup = {
  id: 'default',
  board_id: '',
  name: 'Items',
  color: '#579bfc',
  position: 0,
}
