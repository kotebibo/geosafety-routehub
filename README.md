# GeoSafety RouteHub

**Intelligent Route Optimization & Field Management System**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

## Overview

GeoSafety RouteHub is a comprehensive route optimization and field management system designed for safety inspection services in Georgia. It enables efficient route planning with real road distances, real-time field tracking, and Monday.com-style collaborative workboards for managing inspections.

## Key Features

- **Route Optimization** - Hybrid algorithm (Nearest Neighbor + 2-opt) with OSRM real road distances
- **Monday.com-Style Boards** - 14+ column types, real-time collaboration via Ably, activity tracking
- **Interactive Maps** - Leaflet/Mapbox integration with route visualization
- **Company Management** - 216+ Georgian companies with coordinates and service tracking
- **Inspector Management** - Assignment, workload balancing, and real-time location tracking
- **PDP Compliance** - Personal Data Protection phase tracking for regulatory compliance
- **Role-Based Access** - Admin, Dispatcher, and Inspector roles with Row-Level Security
- **Bilingual Interface** - Georgian and English support

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI |
| **State** | Zustand, TanStack React Query |
| **Real-time** | Ably (presence & messaging) |
| **Maps** | Leaflet, Mapbox GL, OpenStreetMap |
| **Backend** | Supabase (PostgreSQL + PostGIS), Row-Level Security |
| **Testing** | Vitest, React Testing Library |
| **Build** | Turborepo (monorepo) |

## Project Structure

```
geosafety-routehub/
├── apps/
│   ├── web/                    # Next.js 14 web application
│   │   ├── app/                # App Router (pages, API routes)
│   │   ├── src/
│   │   │   ├── features/       # Feature modules (boards, routes, companies...)
│   │   │   ├── lib/            # Utilities (supabase, ably, validations)
│   │   │   ├── services/       # Business logic services
│   │   │   ├── shared/         # Shared UI components
│   │   │   └── store/          # Zustand state management
│   │   └── supabase/           # Database migrations
│   │
│   └── mobile/                 # React Native (Expo) inspector app
│
├── packages/
│   └── route-optimizer/        # Route optimization algorithm package
│
├── supabase/                   # Database migrations (35+ versions)
│   └── migrations/
│
└── docs/                       # Documentation
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase account ([supabase.com](https://supabase.com))
- Ably account for real-time features ([ably.com](https://ably.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/geosafety/routehub.git
cd geosafety-routehub

# Install dependencies
npm install

# Copy environment template
cp apps/web/.env.example apps/web/.env.local

# Edit .env.local with your credentials:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_ABLY_API_KEY
```

### Development

```bash
# Start all apps
npm run dev

# Start web only
npm run dev:web

# Start mobile only
npm run dev:mobile
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all development servers |
| `npm run dev:web` | Start web app only |
| `npm run build` | Build all apps for production |
| `npm run test` | Run test suite |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm run seed:db` | Seed database with initial data |
| `npm run seed:services` | Seed service types |

## Apps & Packages

| Name | Description | Docs |
|------|-------------|------|
| `apps/web` | Next.js 14 web application | [README](apps/web/README.md) |
| `apps/mobile` | React Native (Expo) mobile app | [README](apps/mobile/README.md) |
| `packages/route-optimizer` | Route optimization algorithm | [README](packages/route-optimizer/README.md) |

## Database Setup

The project uses Supabase with 35+ migrations including:

- Companies, inspectors, and routes tables
- Monday.com-style boards system
- PDP compliance tracking
- Row-Level Security policies
- PostGIS for geographic queries

Migrations are applied automatically via Supabase. For manual setup:

```bash
npm run db:push
npm run seed:db
npm run seed:services
```

## Security

- Row-Level Security (RLS) on all tables
- API rate limiting
- Input validation with Zod
- Security headers (CSP, HSTS, X-Frame-Options)
- PKCE authentication flow

## Performance

- Lighthouse Score: 90+
- First Contentful Paint: < 1.8s
- Time to Interactive: < 3.9s
- Virtualized lists for large datasets

## Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Features Overview](FEATURES.md)
- [API Documentation](docs/api/)
- [Security Guide](docs/security/)
- [Getting Started Guide](GET_STARTED.md)

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

### Docker

```bash
docker build -t geosafety-routehub .
docker run -p 3000:3000 geosafety-routehub
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Issues:** [GitHub Issues](https://github.com/geosafety/routehub/issues)
- **Email:** support@geosafety.ge

---

**Version:** 1.0.0 | **Status:** Production Ready
