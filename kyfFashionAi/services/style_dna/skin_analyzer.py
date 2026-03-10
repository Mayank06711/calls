"""Stage 4a: Skin tone + undertone via pixel sampling (zero model weight).

Undertone detection uses hue angle in LAB space with sclera-based
illuminant correction — separates scene lighting from actual skin warmth.
"""

import math
import logging
import cv2
import numpy as np
from .interfaces import IAnalyzer, AnalysisContext

logger = logging.getLogger("style_dna")

# ITA (Individual Typology Angle) to Monk Skin Tone Scale mapping
# From "Beyond Fitzpatrick" (npj Digital Medicine, 2025)
# ITA = atan2(L* - 50, b*) — uses both lightness AND yellow-blue axis
_MONK_ITA_BOUNDARIES = [
    (81.62, 100.01, 1),
    (75.99, 81.62, 2),
    (68.24, 75.99, 3),
    (57.53, 68.24, 4),
    (30.61, 57.53, 5),
    (-4.63, 30.61, 6),
    (-37.77, -4.63, 7),
    (-66.87, -37.77, 8),
    (-81.33, -66.87, 9),
    (-100.01, -81.33, 10),
]

# Monk scale reference hex values for output
_MONK_HEX = {
    1: "#f6ede4", 2: "#f3e7db", 3: "#f7ead0", 4: "#eadaba",
    5: "#d7bd96", 6: "#a07c5b", 7: "#825c43", 8: "#604134",
    9: "#3a312a", 10: "#292420",
}

# MediaPipe face mesh regions for skin sampling (landmark indices)
_FOREHEAD_LANDMARKS = [10, 67, 69, 104, 108, 109, 151, 297, 299, 333, 337, 338]
_LEFT_CHEEK_LANDMARKS = [116, 117, 118, 119, 120, 121, 122, 123]
_RIGHT_CHEEK_LANDMARKS = [345, 346, 347, 348, 349, 350, 351, 352]
_CHIN_LANDMARKS = [152, 175, 199, 200, 17, 18, 421, 396]

# Iris region for eye color (if refine_landmarks=True gives 478 landmarks)
_R_IRIS = [468, 469, 470, 471, 472]
_L_IRIS = [473, 474, 475, 476, 477]

# Eye outline landmarks for sclera extraction
_LEFT_EYE_OUTLINE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
_RIGHT_EYE_OUTLINE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]


def _sample_region(image_bgr: np.ndarray, landmarks, lm_list, h, w, pad=2) -> np.ndarray:
    """Sample pixels around specific face landmarks."""
    pixels = []
    num_landmarks = len(landmarks)
    for idx in lm_list:
        if idx >= num_landmarks:
            continue
        try:
            lm = landmarks[idx]
            cx, cy = int(lm.x * w), int(lm.y * h)
            # Sample a small patch around each landmark
            y1, y2 = max(0, cy - pad), min(h, cy + pad + 1)
            x1, x2 = max(0, cx - pad), min(w, cx + pad + 1)
            patch = image_bgr[y1:y2, x1:x2]
            if patch.size > 0:
                pixels.append(patch.reshape(-1, 3))
        except (IndexError, AttributeError):
            continue
    if not pixels:
        return np.array([])
    return np.concatenate(pixels, axis=0)


def _shades_of_gray(img_bgr: np.ndarray, power: int = 6) -> np.ndarray:
    """Shades-of-Gray white balance (Finlayson & Trezzi, 2004).

    Estimates scene illuminant using Minkowski norm p=6 and corrects it.
    More accurate than Gray-World (p=1) for indoor scenes.
    """
    img = img_bgr.astype("float32")
    img_power = np.power(img + 1e-6, power)
    rgb_vec = np.power(np.mean(img_power, (0, 1)), 1.0 / power)
    rgb_norm = np.sqrt(np.sum(np.power(rgb_vec, 2.0)))
    if rgb_norm < 1e-6:
        return img_bgr
    rgb_vec = rgb_vec / rgb_norm
    rgb_vec = 1.0 / (rgb_vec * np.sqrt(3))
    img = np.multiply(img, rgb_vec)
    return np.clip(img, 0, 255).astype("uint8")


