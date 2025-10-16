# 🚀 GeoSafety RouteHub

## Production-Ready Route Optimization System

[![CI/CD Pipeline](https://github.com/geosafety/routehub/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/geosafety/routehub/actions/workflows/ci-cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

### 🎯 Overview
GeoSafety RouteHub is a comprehensive route optimization and field management system designed for safety inspection services in Georgia. The system enables efficient route planning, real-time tracking, and comprehensive reporting for field inspectors.

### ✨ Key Features
- **🗺️ Interactive Route Planning** - Visual map-based route creation with drag-and-drop
- **📱 Mobile Inspector App** - Real-time route tracking and status updates
- **🏢 Company Management** - Complete database of 216+ Georgian companies
- **👥 Inspector Assignment** - Bulk assignment and workload balancing
- **📊 Analytics Dashboard** - Performance metrics and reporting
- **🔒 Secure Authentication** - Role-based access control (Admin, Dispatcher, Inspector)
- **🌐 Bilingual Support** - Georgian and English interfaces

### 🛠️ Technology Stack
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL), Row-Level Security
- **Maps:** OpenStreetMap / Mapbox GL
- **Monitoring:** Sentry, Web Vitals
- **Deployment:** Vercel / Docker / VPS

### 📋 Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Domain with SSL certificate

### 🚀 Quick Start

#### 1. Clone the repository
```bash
git clone https://github.com/geosafety/routehub.git
cd routehub/apps/web
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

#### 4. Run development server
```bash
npm run dev
```

#### 5. Open browser
Navigate to http://localhost:3000

### 🏗️ Project Structure
```
apps/web/
├── app/              # Next.js 14 App Router
├── components/       # React components
├── src/
│   ├── config/      # Configuration files
│   ├── lib/         # Utilities and libraries
│   ├── services/    # API services
│   ├── hooks/       # Custom React hooks
│   └── types/       # TypeScript types
├── public/          # Static assets
└── supabase/        # Database migrations
```

### 📦 Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript
```

### 🔒 Security Features
- Row-Level Security (RLS) on all tables
- API rate limiting
- Input validation with Zod
- XSS protection
- CORS configuration
- Security headers
- Session management

### 📊 Performance
- Lighthouse Score: 90+
- First Contentful Paint: < 1.8s
- Time to Interactive: < 3.9s
- Bundle size: < 250kb (gzipped)

### 🧪 Testing
- Unit tests with Vitest
- Integration tests for APIs
- E2E tests for critical flows
- Current coverage: ~20% (target: 70%)

### 📝 Documentation
- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Documentation](docs/api/README.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Security Guide](docs/security/README.md)

### 🚢 Deployment Options
1. **Vercel** (Recommended) - One-click deploy
2. **Docker** - Containerized deployment
3. **VPS** - Traditional server deployment
4. **Railway/Render** - Alternative platforms

### 👥 Team
- **Product Owner:** GeoSafety Team
- **Technical Lead:** Development Team
- **UI/UX Design:** Design Team

### 📄 License
MIT License - see [LICENSE](LICENSE) file for details

### 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 📞 Support
- **Email:** support@geosafety.ge
- **Documentation:** [docs.geosafety.ge](https://docs.geosafety.ge)
- **Issues:** [GitHub Issues](https://github.com/geosafety/routehub/issues)

### 🎉 Acknowledgments
- OpenStreetMap contributors
- Supabase team
- Next.js community
- All our beta testers

---

**Production Status:** ✅ Ready for deployment
**Version:** 1.0.0
**Last Updated:** October 2025
