# KYS Server

Express.js API server with TypeScript, Socket.io, and multi-database support.

## Directory Structure

```
server/src/
├── auto/            # Cron jobs and scheduled tasks
├── controllers/     # Request handlers and business logic
├── db/              # Database connection and configuration
├── helper/          # Utility helpers (auth, constants, subscriptions)
├── interface/       # TypeScript interfaces
├── middlewares/      # Express middleware (JWT, file upload, error handling, sanitization)
├── models/          # Mongoose models and schemas
├── redis/           # Redis client abstraction
├── routes/          # API route definitions
├── services/        # Business services
├── thirdparty/      # Third-party integrations (Twilio, Plivo, etc.)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions (Redis client, helpers)
├── validation/      # Zod validation schemas
├── socket.ts        # Socket.io event handlers
├── index.ts         # Server entry point
└── templates.json   # Notification templates
```

## API Routes

| Route | Description |
|-------|-------------|
| `/api/v1/auth` | Authentication (OTP generation, verification, token refresh) |
| `/api/v1/users` | User registration, login, profile management |
| `/api/v1/settings` | User settings (theme, notifications, privacy, layout, etc.) |
| `/api/v1/admins` | Admin operations (user management, notifications) |
| `/api/v1/feedback` | Bug reports, expert feedback, assignment tracking |
| `/api/v1/subscriptions` | Subscription plans, payments, history |
| `/api/v1/sessions` | Active session management, revocation |
| `/api/v1/legal` | Terms and conditions, privacy policy |
| `/system/_status/health_check` | Server health check |

## Middleware

- **Helmet** -- HTTP security headers (CSP, HSTS, XSS protection)
- **CORS** -- Configured allowed origins with credentials
- **Rate Limiting** -- Global (1000 req/10min) and auth-specific (20 req/15min)
- **MongoDB Sanitize** -- NoSQL injection prevention
- **HPP** -- HTTP parameter pollution protection
- **XSS Clean** -- Cross-site scripting input sanitization
- **JWT Verification** -- Token-based authentication (HS512)
- **Platform Detection** -- Mobile app detection via headers
- **Session Tracking** -- Activity-based session TTL management

## Real-Time Events

Socket.io handles:
- Chat messaging and typing indicators
- Video call signaling (WebRTC)
- Expert permission flow
- Call timer and time warnings
- Notification delivery

## NPM Scripts

```bash
npm run dev              # Development server with hot reload
npm run build            # TypeScript compilation
npm start                # Production server
npm run test:session     # Session management tests
npm run test:integration # Integration tests
npm run test:sessionlimit # Session limit tests
npm run test:realworld   # End-to-end tests
npm run test:socket      # WebSocket tests
npm run test:chatsocket  # Chat socket tests
```