def _partial_white_balance(img_bgr: np.ndarray, strength: float = 0.7) -> np.ndarray:
    """Apply Shades-of-Gray with partial correction to preserve undertone signal."""
    balanced = _shades_of_gray(img_bgr).astype("float32")
    original = img_bgr.astype("float32")
    result = original + strength * (balanced - original)
    return np.clip(result, 0, 255).astype("uint8")


def _extract_sclera_illuminant(image_bgr: np.ndarray, landmarks, h: int, w: int):
    """Extract illuminant bias from sclera (eye whites).

    The sclera is approximately white under canonical illumination for all
    humans regardless of ethnicity. Its LAB deviation from neutral reveals
    the scene illuminant color cast.

    Returns: (a_shift, b_shift, sclera_L) or None if extraction fails.
        a_shift, b_shift: OpenCV LAB centered values for undertone correction
        sclera_L: OpenCV LAB L value (0-255) for exposure correction
    """
    num_lm = len(landmarks)
    if num_lm < 478:
        return None  # Need iris landmarks for sclera extraction

    sclera_pixels = []

    for eye_outline, iris_indices in [(_LEFT_EYE_OUTLINE, _L_IRIS), (_RIGHT_EYE_OUTLINE, _R_IRIS)]:
        # Get eye outline polygon
        eye_pts = []
        for idx in eye_outline:
            if idx >= num_lm:
                continue
            eye_pts.append((int(landmarks[idx].x * w), int(landmarks[idx].y * h)))
        if len(eye_pts) < 6:
            continue

        eye_pts = np.array(eye_pts, dtype=np.int32)

        # Create eye region mask
        eye_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.fillPoly(eye_mask, [eye_pts], 255)

        # Create iris circle mask to exclude
        iris_pts = []
        for idx in iris_indices:
            if idx >= num_lm:
                continue
            iris_pts.append((int(landmarks[idx].x * w), int(landmarks[idx].y * h)))
        if len(iris_pts) < 2:
            continue

        iris_pts = np.array(iris_pts, dtype=np.int32)
        iris_center = iris_pts[0]
        if len(iris_pts) > 1:
            iris_radius = int(np.mean(np.linalg.norm(iris_pts[1:].astype(float) - iris_center.astype(float), axis=1)))
        else:
            iris_radius = 5
        iris_radius = max(iris_radius, 3)

        iris_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(iris_mask, tuple(iris_center), iris_radius, 255, -1)

        # Sclera = eye region minus iris
        sclera_mask = cv2.bitwise_and(eye_mask, cv2.bitwise_not(iris_mask))

        # Exclude non-white pixels (eyelashes, pupil spillover, skin, iris)
        # Sclera is genuinely white — needs aggressive brightness threshold
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        bright_mask = (gray > 150).astype(np.uint8) * 255
        sclera_mask = cv2.bitwise_and(sclera_mask, bright_mask)

        pixels = image_bgr[sclera_mask > 0]
        if len(pixels) > 10:  # Need sufficient white pixels for reliable estimate
            sclera_pixels.append(pixels)

    if not sclera_pixels:
        return None

    all_px = np.vstack(sclera_pixels)
    total_sclera_px = len(all_px)
    # Median sclera color (robust to blood vessels)
    median_bgr = np.median(all_px, axis=0).astype(np.uint8)

    # Convert to LAB
    sclera_lab = cv2.cvtColor(np.uint8([[median_bgr]]), cv2.COLOR_BGR2LAB)[0][0].astype(float)

    # Sclera should be neutral: a~128, b~128 in OpenCV LAB
    a_shift = sclera_lab[1] - 128.0
    b_shift = sclera_lab[2] - 128.0
    sclera_L = sclera_lab[0]

    logger.info(f"Sclera illuminant: pixels={total_sclera_px} a_shift={a_shift:.1f}, b_shift={b_shift:.1f}, "
                f"L_ocv={sclera_L:.1f} L_std={sclera_L * 100.0 / 255.0:.1f}")
    return (a_shift, b_shift, sclera_L)


