"""Stage 3: Face geometry — shape, eye, nose, lip classification via MediaPipe Face Landmarker (Tasks API)."""

import math
import os
import numpy as np
from .interfaces import IAnalyzer, AnalysisContext

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "face_landmarker.task")

# ── MediaPipe Face Mesh landmark indices ──────────────────────────────────────
# Jaw contour (face width)
_JAW_LEFT, _JAW_RIGHT = 234, 454
# Forehead top, chin bottom (face height)
_FOREHEAD, _CHIN = 10, 152
# Forehead width
_FOREHEAD_LEFT, _FOREHEAD_RIGHT = 67, 297
# Cheekbone width
_CHEEK_LEFT, _CHEEK_RIGHT = 137, 366

# Eyes (right eye — viewer's left)
_R_EYE_INNER, _R_EYE_OUTER = 133, 33
_R_EYE_TOP, _R_EYE_BOTTOM = 159, 145
# Eyes (left eye — viewer's right)
_L_EYE_INNER, _L_EYE_OUTER = 362, 263
_L_EYE_TOP, _L_EYE_BOTTOM = 386, 374
# Upper eyelid crease (for hooded detection)
_R_EYE_CREASE = 27
_L_EYE_CREASE = 257

# Nose
_NOSE_TIP = 1
_NOSE_LEFT, _NOSE_RIGHT = 129, 358
_NOSE_BRIDGE = 6

# Lips
_LIP_TOP = 13
_LIP_BOTTOM = 14
_LIP_LEFT, _LIP_RIGHT = 61, 291


def _dist(a, b) -> float:
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def _px(landmark, w, h):
    return (landmark.x * w, landmark.y * h)


def _classify_face_shape(jaw_w, face_h, forehead_w, cheek_w) -> str:
    ratio = jaw_w / face_h if face_h > 0 else 1.0

    if ratio < 0.75:
        return "oblong"
    if forehead_w > jaw_w * 1.15 and jaw_w < cheek_w * 0.85:
        return "heart"
    if ratio > 0.85:
        # Wide face — square vs round
        if abs(jaw_w - forehead_w) < jaw_w * 0.08:
            return "square"
        return "round"
    return "oval"


def _classify_eye_shape(eye_h, eye_w, crease_dist, lid_visible) -> str:
    ratio = eye_h / eye_w if eye_w > 0 else 0.3

    if crease_dist < eye_h * 0.15:
        return "monolid"
    if not lid_visible:
        return "hooded"
    if ratio > 0.38:
        return "round"
    return "almond"


def _classify_nose(nose_w, face_w) -> str:
    ratio = nose_w / face_w if face_w > 0 else 0.25
    if ratio > 0.30:
        return "wide"
    if ratio < 0.20:
        return "narrow"
    return "medium"


def _classify_lips(lip_h, lip_w) -> str:
    ratio = lip_h / lip_w if lip_w > 0 else 0.3
    if ratio > 0.40:
        return "full"
    if ratio < 0.25:
        return "thin"
    return "medium"


