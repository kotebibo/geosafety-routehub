# Mobile App Development Plan

## Overview
Build a React Native (Expo) mobile application for field inspectors to navigate routes, track location in real-time, and submit inspection reports.

## Current State Analysis

### Status
- Package.json configured with dependencies
- README with planned architecture
- No actual app code yet

### Planned Stack
- Expo SDK 49
- React Navigation 6
- Zustand for state
- Supabase client
- React Native Maps
- Expo Location/Camera

## Core Features

### 1. Authentication

#### 1.1 Login Screen
```typescript
// app/(auth)/login.tsx
import { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useAuth } from '@/hooks/useAuth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, isLoading, error } = useAuth()

  const handleLogin = async () => {
    await signIn(email, password)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GeoSafety RouteHub</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
```

#### 1.2 Auth Store
```typescript
// src/store/auth.store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: false,
      error: null,

      signIn: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (error) throw error
          set({ user: data.user, session: data.session })
        } catch (error: any) {
          set({ error: error.message })
        } finally {
          set({ isLoading: false })
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: null })
      },

      refreshSession: async () => {
        const { data, error } = await supabase.auth.refreshSession()
        if (!error && data.session) {
          set({ user: data.user, session: data.session })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
)
```

### 2. Route Navigation

#### 2.1 Today's Routes Screen
```typescript
// app/(tabs)/routes.tsx
import { FlatList, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRoutes } from '@/hooks/useRoutes'
import { RouteCard } from '@/components/RouteCard'
import { format } from 'date-fns'

export default function RoutesScreen() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { routes, isLoading, refetch } = useRoutes(today)

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Today's Routes</Text>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RouteCard route={item} />}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <Text style={styles.empty}>No routes assigned for today</Text>
        }
      />
    </View>
  )
}
```

#### 2.2 Route Detail with Map
```typescript
// app/route/[id].tsx
import { View, ScrollView, StyleSheet } from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import { useRoute } from '@/hooks/useRoute'
import { StopsList } from '@/components/StopsList'
import { RouteHeader } from '@/components/RouteHeader'

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams()
  const { route, stops, isLoading } = useRoute(id as string)

  if (isLoading || !route) {
    return <LoadingScreen />
  }

  const region = calculateRegion(stops)

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation
        showsMyLocationButton
      >
        {stops.map((stop, index) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            title={stop.company_name}
            description={`Stop ${index + 1}`}
          />
        ))}

        {route.route_geometry && (
          <Polyline
            coordinates={decodePolyline(route.route_geometry)}
            strokeColor="#0073ea"
            strokeWidth={4}
          />
        )}
      </MapView>

      <ScrollView style={styles.stopsContainer}>
        <RouteHeader route={route} />
        <StopsList stops={stops} onStopPress={handleStopPress} />
      </ScrollView>
    </View>
  )
}
```

### 3. Real-time Location Tracking

#### 3.1 Location Service
```typescript
// src/services/location.service.ts
import * as Location from 'expo-location'
import { supabase } from '@/lib/supabase'

class LocationService {
  private subscription: Location.LocationSubscription | null = null
  private updateInterval: NodeJS.Timeout | null = null

  async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return false

    // Request background for tracking during navigation
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync()
    return bgStatus === 'granted'
  }

  async getCurrentLocation(): Promise<Location.LocationObject> {
    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
  }

  async startTracking(
    inspectorId: string,
    onUpdate?: (location: Location.LocationObject) => void
  ): Promise<void> {
    // Watch position
    this.subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 50, // 50 meters
      },
      (location) => {
        onUpdate?.(location)
        this.updateServerLocation(inspectorId, location)
      }
    )
  }

  async stopTracking(): Promise<void> {
    if (this.subscription) {
      this.subscription.remove()
      this.subscription = null
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  private async updateServerLocation(
    inspectorId: string,
    location: Location.LocationObject
  ): Promise<void> {
    try {
      await supabase
        .from('inspectors')
        .update({
          current_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', inspectorId)
    } catch (error) {
      console.error('Failed to update location:', error)
    }
  }
}

export const locationService = new LocationService()
```