def _classify_monk_tone_ita(l_standard: float, b_standard: float) -> int:
    """Classify Monk tone using hybrid ITA + direct L* approach.

    For light-medium skin (L* >= 35): ITA = atan2(L* - 50, b*) is accurate.
    For dark skin (L* < 35): ITA loses resolution due to atan2 compression
    and b* contamination — use direct L* thresholds instead. This fixes
    Monk 8-10 underdetection (2 Monk levels wrong for dark skin).
    """
    # Dark skin: direct L* thresholds (ITA unreliable below L*=35)
    # atan2 compresses dark tones: only 7° span for L*=10-20 vs 27° for L*=50-60
    # b* variation causes ±2 Monk level noise at low L*
    if l_standard < 35:
        if l_standard < 15:
            tone = 10
        elif l_standard < 22:
            tone = 9
        elif l_standard < 28:
            tone = 8
        else:
            tone = 7
        logger.info(f"Monk (L* direct): L*={l_standard:.1f} b*={b_standard:.1f} → Monk {tone}")
        return tone

    # Light-medium skin: ITA is accurate
    if abs(b_standard) < 0.5:
        ita = 90.0 if l_standard > 50 else -90.0
    else:
        ita = math.degrees(math.atan2(l_standard - 50, b_standard))

    for lo, hi, tone in _MONK_ITA_BOUNDARIES:
        if lo <= ita < hi:
            logger.info(f"Monk (ITA): L*={l_standard:.1f} b*={b_standard:.1f} ITA={ita:.1f} → Monk {tone}")
            return tone

    logger.info(f"Monk (ITA fallback): L*={l_standard:.1f} b*={b_standard:.1f} ITA={ita:.1f} → Monk 5")
    return 5


def _robust_skin_lab(skin_lab: np.ndarray) -> np.ndarray:
    """Compute robust median LAB with trimmed percentile filtering.

    Removes top/bottom 10% of L* values to exclude specular highlights
    (flash on forehead, oily skin) and deep shadows (side lighting).
    """
    L_values = skin_lab[:, 0]
    p10 = np.percentile(L_values, 10)
    p90 = np.percentile(L_values, 90)
    mask = (L_values >= p10) & (L_values <= p90)
    filtered = skin_lab[mask]
    if len(filtered) < 10:
        return np.median(skin_lab, axis=0)
    return np.median(filtered, axis=0)


def _detect_shadow_side(l_cheek_lab: np.ndarray, r_cheek_lab: np.ndarray) -> str:
    """Detect which cheek is in shadow based on L* asymmetry.

    Under directional lighting, one cheek can be 20-30 L* units darker.
    Returns 'left_shadow', 'right_shadow', or 'balanced'.
    """
    if len(l_cheek_lab) < 5 or len(r_cheek_lab) < 5:
        return "balanced"
    l_median_L = np.median(l_cheek_lab[:, 0])
    r_median_L = np.median(r_cheek_lab[:, 0])
    # OpenCV LAB L range is 0-255; ~20 units in standard L* = ~51 in OpenCV
    diff = abs(l_median_L - r_median_L)
    if diff > 20:  # ~8 standard L* units
        return "right_shadow" if l_median_L > r_median_L else "left_shadow"
    return "balanced"


