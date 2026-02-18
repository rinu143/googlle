# Mentalism Performer Portal

A full-stack mentalism tool that instantly reveals spectator searches to a performer's private dashboard. This project consists of a React frontend for the user interface and an Express.js backend for administrative tasks, payments, and email notifications.

## Features

- **Real-time Reveal**: Performers see what spectators search instantly.
- **Unique Audience Links**: Custom slug-based links for each performer (e.g., `domain.com/jon`).
- **Admin Dashboard**: Manage performers and monitor platform usage.
- **Payment Integration**: Automated signup flow with Razorpay payments.
- **Email Notifications**: Automated welcome emails with credentials via Resend.
- **Device Management**: Security feature limiting performers to 2 active devices.
- **Search History**: Performer-specific history of searches.

## Technology Stack

### Frontend

- **React 19** (Vite)
- **Firebase** (Auth, Firestore)
- **React Router DOM**
- **NanoID**

### Backend (Node.js)

- **Express.js**
- **Firebase Admin SDK**
- **Razorpay** (Payments)
- **Resend** (Email Service)
- **Nodemailer** (Legacy/Alternative)

## Prerequisites

- Node.js (v18+)
- Firebase Project (Firestore, Authentication)
- Razorpay Account (Key ID & Secret)
- Resend API Key
- Google Service Account Credentials (`firebaseAdmin.json`)

## Installation & Setup

### 1. Repository Setup

```bash
git clone <repository-url>
cd mentalism
npm install
```

### 2. Frontend Configuration

Create a `.env` file in the root directory with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Start the frontend:

```bash
npm run dev
```

### 3. Backend Configuration

Navigate to the server directory:

```bash
cd server
npm install
```

**Firebase Admin Setup:**

1. Go to Firebase Console -> Project Settings -> Service Accounts.
2. Generate a new private key.
3. Save the JSON file as `firebaseAdmin.json` inside the `server/` directory.

**Environment Variables:**
Create a `.env` file in the `server/` directory:

```env
PORT=5000
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RESEND_API_KEY=your_resend_api_key
FRONTEND_URL=http://localhost:5173
```

Start the backend server:

```bash
npm run dev
```

## Usage Flow

1. **Admin/Signup**: New performers sign up via the portal and pay the fee (verified by Razorpay).
2. **Account Creation**: The backend creates a Firebase user and a corresponding Firestore document.
3. **Email**: The system emails the performer their login credentials and magic link.
4. **Performance**:
   - Performer logs in at `/login`.
   - Spectator visits the magic link (e.g., `/magic`) and "searches" for a thought.
   - Result appears instantly on the performer's dashboard.

## Deployment

### Frontend

Build the React app:

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or Firebase Hosting.

### Backend

The `server/` directory should be deployed to a Node.js environment (e.g., Render, Railway, Heroku). Ensure environment variables and `firebaseAdmin.json` (via secrets management) are correctly configured.