#### 3.2 Background Location Task
```typescript
// src/tasks/locationTask.ts
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'

const LOCATION_TASK_NAME = 'background-location-task'

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error)
    return
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] }
    const location = locations[0]

    // Queue location update
    const queue = await AsyncStorage.getItem('location-queue')
    const updates = queue ? JSON.parse(queue) : []
    updates.push({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
    })
    await AsyncStorage.setItem('location-queue', JSON.stringify(updates))
  }
})

export async function startBackgroundLocationUpdates(): Promise<void> {
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60000, // 1 minute
    distanceInterval: 100, // 100 meters
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Route Tracking Active',
      notificationBody: 'Your location is being shared with dispatchers',
    },
  })
}

export async function stopBackgroundLocationUpdates(): Promise<void> {
  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
}
```

### 4. Inspection Reporting

#### 4.1 Inspection Screen
```typescript
// app/inspection/[stopId].tsx
import { useState } from 'react'
import { View, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useInspection } from '@/hooks/useInspection'
import { StatusSelector } from '@/components/StatusSelector'

export default function InspectionScreen() {
  const { stopId } = useLocalSearchParams()
  const { inspection, updateInspection, submitInspection, isSubmitting } = useInspection(stopId as string)

  const [photos, setPhotos] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'completed' | 'partial' | 'failed'>('completed')

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    })

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri])
    }
  }

  const handleSubmit = async () => {
    await submitInspection({
      status,
      notes,
      photos,
    })
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Inspection Status</Text>
        <StatusSelector value={status} onChange={setStatus} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Photos</Text>
        <View style={styles.photoGrid}>
          {photos.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.photo} />
          ))}
          <TouchableOpacity style={styles.addPhoto} onPress={handleTakePhoto}>
            <Text>+ Add Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          placeholder="Enter inspection notes..."
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Submitting...' : 'Submit Inspection'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
```

#### 4.2 Photo Upload Service
```typescript
// src/services/upload.service.ts
import { supabase } from '@/lib/supabase'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'

class UploadService {
  async uploadPhoto(
    localUri: string,
    inspectionId: string,
    index: number
  ): Promise<string> {
    const filename = `inspection_${inspectionId}_${index}_${Date.now()}.jpg`
    const path = `inspections/${filename}`

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(path, decode(base64), {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(path)

    return publicUrl
  }

  async uploadPhotos(
    localUris: string[],
    inspectionId: string
  ): Promise<string[]> {
    const uploads = localUris.map((uri, index) =>
      this.uploadPhoto(uri, inspectionId, index)
    )

    return Promise.all(uploads)
  }
}

export const uploadService = new UploadService()
```

### 5. Offline Support

#### 5.1 Offline Queue Store
```typescript
// src/store/offline.store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface QueuedAction {
  id: string
  type: 'inspection' | 'location' | 'status_update'
  payload: unknown
  timestamp: number
  retries: number
}

interface OfflineState {
  isOnline: boolean
  queue: QueuedAction[]
  setOnline: (online: boolean) => void
  addToQueue: (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) => void
  removeFromQueue: (id: string) => void
  processQueue: () => Promise<void>
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      queue: [],

      setOnline: (online) => {
        set({ isOnline: online })
        if (online) {
          get().processQueue()
        }
      },

      addToQueue: (action) => {
        const id = Math.random().toString(36).substring(7)
        set((state) => ({
          queue: [
            ...state.queue,
            { ...action, id, timestamp: Date.now(), retries: 0 },
          ],
        }))
      },

      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter((a) => a.id !== id),
        }))
      },

      processQueue: async () => {
        const { queue, removeFromQueue, isOnline } = get()
        if (!isOnline || queue.length === 0) return

        for (const action of queue) {
          try {
            await processAction(action)
            removeFromQueue(action.id)
          } catch (error) {
            console.error('Failed to process queued action:', error)
            // Increment retry count, remove if too many retries
            if (action.retries >= 3) {
              removeFromQueue(action.id)
            }
          }
        }
      },
    }),
    {
      name: 'offline-queue',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

async function processAction(action: QueuedAction): Promise<void> {
  switch (action.type) {
    case 'inspection':
      await submitInspection(action.payload)
      break
    case 'location':
      await updateLocation(action.payload)
      break
    case 'status_update':
      await updateStopStatus(action.payload)
      break
  }
}
```

