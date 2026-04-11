# Style DNA — Fix Research for LOW-Reliability Detections

**Date:** 2026-02-20
**Status:** Research complete, pending implementation + testing

---

## Fix 1: Body Shape — Silhouette-Based Classification

### Problem
Body shape is "inverted_triangle" ~95% of the time because:
- MediaPipe landmarks 23/24 are **hip JOINTS** (acetabulum), not the widest pelvis point
- Landmark 11/12 **shoulder joints** are inflated by clothing (jackets, sarees, puffed sleeves)
- Only 2 measurements (shoulder width, hip width) — no waist measurement at all

### Solution: Segmentation mask + multi-ratio scoring

**Key insight:** MediaPipe PoseLandmarker already has a built-in segmentation mask — just enable `output_segmentation_masks=True`. **Zero additional RAM, zero new models.**

#### Step 1: Enable segmentation in PoseLandmarker

```python
options = mp.tasks.vision.PoseLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=_MODEL_PATH),
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    output_segmentation_masks=True,  # <-- ADD THIS (free, built into the model)
    min_pose_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)
```

If this doesn't work in our MediaPipe version (known issue #5016), fallback: MediaPipe Selfie Segmentation (~20-30MB extra).

#### Step 2: Measure silhouette widths at 3 Y-levels

