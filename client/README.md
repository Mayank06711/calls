# KYS Client

React single-page application built with Vite, Redux Toolkit, Material UI, and Tailwind CSS.

## Directory Structure

```
client/src/
├── Components/
│   ├── Animation/       # Loading and transition animations
│   ├── Common/          # Shared UI components
│   ├── Feedback/        # Feedback forms and display
│   ├── Home/
│   │   ├── Hearders/    # Top navigation, user profile, notifications, settings
│   │   ├── Sidebar/     # Chats, reels, subscriptions, settings navigation
│   │   └── VideoCall/   # Video call UI, incoming call, error modal, expert permissions
│   ├── Legal/           # Terms and conditions, privacy policy pages
│   ├── Login/           # OTP login, user info form
│   ├── Notification/    # Toast notifications
│   ├── QRGenerator/     # QR code generation
│   ├── SignUp/          # User registration
│   └── User/            # User-related components
├── assets/              # Images, icons, static files
├── config/              # API configuration and environment setup
├── constants/           # Color palettes, style options, app constants
├── helper/              # Utility helpers
├── hooks/               # Custom React hooks (useVideoCall, useNotifications, etc.)
├── redux/               # Redux store, actions, reducers, thunks
├── socket/              # Socket.io client (config, context, call service, chat service)
├── utils/               # Utility functions (subscription colors, helpers)
├── webRTCUtils/         # WebRTC peer connection and media handling
├── Wrapper/             # Layout wrapper components
├── App.jsx              # Root component with routing
├── main.jsx             # React entry point
└── index.css            # Global styles (Tailwind)
```

## Key Features

- **Video Calling** -- WebRTC peer-to-peer with encryption badge, tap-to-swap, time warnings
- **Expert Permission Flow** -- Request/accept/decline UI for expert-initiated calls
- **Real-Time Chat** -- Socket.io messaging with file attachments
- **Subscription Management** -- Plan selection, payment status, tier-based access
- **Settings** -- Theme, notifications, privacy, layout, accessibility, analytics, reels
- **User Profile** -- Profile management, activity history, likes, posts
- **Responsive UI** -- Material UI components with Tailwind CSS styling
- **State Management** -- Redux Toolkit with async thunks

## NPM Scripts

```bash
npm run dev       # Development server (Vite HMR)
npm run build     # Production build
npm run lint      # ESLint check
npm run preview   # Preview production build
```

## SSL Certificates (for local HTTPS)

```bash
# Generate private key
openssl genrsa -out key.pem

# Create CSR
openssl req -new -key key.pem -out csr.pem

# Generate SSL certificate (valid 20 days)
openssl x509 -req -days 20 -in csr.pem -signkey key.pem -out cert.pem
```
