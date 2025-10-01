# BIA TaxiGo - Production Deployment Guide

This guide will help you deploy your BIA TaxiGo application to production with all necessary configurations and optimizations.

## 🔒 Security Notice

**Important**: This repository previously contained exposed API keys which have been removed. If you have deployed this application or used this guide before April 5, 2025, please:

1. Rotate any API keys you may have used from this repository
2. Update your deployment environment with new keys
3. Check your application logs for any unauthorized usage

See [SECURITY_NOTICE.md](SECURITY_NOTICE.md) for complete details on the security issue and remediation steps.

## 🚀 Quick Deployment (Vercel - Recommended)

### Prerequisites
- GitHub repository with your code
- Vercel account
- Firebase project
- Google Cloud Console project

### Step 1: Prepare Your Repository

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Production ready BIA TaxiGo"
   git push origin main
   ```

2. **Verify all files are included**
   - `.env.example` (for reference)
   - `vercel.json` (deployment config)
   - `public/manifest.json` (PWA manifest)
   - All source code

### Step 2: Set Up Firebase

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Create a new project** (or use existing)
3. **Enable required services:**
   - Authentication (Email/Password)
   - Firestore Database
   - Storage
   - Functions (optional)

4. **Configure Firestore Security Rules:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Rides collection
       match /rides/{rideId} {
         allow read, write: if request.auth != null;
       }
       
       // Drivers collection
       match /drivers/{driverId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

### Step 3: Set Up Google Cloud

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Enable APIs:**
   - Maps JavaScript API
   - Places API

3. **Create API Keys:**
   - Maps API key (for frontend)
   - AI API key (for Genkit)

4. **Configure API Key Restrictions:**
   - Maps API: Restrict to your domain
   - AI API: Restrict to server-side usage

### Step 4: Deploy to Vercel

1. **Connect Repository:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables:**
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   NEXT_PUBLIC_APP_NAME=BIA TaxiGo
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```

3. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your app will be available at `https://your-app.vercel.app`

## 🔧 Alternative Deployment Options

### Netlify

1. **Connect to GitHub**
2. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`
3. **Environment variables:** Same as Vercel
4. **Deploy**

### AWS Amplify

1. **Connect to GitHub**
2. **Build settings:**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
   ```
3. **Environment variables:** Same as Vercel
4. **Deploy**

### Google Cloud Run

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Deploy:**
   ```bash
   gcloud run deploy bia-taxigo --source . --platform managed --region us-central1
   ```

## 🔒 Production Security Checklist

### Firebase Security
- [ ] Enable App Check
- [ ] Configure Firestore security rules
- [ ] Set up Firebase Auth domain restrictions
- [ ] Enable reCAPTCHA for authentication

### API Security
- [ ] Restrict Google Maps API key to your domain
- [ ] Restrict Google AI API key to server-side usage
- [ ] Enable CORS for your domain
- [ ] Set up rate limiting

### Application Security
- [ ] Enable HTTPS only
- [ ] Set secure headers
- [ ] Implement CSP (Content Security Policy)
- [ ] Regular dependency updates

## 📊 Performance Optimization

### Build Optimization
- [ ] Enable compression
- [ ] Optimize images
- [ ] Enable code splitting
- [ ] Use CDN for static assets

### Runtime Optimization
- [ ] Implement caching strategies
- [ ] Use React.memo for components
- [ ] Optimize bundle size
- [ ] Enable PWA features

## 🔍 Monitoring and Analytics

### Firebase Analytics
1. **Enable Firebase Analytics**
2. **Set up custom events:**
   - Ride requests
   - User registrations
   - Driver activities

### Error Monitoring
1. **Set up Sentry or similar**
2. **Monitor client-side errors**
3. **Track performance metrics**

### Uptime Monitoring
1. **Use UptimeRobot or similar**
2. **Set up alerts**
3. **Monitor API endpoints

## 🚀 Post-Deployment Steps

### 1. Test All Features
- [ ] User registration/login
- [ ] Role-based access
- [ ] Map functionality with autocomplete
- [ ] Ride flow
- [ ] Payment processing

### 2. Performance Testing
- [ ] Load testing
- [ ] Mobile responsiveness
- [ ] Network optimization

### 3. Security Testing
- [ ] Penetration testing
- [ ] Authentication flows
- [ ] Data validation

### 4. Documentation
- [ ] Update README.md
- [ ] API documentation
- [ ] User guides

## 🔄 Maintenance

### Regular Updates
- [ ] Dependencies updates
- [ ] Security patches
- [ ] Feature updates
- [ ] Performance monitoring

### Backup Strategy
- [ ] Database backups
- [ ] Code backups
- [ ] Configuration backups

### Monitoring
- [ ] Error tracking
- [ ] Performance monitoring
- [ ] User analytics
- [ ] System health

## 📞 Support and Troubleshooting

### Common Issues
1. **Environment variables not loading**
   - Check Vercel dashboard
   - Verify variable names
   - Restart deployment

2. **Firebase connection issues**
   - Check API keys
   - Verify project configuration
   - Check security rules

3. **Google Maps not loading**
   - Verify API key
   - Check domain restrictions
   - Enable required APIs

### Getting Help
- Check logs in deployment platform
- Review Firebase console
- Check browser console for errors
- Contact support team

## 🎯 Success Metrics

### Key Performance Indicators
- Page load time < 3 seconds
- 99.9% uptime
- < 1% error rate
- Mobile responsiveness score > 90

### Business Metrics
- User registration rate
- Ride completion rate
- Driver satisfaction
- Customer satisfaction

---

**Note:** This deployment guide assumes you have completed the development setup. Make sure to test thoroughly in a staging environment before deploying to production.