# Style DNA Pipeline — Test Results & Issues

**Date:** 2026-02-20
**Images tested:** 52
**Pipeline version:** Gated pipeline v1 (PersonDetector + Option A validation)

---

## Performance Summary

| Metric | Value |
|---|---|
| Total time (52 imgs) | 24.8s |
| Avg time/image | 0.48s |
| Cold start (1st image) | ~6.9s |
| Non-person early exit | 0.06–0.23s |
| Baseline RAM | 36 MB |
| Peak RAM | 367 MB |
| Net RAM growth | +331 MB |
| Model disk (person_detector) | 4.4 MB |

---

## Gate Accuracy

| Gate | What it does | Correct | Wrong | Accuracy |
|---|---|---|---|---|
| GATE 0: Person? | EfficientDet-Lite0 person detection | 8/8 rejected | 0 | 100% |
| GATE 2: Face? | InsightFace face detection + conf ≥ 0.76 | 6 correct rejects | 3 false negatives | ~85% |
| Full pipeline | All 6 stages ran | 29 complete | — | — |
| colorSeason | Derived from skin+hair+eyes | 29/29 | — | 100% |

---

## Issue 1: Monk Skin Tone — Off by 3-5 levels (~30% error rate)

**Severity:** HIGH — This is the biggest quality problem

| Image | Pipeline Monk | Actual (visual) | Error |
|---|---|---|---|
| african_bald_selfie | Monk5 | Monk8-9 | -4 levels (too light) |
| couple_sofa | Monk7 | Monk2-3 | +4 levels (too dark) |
| shirt_with_person | Monk6 | Monk3-4 | +3 levels (too dark) |
| selfie_green_cardigan | Monk6 | Monk2-3 | +4 levels (too dark) |
| half_body_indian_woman | Monk2 | Monk4-5 | -3 levels (too light) |
| man_with_monkeys | Monk10 | Monk6-7 | +3 levels (too dark) |

**Root cause:** SkinAnalyzer samples pixels near face landmarks using fixed cheek/forehead regions. Lighting conditions, shadows, and image white balance heavily affect the sampled RGB values. The LAB→Monk mapping has no lighting normalization.

**How to fix:**
- **Quick fix (~0 cost):** Add white-balance normalization before skin sampling — detect a known neutral reference (white of eyes, teeth) and adjust RGB channels accordingly
- **Better fix (~0 cost):** Sample from multiple face regions (both cheeks, forehead, chin) and take the median instead of a single region — reduces shadow bias
- **Best fix (~2MB, ~10ms):** Use a small color-constancy model (Gray-World or Shades-of-Gray algorithm) to normalize illumination before skin extraction

---

## Issue 2: Hair Type Misclassification (~30% error rate)

**Severity:** MEDIUM

| Image | Pipeline Hair Type | Actual | Error |
|---|---|---|---|
| personwithtshirtandjeans (Black man) | straight | curly/afro | Type wrong |
| girlinclothstorenotfullyvisible | curly | straight | Type wrong |
| halfbodyindianwomenwithhandfolded | wavy | straight | Type wrong |
| indian_women-insareevilgs | curly | straight | Type wrong |

**Root cause:** HairAnalyzer crops a region above the face bbox and classifies texture. When hair is tied up, covered by dupatta/scarf, or the crop region catches background instead of hair, the classification is unreliable.

**How to fix:**
- **Quick fix (~0 cost):** Increase the hair crop region size and add a hair-vs-background segmentation step (threshold the crop to only analyze dark pixels that are likely hair)
- **Better fix (~0 cost):** Use multiple sampling points around the head (above, left, right of face bbox) and vote on the texture classification
- **Advanced fix (~5MB, ~20ms):** Use a hair segmentation mask (DeepLabV3 or similar) to precisely isolate hair pixels before classifying

---

## Issue 3: Hair Color Errors (~15% error rate)

**Severity:** MEDIUM

| Image | Pipeline Color | Actual | Error |
|---|---|---|---|
| 5_women_tailoring (center) | gray, baldness=3 | jet black, full hair | Color + baldness wrong |
| senior_woman | brown, baldness=2 | gray/white | Color wrong |
| african_bald_woman | brown | blonde buzzcut | Color wrong |

**Root cause:** Same as hair type — the crop region may be sampling wrong area. Also the color classifier uses dominant hue which fails for gray/white hair (low saturation confuses the classifier).

**How to fix:**
- **Quick fix (~0 cost):** Add a "gray detection" path — if sampled hair pixels have low saturation (< 30 in HSV) and high lightness (> 150 in LAB), classify as gray/white regardless of hue
- **Better fix (~0 cost):** Cross-reference age estimate — if age > 55 and hair saturation is low, strongly bias toward gray classification

---

## Issue 4: Baldness Level Unreliable

**Severity:** MEDIUM

| Image | Pipeline Baldness | Actual | Error |
|---|---|---|---|
| caucasian_man_beach | 4 (bald) | 0 (full hair) | Completely wrong |
| tshirt_man | 3 | 0 (full curly hair) | Wrong |
| african_bald_woman | 2 | 4-5 (buzzcut/bald) | Reversed |

**Root cause:** Baldness is estimated by checking how much of the region above the face bbox contains hair-colored pixels. If the background above is dark (beach sky, dark wall) it reads as "hair absent" = bald. If the head has a very short buzzcut that blends with dark skin, it reads as "hair present" = not bald.

