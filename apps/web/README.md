# GeoSafety RouteHub - Web Application

Next.js 14 web application for route optimization and field management.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.3
- **Styling:** Tailwind CSS 3.4 + Radix UI
- **State:** Zustand + TanStack React Query
- **Real-time:** Ably for presence and messaging
- **Maps:** Leaflet + Mapbox GL
- **Forms:** React Hook Form + Zod
- **Testing:** Vitest + React Testing Library

## Project Structure

```
apps/web/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes (health, companies, inspectors...)
│   ├── auth/                   # Authentication pages
│   ├── boards/                 # Monday.com-style boards
│   ├── companies/              # Company management
│   ├── inspectors/             # Inspector management
│   ├── routes/                 # Route planning & optimization
│   └── admin/                  # Admin features
│
├── src/
│   ├── features/               # Feature modules
│   │   ├── assignments/        # Inspector assignment
│   │   ├── auth/               # Authentication
│   │   ├── boards/             # Boards system (columns, cells, filtering)
│   │   ├── companies/          # Companies management
│   │   ├── compliance/         # PDP compliance tracking
│   │   ├── inspectors/         # Inspectors management
│   │   └── routes/             # Route optimization
│   │
│   ├── lib/                    # Utilities
│   │   ├── supabase/           # Database queries
│   │   ├── validations/        # Zod schemas
│   │   ├── ably.ts             # Real-time messaging
│   │   └── logger.ts           # Logging utility
│   │
│   ├── services/               # Business logic
│   │   ├── companies.service.ts
│   │   ├── inspectors.service.ts
│   │   ├── routes.service.ts
│   │   └── assignments.service.ts
│   │
│   ├── shared/                 # Shared components
│   │   ├── components/ui/      # UI components (DataTable, forms, modals)
│   │   └── hooks/              # Shared hooks
│   │
│   ├── store/                  # Zustand stores
│   └── types/                  # TypeScript definitions
│
├── public/                     # Static assets
└── supabase/                   # Database migrations
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase project
- Ably account (for real-time features)

### Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Required variables:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# NEXT_PUBLIC_ABLY_API_KEY=your_ably_key
```

### Development

```bash
# From monorepo root
npm run dev:web

# Or from this directory
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run analyze` | Analyze bundle size |

## Key Features

### Boards System (Monday.com-style)

- **14+ Column Types:** Text, Number, Status, Date, Person, Route, Company, Files, etc.
- **Real-time Collaboration:** Live presence, cell-level editing indicators
- **Advanced Features:** Grouping, sorting, filtering, drag-and-drop
- **Activity Tracking:** Full change history with timestamps

### Route Optimization

- Uses `@geosafety/route-optimizer` package
- Hybrid algorithm: Nearest Neighbor + 2-opt
- OSRM integration for real road distances
- Visual route display on maps

### Authentication

- Supabase Auth with PKCE flow
- Role-based access: Admin, Dispatcher, Inspector
- Row-Level Security on all tables

## API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/companies` | List companies |
| `GET /api/inspectors` | List inspectors |
| `GET /api/service-types` | List service types |
| `POST /api/routes/optimize` | Optimize route |

## Dependencies

### Core

- `next` - React framework
- `react` / `react-dom` - UI library
- `typescript` - Type safety

### UI

- `@radix-ui/*` - Accessible UI primitives
- `tailwindcss` - Utility-first CSS
- `lucide-react` - Icons
- `recharts` - Charts

### Data

- `@supabase/supabase-js` - Database client
- `@tanstack/react-query` - Data fetching
- `zustand` - State management
- `zod` - Schema validation

### Maps

- `leaflet` / `react-leaflet` - Map rendering
- `mapbox-gl` / `react-map-gl` - Alternative map provider

### Real-time

- `ably` - Real-time messaging and presence

## Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# UI test runner
npm run test:ui
```

## Building for Production

```bash
# Build
npm run build

# Start production server
npm run start:prod
```

## Environment Variables

See [.env.example](.env.example) for all available variables:

- **Required:** Supabase URL, Supabase Anon Key, Ably API Key
- **Optional:** Mapbox token, Sentry DSN, Analytics IDs

## Performance

- Lighthouse Score: 90+
- FCP: < 1.8s
- TTI: < 3.9s
- Virtualized lists with `@tanstack/react-virtual`

## License

MIT - See root [LICENSE](../../LICENSE)
