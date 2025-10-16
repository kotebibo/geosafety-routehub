# PowerShell script to initialize the GeoSafety RouteHub project
Write-Host "🚀 GeoSafety RouteHub - Project Initialization" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version $npmVersion found" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
Set-Location D:\geosafety-routehub
npm install

Write-Host "`n📦 Installing web app dependencies..." -ForegroundColor Yellow
Set-Location D:\geosafety-routehub\apps\web
npm install

# Create .env.local file if it doesn't exist
if (!(Test-Path ".env.local")) {
    Write-Host "`n📝 Creating .env.local file..." -ForegroundColor Yellow
    Copy-Item ".env.local.example" ".env.local"
    Write-Host "⚠️  Please edit apps/web/.env.local with your API keys!" -ForegroundColor Yellow
}

Write-Host "`n✅ Project initialized successfully!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Get Supabase credentials from https://supabase.com" -ForegroundColor White
Write-Host "2. Get Mapbox token from https://mapbox.com" -ForegroundColor White
Write-Host "3. Edit apps/web/.env.local with your API keys" -ForegroundColor White
Write-Host "4. Run 'npm run dev:web' to start the development server" -ForegroundColor White
Write-Host "5. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "`n🎉 Happy coding!" -ForegroundColor Magenta