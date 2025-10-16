import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Location {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type: 'commercial' | 'residential' | 'industrial' | 'healthcare' | 'education'
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  inspectorId?: string
  routeId?: string
  priority: 'low' | 'medium' | 'high'
  lastInspection?: Date
  nextDue?: Date
}

export interface MapFilters {
  types: string[]
  statuses: string[]
  inspectors: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  searchQuery?: string
}

interface MapState {
  locations: Location[]
  filters: MapFilters
  selectedLocation: Location | null
  isLoading: boolean
  
  // Actions
  setLocations: (locations: Location[]) => void
  updateLocation: (id: string, updates: Partial<Location>) => void
  setFilters: (filters: Partial<MapFilters>) => void
  setSelectedLocation: (location: Location | null) => void
  setLoading: (loading: boolean) => void
  addLocation: (location: Location) => void
  removeLocation: (id: string) => void
}

export const useMapStore = create<MapState>()(
  devtools(
    (set) => ({
      locations: [],
      filters: {
        types: [],
        statuses: [],
        inspectors: []
      },
      selectedLocation: null,
      isLoading: false,

      setLocations: (locations) => set({ locations }),
      
      updateLocation: (id, updates) => 
        set((state) => ({
          locations: state.locations.map(loc => 
            loc.id === id ? { ...loc, ...updates } : loc
          )
        })),

      setFilters: (filters) => 
        set((state) => ({
          filters: { ...state.filters, ...filters }
        })),

      setSelectedLocation: (location) => 
        set({ selectedLocation: location }),

      setLoading: (loading) => 
        set({ isLoading: loading }),

      addLocation: (location) =>
        set((state) => ({
          locations: [...state.locations, location]
        })),

      removeLocation: (id) =>
        set((state) => ({
          locations: state.locations.filter(loc => loc.id !== id)
        }))
    }),
    {
      name: 'map-store'
    }
  )
)