**How to fix:**
- **Quick fix (~0 cost):** Use the hair segmentation mask overlap ratio instead of raw pixel color. Compare face bbox area to detected hair pixel area for a proper ratio.
- **Better fix (~0 cost):** Add a "scalp visibility" check — look at skin-colored pixels above forehead. If lots of skin-colored pixels above the forehead line → bald.

---

## Issue 5: Age Estimation — Can be off by 20+ years

**Severity:** MEDIUM

| Image | Pipeline Age | Actual (visual) | Error |
|---|---|---|---|
| street_children | 36 | ~10 (children) | +26 years |
| senior_woman | 47 | ~65-70 | -20 years |
| papuan_warrior (B&W) | 70 | ~45 | +25 years |
| two_women_flower_selfie | 39 | ~26 | +13 years |

**Root cause:** InsightFace genderage model is trained mainly on Western faces and struggles with:
- Children (especially South Asian)
- Elderly Indian faces with heavy wrinkles
- Black & white / antique photos
- Heavily made-up faces (cosmetics make people look older to the model)

**How to fix:**
- **No easy fix** — Age estimation is a known hard problem in CV
- **Mitigation (~0 cost):** Return age as a range (±5 years) instead of a single number. Flag "LOW_AGE_CONFIDENCE" when the face has extreme features (very wrinkled, very young proportions, heavy makeup)
- **Better fix (~15MB, ~30ms):** Replace with MiVOLO or FairFace age model which handles diverse ethnicities better

---

## Issue 6: Body Shape Always "inverted_triangle" (~95% same)

**Severity:** LOW-MEDIUM

| Body Shape | Count |
|---|---|
| inverted_triangle | ~28 |
| apple | 1 |
| null | ~23 |

**Root cause:** MediaPipe Pose landmarks detect shoulder and hip keypoints but the ratio calculation is biased. Sarees, dupatta, loose clothing hide the actual hip width, making shoulders always appear wider. The SHR thresholds for different body types may need recalibration.

**How to fix:**
- **Quick fix (~0 cost):** Recalibrate the body shape classification thresholds. Current SHR ranges may be too narrow. Add more shape categories: hourglass (SHR ~1.0 + narrow waist), pear (SHR < 0.85), rectangle (SHR ~1.0 + wide waist)
- **Better fix (~0 cost):** Use torso-to-hip ratio AND waist detection (MediaPipe provides waist landmarks) for more accurate classification

---

## Issue 7: False Negatives — 3 Real Faces Rejected

**Severity:** LOW-MEDIUM (pipeline is conservative, which is safer)

| Image | Face Conf | Threshold | What I See |
|---|---|---|---|
| tribal_old_woman (very wrinkled) | 0.58 | 0.76 | Real face, extreme wrinkles fooled detector |
| film_thumbnail_kangana | 0.73 | 0.76 | Clear face, but tilted + only upper half of body |
| girl_pink_top_cargo | 0.68 | 0.76 | Face visible but hand gesture near chin |

**Root cause:** MIN_FACE_CONF = 0.76 is conservative to prevent false positives (monkey was 0.75). Lowering it would let the monkey through again.

**How to fix:**
- **Quick fix (~0 cost):** Lower threshold to 0.70 BUT only if PersonDetector confirmed hasPerson=true with score > 0.8. This way: monkey (hasPerson=false) stays rejected, but real faces with lower confidence still pass since we already know it's a human.
- This is a **two-gate strategy**: PersonDetector handles "is it human?" while face confidence only handles "is this face region reliable?"

---

## Issue 8: B&W Clipart Classified as Real Person

**Severity:** LOW (rare edge case, but misleading output)

| Image | Pipeline Result |
|---|---|
| indian-women-saree-clipart-bw.webp | female, 23, round, Monk1, neutral, wavy, black, inverted_triangle |

The pipeline treated a black & white illustration as a real person. PersonDetector found "person" (score 0.80) because COCO-trained models detect drawn people too. Face detection succeeded because the illustration has a well-defined face shape. Skin = Monk1 neutral (the white paper).

**How to fix:**
- **Quick fix (~0 cost):** Add a "natural image" check — real photos have continuous color gradients and noise. Illustrations have flat color regions and sharp edges. Measure local color variance in the face region: if variance is extremely low (< threshold), flag as `ILLUSTRATION_DETECTED`
- **Implementation:** After face is detected, compute standard deviation of pixel values in the face bbox. Real faces have stddev > 15-20 in each channel. Clipart/drawings have stddev < 10 (flat colors)
- **Cost:** ~0 extra RAM, ~1ms compute (just numpy stddev on existing face crop)

---

## Priority Fix Order

| Priority | Issue | Difficulty | Impact |
|---|---|---|---|
| 1 | Monk skin tone (lighting normalization) | Medium | HIGH — core feature accuracy |
| 2 | False negative fix (two-gate strategy) | Easy | MEDIUM — recovers 3 faces |
| 3 | Hair type (multi-region sampling) | Medium | MEDIUM — visible to user |
| 4 | Clipart detection (stddev check) | Easy | LOW — rare edge case |
| 5 | Baldness (scalp visibility) | Medium | MEDIUM |
| 6 | Hair color gray detection | Easy | LOW-MEDIUM |
| 7 | Age estimation | Hard | LOW — inherent model limitation |
| 8 | Body shape recalibration | Medium | LOW — needs more test data |
