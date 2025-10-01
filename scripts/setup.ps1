# BIA TaxiGo Setup Script for Windows
Write-Host "🚀 Setting up BIA TaxiGo..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check Node.js version
$nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($nodeMajorVersion -lt 18) {
    Write-Host "❌ Node.js version 18+ is required. Current version: $nodeVersion" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "📝 Creating .env.local file..." -ForegroundColor Yellow
    @"
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Google AI API Key (for Genkit)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# App Configuration
NEXT_PUBLIC_APP_NAME=BIA TaxiGo
NEXT_PUBLIC_APP_VERSION=1.0.0
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local file. Please update it with your API keys." -ForegroundColor Green
} else {
    Write-Host "✅ .env.local already exists." -ForegroundColor Green
}

# Create .env.example
if (-not (Test-Path ".env.example")) {
    Write-Host "📝 Creating .env.example file..." -ForegroundColor Yellow
    Copy-Item ".env.local" ".env.example"
    Write-Host "✅ Created .env.example file." -ForegroundColor Green
}

# Check if Firebase CLI is installed
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI version: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Firebase CLI is not installed. Installing..." -ForegroundColor Yellow
    npm install -g firebase-tools
}

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version
    Write-Host "✅ Vercel CLI version: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Vercel CLI is not installed. Installing..." -ForegroundColor Yellow
    npm install -g vercel
}

# Run type checking
Write-Host "🔍 Running type checking..." -ForegroundColor Yellow
npm run typecheck

# Run linting
Write-Host "🧹 Running linting..." -ForegroundColor Yellow
npm run lint

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env.local with your API keys" -ForegroundColor White
Write-Host "2. Set up Firebase project and enable required services" -ForegroundColor White
Write-Host "3. Get Google Maps API key" -ForegroundColor White
Write-Host "4. Get Google AI API key for tip calculation" -ForegroundColor White
Write-Host "5. Run 'npm run dev' to start development server" -ForegroundColor White
Write-Host ""
Write-Host "For detailed setup instructions, see README.md" -ForegroundColor Cyan
