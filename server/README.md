# KYS Server

Express.js API server with TypeScript, Socket.io, and multi-database support.

## Directory Structure

```
server/src/
├── AISugession/     # AI engine builders, engines, and master config
│   ├── builder_*.ts # Deterministic DB generators (top, pair, layer, footwear)
│   ├── engine*.ts   # Runtime engines (O(1) lookup from pre-built DBs)
│   ├── masterEngine.ts # Unified engine facade
│   ├── shared.ts    # Shared constants (occasions, vibes, body shapes)
│   └── allFactors.ts # Factor definitions for all engines
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
├── utils/           # Utility functions (Redis client, season resolver)
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
| `/api/v1/wardrobe` | Wardrobe management, AI outfit suggestions, pairings |
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

## Wardrobe & AI Suggestion System

### Architecture

The wardrobe suggestion system uses a 4-stage deterministic AI engine pipeline. Each engine reads a pre-built JSON lookup table (generated via `npm run build:engines`) for O(1) lookups by composite key.

```
User Profile + Occasion + Season
        |
        v
  [ConsultantEngine]  -->  Top item + color
        |
        v
  [FashionEngine]     -->  Bottom item + color + pattern
        |
        v
  [LayeringEngine]    -->  3 layer options (type, item, color)
        |
        v
  [FootwearEngine]    -->  3 footwear options (type, item, color)
```

**Engine key factors:**
- ConsultantEngine (10 factors): Gender, Occasion, Vibe, AgeGroup, FitPref, Undertone, SkinTone, Season, BodyShape, Height
- FashionEngine (9 factors): Gender, Category, Type, Color, Pattern, Season, BodyShape, SkinTone, Height
- LayeringEngine (8 factors): Gender, Occasion, Season, Vibe, TopCategory, AgeGroup, BodyShape, Height
- FootwearEngine (8 factors): Gender, Occasion, Season, Vibe, TopCategory, BottomCategory, Height, AgeGroup

### Engine Database Files

Generated via `npm run build:engines` (deterministic, not committed to git):

| File | Rules | Size |
|------|-------|------|
| `consultant_master_db.json` | 1,797,120 | ~150MB |
| `fashion_master_db.json` | 2,328,480 | ~800MB |
| `layering_master_db.json` | 149,760 | ~30MB |
| `footwear_master_db.json` | 93,600 | ~20MB |

### API Flows

All suggestion endpoints require authentication and a configured style profile.

#### Flow 1: Top -> Bottom (`POST /wardrobe/suggest/from-item`)

Given a Top item from the user's wardrobe, suggests matching bottoms, layers, and footwear.

```json
// Request
{ "clothingItemId": "<top_id>", "occasion": "Office: Daily Wear", "season": "Summer" }

// Response
{
  "success": true,
  "data": {
    "bottom": [{ "item": "Chinos", "color": "Navy", "vibe": "Sharp" }],
    "layers": { "options": [{ "item": "Linen Blazer", "color": "Beige" }] },
    "footwear": { "options": [{ "item": "Oxford Shoes", "color": "Brown" }] },
    "wardrobeMatches": {
      "Chinos [Slim/Regular Fit]": [{ "_id": "...", "subcategory": "Chinos", "color": "Navy", "photoUrl": "..." }]
    },
    "productRecommendations": {
      "Denim Shirt [Slim/Regular Fit]": [
        { "name": "Levi's Denim Western Shirt", "price": 2499, "brand": "Levi's", "link": "..." }
      ]
    }
  }
}
```

#### Flow 2: Bottom -> Top (`POST /wardrobe/suggest/from-item`)

Same endpoint as Flow 1 but with a Bottom item. Returns `topSuggestions` instead.

```json
// Request
{ "clothingItemId": "<bottom_id>", "occasion": "Office: Daily Wear", "season": "Summer" }

// Response
{
  "data": {
    "topSuggestions": [{ "item": "Polo T-Shirt", "color": "White" }],
    "wardrobeMatches": { "Polo T-Shirt [Slim/Regular Fit]": [...] },
    "productRecommendations": { "Denim Shirt [Slim/Regular Fit]": [...] }
  }
}
```

#### Flow 3: Full Outfit (`POST /wardrobe/suggest/full-outfit`)

Runs the full 4-engine pipeline to suggest a complete outfit.

```json
// Request
{ "occasion": "Office: Daily Wear", "season": "Summer" }

// Response
{
  "data": {
    "top": { "item": "Polo T-Shirt", "color": "White" },
    "bottom": [{ "item": "Chinos", "color": "Navy" }],
    "layers": { "options": [{ "item": "Open Checkered Shirt", "color": "Red" }] },
    "footwear": { "options": [{ "item": "High-Top Sneakers", "color": "White" }] },
    "wardrobeMatches": { ... },
    "productRecommendations": { ... }
  }
}
```

#### Flow 4: Top Only (`POST /wardrobe/suggest/top`)

Suggests top options for a given occasion/season.

```json
// Request
{ "occasion": "Office: Daily Wear", "season": "Summer" }

