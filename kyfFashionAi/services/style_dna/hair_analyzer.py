"""Stage 4b: Hair type, color, and baldness analysis.

Uses the head region from face detection + simple CV heuristics.
No heavy CNN — keeps RAM low. Hair type classification uses
color variance and edge density as proxy features.
"""

import cv2
import numpy as np
from .interfaces import IAnalyzer, AnalysisContext


# Hair type thresholds based on edge density in hair region
# Higher edge density = curlier hair
_HAIR_EDGE_THRESHOLDS = {
    "straight": (0, 0.08),
    "wavy": (0.08, 0.16),
    "curly": (0.16, 0.28),
    "kinky": (0.28, 1.0),
}

# Hair color classification in HSV space
# Order matters — first match wins. Gray/white checked BEFORE brown catch-all.
_HAIR_COLORS = [
    # (h_lo, h_hi, s_lo, s_hi, v_lo, v_hi, name)
    (0, 180, 0, 40, 0, 50, "black"),
    (0, 180, 0, 50, 50, 110, "dark_brown"),
    (0, 180, 0, 20, 200, 255, "white"),          # white before gray
    (0, 180, 0, 35, 110, 255, "gray"),            # gray: lowered V threshold from 150→110
    (5, 25, 50, 200, 80, 180, "auburn"),
    (15, 30, 100, 255, 180, 255, "red"),
    (15, 35, 60, 200, 150, 255, "light_brown"),
    (20, 40, 60, 200, 180, 255, "strawberry_blonde"),
    (20, 45, 30, 150, 180, 255, "blonde"),
    (20, 45, 10, 60, 200, 255, "platinum_blonde"),
    (10, 30, 40, 180, 110, 220, "brown"),          # brown catch-all moved LAST
]


def _extract_hair_region(image_bgr: np.ndarray, face_bbox: tuple) -> np.ndarray | None:
    """Extract the region above and around the face as hair area."""
    if face_bbox is None:
        return None

    h, w = image_bgr.shape[:2]
    fx, fy, fw, fh = face_bbox

    # Hair region: above face (forehead to top of head) + sides
    hair_top = max(0, fy - int(fh * 0.7))
    hair_bottom = fy + int(fh * 0.15)  # Just forehead area
    hair_left = max(0, fx - int(fw * 0.15))
    hair_right = min(w, fx + fw + int(fw * 0.15))

    region = image_bgr[hair_top:hair_bottom, hair_left:hair_right]
    if region.size == 0:
        return None
    return region


