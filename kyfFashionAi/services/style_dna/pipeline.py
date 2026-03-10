"""Style DNA Pipeline — gated sequential orchestrator.

Logical gate flow:
  GATE 0: PersonDetector  → not a person? STOP (save all compute)
  STAGE 1: BodyAnalyzer   → independent, runs if person detected
  GATE 2: FaceAnalyzer    → no face? STOP face-dependent stages
  GATE 3: FaceGeometry    → needs face bbox from gate 2
  STAGE 4: SkinAnalyzer   → needs face landmarks from gate 3
  STAGE 5: HairAnalyzer   → needs face bbox from gate 2

Each analyzer is loaded, run, then cleaned up before the next one starts
to minimize peak RAM.
"""

import time
import logging
import cv2
import numpy as np
from pathlib import Path

from .interfaces import IAnalyzer, AnalysisContext
from .person_detector import PersonDetector
from .body_analyzer import BodyAnalyzer
from .face_analyzer import FaceAnalyzer
from .face_geometry import FaceGeometryAnalyzer
from .skin_analyzer import SkinAnalyzer
from .hair_analyzer import HairAnalyzer
from .color_season import derive_color_season

logger = logging.getLogger("style_dna")

MIN_FACE_CONF = 0.76       # Default face confidence threshold
MIN_FACE_CONF_GATED = 0.55  # Lower threshold when PersonDetector already confirmed human
                             # Safe: monkey/animals fail Gate 0 before reaching this


