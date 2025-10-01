#!/bin/bash

# BIA TaxiGo Setup Script
echo "🚀 Setting up BIA TaxiGo..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
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
EOF
    echo "✅ Created .env.local file. Please update it with your API keys."
else
    echo "✅ .env.local already exists."
fi

# Create .env.example
if [ ! -f ".env.example" ]; then
    echo "📝 Creating .env.example file..."
    cp .env.local .env.example
    echo "✅ Created .env.example file."
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "⚠️  Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
fi

echo "✅ Firebase CLI version: $(firebase --version)"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

echo "✅ Vercel CLI version: $(vercel --version)"

# Run type checking
echo "🔍 Running type checking..."
npm run typecheck

# Run linting
echo "🧹 Running linting..."
npm run lint

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your API keys"
echo "2. Set up Firebase project and enable required services"
echo "3. Get Google Maps API key"
echo "4. Get Google AI API key for tip calculation"
echo "5. Run 'npm run dev' to start development server"
echo ""
echo "For detailed setup instructions, see README.md"
