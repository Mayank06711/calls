# Credit Implementation Plan — Subscription → Credits Migration

## Current System Overview

**What exists today (dual system):**
1. **Subscriptions** — 4 tiers (Free/Silver/Gold/Platinum) with daily pricing (₹0-₹24/day), duration-based (7-365 days), Razorpay payments
2. **Credits** — Already partially implemented: credit packs (₹99-₹899), credit balance on user model, booking deductions, credit store UI
3. **Feature gating** — `PremiumGate` component checks `subscription.type` against tier levels (Free=0, Silver=1, Gold=2, Platinum=3)
4. **Subscription grants credits** — On subscription activation: Free=90, Silver=600, Gold=1500, Platinum=5000 credits granted

**The problem:** Two parallel payment systems create confusion. The policy has shifted to credits-only, but the subscription infrastructure remains the primary gateway.

---

## Migration Plan: Subscription → Credits-Only

### Phase 1: Redefine Tiers as Credit-Based (No Duration)

**Concept:** Keep the 4 tiers but they become **credit bundles** instead of time-based subscriptions. Users buy credits, credits unlock tier status.

| Tier | Credits Granted | Price (INR) | Tier Status Duration |
|------|----------------|-------------|---------------------|
| Free | 90 (signup) | ₹0 | Permanent until upgrade |
| Silver | 600 | ₹249 | Until credits deplete below threshold OR 30 days |
| Gold | 1500 | ₹499 | Until credits deplete below threshold OR 30 days |
| Platinum | 5000 | ₹899 | Until credits deplete below threshold OR 30 days |

**Key change:** Tiers are now just "credit packs with perks" — buying a Gold pack gives you 1500 credits AND Gold-tier access for 30 days (or until you run out, whichever is first). Users can also buy standalone credit packs (existing system) without changing tier.

---

### Phase 2: Server Changes — COMPLETED ✅

#### 2A. Merge `SUBSCRIPTION_CONFIG` tiers with credit packs ✅

**File:** `server/src/helper/constants.ts`

- ✅ Replaced `dailyPricing` with flat `price` per tier
- ✅ Added `creditsGranted` field per tier
- ✅ Added `tierDurationDays: 30`
- ✅ Removed `MINIMUM_DAYS`, `MAXIMUM_DAYS`, `MINIMUM_AMOUNT`, `MAXIMUM_REFERRAL_DISCOUNT`
- ✅ Added `TIER_DURATION_DAYS: 30`, `MAXIMUM_REFERRAL_BONUS_CREDITS: 100`
- ✅ Simplified POLICIES section

#### 2B. Simplify `subscriptionModel.ts` ✅

**File:** `server/src/models/subscriptionModel.ts` + `server/src/interface/ISubscription.ts`

- ✅ Added `creditsGranted: { type: Number, default: 0 }`
- ✅ Removed `durationInDays`
- ✅ Replaced `referralDiscount`/`extraValidityDays` with `referralBonusCredits`
- ✅ Removed TTL index on `endDate`
- ✅ Updated competing `ISubscription` in `types/interfaceModel.ts`

#### 2C. Simplify `subscriptionController.ts` ✅

**File:** `server/src/controllers/subscriptionController.ts`

- ✅ Complete rewrite (~1464 → ~870 lines)
- ✅ Removed `calculatePriceForDuration`, `calculateProRatedAmount`, `calculateUpgradeDetails`
- ✅ `getSubscriptionPrice` → returns flat `config.price`
- ✅ `_createSubscription` → no `numberOfDays`, flat `tierConfig.price`, fixed endDate
- ✅ Referral → bonus credits instead of percentage discount
- ✅ `_getSubscriptionPlans` → returns `price, creditsGranted, tierDurationDays`
- ✅ `_updatePaymentStatus` → grants credits + sets `tierExpiresAt`

#### 2D. Merge credit flow ✅

**File:** `server/src/controllers/creditController.ts`

- ✅ Renamed credit packs: "100 Credits", "300 Credits", "700 Credits", "1500 Credits"
- ✅ Updated `grantSubscriptionCredits` to read from `SUBSCRIPTION_CONFIG.TIERS`
- ✅ Removed hardcoded `SUBSCRIPTION_CREDIT_GRANTS` map

#### 2E. Update payment/webhook ✅

**Files:** `server/src/controllers/paymentController.ts`, `server/src/services/payment/webhook.handler.ts`

- ✅ `durationInDays` references → `creditsGranted`
- ✅ Webhook `activateSubscription` → sets `tierExpiresAt` on user model

#### 2F. Update `userModel.ts` ✅

**Files:** `server/src/models/userModel.ts`, `server/src/interface/IUser.ts`

- ✅ Added `tierExpiresAt: Date` field

#### 2G. Update validation ✅

**File:** `server/src/validation/zodSchema.ts`

- ✅ `AdminSubscriptionExtendSchema`: `days` → `bonusCredits`

#### 2H. TypeScript compile check ✅

- ✅ `npx tsc --noEmit` passes clean (0 errors)

---

### Phase 3: Client Changes — COMPLETED ✅

#### 3A. Subscriptions page ✅

**File:** `client/src/Components/Home/Sidebar/Subscriptions/Subscriptions.jsx`

