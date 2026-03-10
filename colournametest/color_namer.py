"""
Color namer using CIEDE2000 perceptual distance against Stitch Fix color hierarchy.
Pure numpy implementation — zero external dependencies beyond numpy.
"""
import json
import os
import numpy as np

# Module-level cache
_color_data = None
_lab_refs = None


def _load_color_data():
    """Load color hierarchy JSON and pre-compute LAB values for all 949 reference colors."""
    global _color_data, _lab_refs

    if _color_data is not None:
        return

    json_path = os.path.join(os.path.dirname(__file__), "color_hierarchy.json")
    with open(json_path, "r", encoding="utf-8") as f:
        _color_data = json.load(f)

    # Build RGB array (949 x 3) and convert to LAB once
    rgb_array = np.array(
        [[c["xkcd_r"], c["xkcd_g"], c["xkcd_b"]] for c in _color_data],
        dtype=np.float64,
    )
    _lab_refs = rgb_to_lab(rgb_array)


def rgb_to_lab(rgb):
    """
    Convert RGB [0-255] to CIELAB color space.

    Args:
        rgb: numpy array of shape (N, 3) or (3,)

    Returns:
        LAB array of same shape. L in [0,100], a/b in ~[-128, 127].
    """
    single = rgb.ndim == 1
    if single:
        rgb = rgb[np.newaxis, :]

    # Step 1: sRGB gamma correction → linear RGB
    srgb = rgb / 255.0
    linear = np.where(
        srgb > 0.04045,
        np.power((srgb + 0.055) / 1.055, 2.4),
        srgb / 12.92,
    )

    # Step 2: Linear RGB → XYZ (sRGB D65 matrix)
    m = np.array([
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041],
    ])
    xyz = linear @ m.T

    # Step 3: XYZ → LAB (D65 reference white)
    ref = np.array([0.95047, 1.00000, 1.08883])
    xyz_n = xyz / ref

    epsilon = 216.0 / 24389.0
    kappa = 24389.0 / 27.0

    f = np.where(
        xyz_n > epsilon,
        np.cbrt(xyz_n),
        (kappa * xyz_n + 16.0) / 116.0,
    )

    lab = np.empty_like(rgb, dtype=np.float64)
    lab[:, 0] = 116.0 * f[:, 1] - 16.0       # L*
    lab[:, 1] = 500.0 * (f[:, 0] - f[:, 1])   # a*
    lab[:, 2] = 200.0 * (f[:, 1] - f[:, 2])   # b*

    return lab[0] if single else lab


def ciede2000_batch(lab1, lab_refs):
    """
    Vectorized CIEDE2000 distance from one LAB color to N reference LAB colors.

    Args:
        lab1: shape (3,) — single color [L, a, b]
        lab_refs: shape (N, 3) — reference colors

    Returns:
        shape (N,) — CIEDE2000 distances
    """
    L1, a1, b1 = lab1[0], lab1[1], lab1[2]
    L2 = lab_refs[:, 0]
    a2 = lab_refs[:, 1]
    b2 = lab_refs[:, 2]

    # Step 1: Chroma
    C1 = np.sqrt(a1**2 + b1**2)
    C2 = np.sqrt(a2**2 + b2**2)
    C_avg = (C1 + C2) / 2.0

    C25_7 = 6103515625.0  # 25**7
    G = 0.5 * (1.0 - np.sqrt(C_avg**7 / (C_avg**7 + C25_7)))

    # Step 2: Corrected a', C'
    a1p = a1 * (1.0 + G)
    a2p = a2 * (1.0 + G)

    C1p = np.sqrt(a1p**2 + b1**2)
    C2p = np.sqrt(a2p**2 + b2**2)

    # Step 3: Hue angles h' in [0, 2*pi]
    h1p = np.arctan2(b1, a1p) % (2.0 * np.pi)
    h2p = np.arctan2(b2, a2p) % (2.0 * np.pi)

    # Step 4: Differences
    dLp = L2 - L1
    dCp = C2p - C1p

    dhp = np.zeros_like(h2p)
    prod = C1p * C2p
    mask_zero = prod == 0
    diff = h2p - h1p

    mask_le_pi = np.abs(diff) <= np.pi
    mask_gt_pi_pos = (diff > np.pi)
    mask_gt_pi_neg = (diff < -np.pi)

    dhp = np.where(mask_zero, 0.0, diff)
    dhp = np.where(~mask_zero & mask_gt_pi_pos, diff - 2.0 * np.pi, dhp)
    dhp = np.where(~mask_zero & mask_gt_pi_neg, diff + 2.0 * np.pi, dhp)

    dHp = 2.0 * np.sqrt(C1p * C2p) * np.sin(dhp / 2.0)

    # Step 5: Averages
    Lbp = (L1 + L2) / 2.0
    Cbp = (C1p + C2p) / 2.0

    # Average hue
    hsum = h1p + h2p
    hdiff_abs = np.abs(h1p - h2p)

    hbp = np.where(
        mask_zero,
        0.0,
        np.where(
            hdiff_abs <= np.pi,
            hsum / 2.0,
            np.where(
                hsum < 2.0 * np.pi,
                hsum / 2.0 + np.pi,
                hsum / 2.0 - np.pi,
            ),
        ),
    )

    # Step 6: T
    T = (1.0
         - 0.17 * np.cos(hbp - np.pi / 6.0)
         + 0.24 * np.cos(2.0 * hbp)
         + 0.32 * np.cos(3.0 * hbp + np.pi / 30.0)
         - 0.20 * np.cos(4.0 * hbp - 63.0 * np.pi / 180.0))

    # Step 7: Rotation
    hbp_deg = np.degrees(hbp)
    hbp_deg = hbp_deg % 360.0
    dTheta = 30.0 * np.exp(-((hbp_deg - 275.0) / 25.0) ** 2)
    RC = 2.0 * np.sqrt(Cbp**7 / (Cbp**7 + C25_7))
    RT = -np.sin(2.0 * np.radians(dTheta)) * RC

    # Step 8: Weighting
    SL = 1.0 + (0.015 * (Lbp - 50.0) ** 2) / np.sqrt(20.0 + (Lbp - 50.0) ** 2)
    SC = 1.0 + 0.045 * Cbp
    SH = 1.0 + 0.015 * Cbp * T

    # Step 9: Final
    term_L = dLp / SL
    term_C = dCp / SC
    term_H = dHp / SH

    dE = np.sqrt(term_L**2 + term_C**2 + term_H**2 + RT * term_C * term_H)
    return dE


def get_color_name(r, g, b):
    """
    Get detailed color name and family for an RGB color.

    Args:
        r, g, b: int values 0-255

    Returns:
        dict with keys: name, colorFamily, detailedName, colorType
    """
    _load_color_data()

    lab_input = rgb_to_lab(np.array([r, g, b], dtype=np.float64))
    distances = ciede2000_batch(lab_input, _lab_refs)
    idx = np.argmin(distances)
    match = _color_data[idx]

    return {
        "name": match["common_color"],
        "colorFamily": match["color_family"],
        "detailedName": match["xkcd_color"],
        "colorType": match["color_type"],
    }
