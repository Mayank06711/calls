"""Stage 1: Body shape analysis — hybrid silhouette + landmarks approach.

Uses MediaPipe PoseLandmarker for landmarks + standalone ImageSegmenter
(selfie_segmenter.tflite, 244KB) for body silhouette mask.
Primary: measure body widths from silhouette at shoulder/waist/hip Y-levels.
Fallback: landmark-only with relaxed thresholds if mask unavailable.

NOTE: PoseLandmarker's built-in output_segmentation_masks=True crashes on
Windows (MediaPipe issue #5016). The standalone ImageSegmenter uses a
completely different pipeline and works fine.
"""

import math
import logging
import os
import numpy as np
from .interfaces import IAnalyzer, AnalysisContext

logger = logging.getLogger("style_dna")

# MediaPipe pose landmark indices
_L_SHOULDER, _R_SHOULDER = 11, 12
_L_HIP, _R_HIP = 23, 24
_L_KNEE, _R_KNEE = 25, 26
_L_ANKLE, _R_ANKLE = 27, 28
_L_WRIST, _R_WRIST = 15, 16
_L_EAR, _R_EAR = 7, 8
_NOSE = 0

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "pose_landmarker_full.task")
_SEGMENTER_PATH = os.path.join(os.path.dirname(__file__), "models", "selfie_segmenter.tflite")