Use pose landmarks for Y-coordinates (accurate even when X-widths aren't), then measure pixel widths from the binary mask:

- **Shoulder Y**: average of landmarks 11, 12
- **Waist Y**: 45% of the way from shoulders to hip joints
- **True Hip Y**: 30% of the way from hip joints (23/24) to knees (25/26) — this is where the pelvis is actually widest

```python
def _pixel_width_at_y(mask: np.ndarray, y: int, search_range: int = 5) -> int:
    """Measure horizontal pixel width of body silhouette at a given Y coordinate."""
    h = mask.shape[0]
    y_min = max(0, y - search_range)
    y_max = min(h, y + search_range + 1)
    max_width = 0
    for row_y in range(y_min, y_max):
        row = mask[row_y, :]
        nonzero = np.where(row > 0)[0]
        if len(nonzero) >= 2:
            width = int(nonzero[-1] - nonzero[0])
            max_width = max(max_width, width)
    return max_width
```

#### Step 3: Arm overlap correction

When arms are at sides, they inflate shoulder silhouette width. Detect via wrist landmark positions:

```python
def _detect_arms_at_sides(lm, img_w, shoulder_width_px):
    l_wrist_x = lm[15].x * img_w  # left wrist
    r_wrist_x = lm[16].x * img_w  # right wrist
    l_shoulder_x = lm[11].x * img_w
    r_shoulder_x = lm[12].x * img_w
    center_x = (l_shoulder_x + r_shoulder_x) / 2
    half_w = abs(l_shoulder_x - r_shoulder_x) / 2

    l_inside = abs(l_wrist_x - center_x) < half_w * 1.3
    r_inside = abs(r_wrist_x - center_x) < half_w * 1.3

    if l_inside and r_inside: return 0.82   # Both arms → ~18% inflation
    elif l_inside or r_inside: return 0.91  # One arm → ~9% inflation
    return 1.0  # Arms away, no correction
```

#### Step 4: Multi-ratio classification (replaces simple if-else)

Uses 3 measurements + 3 derived ratios:

| Ratio | Formula | What it tells you |
|---|---|---|
| SHR | shoulder / hip | Shoulder-hip balance |
| WHR | waist / hip | Waist-hip proportion |
| Waist definition | 1 - (waist / max(shoulder, hip)) | How defined the waist is (0 = no waist, 0.25+ = defined) |

**Classification scoring:**

| Body Type | Primary Signal | Secondary Signal |
|---|---|---|
| **Hourglass** | SHR ≈ 1.0 (±5%) | waist_definition > 0.20 |
| **Pear** | hips >10% wider than shoulders | waist somewhat defined |
| **Inverted Triangle** | shoulders >10% wider than hips | waist less critical |
| **Apple** | SHR ≈ 1.0 (±10%) | WHR > 0.85 (no waist definition) |
| **Rectangle** | SHR ≈ 1.0 (±10%) | waist_definition 0.10-0.20 |

**Literature reference (FFIT, Lee et al. 2007):**

| Body Type | SHR Range | WHR Range | Waist Definition |
|---|---|---|---|
| Hourglass | 0.95 - 1.05 | 0.65 - 0.75 | > 0.20 |
| Pear | < 0.90 | 0.65 - 0.80 | moderate |
| Inverted Triangle | > 1.10 | 0.70 - 0.85 | variable |
| Apple | 0.90 - 1.10 | > 0.85 | < 0.10 |
| Rectangle | 0.90 - 1.10 | 0.75 - 0.85 | 0.10 - 0.20 |

#### Fallback: Landmarks-only with relaxed thresholds

If segmentation mask is unavailable, use landmarks with wider bands:

```python
def _classify_shape_landmarks_only(shr, waist_ratio):
    if shr > 1.20: return "inverted_triangle"  # was 1.15
    if shr < 0.80: return "pear"               # was 0.85
    if waist_ratio < 0.72: return "hourglass"
    if waist_ratio > 0.92: return "apple"
    return "rectangle"
```

### Expected Impact
- Before: 95% inverted_triangle
- After: Silhouette adds real waist measurement, true hip width. Should see hourglass, rectangle, pear emerging.
- Clothing still affects results, but silhouette captures drape patterns better than skeleton joints.

### RAM/Time Cost
- Segmentation mask from PoseLandmarker: **+0 RAM, +0 models** (already loaded)
- Selfie Segmentation fallback: **+20-30MB RAM** if needed
- Processing: **+2-5ms** (numpy mask operations)

---

## Fix 2: Undertone — Hue Angle + Sclera Correction

### Problem
Undertone is almost always "warm" because:
1. Formula `warmth = a*0.5 + b*0.5` **sums** a* and b* — this is fundamentally wrong
2. Real skin always has positive a* (6-31) and positive b* (11-25), so sum is always >>3
3. Threshold ±3 is absurdly narrow for real-world values
4. Indoor lighting shifts both a* and b* positive by +3 to +8 (warm tungsten/fluorescent)

### Root Cause: Summing conflates two independent signals

- **a* axis** = redness/pinkness → indicates COOL undertone (rosy, pink flush)
- **b* axis** = yellowness → indicates WARM undertone (golden, olive)
- **Summing them cancels out the distinction.** A cool person (a*=20, b*=8, sum=14) and a warm person (a*=8, b*=20, sum=14) get the same score.

### Solution: Hue angle + sclera white balance

#### Step 1: Sclera-based illuminant correction

The sclera (white of eye) is approximately white under canonical illumination for ALL humans regardless of ethnicity. Its deviation from neutral white reveals the scene illuminant.

We already have MediaPipe 478 landmarks with iris refinement. Eye landmark indices:
- Left eye outline: [33, 7, 163, 144, 145, 153, 154, 155, 133, ...]
- Right eye outline: [362, 382, 381, 380, 374, 373, 390, 249, 263, ...]
- Left iris: [473-477], Right iris: [468-472]

**Algorithm:**
1. Create eye mask from outline landmarks
2. Subtract iris circle from mask → sclera region
3. Exclude dark pixels (<60 brightness) — eyelashes, pupil spillover
4. Compute median sclera LAB → illuminant bias
5. Sclera a* deviation from 128 = illuminant redness bias
6. Sclera b* deviation from 128 = illuminant yellowness bias

```python
sclera_lab = cv2.cvtColor(np.uint8([[sclera_bgr]]), cv2.COLOR_BGR2LAB)[0][0]
a_shift = sclera_lab[1] - 128  # illuminant redness
b_shift = sclera_lab[2] - 128  # illuminant yellowness
```

#### Step 2: Hue angle instead of sum

**Formula:** `h = atan2(b_corrected, a_corrected)` in degrees

Interpretation for skin (first quadrant, both positive):
- **Low hue angle** (< ~50°) = more red/pink dominant = **COOL** undertone
- **High hue angle** (> ~60°) = more yellow dominant = **WARM** undertone
- **Middle range** = **NEUTRAL**

Published data from spectrophotometer studies:

| Ethnicity | Typical Hue Angle | Notes |
|---|---|---|
| African | ~53° (narrow range) | - |
| Caucasian | 45° - 69° | Wide range |
| South Asian | 50° - 69° | Tends warm |
| East Asian | 55° - 75° | Tends warm/yellow |

Full skin hue range across all ethnicities: 24.63° to 79.64° (Van Song, 2026)

#### Step 3: ITA-aware thresholds

ITA (Individual Typology Angle) = `atan2(L* - 50, b*)` measures skin depth. Darker skin has different baseline hue angles, so thresholds need to adapt:

| Skin Depth (ITA) | Cool (h <) | Neutral | Warm (h >) |
|---|---|---|---|
| Dark (ITA < 10) | < 42° | 42° - 55° | > 55° |
| Medium (10 < ITA < 30) | < 48° | 48° - 60° | > 60° |
| Light (ITA > 30) | < 52° | 52° - 65° | > 65° |

#### Why this works

1. **Hue angle separates warm from cool** — red-dominant skin (cool) has different angle than yellow-dominant skin (warm)
2. **Sclera correction removes lighting bias** — measures the actual illuminant from the same image, same face, same lighting
3. **ITA adjustment handles ethnic variation** — darker skin naturally has lower hue angles, so thresholds shift down
4. **Zero cost** — pure math on pixels we already sample, no new models

### Expected Impact
- Before: ~95% "warm"
- After: Should see proper distribution of warm/cool/neutral based on actual skin pigment, not scene lighting

### RAM/Time Cost
- **+0 RAM** (pure math, existing landmarks)
- **+1-2ms** (sclera extraction + hue angle computation)

---

## Fix 3: CLAHE Revert → Shades-of-Gray White Balance

### Problem
CLAHE normalizes LOCAL CONTRAST (histogram equalization in tiles), which pushes all skin tones toward the middle. Dark skin gets lighter, light skin gets darker.

### Solution: Replace with Shades-of-Gray (Minkowski p=6)

```python
def shades_of_gray(img_bgr, power=6):
    """Shades of Gray color constancy — estimates and removes scene illuminant."""
    img = img_bgr.astype('float32')
    img_power = np.power(img, power)
    rgb_vec = np.power(np.mean(img_power, (0, 1)), 1 / power)
    rgb_norm = np.sqrt(np.sum(np.power(rgb_vec, 2.0)))
    rgb_vec = rgb_vec / rgb_norm
    rgb_vec = 1 / (rgb_vec * np.sqrt(3))
    img = np.multiply(img, rgb_vec)
    return np.clip(img, 0, 255).astype('uint8')
```

**Important:** Apply with partial correction (70%) to avoid removing undertone signal:

```python
def partial_white_balance(img, strength=0.7, power=6):
    balanced = shades_of_gray(img, power).astype('float32')
    original = img.astype('float32')
    result = original + strength * (balanced - original)
    return np.clip(result, 0, 255).astype('uint8')
```

**Note:** If sclera-based correction (Fix 2) works well, Shades-of-Gray becomes less critical — the sclera gives a more precise per-face illuminant estimate. Shades-of-Gray is the fallback when sclera sampling fails.

### RAM/Time Cost
- **+0 RAM**
- **+1ms** (numpy operations on existing image)

---

## Implementation Priority

| Order | Fix | Confidence it will work | Difficulty |
|---|---|---|---|
| 1 | Undertone hue angle + sclera | HIGH — backed by published spectrophotometer data | Medium |
| 2 | CLAHE → Shades-of-Gray | HIGH — straightforward replacement | Easy |
| 3 | Body shape silhouette | MEDIUM — depends on MediaPipe mask quality | Medium |

### Testing Plan

1. Implement all 3 fixes
2. Run on 52 test images with `--tag "fix_v3"`
3. Compare:
   - Undertone distribution: should see warm/cool/neutral mix (not 95% warm)
   - Body shape distribution: should see variety (not 95% inverted_triangle)
   - Monk skin tone: should improve for dark-skin cases (CLAHE removed)
4. Visual verification on key problem images:
   - african_bald_selfie: Monk tone (was 5, should be 8-9)
   - couple_sofa: Monk tone (was 7, should be 2-3)
   - Any image where undertone was clearly wrong

---

## Sources

### Body Shape
- Lee et al. 2007, "Female Figure Identification Technique (FFIT)" — FFIT body classification rules
- Shapesense (JOCSES) — Body type classification using MediaPipe
- MediaPipe PoseLandmarker docs — `output_segmentation_masks` parameter
- MediaPipe Issue #5016 — Known segmentation mask issues
- Van Song 2026, "Global CIELAB Skin Color" — Anthropometric reference data
- FFIT Modification for Plus Size Bodies (2022) — Updated thresholds

### Undertone
- Finlayson & Trezzi 2004, "Shades of Gray and Colour Constancy" — Minkowski p=6
- Alyoubi et al. 2025, "Colors Matter" (arXiv:2505.14931) — Vein-based warm/cool, reference LAB values
- Van Song 2026, Wiley — Skin hue angle range 24.63°-79.64°
- Xiao et al. 2017, "Ethnic Skin Colours" — Spectrophotometer data, 960 subjects, 4 ethnicities
- PMC 2024, "Facial Skin Shade Guide" — Indian adult LAB values
- ResearchGate 2008, "Sclera-Based Illuminant Estimation" — Sclera as white reference
- Sony AI 2024, "Beyond Skin Tone" — ITA limitations, multidimensional skin color
- JAMA Dermatology — ITA classification ranges
- MDPI 2024, "Skin Tone Estimation under Diverse Lighting" — Grey-World reduced accuracy warning
