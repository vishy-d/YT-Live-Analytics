# 📺 YouTube LIVE Analytics Monitoring Platform

**Real-time YouTube LIVE viewer analytics — Next.js 14 + Firebase**  
Built by VS InfoTech, Chennai

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔐 Authentication | Firebase Auth (email + password) |
| 📡 Channel Monitoring | Add via @handle, /channel/UC…, /c/name |
| 🔄 API Key Rotation | Up to 10 keys, round-robin, 10,000 units/day each |
| 📊 Historical Charts | Firestore-backed, per-minute granularity, Chart.js |
| 🔴 Current LIVE | Auto-polls every 10 seconds |
| 🌐 Multi-Language | Group channels by language/sheet |
| ⬇ Excel Export | ExcelJS — download .xlsx with all analytics data |
| 🏎 Capture Engine | Fires at exact minute boundaries, 10-min discovery cache |
| ☁ Hosting | Deploy free on Vercel |

---

## 🛠 Tech Stack

```
Next.js 14          — Framework (pages router)
Firebase Auth       — User authentication
Firestore           — Channels, config, analytics storage
Firebase Admin SDK  — Server-side token verification
Chart.js 4          — Historical line charts
ExcelJS             — Excel export
Framer Motion       — UI animations
Tailwind CSS        — Utility styling
```

---

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_ORG/yt-live-analytics.git
cd yt-live-analytics
npm install
```

### 2. Get a YouTube Data API v3 Key

1. Open [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable **YouTube Data API v3**
3. Credentials → + Create Credentials → API key
4. Copy the key (starts with `AIzaSy…`)

### 3. Create Firebase project

1. Open [console.firebase.google.com](https://console.firebase.google.com)
2. Add project → **Enable Authentication** → Email/Password
3. **Authentication → Users → Add user** (your login email + password)
4. **Firestore Database** → Create in production mode
5. **Project Settings → Your apps** → Add web app → copy the config
6. **Project Settings → Service accounts** → Generate new private key → download JSON

### 4. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

```env
# From Firebase console → Project Settings → Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc

# From downloaded service account JSON
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

JWT_SECRET=your-random-32-char-secret-string
```

### 5. Deploy Firestore rules & indexes

```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore
```

### 6. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## ☁ Deploy to Vercel (free)

```bash
# Option A: Vercel CLI
npm install -g vercel
vercel

# Option B: GitHub → vercel.com → Import repository → Add env vars → Deploy
```

All `NEXT_PUBLIC_*` and server-side env vars need to be set in Vercel's Environment Variables dashboard.

---

## 📁 Project Structure

```
yt-live-analytics/
├── pages/
│   ├── index.js          ← Auth redirect
│   ├── login.js          ← Cyberpunk login page
│   ├── app.js            ← Main dashboard shell
│   ├── _app.js
│   ├── _document.js
│   └── api/
│       ├── youtube/
│       │   ├── resolve.js   ← Resolve channel URL → ID + name
│       │   └── live.js      ← Fetch live streams + viewer counts
│       └── analytics/
│           ├── save.js      ← Save data point to Firestore
│           └── get.js       ← Query analytics by language + date
├── components/
│   ├── Sidebar.js
│   ├── Header.js
│   ├── ChannelCard.js
│   ├── AddChannelModal.js
│   └── views/
│       ├── ConfigView.js    ← API keys + setup guide
│       ├── ChannelsView.js  ← Channel management + capture engine
│       ├── DashboardView.js ← Historical Chart.js charts
│       └── LiveView.js      ← 10-second real-time polling
├── hooks/
│   ├── useAuth.js           ← Firebase auth state
│   └── useFirestore.js      ← Channels + config Firestore hooks
├── lib/
│   ├── firebase.js          ← Client SDK
│   ├── firebaseAdmin.js     ← Admin SDK (server-side)
│   └── youtube.js           ← YouTube Data API helpers
├── styles/
│   └── globals.css          ← Cyberpunk theme, fonts, animations
├── firestore.rules          ← Security rules
├── firestore.indexes.json   ← Composite indexes
├── tailwind.config.js
└── .env.local.example
```

---

## 🗄 Firestore Schema

### `/config/{uid}`
```json
{ "apiKeys": ["AIzaSy...", "AIzaSy..."] }
```

### `/channels/{docId}`
```json
{
  "uid": "firebase-user-id",
  "channelId": "UCxxxxxxxxxxxxxxxxxxxxxxxx",
  "channelName": "Aaj Tak",
  "language": "Hindi",
  "colName": "Aaj Tak",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### `/analytics/{docId}`
```json
{
  "uid": "firebase-user-id",
  "channelId": "UCxxxxxxxxxxxxxxxxxxxxxxxx",
  "channelName": "Aaj Tak",
  "language": "Hindi",
  "colName": "Aaj Tak",
  "viewers": 225000,
  "streams": [{"id": "videoId", "title": "Live Now", "views": 225000}],
  "date": "2025-01-01",
  "time": "20:47",
  "timestamp": "2025-01-01T20:47:00.000Z",
  "createdAt": "Firestore Timestamp"
}
```

---

## 💡 API Quota Guide

| Keys | Daily quota | Channels (8h peak) |
|------|------------|---------------------|
| 1    | 10,000     | ~2 channels          |
| 3    | 30,000     | ~6 channels          |
| 10   | 100,000    | ~20 channels         |
| 30   | 300,000    | ~60 channels         |

Each channel costs ~660 units/hour (discovery every 10 min + viewers every 60s).

---

## 🔐 Security Notes

- Firebase Firestore rules enforce per-user data isolation
- API routes verify Firebase ID tokens server-side via Admin SDK
- API keys are stored in Firestore (per user), never in env vars
- Never commit `.env.local` to git

---

© VS InfoTech, Chennai · All Rights Reserved  
YouTube LIVE Analytics Monitoring Platform · Next.js + Firebase Edition