def _estimate_baldness(hair_region: np.ndarray, face_bbox: tuple,
                       image_bgr: np.ndarray) -> int:
    """Estimate baldness level 0-5 (simplified Norwood scale).

    0 = full head of hair, 5 = mostly bald.
    Uses color distance from the person's own forehead skin to detect
    scalp pixels in the hair region. Adaptive to any skin tone.
    """
    if hair_region is None or hair_region.size == 0:
        return 0

    h, w = image_bgr.shape[:2]
    if face_bbox is None:
        return 0

    fx, fy, fw, fh = face_bbox

    # Sample the person's actual forehead color as skin reference
    # (top 20% of face bbox = forehead area)
    forehead_y1 = max(0, fy)
    forehead_y2 = max(0, fy + int(fh * 0.2))
    forehead_x1 = max(0, fx + int(fw * 0.25))
    forehead_x2 = min(w, fx + int(fw * 0.75))
    forehead = image_bgr[forehead_y1:forehead_y2, forehead_x1:forehead_x2]

    if forehead.size == 0:
        return 0

    # Get median forehead color in LAB (perceptually uniform)
    forehead_lab = cv2.cvtColor(forehead, cv2.COLOR_BGR2LAB)
    ref_lab = np.median(forehead_lab.reshape(-1, 3), axis=0).astype(float)

    # Convert hair region to LAB and compute color distance from skin
    hair_lab = cv2.cvtColor(hair_region, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(float)
    # Euclidean distance in LAB space to forehead skin color
    dists = np.sqrt(np.sum((hair_lab - ref_lab) ** 2, axis=1))

    # Pixels close to skin color (distance < 30 in LAB) = scalp showing
    skin_ratio = np.sum(dists < 30) / max(1, len(dists))

    if skin_ratio < 0.15:
        return 0  # Full hair
    if skin_ratio < 0.30:
        return 1  # Minor thinning
    if skin_ratio < 0.50:
        return 2  # Noticeable thinning
    if skin_ratio < 0.70:
        return 3  # Significant thinning
    if skin_ratio < 0.85:
        return 4  # Mostly bald
    return 5      # Bald


def _classify_hair_type(hair_region: np.ndarray) -> str:
    """Classify hair texture using edge density as a proxy.

    Straight hair has smooth, low-frequency patterns.
    Curly/kinky hair has high-frequency edges.
    """
    if hair_region is None or hair_region.size == 0:
        return "unknown"

    gray = cv2.cvtColor(hair_region, cv2.COLOR_BGR2GRAY)
    # Canny edge detection
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / max(1, edges.size)

    for hair_type, (lo, hi) in _HAIR_EDGE_THRESHOLDS.items():
        if lo <= edge_density < hi:
            return hair_type
    return "wavy"  # Default


def _classify_hair_color(hair_region: np.ndarray) -> dict:
    """Classify dominant hair color from HSV analysis."""
    if hair_region is None or hair_region.size == 0:
        return {"name": "unknown", "hex": "#000000"}

    # Sample center portion to avoid edges/background
    rh, rw = hair_region.shape[:2]
    margin_y, margin_x = rh // 4, rw // 4
    center = hair_region[margin_y:rh - margin_y, margin_x:rw - margin_x]
    if center.size == 0:
        center = hair_region

    hsv = cv2.cvtColor(center, cv2.COLOR_BGR2HSV)
    median_hsv = np.median(hsv.reshape(-1, 3), axis=0)
    h_val, s_val, v_val = float(median_hsv[0]), float(median_hsv[1]), float(median_hsv[2])

    # Classify
    best = "brown"
    for h_lo, h_hi, s_lo, s_hi, v_lo, v_hi, name in _HAIR_COLORS:
        if h_lo <= h_val <= h_hi and s_lo <= s_val <= s_hi and v_lo <= v_val <= v_hi:
            best = name
            break

    # Get hex from median BGR
    median_bgr = np.median(center.reshape(-1, 3), axis=0).astype(int)
    b, g, r = median_bgr
    hex_val = f"#{r:02x}{g:02x}{b:02x}"

    return {"name": best, "hex": hex_val}


class HairAnalyzer(IAnalyzer):
    """Hair type, color, and baldness from the head region above the face."""

    @property
    def name(self) -> str:
        return "hair_analyzer"

    def load(self) -> None:
        pass  # Pure CV — no model files

    def analyze(self, ctx: AnalysisContext) -> dict:
        hair_region = _extract_hair_region(ctx.image, ctx.face_bbox)

        if hair_region is None:
            return {"hair": None, "_confidence": {"hair": 0.0}}

        baldness = _estimate_baldness(hair_region, ctx.face_bbox, ctx.image)

        # If very bald, skip hair type/color
        if baldness >= 4:
            return {
                "hair": {
                    "type": "bald",
                    "color": {"name": "n/a", "hex": "#000000"},
                    "baldnessLevel": baldness,
                },
                "_confidence": {"hair": 0.7},
            }

        hair_type = _classify_hair_type(hair_region)
        hair_color = _classify_hair_color(hair_region)

        return {
            "hair": {
                "type": hair_type,
                "color": hair_color,
                "baldnessLevel": baldness,
            },
            "_confidence": {"hair": 0.75},
        }

    def cleanup(self) -> None:
        pass  # Nothing to release
