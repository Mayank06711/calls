# Know Your Fashion (KYF)

A fashion and styling consultation platform that connects users with expert stylists through real-time video calls, chat, and personalized recommendations.

## Features

- **Video Calling** -- WebRTC-based video consultations with expert stylists
- **Real-Time Chat** -- Instant messaging via Socket.io with file attachments
- **Expert Consultations** -- Permission-based call flow between experts and users
- **Subscription Tiers** -- Free, Silver, Gold, and Platinum plans with tiered access
- **Admin Dashboard** -- User management, notifications, and analytics
- **Session Management** -- Multi-device session tracking with Redis
- **Multi-Factor Authentication** -- OTP-based login with MFA support
- **Reels & Posts** -- Content sharing and engagement
- **Feedback System** -- Bug reports and expert feedback collection

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Express.js, TypeScript, Socket.io, Node.js |
| **Frontend** | React 18, Vite, Redux Toolkit, Material UI, Tailwind CSS |
| **Databases** | MongoDB (Mongoose), PostgreSQL (pg), Redis (ioredis) |
| **Auth** | JWT (HS512), OTP, MFA, Session management |
| **Media** | WebRTC (DTLS-SRTP), Cloudinary |
| **Services** | Twilio, Plivo, Nodemailer |

## Project Structure

```
calls/
├── server/          # Express.js API server (TypeScript)
├── client/          # React SPA (Vite + JSX)
├── LICENSE
└── README.md
```

See [server/README.md](server/README.md) and [client/README.md](client/README.md) for detailed structure.

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- PostgreSQL
- Redis

### Setup

1. Clone the repository
2. Install server dependencies:
   ```bash
   cd server && npm install
   ```
3. Install client dependencies:
   ```bash
   cd client && npm install
   ```
4. Create `.env` in `server/` with required environment variables
5. Start development servers:
   ```bash
   # Terminal 1 - Backend
   cd server && npm run dev

   # Terminal 2 - Frontend
   cd client && npm run dev
   ```

## Testing

Run from the `server/` directory:

```bash
npm run test:session       # Redis session management unit tests
npm run test:integration   # Full flow integration tests
npm run test:sessionlimit  # Session limit enforcement tests
npm run test:realworld     # End-to-end real world session tests
npm run test:socket        # WebSocket connection tests
npm run test:chatsocket    # Chat socket tests
```

## Authors

Mayank Soni, Satyam Soni, Vishal Kushuwaha
