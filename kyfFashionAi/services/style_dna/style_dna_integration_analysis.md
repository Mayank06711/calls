# Style DNA — Integration Analysis & Metadata Value Assessment

**Date:** 2026-02-20
**Status:** Pre-implementation analysis (no code changes yet)

---

## Pipeline Output → StyleProfile Mapping

### Auto-fillable Required Fields (5 of 7)

| StyleProfile Required | Style DNA Source | Mapping | Reliability |
|---|---|---|---|
| `bodyShape` | `body.shape` | `inverted_triangle`→`Inverted_Triangle`, etc. | **LOW** — 95% inverted_triangle, NEEDS FIX |
| `height` | `body.heightCategory` | `tall`→`Tall`, `average`→`Medium`, `short`→`Short` | MEDIUM |
| `skinTone` | `skin.monkTone` | Monk 1-3→`Fair`, 4-5→`Wheatish`, 6-7→`Dusky`, 8-10→`Dark Brown` | MEDIUM (after white-balance fix) |
| `undertone` | `skin.undertone` | `warm`→`Warm`, `cool`→`Cool`, `neutral`→`Neutral` | **LOW** — biased toward "warm", NEEDS FIX |
| `ageGroup` | `face.estimatedAge` | 16-25→`GenZ`, 26-35→`Young Adult`, 36-50→`Mid-Aged`, 50+→`Senior` | MEDIUM |

### NOT Auto-fillable (2 of 7 — subjective preferences)

| StyleProfile Required | Reason |
|---|---|
| `fitPreference` | Personal choice, not detectable from photo |
| `styleVibe` | Aesthetic preference, not physical attribute |

### Auto-fillable Optional Tier 1 (6 of 7)

| StyleProfile Optional | Style DNA Source | Mapping |
|---|---|---|
| `faceShape` | `face.faceShape` | Direct: oval→Oval, round→Round, square→Square, heart→Heart, oblong→Oblong |
| `hairType` | `hair.type` | Partial: straight→Straight Medium, wavy→Wavy Medium, curly→Curly Loose, kinky→Coily Soft |
| `hairColor` | `hair.color.name` | Direct: black→Black, dark_brown→Dark Brown, gray→Gray/Silver, etc. |
| `eyeShape` | `eyes.shape` | Direct: almond→Almond, round→Round, hooded→Hooded, monolid→Monolid |
| `lipShape` | `lips.fullness` | Partial: full→Full, thin→Thin, medium→Round |
| `colorPaletteSeason` | `colorSeason.season` | Direct: spring→Spring, summer→Summer, autumn→Autumn, winter→Winter |