def _dist(a, b) -> float:
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def _midpoint(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


# ── Silhouette-based body width measurement ──────────────────────────────

def _pixel_width_at_y(mask: np.ndarray, y: int, search_range: int = 5) -> int:
    """Measure horizontal pixel width of body silhouette at a given Y coordinate.

    Scans a small vertical band (±search_range) and returns the maximum width
    to handle mask noise.
    """
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


def _detect_arms_at_sides(lm, img_w: int) -> float:
    """Return correction factor for arms overlapping the torso silhouette.

    When arms hang at the sides, they inflate the measured shoulder width.
    Detects this by checking if wrist landmarks fall within the torso X bounds.
    """
    l_wrist_x = lm[_L_WRIST].x * img_w
    r_wrist_x = lm[_R_WRIST].x * img_w
    l_shoulder_x = lm[_L_SHOULDER].x * img_w
    r_shoulder_x = lm[_R_SHOULDER].x * img_w

    center_x = (l_shoulder_x + r_shoulder_x) / 2
    half_w = abs(l_shoulder_x - r_shoulder_x) / 2

    if half_w < 5:
        return 1.0

    l_inside = abs(l_wrist_x - center_x) < half_w * 1.3
    r_inside = abs(r_wrist_x - center_x) < half_w * 1.3

    if l_inside and r_inside:
        return 0.82   # Both arms at sides → ~18% width inflation
    elif l_inside or r_inside:
        return 0.91   # One arm at side → ~9% inflation
    return 1.0


def _classify_shape_silhouette(shoulder_w: float, waist_w: float, hip_w: float) -> dict:
    """Classify body shape from silhouette pixel widths using multi-ratio scoring.

    Based on FFIT (Lee et al. 2007) rules adapted to pixel-width ratios.
    Uses 3 measurements: shoulder, waist, hip widths.
    Returns dict with shape, confidence, and measurement ratios.
    """
    if hip_w <= 0 or shoulder_w <= 0 or waist_w <= 0:
        return {"shape": "rectangle", "confidence": 0.5, "shr": 0, "whr": 0, "waistDefinition": 0}

    shr = shoulder_w / hip_w
    whr = waist_w / hip_w
    max_w = max(shoulder_w, hip_w)
    waist_def = 1.0 - (waist_w / max_w)

    # Score each body type (0.0 to 1.0)
    scores = {}

    shr_balance = 1.0 - min(abs(shr - 1.0) / 0.15, 1.0)
    waist_score = min(waist_def / 0.25, 1.0)

    # HOURGLASS: balanced SHR + defined waist
    scores["hourglass"] = shr_balance * 0.5 + waist_score * 0.5

    # PEAR: hips wider than shoulders
    if shr < 1.0:
        scores["pear"] = min((1.0 - shr) / 0.20, 1.0) * 0.7 + waist_score * 0.3
    else:
        scores["pear"] = 0.0

    # INVERTED TRIANGLE: shoulders wider than hips
    if shr > 1.0:
        scores["inverted_triangle"] = min((shr - 1.0) / 0.20, 1.0) * 0.8 + (1.0 - waist_score) * 0.2
    else:
        scores["inverted_triangle"] = 0.0

    # APPLE: balanced but wide waist (no definition)
    apple_balance = 1.0 - min(abs(shr - 1.0) / 0.15, 1.0)
    apple_waist = min(max(whr - 0.80, 0) / 0.15, 1.0)
    scores["apple"] = apple_balance * 0.4 + apple_waist * 0.6

    # RECTANGLE: balanced, waist not strongly defined
    rect_nowaist = 1.0 - waist_score
    scores["rectangle"] = shr_balance * 0.5 + rect_nowaist * 0.5
    if waist_def > 0.20:
        scores["rectangle"] *= 0.5
    if whr > 0.85:
        scores["rectangle"] *= 0.7

    # Winner takes all
    best_shape = max(scores, key=scores.get)

    # Confidence from margin between top two scores
    sorted_scores = sorted(scores.values(), reverse=True)
    if len(sorted_scores) > 1 and sorted_scores[0] > 0:
        margin = sorted_scores[0] - sorted_scores[1]
        confidence = min(0.5 + margin, 1.0)
    else:
        confidence = 0.5

    logger.info(f"Silhouette shape: shr={shr:.2f} whr={whr:.2f} waist_def={waist_def:.2f} → "
                f"{best_shape} (conf={confidence:.2f}) scores={{{', '.join(f'{k}:{v:.2f}' for k,v in scores.items())}}}")

    return {
        "shape": best_shape,
        "confidence": round(confidence, 2),
        "shr": round(shr, 3),
        "whr": round(whr, 3),
        "waistDefinition": round(waist_def, 3),
    }


# ── Landmarks-only fallback (relaxed thresholds) ─────────────────────────

def _classify_shape_landmarks(shr: float, waist_ratio: float) -> str:
    """Fallback classification from landmarks only with wider threshold bands."""
    if shr > 1.20:
        return "inverted_triangle"
    if shr < 0.80:
        return "pear"
    if waist_ratio < 0.72:
        return "hourglass"
    if waist_ratio > 0.92:
        return "apple"
    return "rectangle"


def _height_category(torso_leg_ratio: float, total_px: float, img_h: float) -> str:
    """Rough height bucket from body proportion in frame."""
    body_fill = total_px / img_h
    if body_fill > 0.85:
        return "tall"
    if body_fill < 0.55:
        return "short"
    return "average"


class BodyAnalyzer(IAnalyzer):
    """Extracts body shape using hybrid silhouette + landmarks approach."""

    def __init__(self):
        self._landmarker = None
        self._segmenter = None

    @property
    def name(self) -> str:
        return "body_analyzer"

    def load(self) -> None:
        import mediapipe as mp

        # PoseLandmarker — landmarks only (segmentation masks disabled due to
        # fatal C++ crash on Windows, MediaPipe issue #5016)
        options = mp.tasks.vision.PoseLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=_MODEL_PATH),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            output_segmentation_masks=False,
            min_pose_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self._landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(options)

        # Standalone ImageSegmenter — selfie_segmenter.tflite (244KB, ~2MB RAM)
        # Completely separate pipeline from PoseLandmarker, no crash issues.
        try:
            seg_options = mp.tasks.vision.ImageSegmenterOptions(
                base_options=mp.tasks.BaseOptions(model_asset_path=_SEGMENTER_PATH),
                running_mode=mp.tasks.vision.RunningMode.IMAGE,
                output_category_mask=False,
                output_confidence_masks=True,
            )
            self._segmenter = mp.tasks.vision.ImageSegmenter.create_from_options(seg_options)
            logger.info("ImageSegmenter (selfie_segmenter) loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load ImageSegmenter, will use landmarks-only: {e}")
            self._segmenter = None

    def analyze(self, ctx: AnalysisContext) -> dict:
        if self._landmarker is None:
            raise RuntimeError("BodyAnalyzer.load() not called")

        import mediapipe as mp

        # Convert BGR to RGB and create MediaPipe Image
        img_rgb = ctx.image[:, :, ::-1].copy()
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)

        result = self._landmarker.detect(mp_image)

        if not result.pose_landmarks or len(result.pose_landmarks) == 0:
            return {"body": None, "_confidence": {"body": 0.0}}

        lm = result.pose_landmarks[0]  # First person
        h, w = ctx.image.shape[:2]

        def px(idx):
            return (lm[idx].x * w, lm[idx].y * h)

        # Cache for later stages
        ctx.pose_landmarks_33 = lm

        # Key points
        l_shoulder, r_shoulder = px(_L_SHOULDER), px(_R_SHOULDER)
        l_hip, r_hip = px(_L_HIP), px(_R_HIP)
        l_ankle, r_ankle = px(_L_ANKLE), px(_R_ANKLE)
        l_knee, r_knee = px(_L_KNEE), px(_R_KNEE)

        shoulder_mid = _midpoint(l_shoulder, r_shoulder)
        hip_mid = _midpoint(l_hip, r_hip)
        ankle_mid = _midpoint(l_ankle, r_ankle)

        # Landmark-based measurements (always computed for output)
        shoulder_width_lm = _dist(l_shoulder, r_shoulder)
        hip_width_lm = _dist(l_hip, r_hip)

        # ── Try silhouette-based classification first ──────────────────────
        shape_result = None
        method_used = "landmarks"

        seg_mask = None
        if self._segmenter is not None:
            try:
                seg_result = self._segmenter.segment(mp_image)
                # confidence_masks[0] is the person confidence (0.0-1.0)
                if seg_result.confidence_masks and len(seg_result.confidence_masks) > 0:
                    seg_mask = seg_result.confidence_masks[0].numpy_view()
            except Exception as e:
                logger.warning(f"ImageSegmenter failed: {e}")

        if seg_mask is not None and seg_mask.shape[0] > 0:
            # Resize mask to image dimensions if needed (selfie_segmenter outputs 256x256)
            if seg_mask.shape[0] != h or seg_mask.shape[1] != w:
                import cv2
                seg_mask = cv2.resize(seg_mask, (w, h), interpolation=cv2.INTER_LINEAR)
            binary_mask = (seg_mask > 0.5).astype(np.uint8)

            # Y-coordinates from landmarks (accurate even when X-widths aren't)
            shoulder_y = int((lm[_L_SHOULDER].y + lm[_R_SHOULDER].y) / 2 * h)
            hip_joint_y = int((lm[_L_HIP].y + lm[_R_HIP].y) / 2 * h)
            knee_y = int((lm[_L_KNEE].y + lm[_R_KNEE].y) / 2 * h)

            # Waist: 45% between shoulders and hips
            waist_y = int(shoulder_y + 0.45 * (hip_joint_y - shoulder_y))
            # True hip: 30% from hip joints toward knees (where pelvis is widest)
            true_hip_y = int(hip_joint_y + 0.30 * (knee_y - hip_joint_y))

            s_w = _pixel_width_at_y(binary_mask, shoulder_y)
            wa_w = _pixel_width_at_y(binary_mask, waist_y)
            h_w = _pixel_width_at_y(binary_mask, true_hip_y)

            # Sanity check: all widths must be reasonable (>20px)
            if s_w > 20 and wa_w > 20 and h_w > 20:
                # Apply arm correction to shoulder measurement
                arm_factor = _detect_arms_at_sides(lm, w)
                s_w_corrected = s_w * arm_factor

                logger.info(f"Silhouette widths: shoulder={s_w}(×{arm_factor:.2f}={s_w_corrected:.0f}) "
                            f"waist={wa_w} hip={h_w}")

                shape_result = _classify_shape_silhouette(s_w_corrected, wa_w, h_w)
                method_used = "silhouette"
            else:
                logger.info(f"Silhouette widths too small: s={s_w} w={wa_w} h={h_w} — falling back to landmarks")
        else:
            logger.info("No segmentation mask — falling back to landmarks")

        # ── Landmarks fallback ─────────────────────────────────────────────
        if shape_result is None:
            shr = shoulder_width_lm / hip_width_lm if hip_width_lm > 0 else 1.0
            t = 0.45
            waist_width_est = shoulder_width_lm * (1 - t) + hip_width_lm * t
            whr = waist_width_est / hip_width_lm if hip_width_lm > 0 else 1.0
            shape = _classify_shape_landmarks(shr, whr)
            shape_result = {
                "shape": shape,
                "confidence": 0.5,
                "shr": round(shr, 3),
                "whr": round(whr, 3),
                "waistDefinition": 0,
            }
            logger.info(f"Landmarks shape: shr={shr:.2f} whr={whr:.2f} → {shape}")

        # ── Common measurements ────────────────────────────────────────────
        torso_len = _dist(shoulder_mid, hip_mid)
        leg_len = _dist(hip_mid, ankle_mid)
        torso_leg = torso_len / leg_len if leg_len > 0 else 0.5

        nose_pt = px(_NOSE)
        total_body = _dist(nose_pt, ankle_mid)
        height_cat = _height_category(torso_leg, total_body, h)

        # Confidence from landmark visibility
        vis = [lm[i].visibility for i in
               [_L_SHOULDER, _R_SHOULDER, _L_HIP, _R_HIP, _L_ANKLE, _R_ANKLE]]
        lm_confidence = round(sum(vis) / len(vis), 2)

        # Blend landmark visibility with shape classification confidence
        shape_conf = shape_result.get("confidence", 0.5)
        combined_conf = round(lm_confidence * 0.5 + shape_conf * 0.5, 2)

        return {
            "body": {
                "shape": shape_result["shape"],
                "shoulderHipRatio": shape_result.get("shr", 0),
                "waistHipRatio": shape_result.get("whr", 0),
                "waistDefinition": shape_result.get("waistDefinition", 0),
                "torsoLegRatio": round(torso_leg, 2),
                "heightCategory": height_cat,
                "classificationMethod": method_used,
            },
            "_confidence": {"body": combined_conf},
        }

    def cleanup(self) -> None:
        if self._landmarker:
            self._landmarker.close()
            self._landmarker = None
        if self._segmenter:
            self._segmenter.close()
            self._segmenter = None
