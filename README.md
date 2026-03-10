# RuProof Growth OS

Your personal marketing command center — LinkedIn, Facebook, Content, Leads, Campaigns, Scrapers, and more. Powered by Firebase.

## 🚀 Run on Your PC

### Step 1: Install Node.js
Download from https://nodejs.org (use LTS version)

### Step 2: Extract this folder
Unzip `ruproof-growth-os.zip` anywhere on your PC (e.g. `C:\Projects\ruproof-growth-os`)

### Step 3: Open terminal in the folder
```bash
cd ruproof-growth-os
npm install
npm run dev
```

### Step 4: Open in browser
Go to → http://localhost:8080

---

## 🔐 Auth Flow
- `/signup` → create account → set up workspace → Dashboard
- `/login` → sign in with email/password or Google → Dashboard
- All app routes are protected — must be logged in with a workspace

## 🔥 Firebase
Already configured. Project: `ruleproof-growth-os`
- Auth: Email/Password + Google ✅
- Firestore: ready ✅

## 📁 Project Structure
```
src/
├── pages/
│   ├── auth/         LoginPage, SignupPage, WorkspaceSetupPage, ForgotPasswordPage
│   ├── Dashboard, LinkedIn, Facebook, ContentStudio, IdeasLab
│   ├── Scrapers, LeadsCRM, Campaigns, Files, Activity, Settings
├── components/
│   ├── layout/       AppLayout, AppSidebar, TopBar
│   ├── auth/         ProtectedRoute
│   └── CommandPalette
├── contexts/         AuthContext (Firebase auth + workspace)
├── hooks/            useTheme
└── lib/              firebase.ts, utils.ts
```