**Not detectable:** `hairLength` (pipeline only sees top of head, can't measure length)

---

## New Metadata Beyond StyleProfile

### HIGH VALUE — directly useful for engine/recommendations

| Data | Source | Why it matters |
|---|---|---|
| `colorSeason.palette` (8 hex) | Derived | **THE key output** — exact colors that look best on this person. Engine could match wardrobe items to these. |
| `colorSeason.subSeason` | Derived | "Light Spring" vs "Clear Spring" — determines which 8 palette colors. Much more precise than just "Spring". |
| `skin.hex` | Pixel sampling | Actual skin color — virtual try-on, color swatch previews |
| `skin.referenceHex` | Monk scale | Standardized reference for this skin tone |
| `eyes.color` (name + hex) | Iris sampling | Complementary color theory — suggest colors that make eyes pop |
| `hair.color.hex` | Pixel sampling | Outfit-to-hair color coordination |
| `face.gender` | InsightFace | Auto-detect gender instead of asking |
| `face.estimatedAge` (numeric) | InsightFace | More precise than 4 age groups |

### MEDIUM VALUE — useful for UI/UX, future features

| Data | Source | Why it matters |
|---|---|---|
| `confidence` scores | Per-analyzer | Show user "85% confident" — lets them correct manually |
| `warnings` | Pipeline gates | Drive UI: NO_FACE → re-upload, MULTIPLE_PEOPLE → crop |
| `body.shoulderHipRatio` | MediaPipe | More precise than enum — could refine fit recs |
| `body.torsoLegRatio` | MediaPipe | High-waist vs low-rise recommendations |
| `hair.baldnessLevel` | Hair analyzer | Hat/cap/headwear suggestions |

### LOW VALUE — diagnostic only, don't store in production

| Data | Source |
|---|---|
| `_meta.timingsMs` | Dev-only |
| `_meta.imageSize` | Diagnostic |
| `_meta.personDetection.otherObjects` | Irrelevant |

---

## Recommended Storage Architecture

### New Model: `StyleDNA` — raw AI analysis

```
StyleDNA
├── user: ObjectId (unique, 1:1 with User)
├── sourcePhotoUrl: string
├── analyzedAt: Date
├── processingTimeMs: number
├── body: { shape, shoulderHipRatio, torsoLegRatio, heightCategory }
├── face: { estimatedAge, gender, faceShape, eyeShape, noseProportion, lipFullness }
├── skin: { monkTone, undertone, hex, referenceHex }
├── eyes: { shape, color: { name, hex } }
├── hair: { type, color: { name, hex }, baldnessLevel }
├── colorSeason: { season, subSeason, palette: [8 hex] }
├── confidence: { body, face, face_geo, skin, hair }
├── warnings: [string]
└── status: 'processing' | 'complete' | 'failed' | 'needs_review'
```

### Existing Model: `StyleProfile` — user's confirmed preferences

- 7 required fields auto-suggested from StyleDNA, user confirms
- Optional Tier 1 auto-filled from StyleDNA
- Add `autoFilledFrom: 'style_dna' | 'manual' | 'onboarding'` flag

**Why two models:**
1. StyleProfile = user's CONFIRMED preferences (engine uses this)
2. StyleDNA = raw AI output (user might disagree, override)
3. Clean separation: AI detection vs user preference

---

## Integration Flow

```
User uploads profile photo
  → Frontend → Node.js: POST /api/v1/wardrobe/analyze-style-dna { photoUrl }
  → Node.js → Python: POST /api/v1/analyze-style-dna { imageUrl, userId }
  → Python: download thumbnail → run pipeline → return JSON
  → Node.js: save to StyleDNA model, map to StyleProfile suggestions
  → Socket: notification:new { type: "wardrobe", actionType: "style_dna_complete" }
  → Frontend: show notification → navigate to "My Style" → review & confirm
```

## Warning → UI Message Mapping

| Warning | User Message |
|---|---|
| `NO_PERSON_DETECTED` | "This doesn't look like a photo of a person. Please upload a selfie or full-body photo." |
| `NO_FACE` | "We can see you but can't detect your face clearly. Please upload a front-facing photo with good lighting." |
| `ILLUSTRATION_DETECTED` | "This looks like an illustration. Please upload an actual photo." |
| `MULTIPLE_PEOPLE` | "We detected multiple people. Please upload a solo photo." |
| `LOW_FACE_CONFIDENCE` | "The lighting or angle made detection harder. Results may be less accurate." |
| `FACE_OBSCURED` | "Your face appears partially obscured. For better results, use a clear front-facing photo." |

---

## Known Issues Blocking Integration

### MUST FIX before integration:

1. **bodyShape always "inverted_triangle"** (LOW reliability)
   - Root cause: MediaPipe shoulder landmarks always appear wider than hips due to clothing/pose
   - Status: NEEDS RESEARCH — see fix_research.md

2. **undertone always "warm"** (LOW reliability)
   - Root cause: `_classify_undertone()` threshold too narrow, LAB a*/b* always positive
   - Status: NEEDS RESEARCH — see fix_research.md

3. **CLAHE skin tone — revert needed**
   - CLAHE pushes all tones toward middle (hurts dark skin)
   - Replace with Shades-of-Gray white balance algorithm

### ACCEPTABLE for v1 (user can override):

- Hair type ~30% error rate (user corrects in review)
- Age estimation ±10-20 years (user corrects in review)
- Baldness detection unreliable (user corrects in review)
- Body shape ~95% same (user corrects — but fixing is better)