#### 5.2 Network Monitor
```typescript
// src/hooks/useNetworkStatus.ts
import { useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { useOfflineStore } from '@/store/offline.store'

export function useNetworkStatus() {
  const { isOnline, setOnline } = useOfflineStore()

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected ?? false)
    })

    return () => unsubscribe()
  }, [setOnline])

  return { isOnline }
}
```

### 6. Push Notifications

#### 6.1 Notification Service
```typescript
// src/services/notifications.service.ts
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

class NotificationService {
  async registerForPushNotifications(userId: string): Promise<string | null> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      return null
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data

    // Store token in database
    await supabase
      .from('user_push_tokens')
      .upsert({ user_id: userId, token, platform: Platform.OS })

    return token
  }

  async scheduleRouteReminder(route: Route): Promise<void> {
    const trigger = new Date(route.date)
    trigger.setHours(7, 0, 0, 0) // 7 AM reminder

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Route Starting Soon',
        body: `Your route "${route.name}" starts today. ${route.stops_count} stops planned.`,
        data: { routeId: route.id },
      },
      trigger,
    })
  }
}

export const notificationService = new NotificationService()
```

## App Architecture

### Folder Structure
```
apps/mobile/
├── app/                        # Expo Router pages
│   ├── (auth)/                # Auth screens (login, forgot password)
│   │   └── login.tsx
│   ├── (tabs)/                # Main tab screens
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Dashboard
│   │   ├── routes.tsx         # Route list
│   │   └── profile.tsx        # User profile
│   ├── route/
│   │   └── [id].tsx           # Route detail
│   ├── inspection/
│   │   └── [stopId].tsx       # Inspection form
│   └── _layout.tsx            # Root layout
├── src/
│   ├── components/
│   │   ├── RouteCard.tsx
│   │   ├── StopsList.tsx
│   │   ├── StatusSelector.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRoutes.ts
│   │   ├── useInspection.ts
│   │   └── useNetworkStatus.ts
│   ├── services/
│   │   ├── location.service.ts
│   │   ├── upload.service.ts
│   │   └── notifications.service.ts
│   ├── store/
│   │   ├── auth.store.ts
│   │   └── offline.store.ts
│   ├── lib/
│   │   └── supabase.ts
│   └── constants/
│       └── theme.ts
├── assets/
│   ├── images/
│   └── fonts/
├── app.json
└── package.json
```

### Theme Constants
```typescript
// src/constants/theme.ts
export const theme = {
  colors: {
    primary: '#0073ea',
    primaryDark: '#0060c2',
    success: '#00c875',
    warning: '#fdab3d',
    error: '#e2445c',
    background: '#f6f7fb',
    surface: '#ffffff',
    text: '#323338',
    textSecondary: '#676879',
    border: '#c5c7d0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
}
```

## Implementation Priority

### Phase 1: Core App
1. Set up Expo Router navigation
2. Implement authentication flow
3. Create basic screens (dashboard, routes, profile)

### Phase 2: Route Features
1. Route list and detail screens
2. Map integration with markers
3. Turn-by-turn navigation link

### Phase 3: Inspection
1. Inspection form with photo capture
2. Status updates for stops
3. Photo upload to Supabase Storage

### Phase 4: Real-time
1. Location tracking service
2. Background location updates
3. Push notifications

### Phase 5: Offline
1. Offline queue for actions
2. Network status monitoring
3. Auto-sync on reconnection

## Success Metrics

| Metric | Target |
|--------|--------|
| App launch time | <2 seconds |
| Location accuracy | <10 meters |
| Offline queue capacity | 100 actions |
| Photo upload success | >99% |
| Crash-free sessions | >99.5% |

## Dependencies

### To Add
- @react-native-community/netinfo
- expo-notifications
- expo-file-system
- expo-task-manager
- react-native-reanimated

### Optional
- react-native-maps-directions
- expo-blur
- expo-haptics

## Testing Strategy

- Jest + React Native Testing Library for unit tests
- Detox for E2E testing
- Manual testing on iOS Simulator and Android Emulator
- TestFlight/Internal Testing Track for beta testing
