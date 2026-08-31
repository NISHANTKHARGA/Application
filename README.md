<div align="center">

# ⚖️ KanoonSathi

### AI-Powered Legal Platform for Nepal

Connect with verified Nepali lawyers, get instant AI legal guidance, and manage consultations — all in one place.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-gray?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&logoColor=white)

</div>

---

## 📌 About

**KanoonSathi** (कानूनसाथी — "legal companion") is a full-stack legal platform built for Nepal. It combines a **Groq-powered AI legal assistant** with a **verified lawyer marketplace** and **appointment / video consultation system**, enabling users to:

- Ask legal questions in **Nepali or English** and get instant, context-aware AI answers.
- Browse, search, and filter **verified Nepali lawyers** by specialization.
- Book and manage **online consultations** with lawyers, including mutual completion and ratings.
- Let lawyers manage their profile, availability, appointments, and ratings.
- Let an **admin panel** review, approve, or reject lawyer applications.

---

## ✨ Features

### 🤖 AI Legal Assistant
- Conversational chat in **Nepali and English**.
- Powered by **Groq** (Llama 3.3-70B) with RAG over a curated Nepali legal-knowledge base.
- Handles **outdated political / current-event topics** gracefully via fallback responses.
- Recommends relevant lawyers based on the conversation topic.
- Conversation history, download/export, and delete.

### 👤 User Portal
- Register / login with email or phone (`+977`).
- Browse lawyers list, view detailed profiles, and book appointments.
- **Video consultations** with Jitsi-style room handling.
- Rate and review lawyers after completing consultations.
- Change password and update profile.

### 🧑‍⚖️ Lawyer Portal
- Lawyer registration with profile picture + license document upload.
- Admin approval workflow (`pending → approved / rejected`).
- Manage profile, availability, and specialization.
- View appointment stats and endorse case summaries from AI chat.

### 🗓️ Appointments & Video
- Conflict-free booking with time-slot availability.
- Pending → confirmed → ongoing → completed lifecycle.
- **Mutual completion** confirmation from both user and lawyer.
- Reschedule with notes; meeting-join guards based on status.

### 🛠️ Admin Panel
- Review & approve/reject lawyer applications.
- Manage users and lawyers.
- View appointments and platform stats.

### 🗓️ Bonus Tools
- **Nepali ↔ English date converter** (Bikram Sambat).

---

## 🏗️ Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | Next.js 14 (App Router), React 18, Tailwind CSS, Lucide icons |
| Backend    | Node.js, Express 4 |
| AI         | Groq (Llama 3.3-70B), custom RAG + intent classification |
| Database   | PostgreSQL on Supabase (Sequelize ORM) |
| Auth       | JWT (bcrypt password hashing) |
| Email      | Nodemailer |
| Deploy     | Vercel (monorepo with experimental services) |

---

## 📁 Project Structure

```
.
├── frontend/           # Next.js user + lawyer portal
│   └── src/app/        # App Router pages (dashboard, chat, lawyers, appointments, video, login, register, ...)
├── backend/            # Express REST API
│   └── src/
│       ├── controllers/  # auth, lawyer, appointment, chat, date conversion
│       ├── models/       # User, Lawyer, Appointment, ChatMessage (Sequelize)
│       ├── routes/       # /api/auth, /api/lawyer, /api/appointment, /api/chat, /api/date
│       ├── services/     # chat, RAG, email, web search, embedding, intent classifier
│       └── seed.js       # auto-seeds demo accounts on startup
├── admin-frontend/     # Next.js admin dashboard
├── admin-backend/      # Express API for admin
├── vercel.json         # Monorepo deployment config (frontend + backend)
└── package.json        # Root scripts to run both frontend & backend
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Supabase (PostgreSQL) database
- A Groq API key (for the AI assistant)

### 1. Clone & Install

```bash
git clone <your-repo-url> && cd KanoonSathi
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure Environment

**backend/.env**
```
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
GROQ_API_KEY=your_groq_key
FRONTEND_URL=http://localhost:3000
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
GROQ_API_KEY=your_groq_key
```

### 3. Run Locally

From the project root:

```bash
npm run start
```

This starts the **backend** (port 5000) and **frontend** (port 3000) concurrently.

Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 Demo Accounts

Demo accounts are **auto-seeded** on backend startup (idempotent — only created if they don't already exist).

| Role   | Email              | Password |
|--------|--------------------|----------|
| User   | `demo@user.com`    | `demo123`|
| Lawyer | `demo@lawyer.com`  | `demo123`|

You can also run the seeder manually:

```bash
cd backend && node src/seed.js
```

---

## 📡 API Overview

Base URL: `http://localhost:5000/api`

| Method | Endpoint                      | Description                       |
|--------|-------------------------------|-----------------------------------|
| POST   | `/auth/register`              | Register a user                   |
| POST   | `/auth/login`                 | User login                        |
| POST   | `/auth/lawyer/register`       | Lawyer registration (multipart)   |
| POST   | `/auth/lawyer/login`          | Lawyer login                      |
| GET    | `/auth/me`                    | Current authenticated user/lawyer |
| PUT    | `/auth/profile`               | Update profile                    |
| PUT    | `/auth/change-password`       | Change password                   |
| GET    | `/lawyer/all`                 | List approved lawyers             |
| GET    | `/lawyer/:id`                 | Lawyer details                    |
| GET    | `/lawyer/specialization/:spec`| Filter by specialization          |
| PUT    | `/lawyer/approve/:id`         | Approve lawyer (admin)            |
| PUT    | `/lawyer/reject/:id`          | Reject lawyer (admin)             |
| PUT    | `/lawyer/profile`             | Update lawyer profile             |
| POST   | `/appointment/`               | Book an appointment               |
| POST   | `/chat/`                      | Send AI chat message              |
| GET    | `/chat/history/:userId`       | Chat history                      |
| GET    | `/date/to-nepali` / `/date/to-english` | Date conversion          |
| GET    | `/health`                     | Health check                      |

---

## ☁️ Deployment (Vercel)

This repo uses a **monorepo** configuration with Vercel's `experimentalServices`. `vercel.json` splits the build into:

- `frontend` → Next.js (route prefix `/`)
- `backend` → Express endpoint `src/index.js` (route prefix `/_/backend`)

```bash
vercel deploy --prod --yes
```

The frontend calls the backend through its Vercel URL (e.g. `https://<app>.vercel.app/_/backend/api`).

---

## 🗺️ Roadmap

- [ ] Payment / consultation invoicing
- [ ] More legal-language coverage in the RAG knowledge base
- [ ] Multi-language UI (Nepali)
- [ ] Document signing for agreements
- [ ] Push notifications for appointment reminders

---

## ⚠️ Disclaimer

KanoonSathi provides general legal information for educational purposes **only** and does **not** constitute professional legal advice. Always consult a qualified lawyer for advice specific to your situation.

---

## 📄 License

This project is for demonstration purposes. See the license file (if present) for details.