// Response
{
  "data": {
    "options": [
      { "label": "Primary", "vibe": "Sharp", "top": { "item": "Polo T-Shirt", "color": "White" }, "queryForBottom": { ... } }
    ],
    "wardrobeMatches": { "Polo T-Shirt": [{ "_id": "...", "subcategory": "Polo T-Shirt" }] },
    "productRecommendations": { }
  }
}
```

#### Flow 5: Layer Suggestion (`POST /wardrobe/suggest/layer`)

Suggests layering options for a given top item.

```json
// Request
{ "clothingItemId": "<top_id>", "occasion": "Office: Daily Wear", "season": "Summer" }

// Response
{
  "data": {
    "options": [
      { "type": "Standard Layer", "item": "Open Checkered Shirt", "color": "Red", "reason": "..." }
    ],
    "wardrobeMatches": { "Open Checkered Shirt": [] },
    "productRecommendations": {
      "Open Checkered Shirt": [
        { "name": "Levi's Checkered Open Shirt", "price": 1799, "brand": "Levi's", "link": "..." }
      ]
    }
  }
}
```

#### Flow 6: Footwear Suggestion (`POST /wardrobe/suggest/footwear`)

Suggests footwear based on the top + bottom combination.

```json
// Request
{ "topItemId": "<top_id>", "bottomItemId": "<bottom_id>", "occasion": "Office: Daily Wear", "season": "Summer" }

// Response
{
  "data": {
    "options": [
      { "type": "Classic Shoes", "item": "High-Top Sneakers", "color": "White", "note": "..." }
    ],
    "wardrobeMatches": { "High-Top Sneakers": [] },
    "productRecommendations": {
      "High-Top Sneakers": [
        { "name": "Nike Air Jordan 1 Mid", "price": 8995, "brand": "Nike", "link": "..." }
      ]
    }
  }
}
```

#### Flow 7: Generate Pairings (`POST /wardrobe/generate-pairings`)

Cross-matches all user's tops and bottoms to generate outfit pairings with layer/footwear suggestions.

```json
// Request
{ "occasion": "Office: Daily Wear", "season": "Summer", "page": 1, "limit": 20 }

// Response
{
  "data": {
    "pairings": [
      {
        "top": { "_id": "...", "subcategory": "Polo T-Shirt", "color": "White" },
        "bottom": { "_id": "...", "subcategory": "Chinos", "color": "Navy" },
        "layers": {
          "owned": [{ "_id": "...", "subcategory": "Blazer" }],
          "suggestions": [{ "item": "Open Checkered Shirt", "color": "Red" }]
        },
        "footwear": {
          "owned": [{ "_id": "...", "subcategory": "Oxford Shoes" }],
          "suggestions": [{ "item": "High-Top Sneakers", "color": "White" }]
        }
      }
    ],
    "unpaired": { "tops": [], "bottoms": [] },
    "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
  }
}
```

### Wardrobe Matching & Product Recommendations

Every suggestion flow includes two enrichment layers:

1. **`wardrobeMatches`** -- For each engine suggestion, fuzzy-matches against the user's wardrobe items (e.g., engine says "Chinos [Slim/Regular Fit]" -> matches user's "Chinos" item). Returns matching items with `_id`, `subcategory`, `color`, `photoUrl`.

2. **`productRecommendations`** -- For suggestions where `wardrobeMatches` is empty (user doesn't own that item), looks up `product_catalog.json` for purchasable products. Returns up to 3 products with `name`, `price`, `brand`, `image`, `link`, `platform`.

### Style Profile

Users configure their style profile via `PUT /wardrobe/style-profile`:

```json
{
  "bodyShape": "Trapezoid",
  "height": "Medium",
  "skinTone": "Wheatish",
  "undertone": "Warm",
  "ageGroup": "Young Adult (26-35)",
  "fitPreference": "Regular Fit",
  "styleVibe": "Fusion"
}
```

Available profile options can be fetched via `GET /wardrobe/profile-options`.

### Occasion Names

The engine uses specific occasion names (not shorthand):

| Occasion Key | Category |
|-------------|----------|
| Office: Daily Wear | Office |
| Casual | Casual |
| Party | Party |
| Date Night | Date |
| Wedding: Haldi (Day) | Wedding |
| Wedding: Sangeet (Night) | Wedding |
| Wedding: Main Ceremony | Wedding |
| Wedding: Reception | Wedding |
| Festive | Festive |
| Travel | Travel |
| College/Campus | Campus |

### Setup (First Run)

```bash
# 1. Install dependencies
npm install

# 2. Generate engine databases (~1GB total, takes ~30 seconds)
npm run build:engines

# 3. Start dev server (engines load lazily on first suggestion request)
npm run dev
```

## NPM Scripts

```bash
npm run dev              # Development server with hot reload
npm run build            # TypeScript compilation
npm run build:engines    # Generate all 4 AI engine databases
npm start                # Production server
npm run test:wardrobe    # Wardrobe suggestion tests
npm run test:session     # Session management tests
npm run test:integration # Integration tests
npm run test:sessionlimit # Session limit tests
npm run test:realworld   # End-to-end tests
npm run test:socket      # WebSocket tests
npm run test:chatsocket  # Chat socket tests
```
