# Muslim Youth Retreat 2025 - Setup Instructions

This project now includes a complete backend integration with Firebase and Stripe payment processing, plus an admin portal to view registrations.

## 🚀 New Features Added

- **Firebase Backend**: Complete registration storage with Firestore
- **Stripe Payment Integration**: Real payment processing with Stripe Elements
- **Admin Portal**: View all registrations with detailed information
- **Registration Management**: Track payment status and participant details

## 📋 Prerequisites

1. **Firebase Project**: Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. **Stripe Account**: Sign up at [Stripe](https://stripe.com) and get your API keys
3. **Node.js**: Version 18 or higher

## 🔧 Setup Instructions

### 1. Firebase Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Create a project"
   - Follow the setup wizard

2. **Enable Firestore**:
   - In your Firebase project, go to "Firestore Database"
   - Click "Create database"
   - Choose "Start in test mode" (you can configure security rules later)

3. **Enable Functions**:
   - Go to "Functions" in the Firebase console
   - Set up billing (required for HTTP functions)
   - Initialize Functions

4. **Get Firebase Configuration**:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Click on the web app icon (</>)
   - Copy the config object

### 2. Stripe Setup

1. **Create a Stripe Account**:
   - Sign up at [Stripe](https://stripe.com)
   - Complete account verification

2. **Get API Keys**:
   - Go to Developers > API keys
   - Copy your Publishable key (starts with `pk_test_`)
   - Copy your Secret key (starts with `sk_test_`)

### 3. Environment Configuration

1. **Create Environment Files**:
   ```bash
   # In the root directory
   cp .env.example .env
   
   # In the functions directory
   cd functions
   cp .env.example .env
   cd ..
   ```

2. **Configure Frontend Environment** (`.env` in root):
   ```env
   # Stripe Configuration
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_FUNCTIONS_URL=https://us-central1-your-project-id.cloudfunctions.net
   ```

3. **Configure Backend Environment** (`functions/.env`):
   ```env
   STRIPE_API_PRIVATE_KEY=sk_test_your_stripe_secret_key_here
   ```

### 4. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd functions
npm install
cd ..
```

### 5. Deploy Firebase Functions

```bash
# Login to Firebase (if not already logged in)
firebase login

# Initialize Firebase (if not already done)
firebase init

# Deploy functions
firebase deploy --only functions
```

### 6. Run the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build
```

## 🎯 Features Overview

### Registration System
- **Multi-step Form**: Parent info, participant details, agreements, payment
- **Real-time Validation**: Email validation, required fields
- **Pricing Logic**: $275 for single participant, $250 each for multiple
- **Stripe Integration**: Secure payment processing with Stripe Elements

### Admin Portal
- **Registration Overview**: View all registrations with key statistics
- **Detailed Information**: Parent contact info, participant details, payment status
- **Search & Filter**: Find registrations by name, ID, or payment status
- **Real-time Data**: Connected to Firebase for live updates

### Backend Functions
- **`createPaymentIntent`**: Creates Stripe payment intents
- **`saveRegistration`**: Stores registration data in Firestore
- **`confirmPayment`**: Confirms successful payments
- **`getRegistrations`**: Retrieves all registrations for admin portal

## 🔐 Security Considerations

### Production Checklist
- [ ] Configure Firestore security rules
- [ ] Set up Firebase Authentication for admin portal
- [ ] Use production Stripe keys
- [ ] Configure CORS properly
- [ ] Set up proper error logging
- [ ] Add rate limiting to functions

### Firestore Security Rules Example
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to registrations for authenticated users only
    match /registrations/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 Deployment

### Frontend (Firebase Hosting)
```bash
npm run build
firebase deploy --only hosting
```

### Backend (Firebase Functions)
```bash
firebase deploy --only functions
```

## 📱 Admin Portal Access

The admin portal is accessible via a small "Admin" link at the bottom of the home page. In production, you should:

1. Add authentication to the admin portal
2. Restrict access to authorized users only
3. Consider hiding the admin link for non-admin users

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your Firebase Functions are properly configured for CORS
2. **Stripe Errors**: Verify your API keys are correct and have the right permissions
3. **Firebase Connection**: Check that your Firebase config is correct
4. **Environment Variables**: Ensure all required environment variables are set

### Development vs Production

- **Development**: Uses Stripe test keys (pk_test_, sk_test_)
- **Production**: Use live Stripe keys (pk_live_, sk_live_)
- **Firebase**: Same project can be used, but consider separate projects for dev/prod

## 📞 Support

If you need help with setup:
1. Check the Firebase and Stripe documentation
2. Verify all environment variables are set correctly
3. Check browser console for error messages
4. Ensure all dependencies are installed

## 🎉 You're Ready!

Your Muslim Youth Retreat registration system is now fully integrated with:
- ✅ Real payment processing
- ✅ Registration data storage
- ✅ Admin portal for management
- ✅ Professional UI/UX

The system is production-ready once you configure your actual Firebase project and Stripe account!