def _sclera_exposure_correction(sclera_L_ocv: float) -> float:
    """Estimate exposure bias from sclera brightness.

    Sclera is ~L*85-92 under correct exposure for all humans.
    In OpenCV LAB, that's L ≈ 217-235.
    Returns L* correction offset (standard scale, add to skin L*).
    """
    # Convert OpenCV LAB L (0-255) to standard L* (0-100)
    sclera_L_standard = sclera_L_ocv * 100.0 / 255.0

    # Validate: real sclera white should have L* > 70 standard.
    # If below that, extraction got non-sclera pixels (eyelashes, skin, iris)
    # — don't apply correction based on bad data.
    if sclera_L_standard < 70.0:
        logger.info(f"Sclera L*={sclera_L_standard:.1f} too low (< 70), skipping exposure correction")
        return 0.0

    EXPECTED_SCLERA_L = 88.0
    bias = sclera_L_standard - EXPECTED_SCLERA_L
    # Cap correction to ±8 L* units (conservative to prevent overcorrection)
    bias = max(-8.0, min(8.0, bias))
    logger.info(f"Sclera exposure: L*={sclera_L_standard:.1f}, bias={bias:.1f}")
    return bias


def _face_histogram_exposure(face_img_bgr: np.ndarray, face_bbox: tuple) -> float:
    """Fallback exposure estimate from face region brightness histogram.

    When sclera extraction fails, use the face region's median luminance.
    A well-exposed face sits around L*=55-70 (standard). If the median is
    significantly off from this range, the image is likely mis-exposed.

    Returns exposure bias in standard L* units (same sign convention as sclera).
    More conservative than sclera (±5 cap) since this is a rougher signal.
    """
    if face_bbox is None:
        return 0.0

    fx, fy, fw, fh = face_bbox
    h, w = face_img_bgr.shape[:2]
    # Crop inner 60% of face bbox to avoid hair/background
    margin_x, margin_y = int(fw * 0.2), int(fh * 0.2)
    y1 = max(0, fy + margin_y)
    y2 = min(h, fy + fh - margin_y)
    x1 = max(0, fx + margin_x)
    x2 = min(w, fx + fw - margin_x)

    face_crop = face_img_bgr[y1:y2, x1:x2]
    if face_crop.size < 100:
        return 0.0

    # Median luminance of face region
    face_lab = cv2.cvtColor(face_crop, cv2.COLOR_BGR2LAB)
    median_L_ocv = float(np.median(face_lab[:, :, 0]))
    median_L_std = median_L_ocv * 100.0 / 255.0

    # Expected face L* range: 55-70 for most skin tones under good exposure
    # (this is the face region average, not skin-only — includes some shadow)
    EXPECTED_FACE_L_MID = 62.0
    bias = median_L_std - EXPECTED_FACE_L_MID

    # Only correct if significantly off (>10 L* units from expected mid)
    if abs(bias) < 10.0:
        return 0.0

    # Conservative cap: ±5 L* (rougher signal than sclera)
    bias = max(-5.0, min(5.0, bias))
    logger.info(f"Face histogram exposure: median_L*={median_L_std:.1f}, bias={bias:.1f}")
    return bias


def _classify_undertone(a_corrected: float, b_corrected: float, l_standard: float) -> str:
    """Classify warm/cool/neutral using hue angle in LAB space.

    After illuminant correction, the hue angle separates warm (yellow-dominant)
    from cool (red/pink-dominant) skin undertones. ITA-aware thresholds adapt
    to skin depth since darker skin has different baseline hue angles.

    Based on: Van Song 2026 (skin hue range 24.63°-79.64°), Xiao et al. 2017
    (ethnic skin spectrophotometer data, 960 subjects).
    """
    # Avoid division by zero / noise for very dark skin with tiny chroma
    chroma = math.sqrt(a_corrected ** 2 + b_corrected ** 2)
    if chroma < 1.5:
        return "neutral"

    # Hue angle: atan2(b*, a*) in degrees
    hue_angle = math.degrees(math.atan2(b_corrected, a_corrected))
    if hue_angle < 0:
        hue_angle += 360

    # ITA (Individual Typology Angle) for threshold tier selection
    # ITA uses standard L* and b* values
    b_for_ita = b_corrected  # already in standard range after correction
    if abs(b_for_ita) > 0.5:
        ita = math.degrees(math.atan2(l_standard - 50, b_for_ita))
    else:
        ita = 90.0 if l_standard > 50 else -90.0

    # ITA-aware thresholds (from published spectrophotometer data)
    if ita < 10:       # Dark skin
        cool_threshold, warm_threshold = 42, 55
    elif ita < 30:     # Medium skin
        cool_threshold, warm_threshold = 48, 60
    else:              # Light skin
        cool_threshold, warm_threshold = 52, 65

    logger.info(f"Undertone: hue={hue_angle:.1f}° ita={ita:.1f} a*={a_corrected:.1f} b*={b_corrected:.1f} "
                f"thresholds=[{cool_threshold},{warm_threshold}]")

    if hue_angle < cool_threshold:
        return "cool"
    elif hue_angle > warm_threshold:
        return "warm"
    return "neutral"


