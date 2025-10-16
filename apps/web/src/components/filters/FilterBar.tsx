'use client'

import { Filter, MapPin, Users, Clock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function FilterBar() {
  return (
    <div className="bg-white border-b px-4 py-3">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Filter Button */}
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>

        {/* Type Filter */}
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Location Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="industrial">Industrial</SelectItem>
            <SelectItem value="healthcare">Healthcare</SelectItem>
            <SelectItem value="education">Education</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select defaultValue="all">
          <SelectTrigger className="w-[160px]">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Inspector Filter */}
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <Users className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Inspector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Inspectors</SelectItem>
            <SelectItem value="john">John Smith</SelectItem>
            <SelectItem value="jane">Jane Doe</SelectItem>
            <SelectItem value="bob">Bob Johnson</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Today
        </Button>

        {/* Active Filters Display */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-600">Active:</span>
          <Badge variant="secondary">Commercial</Badge>
          <Badge variant="secondary">Pending</Badge>
          <Button variant="ghost" size="sm" className="text-xs">
            Clear all
          </Button>
        </div>
      </div>
    </div>
  )
}