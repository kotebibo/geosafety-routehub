# 🚀 Deployment Guide - GeoSafety RouteHub

## Prerequisites

Before deploying, ensure you have:
- [ ] GitHub account with repository
- [ ] Vercel account (or chosen platform)
- [ ] Supabase project with production database
- [ ] Domain name (optional but recommended)

## Step 1: Prepare Environment Variables

1. Copy `.env.production.example` to `.env.production`
2. Fill in all required values:
   - Get Supabase credentials from [Supabase Dashboard](https://app.supabase.com)
   - Generate secure secrets using: `openssl rand -base64 32`
   - Set up Sentry project for error tracking (optional but recommended)

## Step 2: Database Setup

### 2.1 Run Migrations

```bash
# Connect to production database
cd supabase

# Run all migrations in order
psql $DATABASE_URL < migrations/001_initial_schema.sql
psql $DATABASE_URL < migrations/002_service_system.sql
psql $DATABASE_URL < migrations/003_authentication.sql
psql $DATABASE_URL < migrations/004_rls_policies.sql
```

### 2.2 Seed Initial Data

```bash
# Seed service types (required)
psql $DATABASE_URL < seed/service_types.sql

# Create admin user (required)
# Use Supabase Dashboard to create first admin user
```

## Step 3: Deploy to Vercel

### 3.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository

### 3.2 Configure Project

1. **Framework Preset:** Next.js
2. **Root Directory:** `apps/web`
3. **Build Command:** `npm run build`
4. **Install Command:** `npm install`

### 3.3 Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_KEY=your_service_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
SESSION_SECRET=your_secret
```

### 3.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (3-5 minutes)
3. Test deployment at provided URL

## Step 4: Configure Custom Domain (Optional)

1. In Vercel → Settings → Domains
2. Add your domain: `routehub.geosafety.ge`
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

## Step 5: Post-Deployment

### 5.1 Verify Health Check

```bash
curl https://your-domain.com/api/health
```

### 5.2 Run Smoke Tests

1. Test login functionality
2. Create a test company
3. Create a test route
4. Verify map loads correctly

### 5.3 Set Up Monitoring

1. **Sentry:** Verify errors are being tracked
2. **Analytics:** Verify page views are tracked
3. **Uptime:** Set up monitoring (UptimeRobot, Pingdom)

## Alternative Deployment Options

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up
```

### Deploy to DigitalOcean App Platform

1. Create new app in DigitalOcean
2. Connect GitHub repository
3. Configure build settings
4. Add environment variables
5. Deploy

### Self-Hosted (VPS)

```bash
# On your server
git clone https://github.com/your-repo/geosafety-routehub
cd geosafety-routehub/apps/web
npm install
npm run build
pm2 start npm --name "routehub" -- start
```

## Rollback Procedure

If issues occur:

1. **Vercel:** Use instant rollback in dashboard
2. **Database:** Restore from backup
3. **Emergency:** Set maintenance mode

```javascript
// middleware.ts - Add maintenance mode
if (process.env.MAINTENANCE_MODE === 'true') {
  return NextResponse.rewrite('/maintenance')
}
```

## Security Checklist

- [ ] All secrets are in environment variables
- [ ] HTTPS is enforced
- [ ] Security headers are configured
- [ ] Rate limiting is enabled
- [ ] Database backups are scheduled
- [ ] Error tracking is configured
- [ ] Admin accounts have strong passwords
- [ ] RLS policies are active

## Performance Optimization

After deployment:

1. Run Lighthouse audit
2. Enable Vercel Analytics
3. Set up CDN for assets
4. Enable ISR for static pages
5. Optimize images with next/image

## Troubleshooting

### Common Issues

**Build Fails:**
- Check Node version (18.x required)
- Verify all env variables are set
- Check TypeScript errors

**Database Connection Fails:**
- Verify Supabase URL and keys
- Check IP allowlist in Supabase
- Ensure migrations ran successfully

**Authentication Issues:**
- Verify Supabase Auth settings
- Check callback URLs
- Ensure RLS policies are correct

## Support

- **Vercel Issues:** [Vercel Support](https://vercel.com/support)
- **Supabase Issues:** [Supabase Support](https://supabase.com/support)
- **Application Issues:** Check error logs in Sentry

## Maintenance

### Weekly Tasks
- Review error logs
- Check performance metrics
- Update dependencies: `npm update`

### Monthly Tasks
- Security audit: `npm audit`
- Database backup verification
- Review and rotate API keys

### Quarterly Tasks
- Full security review
- Performance optimization
- Dependency major updates

---

**Last Updated:** October 2024
**Version:** 1.0.0