def _dominant_color_hex(pixels_bgr: np.ndarray) -> str:
    """Get the dominant color as hex from a set of BGR pixels."""
    if len(pixels_bgr) == 0:
        return "#000000"
    # Use median for robustness against outliers
    median = np.median(pixels_bgr, axis=0).astype(int)
    b, g, r = median
    return f"#{r:02x}{g:02x}{b:02x}"


def _classify_eye_color(pixels_bgr: np.ndarray) -> dict:
    """Classify eye color from iris pixel samples."""
    if len(pixels_bgr) == 0:
        return {"name": "unknown", "hex": "#000000"}

    median_bgr = np.median(pixels_bgr, axis=0).astype(int)
    b, g, r = median_bgr

    # Convert to HSV for classification
    hsv = cv2.cvtColor(np.uint8([[median_bgr]]), cv2.COLOR_BGR2HSV)[0][0]
    h, s, v = int(hsv[0]), int(hsv[1]), int(hsv[2])

    hex_val = f"#{r:02x}{g:02x}{b:02x}"

    # Simple hue-based classification
    if v < 60:
        name = "dark_brown"
    elif s < 40:
        name = "gray"
    elif h < 15 or h > 165:
        name = "brown"
    elif 15 <= h < 25:
        name = "amber"
    elif 25 <= h < 45:
        name = "hazel"
    elif 45 <= h < 85:
        name = "green"
    elif 85 <= h < 130:
        name = "blue"
    else:
        name = "brown"

    return {"name": name, "hex": hex_val}