- ✅ Flat pricing: ₹249/₹499/₹899 instead of ₹X/day
- ✅ Credits displayed prominently on each card ("1,500 credits included")
- ✅ Feature comparison table fixed column order (Free, Silver, Gold, Platinum)
- ✅ Navigation passes `{ price, creditsGranted, tierDurationDays }` instead of `pricing` arrays
- ✅ AI context updated with new pricing
- ✅ Trust strip: "Instant credit delivery · 30 days of premium features"

#### 3B. Unified plan detail page ✅

**File:** `client/src/Components/Home/Sidebar/Subscriptions/SubscriptionType/CreditPlanDetail.jsx` (NEW)

- ✅ Replaces 3 separate pages (GoldSubscription.jsx, SilverSubscription.jsx, PlatinumSubscription.jsx)
- ✅ No duration picker / custom day calculator
- ✅ Shows: flat price, credits granted, tier duration, features/limits/support
- ✅ Integrates Payment component directly
- ✅ Dynamic plan icon/color based on tier type
- ✅ Back button to /subscriptions

#### 3C. Simplified Payment component ✅

**File:** `client/src/Components/Home/Sidebar/Subscriptions/Payment/Payment.jsx`

- ✅ Removed date picker step (no start date needed)
- ✅ Removed `numberOfDays` prop and all duration logic
- ✅ Removed `react-date-range` import
- ✅ Steps: Email verification (if needed) → Referral → Payment → Confirmation
- ✅ Payment summary shows: flat price, credits, tier duration
- ✅ Confirmation shows: credits added, premium-until date
- ✅ Sends `{ type, referralCode }` to create subscription (no numberOfDays)

#### 3D-3G. Supporting components — No changes needed ✅

- **CreditStore.jsx** — Already works with dynamic pack data from server
- **PremiumGate.jsx** — Tier level check (0-3) unchanged, works as-is
- **AccountSettings.jsx** — No subscription-related UI to change
- **Sidebar.jsx** — Navigation links unchanged

#### 3H. Routing ✅

**File:** `client/src/App.jsx`

- ✅ Replaced 3 lazy imports (GoldSubscription, SilverSubscription, PlatinumSubscription) with single `CreditPlanDetail`
- ✅ Replaced 3 routes (`/gold`, `/silver`, `/platinum`) with single `/:planType` route

#### 3I. Redux ✅

**File:** `client/src/redux/thunks/subscription.thunks.js`

- ✅ Fixed type validation: `["Gold", "Silver", "Platinum"]` (correct casing)
- ✅ Fixed endpoint: `ENDPOINTS.SUBCRIPTIONS.CREATE_SUBSCRIPTION`
- ✅ No `numberOfDays` in request body

---

### Phase 4: Admin Changes — DEFERRED

Admin panel changes (SubscriptionList, SubscriptionDetail, admin controller) are not blocking. The existing admin views will still work — they'll just show `creditsGranted` instead of `durationInDays` in the data. These can be updated in a separate pass.

---

### Phase 5: Data Migration — NOT NEEDED

The server changes are backward-compatible:
- Existing active subscriptions continue to work (status/endDate unchanged)
- New purchases use the credits-based flow automatically
- `tierExpiresAt` on user model is set on new payments; existing users don't have it (falls back to checking subscription endDate)

---

## Summary of Changes Made

| File | Action | Status |
|------|--------|--------|
| `server/src/helper/constants.ts` | Flat price + credits per tier | ✅ |
| `server/src/controllers/subscriptionController.ts` | Major rewrite, remove duration logic | ✅ |
| `server/src/models/subscriptionModel.ts` | Add creditsGranted, remove durationInDays | ✅ |
| `server/src/interface/ISubscription.ts` | Add creditsGranted, referralBonusCredits | ✅ |
| `server/src/types/interfaceModel.ts` | Fix competing interfaces | ✅ |
| `server/src/interface/ISubscriptionHistroy.ts` | creditsGranted instead of durationInDays | ✅ |
| `server/src/controllers/creditController.ts` | Align packs + dynamic tier config | ✅ |
| `server/src/controllers/paymentController.ts` | creditsGranted references | ✅ |
| `server/src/services/payment/webhook.handler.ts` | Add tierExpiresAt update | ✅ |
| `server/src/models/userModel.ts` | Add tierExpiresAt | ✅ |
| `server/src/interface/IUser.ts` | Add tierExpiresAt | ✅ |
| `server/src/validation/zodSchema.ts` | bonusCredits instead of days | ✅ |
| `client/src/Components/.../Subscriptions.jsx` | Flat pricing, credits focus | ✅ |
| `client/src/Components/.../CreditPlanDetail.jsx` | NEW unified plan detail | ✅ |
| `client/src/Components/.../Payment.jsx` | Remove date picker, simplify | ✅ |
| `client/src/App.jsx` | Single :planType route | ✅ |
| `client/src/redux/thunks/subscription.thunks.js` | Fix casing + endpoint | ✅ |

**Untouched (no changes needed):** PremiumGate, CreditStore, AccountSettings, Sidebar, getSubscriptionColors, sessionLimits, wardrobe feature gating, booking/credit deduction flow, Razorpay core, webhook handler core.
