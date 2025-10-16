# 🚀 Deployment Guide - GeoSafety RouteHub

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Supabase account and project
- Domain name (e.g., routehub.geosafety.ge)
- SSL certificate (automatic with most platforms)

## 🎯 Quick Deploy to Vercel (Recommended)

### Step 1: Prepare Your Repository
```bash
git init
git add .
git commit -m "Initial production release"
git remote add origin https://github.com/yourusername/geosafety-routehub.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository
5. Configure environment variables (see below)
6. Click "Deploy"

### Step 3: Environment Variables in Vercel
Add these in Vercel Dashboard > Settings > Environment Variables:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
NEXT_PUBLIC_APP_URL=https://routehub.geosafety.ge

# Optional but recommended
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

### Step 4: Configure Domain
1. In Vercel Dashboard > Settings > Domains
2. Add your domain: routehub.geosafety.ge
3. Follow DNS configuration instructions
4. SSL certificate will be automatic

---

## 🐳 Deploy with Docker

### Step 1: Create Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY apps/web/package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY apps/web .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```
### Step 2: Build and Run
```bash
docker build -t geosafety-routehub .
docker run -p 3000:3000 --env-file .env.production geosafety-routehub
```

---

## 📦 Deploy to VPS (DigitalOcean/Linode)

### Step 1: Server Setup
```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install nginx -y
```

### Step 2: Clone and Build
```bash
# Clone repository
git clone https://github.com/yourusername/geosafety-routehub.git
cd geosafety-routehub/apps/web

# Install dependencies
npm install

# Build application
npm run build:prod
```
### Step 3: Configure PM2
```bash
# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'routehub',
    script: 'npm',
    args: 'start',
    cwd: '/root/geosafety-routehub/apps/web',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 4: Configure Nginx
```nginx
# /etc/nginx/sites-available/routehub
server {
    listen 80;
    server_name routehub.geosafety.ge;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```