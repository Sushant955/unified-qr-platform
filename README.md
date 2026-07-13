# Unified QR Platform — Enterprise Digital Identity & Smart QR Management System

Backend API for a SaaS-style QR code platform supporting **static** and **dynamic** QR codes, user authentication, QR customization, and scan analytics.

> NxtGenSec Development Internship 2026 — Capstone Project
> Assigned Role: Backend Engineer

## Tech Stack

- **Runtime:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + bcrypt
- **QR Generation:** `qrcode` npm package
- **Short IDs:** `nanoid`

## Architecture
Client (frontend)
|
v
Express API  ──────────────► MongoDB (Users, QRCodes)
|
├─ /api/auth      (register, login, get current user)
├─ /api/user       (profile management)
├─ /api/qr         (create/list/update/delete QR codes)
└─ /r/:shortId      (PUBLIC — scanned by phone cameras,
logs the scan, then redirects to the
real destination URL)
### Static vs Dynamic QR

- **Static QR:** the destination URL is baked directly into the QR image. Fast, but the destination can never change without reprinting the code.
- **Dynamic QR:** the QR image encodes a short URL (`BASE_URL/r/:shortId`) hosted by this API. Scanning it hits the redirect route, which logs the scan and 302-redirects to the current `destination` stored in the database — so the owner can repoint the QR code at any time without regenerating the image. This also enables scan analytics.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your MongoDB URI and JWT secret
npm run dev             # requires nodemon, or use `npm start`
```

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Port the server runs on (default 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `BASE_URL` | Public base URL of the deployed API, used to build dynamic QR redirect links |

## API Reference

### Auth
| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login, returns JWT | No |
| GET | `/api/auth/me` | Get current user | Yes |

### User
| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/user/profile` | Get profile | Yes |
| PUT | `/api/user/profile` | Update profile (name, avatar, company) | Yes |

### QR Codes
| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/qr` | List all QR codes for logged-in user | Yes |
| POST | `/api/qr/static` | Create a static QR code | Yes |
| POST | `/api/qr/dynamic` | Create a dynamic QR code | Yes |
| GET | `/api/qr/:id` | Get a single QR code | Yes |
| PUT | `/api/qr/:id` | Update title / destination / customization | Yes |
| DELETE | `/api/qr/:id` | Delete a QR code | Yes |
| GET | `/api/qr/:id/stats` | Get scan analytics for a QR code | Yes |

### Public Redirect
| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/r/:shortId` | Scanned by a phone camera; logs the scan and redirects | No |

## Project Status

### ✅ Completed
- User registration/login with JWT + bcrypt
- Static QR generation
- Dynamic QR generation with short-link redirect
- QR CRUD operations
- QR customization (foreground/background color)
- Scan logging (IP, device, browser, OS, referrer, timestamp)
- Scan analytics endpoint

### 🚧 Pending / Future Improvements
- Frontend dashboard UI
- Logo embedding inside QR codes (currently field exists in schema, generation logic not yet wired)
- Bulk QR generation
- Rate limiting on the public redirect route
- Email verification / password reset flow
- Admin panel for platform-wide analytics
- QR shape customization (rounded/dots — currently schema-only)
- Deployment to Render/Railway + MongoDB Atlas

## Author

Sushanth Kalla — Backend Engineer, NxtGenSec Development Internship 2026
