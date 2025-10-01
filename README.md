# BIA TaxiGo - Ride-Hailing Platform

A modern, full-stack ride-hailing application built with Next.js, Firebase, and TypeScript. This platform provides separate dashboards for customers, drivers, and administrators with real-time features.

## 🚀 Features

- **Multi-role Authentication**: Separate dashboards for customers, drivers, and admins
- **Location Services**: Map integration with location services and autocomplete
- **Ride Management**: Complete ride flow from request to completion
- **AI-Powered Features**: Smart tip calculation using Google AI
- **Responsive Design**: Mobile-first design with PWA support
- **Firebase Integration**: Authentication, Firestore, Storage, and Functions
- **Type Safety**: Full TypeScript implementation
- **Error Handling**: Comprehensive error boundaries and user feedback

## 🔒 Security Notice

**Important**: This repository previously contained exposed API keys which have been removed. If you have cloned this repository before April 5, 2025, please:

1. Rotate any API keys you may have used from this repository
2. Update your local environment with new keys following the setup instructions below
3. Check your application logs for any unauthorized usage

See [SECURITY_NOTICE.md](SECURITY_NOTICE.md) for complete details on the security issue and remediation steps.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Maps**: Google Maps Platform for location services
- **AI**: Google AI (Gemini) for tip calculation
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js 18+ installed
- A Firebase project set up
- Google Maps API key
- Google AI API key (for tip calculation)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BIA-main
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
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
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication (Email/Password)
4. Create a Firestore database
5. Enable Storage
6. Copy your Firebase config to `.env.local`

### 5. Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or use an existing one
3. Enable the Maps JavaScript API and Places API
4. Create an API key
5. Add the key to your `.env.local` file

### 6. Google AI Setup

1. Go to [Google AI Studio](https://studio.google.com/)
2. Create an API key
3. Add the key to your `.env.local` file

### 7. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:9003](http://localhost:9003) to see the application.

## 📱 User Roles

### Customer
- Request rides with pickup and dropoff locations
- View ride history and status
- Rate drivers and provide feedback
- AI-powered tip suggestions

### Driver
- Accept ride requests
- Navigate to pickup and dropoff locations
- Update ride status
- View earnings and statistics

### Admin
- Monitor all rides and users
- Manage drivers and customers
- View platform analytics
- Handle support requests

## 📖 Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](docs/api.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core features
  - Multi-role authentication
  - Map integration with autocomplete
  - Ride management system
  - AI-powered tip calculation
  - Responsive design