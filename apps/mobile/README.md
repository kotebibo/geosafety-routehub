# GeoSafety RouteHub - Mobile App

React Native (Expo) mobile application for field inspectors.

## Overview

The mobile app provides field inspectors with route navigation, real-time location tracking, and inspection reporting capabilities. Built with Expo for cross-platform iOS and Android support.

## Tech Stack

- **Framework:** React Native with Expo SDK 49
- **Navigation:** React Navigation 6
- **State:** Zustand
- **Backend:** Supabase
- **Maps:** React Native Maps
- **Location:** Expo Location
- **Camera:** Expo Camera + Image Picker

## Features

- **Route Navigation** - Turn-by-turn directions to inspection sites
- **Real-time Location** - GPS tracking shared with dispatchers
- **Inspection Reporting** - Photo capture and status updates
- **Offline Support** - Queue actions when offline
- **Push Notifications** - Route assignments and updates

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router pages
├── src/
│   ├── components/         # React Native components
│   ├── screens/           # Screen components
│   ├── navigation/        # Navigation configuration
│   ├── services/          # API services
│   ├── store/             # Zustand stores
│   └── utils/             # Utilities
│
├── assets/                # Images, fonts
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator (macOS) or Android Emulator
- Expo Go app on physical device (optional)

### Installation

```bash
# From monorepo root
npm install

# Or from this directory
cd apps/mobile
npm install
```

### Environment Setup

Create `.env` with your Supabase credentials:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Development

```bash
# From monorepo root
npm run dev:mobile

# Or from this directory
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your device

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo development server |
| `npm run android` | Start on Android |
| `npm run ios` | Start on iOS |
| `npm run web` | Start web version |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |

## Dependencies

### Core

- `expo` - Development platform
- `react-native` - UI framework
- `typescript` - Type safety

### Navigation

- `@react-navigation/native` - Navigation core
- `@react-navigation/stack` - Stack navigation
- `@react-navigation/bottom-tabs` - Tab navigation

### Data

- `@supabase/supabase-js` - Backend client
- `zustand` - State management
- `@react-native-async-storage/async-storage` - Local storage

### Device Features

- `expo-location` - GPS location
- `expo-camera` - Camera access
- `expo-image-picker` - Photo library
- `react-native-maps` - Map display

## Building for Production

### Development Build

```bash
# Create development build
npx expo run:ios
npx expo run:android
```

### Production Build (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for stores
eas build --platform ios
eas build --platform android
```

## App Screens

| Screen | Description |
|--------|-------------|
| Login | Authentication |
| Dashboard | Today's routes and stats |
| Route List | Assigned routes |
| Route Detail | Route stops and navigation |
| Inspection | Photo capture and reporting |
| Profile | User settings |

## Permissions

The app requires the following permissions:

- **Location** - GPS tracking and navigation
- **Camera** - Inspection photo capture
- **Photo Library** - Upload existing photos
- **Notifications** - Route assignments (optional)

## Offline Support

The app queues actions when offline:
- Inspection reports saved locally
- Synced when connection restored
- Location tracking continues

## License

MIT - See root [LICENSE](../../LICENSE)