def _is_illustration(image_bgr: np.ndarray, face_bbox: tuple) -> bool:
    """Check if the face region looks like clipart/illustration vs real photo.

    Real photos have smooth color gradients → many unique colors, low flat-pixel ratio.
    Illustrations have flat fills + sharp edges → few unique colors, high flat-pixel ratio.

    Two signals combined:
    1. Unique quantized colors in face region (real: 200+, clipart: <60)
    2. Flat pixel ratio: % of pixels where gradient magnitude < 3 (real: <70%, clipart: >85%)
    """
    if face_bbox is None:
        return False
    fx, fy, fw, fh = face_bbox
    h, w = image_bgr.shape[:2]
    y1, y2 = max(0, fy), min(h, fy + fh)
    x1, x2 = max(0, fx), min(w, fx + fw)
    face_crop = image_bgr[y1:y2, x1:x2]
    if face_crop.size < 100:
        return False

    # Signal 1: unique colors after quantizing to 16 bins per channel
    quantized = (face_crop // 16).reshape(-1, 3)
    unique_colors = len(np.unique(quantized, axis=0))

    # Signal 2: flat pixel ratio (pixels with near-zero gradient)
    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(grad_x ** 2 + grad_y ** 2)
    flat_ratio = float(np.sum(grad_mag < 3) / max(1, grad_mag.size))

    logger.info(f"Illustration check: unique_colors={unique_colors}, flat_ratio={flat_ratio:.2f}")
    # Primary signal: real faces ALWAYS have 80+ unique quantized colors (skin gradients)
    # Illustrations/clipart have very few flat fills → <50 unique colors
    return unique_colors < 50


def _run_stage(analyzer: IAnalyzer, ctx: AnalysisContext, timings: dict) -> dict | None:
    """Load → analyze → cleanup a single analyzer. Returns result or None on failure."""
    t0 = time.perf_counter()
    try:
        logger.info(f"Loading {analyzer.name}...")
        analyzer.load()
        logger.info(f"Running {analyzer.name}...")
        return analyzer.analyze(ctx)
    except Exception as e:
        logger.warning(f"{analyzer.name} failed: {e}")
        return None
    finally:
        analyzer.cleanup()
        elapsed = round((time.perf_counter() - t0) * 1000)
        timings[analyzer.name] = elapsed
        logger.info(f"{analyzer.name} done in {elapsed}ms")


def _build_output(
    body, face_basic, face_geo, eyes_color, skin, hair, color_season,
    confidence, warnings, timings, image_size, face_count, person_detection,
):
    """Assemble the final Style DNA output dict."""
    face = {}
    if face_basic:
        face.update(face_basic)
    if face_geo:
        face.update(face_geo)

    return {
        "body": body,
        "face": face or None,
        "eyes": {
            "shape": face_geo.get("eyeShape") if face_geo else None,
            "color": eyes_color,
        } if face_geo or eyes_color else None,
        "nose": {
            "proportion": face_geo.get("noseProportion"),
        } if face_geo else None,
        "lips": {
            "fullness": face_geo.get("lipFullness"),
        } if face_geo else None,
        "skin": skin,
        "hair": hair,
        "colorSeason": color_season,
        "confidence": confidence,
        "warnings": list(dict.fromkeys(warnings)) if warnings else None,
        "_meta": {
            "timingsMs": timings,
            "imageSize": image_size,
            "faceCount": face_count,
            "personDetection": person_detection,
        },
    }


def analyze_style_dna(
    image_path: str | Path | None = None,
    image_bgr: np.ndarray | None = None,
) -> dict:
    """Run the full Style DNA pipeline on an image.

    Uses logical gates — each stage checks prerequisites before running.
    If a gate fails, all dependent downstream stages are skipped entirely
    (no wasted compute, no leaked data from irrelevant analysis).
    """
    # ── Load image ────────────────────────────────────────────────────────
    if image_bgr is not None:
        img = image_bgr
    elif image_path is not None:
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
    else:
        raise ValueError("Provide either image_path or image_bgr")

    # Resize if too large (save RAM + speed)
    max_dim = 1024
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        logger.info(f"Resized image from {w}x{h} to {img.shape[1]}x{img.shape[0]}")

    ctx = AnalysisContext(image=img)
    image_size = f"{img.shape[1]}x{img.shape[0]}"
    timings = {}
    confidence = {}
    warnings = []

    # Shared state across gates
    body = None
    face_basic = None
    face_geo = None
    eyes_color = None
    skin = None
    hair = None
    color_season = None
    face_count = 0
    person_detection = None
    body_conf = 0.0
    face_conf = 0.0

    out = lambda: _build_output(
        body, face_basic, face_geo, eyes_color, skin, hair, color_season,
        confidence, warnings, timings, image_size, face_count, person_detection,
    )

    # ══════════════════════════════════════════════════════════════════════
    # GATE 0: Is there a person in this image?
    # If NO → stop immediately, don't waste compute on anything else
    # ══════════════════════════════════════════════════════════════════════
    result = _run_stage(PersonDetector(), ctx, timings)
    if result:
        person_detection = result.get("_person_detection")

    if not person_detection or not person_detection["hasPerson"]:
        warnings.append("NO_PERSON_DETECTED")
        if person_detection:
            other = person_detection.get("otherObjects", [])
            if other:
                logger.info(f"Non-person objects: {[o['label'] for o in other[:3]]}")
        logger.info("GATE 0 CLOSED — no person, pipeline stopped")
        return out()

    logger.info(f"GATE 0 OPEN — person detected (score={person_detection['bestPersonScore']})")

    # ══════════════════════════════════════════════════════════════════════
    # STAGE 1: Body analysis (independent — doesn't gate anything)
    # Provides body shape, proportions. Useful even without face.
    # ══════════════════════════════════════════════════════════════════════
    result = _run_stage(BodyAnalyzer(), ctx, timings)
    if result:
        body = result.get("body")
        body_conf = result.get("_confidence", {}).get("body", 0.0)
        confidence["body"] = body_conf

        # Validate proportions — reject non-human bodies
        if body:
            shr = body.get("shoulderHipRatio", 1.0)
            tlr = body.get("torsoLegRatio", 0.5)
            if not (0.30 <= tlr <= 1.20) or not (0.65 <= shr <= 2.30):
                logger.info(f"Body proportions out of range (SHR={shr}, TLR={tlr}) — discarding")
                body = None
                confidence["body"] = 0.0

    # ══════════════════════════════════════════════════════════════════════
    # GATE 2: Face detection (CRITICAL GATE)
    # Face bbox is needed by: FaceGeometry, Skin, Hair
    # No face → skip ALL downstream stages, tell user to upload full photo
    # ══════════════════════════════════════════════════════════════════════
    result = _run_stage(FaceAnalyzer(), ctx, timings)
    face_detected = False

    # Two-gate strategy: if PersonDetector already confirmed human,
    # use a lower face confidence threshold. Monkey (hasPerson=false)
    # was already stopped at Gate 0, so this is safe.
    person_score = person_detection.get("bestPersonScore", 0) if person_detection else 0
    effective_threshold = MIN_FACE_CONF_GATED if person_score >= 0.70 else MIN_FACE_CONF

    if result:
        face_count = result.get("_face_count", 0)
        face_basic = result.get("face_basic")
        face_conf = result.get("_confidence", {}).get("face", 0.0)
        confidence["face"] = face_conf

        if face_basic and face_conf >= effective_threshold:
            face_detected = True
        else:
            if face_basic:
                logger.info(f"Face conf {face_conf} < {effective_threshold} — rejecting")
            face_basic = None

    # Clipart/illustration check — flat colors = not a real photo
    if face_detected and ctx.face_bbox and _is_illustration(ctx.image, ctx.face_bbox):
        logger.info("Face region looks like illustration/clipart — rejecting")
        warnings.append("ILLUSTRATION_DETECTED")
        face_detected = False
        face_basic = None

    if not face_detected:
        # No usable face — skip face_geometry, skin, hair entirely
        timings["face_geometry"] = 0
        timings["skin_analyzer"] = 0
        timings["hair_analyzer"] = 0

        if body:
            warnings.append("NO_FACE")
        else:
            warnings.append("NO_PERSON")

        if face_count > 1:
            warnings.append("MULTIPLE_PEOPLE_CROP_SUGGESTED")
        if body and body_conf < 0.50:
            warnings.append("LOW_BODY_CONFIDENCE")

        logger.info("GATE 2 CLOSED — no face, skipping face_geo/skin/hair")
        return out()

    logger.info(f"GATE 2 OPEN — face detected (conf={face_conf}, count={face_count})")

    # ── Multiple people → early exit (results unreliable) ────────────
    if face_count > 1:
        warnings.append("MULTIPLE_PEOPLE_CROP_SUGGESTED")
        timings["face_geometry"] = 0
        timings["skin_analyzer"] = 0
        timings["hair_analyzer"] = 0
        logger.info("EARLY EXIT — multiple faces detected, skipping remaining stages")
        return out()

    # ══════════════════════════════════════════════════════════════════════
    # GATE 3: Face geometry (needs face bbox from gate 2)
    # Produces: face shape, eye shape, nose, lips, 468 face landmarks
    # Face landmarks are needed by SkinAnalyzer for sampling skin pixels
    # ══════════════════════════════════════════════════════════════════════
    result = _run_stage(FaceGeometryAnalyzer(), ctx, timings)
    face_geo_ok = False

    if result:
        face_geo = result.get("face_geometry")
        geo_conf = result.get("_confidence", {}).get("face_geo", 0.0)
        confidence["face_geo"] = geo_conf

        if face_geo:
            face_geo_ok = True

    if not face_geo_ok:
        # Face found but geometry failed (obscured, unusual angle, etc.)
        # Skip skin (needs landmarks) but still try hair (only needs face bbox)
        warnings.append("FACE_OBSCURED")
        timings["skin_analyzer"] = 0
        logger.info("GATE 3 CLOSED — face geometry failed, skipping skin")
    else:
        logger.info("GATE 3 OPEN — face geometry extracted")

        # ══════════════════════════════════════════════════════════════════
        # STAGE 4: Skin analysis (needs face landmarks from gate 3)
        # Samples skin pixels near face landmarks for Monk tone, undertone
        # ══════════════════════════════════════════════════════════════════
        result = _run_stage(SkinAnalyzer(), ctx, timings)
        if result:
            skin = result.get("skin")
            eyes_color = result.get("eyes_color")  # Iris color extracted alongside skin
            skin_conf = result.get("_confidence", {}).get("skin", 0.0)
            confidence["skin"] = skin_conf

    # ══════════════════════════════════════════════════════════════════════
    # STAGE 5: Hair analysis (needs face bbox from gate 2)
    # Looks above the face bounding box for hair region
    # ══════════════════════════════════════════════════════════════════════
    result = _run_stage(HairAnalyzer(), ctx, timings)
    if result:
        hair = result.get("hair")
        hair_conf = result.get("_confidence", {}).get("hair", 0.0)
        confidence["hair"] = hair_conf

    # ══════════════════════════════════════════════════════════════════════
    # POST: Color season derivation + final warnings
    # ══════════════════════════════════════════════════════════════════════
    if skin and hair and eyes_color:
        try:
            color_season = derive_color_season(
                undertone=skin.get("undertone", "neutral"),
                hair_color_name=hair.get("color", {}).get("name", "unknown"),
                eye_color_name=eyes_color.get("name", "unknown"),
                monk_tone=skin.get("monkTone", 5),
            )
        except Exception as e:
            logger.warning(f"Color season derivation failed: {e}")

    # Warnings for partial/quality issues (only reached if face was found)
    if face_conf < 0.80:
        warnings.append("LOW_FACE_CONFIDENCE")
    if body and body_conf < 0.50:
        warnings.append("LOW_BODY_CONFIDENCE")
    if not skin and not hair:
        warnings.append("PARTIAL_RESULTS")

    return out()