class SkinAnalyzer(IAnalyzer):
    """Skin tone (Monk scale), undertone, and eye color from pixel sampling."""

    @property
    def name(self) -> str:
        return "skin_analyzer"

    def load(self) -> None:
        pass  # No model to load — pure math

    def analyze(self, ctx: AnalysisContext) -> dict:
        lm = ctx.face_landmarks_468
        if lm is None:
            return {"skin": None, "eyes_color": None, "_confidence": {"skin": 0.0}}

        # Use the same image that face landmarks were detected on
        # (may be a crop if full-image detection failed)
        face_img = getattr(ctx, "_face_lm_image", ctx.image)
        h, w = face_img.shape[:2]

        # ── White balance: Shades-of-Gray (replaces CLAHE) ─────────────────
        # Partial correction (70%) to remove scene illuminant without
        # destroying the undertone signal that CLAHE was wiping out.
        face_img_wb = _partial_white_balance(face_img, strength=0.7)

        # ── Sclera-based illuminant + exposure correction ────────────────
        illuminant = _extract_sclera_illuminant(face_img, lm, h, w)
        a_shift = illuminant[0] if illuminant else 0.0
        b_shift = illuminant[1] if illuminant else 0.0
        sclera_L = illuminant[2] if illuminant else None

        # Exposure correction: sclera (primary) → face histogram (fallback)
        exposure_bias = _sclera_exposure_correction(sclera_L) if sclera_L is not None else 0.0
        if abs(exposure_bias) < 0.1:
            # Sclera unavailable or rejected — try face histogram fallback
            exposure_bias = _face_histogram_exposure(face_img_wb, ctx.face_bbox)

        # ── Skin tone from forehead + cheeks + chin ──────────────────────
        forehead_px = _sample_region(face_img_wb, lm, _FOREHEAD_LANDMARKS, h, w)
        l_cheek_px = _sample_region(face_img_wb, lm, _LEFT_CHEEK_LANDMARKS, h, w)
        r_cheek_px = _sample_region(face_img_wb, lm, _RIGHT_CHEEK_LANDMARKS, h, w)
        chin_px = _sample_region(face_img_wb, lm, _CHIN_LANDMARKS, h, w)

        # Convert each region to LAB for shadow analysis
        def _to_lab(px):
            if len(px) == 0:
                return np.array([])
            return cv2.cvtColor(
                px.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_BGR2LAB
            ).reshape(-1, 3).astype(float)

        l_cheek_lab = _to_lab(l_cheek_px)
        r_cheek_lab = _to_lab(r_cheek_px)

        # ── Cheek asymmetry: discard shadowed side ───────────────────────
        shadow_side = _detect_shadow_side(l_cheek_lab, r_cheek_lab)

        # Build skin pixel pool with shadow awareness
        # Cheeks weighted 1.0, forehead 0.5 (specular-prone), chin 0.7
        all_skin = []
        if shadow_side != "left_shadow" and len(l_cheek_px) > 0:
            all_skin.append(l_cheek_px)
        if shadow_side != "right_shadow" and len(r_cheek_px) > 0:
            all_skin.append(r_cheek_px)
        if len(chin_px) > 0:
            all_skin.append(chin_px)
        # Forehead: include at half weight (subsample) to reduce specular impact
        if len(forehead_px) > 0:
            step = max(1, len(forehead_px) // (len(l_cheek_px) if len(l_cheek_px) > 0 else 25))
            all_skin.append(forehead_px[::max(step, 2)])

        if not all_skin:
            return {"skin": None, "eyes_color": None, "_confidence": {"skin": 0.0}}

        skin_pixels = np.concatenate(all_skin, axis=0)

        # Convert to LAB
        skin_lab = cv2.cvtColor(
            skin_pixels.reshape(1, -1, 3).astype(np.uint8),
            cv2.COLOR_BGR2LAB,
        ).reshape(-1, 3).astype(float)

        # ── Trimmed percentile: remove top/bottom 10% L* outliers ────────
        median_lab = _robust_skin_lab(skin_lab)

        # OpenCV LAB → standard LAB
        l_val = median_lab[0] * 100.0 / 255.0
        a_val, b_val = median_lab[1] - 128, median_lab[2] - 128

        # Apply sclera exposure correction to L*
        l_corrected = l_val - exposure_bias
        l_corrected = max(0.0, min(100.0, l_corrected))

        if abs(exposure_bias) > 1.0:
            logger.info(f"Exposure correction: L*={l_val:.1f} → {l_corrected:.1f} (bias={exposure_bias:.1f})")
        if shadow_side != "balanced":
            logger.info(f"Shadow detection: {shadow_side} cheek discarded")

        # ── Monk tone via ITA (uses corrected L* + b*) ──────────────────
        monk_tone = _classify_monk_tone_ita(l_corrected, b_val)

        # ── Undertone: hue angle with sclera illuminant correction ───────
        a_corrected = a_val - a_shift
        b_corrected = b_val - b_shift
        undertone = _classify_undertone(a_corrected, b_corrected, l_corrected)

        skin_hex = _dominant_color_hex(skin_pixels)

        # ── Eye color from iris (use ORIGINAL image, not white-balanced) ───
        original_face_img = getattr(ctx, "_face_lm_image", ctx.image)
        iris_indices = _R_IRIS + _L_IRIS
        iris_px = _sample_region(original_face_img, lm, iris_indices, h, w, pad=1)
        eye_color = _classify_eye_color(iris_px)

        return {
            "skin": {
                "monkTone": monk_tone,
                "undertone": undertone,
                "hex": skin_hex,
                "referenceHex": _MONK_HEX.get(monk_tone, "#a07c5b"),
            },
            "eyes_color": eye_color,
            "_confidence": {"skin": 0.88},
        }

    def cleanup(self) -> None:
        pass  # Nothing to release
