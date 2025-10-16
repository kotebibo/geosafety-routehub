# 🚀 GEOSAFETY ROUTEHUB - SETUP GUIDE

## Prerequisites
- Node.js 18+ and npm 9+
- Git
- Supabase account (free tier works)
- Mapbox account (free tier works)
- Optional: Google Maps API key (for geocoding fallback)

## Quick Start

### 1. Clone and Install
```bash
cd D:\geosafety-routehub
npm install
```

### 2. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy your project URL and anon key
4. Run the database migration:
   - Go to SQL Editor in Supabase
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Run the SQL

### 3. Set up Mapbox
1. Create account at [mapbox.com](https://mapbox.com)
2. Get your access token from Account → Tokens

### 4. Configure Environment Variables
```bash
cd apps/web
cp .env.local.example .env.local
```

Edit `.env.local` with your keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### 5. Run Development Server
```bash
# From root directory
npm run dev:web

# Or from web app directory
cd apps/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## Project Structure
```
geosafety-routehub/
├── apps/
│   ├── web/                 # Next.js dashboard
│   │   ├── app/            # App router pages
│   │   ├── src/
│   │   │   ├── components/ # UI components
│   │   │   ├── lib/       # Utilities
│   │   │   ├── hooks/     # Custom hooks
│   │   │   ├── store/     # State management
│   │   │   ├── services/  # API services
│   │   │   └── types/     # TypeScript types
│   │   └── public/        # Static assets
│   └── mobile/            # React Native app (coming soon)
├── packages/
│   ├── shared/            # Shared utilities
│   ├── api-client/        # API client
│   └── ui-components/     # Shared UI
├── supabase/
│   ├── migrations/        # Database migrations
│   └── seed/             # Seed data
└── docs/                 # Documentation
```

## Available Scripts
```bash
# Development
npm run dev          # Run all apps
npm run dev:web      # Run web app only
npm run dev:mobile   # Run mobile app only

# Build
npm run build        # Build all apps
npm run build:web    # Build web app only

# Database
npm run db:push      # Push migrations to Supabase
npm run db:migrate   # Create new migration

# Quality
npm run lint         # Lint all code
npm run format       # Format all files
npm run test        # Run tests
```

## Key Features Implemented

### ✅ Completed
- [x] Monorepo structure with Turbo
- [x] Next.js 14 web application
- [x] Mapbox GL integration
- [x] Supabase backend setup
- [x] Database schema with PostGIS
- [x] State management with Zustand
- [x] Responsive layout
- [x] TypeScript configuration
- [x] Tailwind CSS styling

### 🚧 In Progress
- [ ] Authentication flow
- [ ] Route optimization algorithm
- [ ] Real-time updates
- [ ] Mobile app

### 📋 Todo
- [ ] Inspector tracking
- [ ] Report generation
- [ ] Analytics dashboard
- [ ] Offline mode
- [ ] Push notifications

## Development Workflow

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Test locally: `npm run dev:web`
4. Lint: `npm run lint`
5. Build: `npm run build`
6. Commit: `git commit -m "feat: your feature"`
7. Push: `git push origin feature/your-feature`

### Database Changes
1. Create migration: `npm run db:migrate your_migration_name`
2. Write SQL in `supabase/migrations/`
3. Test locally
4. Push to Supabase: `npm run db:push`

### Styling Guide
- Use Tailwind classes
- Follow color scheme in `tailwind.config.js`
- Components in `src/components/ui/` are reusable
- Keep responsive design in mind

## Troubleshooting

### Common Issues

**Issue: Module not found errors**
```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

**Issue: Mapbox map not showing**
- Check your access token is valid
- Ensure `.env.local` is properly configured
- Check browser console for errors

**Issue: Supabase connection failed**
- Verify URL and anon key
- Check if migrations ran successfully
- Ensure PostGIS extension is enabled

**Issue: Build fails**
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

## Next Steps

1. **Set up authentication**
   - Enable Auth in Supabase
   - Add login/signup pages
   - Implement role-based access

2. **Add sample data**
   - Create seed script
   - Import Tbilisi locations
   - Generate test routes

3. **Implement optimization**
   - Add OR-Tools integration
   - Create optimization endpoint
   - Test with real data

4. **Deploy to production**
   - Set up Vercel account
   - Configure environment variables
   - Deploy web app

## Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://github.com/pmndrs/zustand)

## Support
For questions or issues:
- Check `/docs` folder for detailed guides
- Review code comments for implementation details
- Contact the development team

---
Built with ❤️ for GeoSafety