class FaceGeometryAnalyzer(IAnalyzer):
    """Classify face shape, eye shape, nose, lips from 478 face landmarks."""

    def __init__(self):
        self._landmarker = None

    @property
    def name(self) -> str:
        return "face_geometry"

    def load(self) -> None:
        import mediapipe as mp

        options = mp.tasks.vision.FaceLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=_MODEL_PATH),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
        )
        self._landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)

    def _detect_face(self, ctx: AnalysisContext):
        """Try full image first; if face not found and we have a face bbox, crop and retry."""
        import mediapipe as mp
        import cv2

        img_rgb = ctx.image[:, :, ::-1].copy()
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        result = self._landmarker.detect(mp_image)

        if result.face_landmarks and len(result.face_landmarks) > 0:
            return result, ctx.image  # Found on full image

        # Retry with cropped + enlarged face region from InsightFace bbox
        if ctx.face_bbox is not None:
            fx, fy, fw, fh = ctx.face_bbox
            img_h, img_w = ctx.image.shape[:2]
            # Expand bbox by 80% for forehead + neck + sides
            pad_x, pad_y = int(fw * 0.8), int(fh * 0.8)
            x1 = max(0, fx - pad_x)
            y1 = max(0, fy - pad_y)
            x2 = min(img_w, fx + fw + pad_x)
            y2 = min(img_h, fy + fh + pad_y)

            crop = ctx.image[y1:y2, x1:x2]
            if crop.size > 0:
                # Scale up to at least 400px for better landmark detection
                ch, cw = crop.shape[:2]
                if max(ch, cw) < 400:
                    scale = 400 / max(ch, cw)
                    crop = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)

                crop_rgb = crop[:, :, ::-1].copy()
                mp_crop = mp.Image(image_format=mp.ImageFormat.SRGB, data=crop_rgb)
                result = self._landmarker.detect(mp_crop)
                if result.face_landmarks and len(result.face_landmarks) > 0:
                    return result, crop  # Found on cropped region

        return result, ctx.image  # Return whatever we got

    def analyze(self, ctx: AnalysisContext) -> dict:
        if self._landmarker is None:
            raise RuntimeError("FaceGeometryAnalyzer.load() not called")

        result, working_image = self._detect_face(ctx)

        if not result.face_landmarks or len(result.face_landmarks) == 0:
            return {"face_geometry": None, "_confidence": {"face_geo": 0.0}}

        lm = result.face_landmarks[0]  # First face
        ctx.face_landmarks_468 = lm  # Cache for skin/eye color
        # Store the image used for landmarks so skin_analyzer can sample from it
        ctx._face_lm_image = working_image
        h, w = working_image.shape[:2]

        def p(idx):
            return _px(lm[idx], w, h)

        # ── Face shape ────────────────────────────────────────────────────
        jaw_w = _dist(p(_JAW_LEFT), p(_JAW_RIGHT))
        face_h = _dist(p(_FOREHEAD), p(_CHIN))
        forehead_w = _dist(p(_FOREHEAD_LEFT), p(_FOREHEAD_RIGHT))
        cheek_w = _dist(p(_CHEEK_LEFT), p(_CHEEK_RIGHT))
        face_shape = _classify_face_shape(jaw_w, face_h, forehead_w, cheek_w)

        # ── Eye shape (average both eyes) ─────────────────────────────────
        r_eye_h = _dist(p(_R_EYE_TOP), p(_R_EYE_BOTTOM))
        r_eye_w = _dist(p(_R_EYE_INNER), p(_R_EYE_OUTER))
        l_eye_h = _dist(p(_L_EYE_TOP), p(_L_EYE_BOTTOM))
        l_eye_w = _dist(p(_L_EYE_INNER), p(_L_EYE_OUTER))
        avg_eye_h = (r_eye_h + l_eye_h) / 2
        avg_eye_w = (r_eye_w + l_eye_w) / 2

        # Crease distance for hooded/monolid detection
        r_crease_dist = _dist(p(_R_EYE_CREASE), p(_R_EYE_TOP))
        l_crease_dist = _dist(p(_L_EYE_CREASE), p(_L_EYE_TOP))
        avg_crease = (r_crease_dist + l_crease_dist) / 2
        lid_visible = avg_crease > avg_eye_h * 0.2

        eye_shape = _classify_eye_shape(avg_eye_h, avg_eye_w, avg_crease, lid_visible)

        # ── Nose ──────────────────────────────────────────────────────────
        nose_w = _dist(p(_NOSE_LEFT), p(_NOSE_RIGHT))
        nose_prop = _classify_nose(nose_w, jaw_w)

        # ── Lips ──────────────────────────────────────────────────────────
        lip_h = _dist(p(_LIP_TOP), p(_LIP_BOTTOM))
        lip_w = _dist(p(_LIP_LEFT), p(_LIP_RIGHT))
        lip_full = _classify_lips(lip_h, lip_w)

        return {
            "face_geometry": {
                "faceShape": face_shape,
                "eyeShape": eye_shape,
                "noseProportion": nose_prop,
                "lipFullness": lip_full,
            },
            "_confidence": {"face_geo": 0.85},
        }

    def cleanup(self) -> None:
        if self._landmarker:
            self._landmarker.close()
            self._landmarker = None
