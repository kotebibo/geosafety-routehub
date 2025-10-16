# Production Environment Variables Setup

## 📋 Overview

This document provides guidance for setting up environment variables for production deployment.

## 🔒 Security Requirements

**CRITICAL:** Never commit these files to version control:
- `.env.local` (development)
- `.env.production` (production)
- Any file containing actual API keys or secrets

## 📝 Required Variables

### For All Environments

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://rjnraabxbpvonhowdfuc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_KEY=<your_service_key>

# Application
NEXT_PUBLIC_APP_URL=<your_production_url>
NODE_ENV=production

# Map Provider
NEXT_PUBLIC_MAP_PROVIDER=openstreetmap
```

### For Production Only

```bash
# Error Tracking (Sentry - Recommended)
NEXT_PUBLIC_SENTRY_DSN=<your_sentry_dsn>
SENTRY_AUTH_TOKEN=<your_auth_token>
SENTRY_ORG=<your_org>
SENTRY_PROJECT=<your_project>

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

## 🚀 Deployment Platforms

### Vercel (Recommended)

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable:
   - Set "Environment" appropriately (Production/Preview/Development)
   - Use "Encrypted" for sensitive values
4. Redeploy after adding variables

### Netlify
1. Go to Site Settings → Build & Deploy → Environment
2. Add each variable
3. Trigger new deployment

### Self-Hosted
Create a `.env.production` file on your server:
```bash
# Never commit this file!
cp .env.example .env.production
# Edit with production values
nano .env.production
```

## 🔐 Obtaining Credentials

### Supabase Keys
1. Go to https://app.supabase.com/project/rjnraabxbpvonhowdfuc/settings/api
2. Copy:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_KEY` (Keep secret!)

### Sentry DSN (Error Tracking)
1. Sign up at https://sentry.io
2. Create a new project (Next.js)
3. Copy the DSN from project settings
4. Get auth token from: Account → API Keys

## ✅ Validation

Test your environment setup:

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Check for errors related to missing environment variables.

## 🔍 Troubleshooting

### "Missing required environment variable"
- Ensure all required variables from `.env.example` are set
- Check spelling and prefixes (`NEXT_PUBLIC_` for client-side)
- Restart dev server after changing variables

### "Invalid Supabase URL"
- Verify URL format: `https://<project-id>.supabase.co`
- Ensure no trailing slashes
- Check that keys match your project

### Variables not updating
- Clear Next.js cache: `rm -rf .next`
- Restart development server
- For Vercel: redeploy after changing variables

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Documentation](https://supabase.com/docs)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
