"""
Background removal processing for clothing items.

Two paths:
- Person photos: silueta (bg-only removal, keeps person+garment) ~0.5-1s
- Product photos: u2netp (bg removal, keeps product) ~0.3-0.5s

Legacy: cloth_seg functions kept below but no longer called in production.
"""
import cv2
import numpy as np
from PIL import Image
from rembg import remove

from config import TYPE_TO_CLOTHSEG_CHANNEL
from utils.image_utils import has_transparency, count_opaque_ratio


def split_cloth_seg_channels(cloth_seg_result, orig_h):
    """
    Split cloth_seg 3x output into upper, lower, full channels.

    cloth_seg returns a 3x height image with:
    - Top third: upper body (shirts, jackets)
    - Middle third: lower body (pants, skirts)
    - Bottom third: full body (dresses)

    Args:
        cloth_seg_result: PIL Image (3x original height)
        orig_h: Original image height

    Returns:
        Tuple of (upper, lower, full) PIL Images
    """
    w, h = cloth_seg_result.size
    upper = cloth_seg_result.crop((0, 0, w, orig_h))
    lower = cloth_seg_result.crop((0, orig_h, w, orig_h * 2))
    full  = cloth_seg_result.crop((0, orig_h * 2, w, orig_h * 3))
    return upper, lower, full


def cleanup_alpha_mask(img, alpha_threshold=180, erode_size=3, dilate_size=2):
    """
    Clean up cloth_seg output by:
    1. Binary threshold the alpha channel (remove faint artifacts)
    2. Apply morphological opening (erosion then dilation) to remove noise

    This is critical for person photos to remove ghosting artifacts
    (e.g., faint jeans ghosting in upper channel when extracting shirt).

    Args:
        img: PIL RGBA image
        alpha_threshold: pixels below this alpha become fully transparent (0-255)
        erode_size: erosion kernel size (removes thin noise)
        dilate_size: dilation kernel size (restores edges after erosion)

    Returns:
        Cleaned PIL RGBA image
    """
    rgba = np.array(img.convert("RGBA"))
    alpha = rgba[:, :, 3].copy()

    # Step 1: Binary threshold - remove faint pixels
    alpha[alpha < alpha_threshold] = 0
    alpha[alpha >= alpha_threshold] = 255

    # Step 2: Morphological opening (erosion → dilation) to clean noise
    if erode_size > 0:
        kernel_erode = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (erode_size, erode_size))
        alpha = cv2.erode(alpha, kernel_erode, iterations=1)

    if dilate_size > 0:
        kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate_size, dilate_size))
        alpha = cv2.dilate(alpha, kernel_dilate, iterations=1)

    # Apply cleaned mask back
    rgba[:, :, 3] = alpha
    return Image.fromarray(rgba, "RGBA")


def process_person_bg_only(img, silueta_session):
    """
    Person photo: remove background only, keep full person + garment intact.

    Uses silueta (~44MB) — a human-silhouette bg-removal model that cleanly
    separates person+clothing from background. Works for all garment types
    including sarees, lehengas, gowns where the garment IS the person silhouette.

    Args:
        img: PIL Image (RGB or RGBA)
        silueta_session: rembg session for silueta model

    Returns:
        Tuple of (nobg_image, method_name)
    """
    rgba = img.convert("RGBA")

    # Skip if already has transparency
    if has_transparency(rgba):
        return rgba, "skip_transparent"

    result = remove(rgba, session=silueta_session)
    return result, "silueta_bg_only"


# ── Legacy: cloth_seg (no longer used in production) ─────────────────────

def process_person_photo(img, item_type, cloth_seg_session):
    """
    Person photo: use cloth_seg and select channel based on item type.

    Process flow:
    1. Run cloth_seg (u2net_cloth_seg) → returns 3x height image
    2. Split into upper/lower/full channels
    3. Select channel based on item_type (Top→upper, Bottom→lower, etc.)
    4. Clean up alpha mask to remove artifacts (e.g., jeans ghosting in shirt)
    5. Validate result has content, fallback to full channel if empty

    Args:
        img: PIL Image (RGB or RGBA)
        item_type: "Top", "Bottom", "Outerwear", "Dress", etc.
        cloth_seg_session: rembg session for u2net_cloth_seg

    Returns:
        Tuple of (nobg_image, method_name)
        - nobg_image: PIL RGBA image with background removed
        - method_name: "cloth_seg_upper", "cloth_seg_lower", etc.
    """
    rgba = img.convert("RGBA")
    orig_w, orig_h = rgba.size

    # Run cloth_seg
    cloth_raw = remove(rgba, session=cloth_seg_session)
    raw_w, raw_h = cloth_raw.size

    # Validate output size (should be 3x height)
    if raw_h < orig_h * 2:
        # Unexpected size, return raw result
        return cloth_raw, "cloth_seg_raw"

    # Split channels
    upper, lower, full = split_cloth_seg_channels(cloth_raw, orig_h)

    # Select channel based on item type
    channel = TYPE_TO_CLOTHSEG_CHANNEL.get(item_type, "upper")

    if channel == "upper":
        result = upper
        method = "cloth_seg_upper"
    elif channel == "lower":
        result = lower
        method = "cloth_seg_lower"
    elif channel == "full":
        result = full
        method = "cloth_seg_full"
    else:
        # Combine upper + lower (fallback for unknown types)
        upper_arr = np.array(upper.convert("RGBA"))
        lower_arr = np.array(lower.convert("RGBA"))
        upper_alpha = upper_arr[:, :, 3].astype(np.float32)
        lower_alpha = lower_arr[:, :, 3].astype(np.float32)
        use_lower = lower_alpha > upper_alpha
        combined = upper_arr.copy()
        combined[use_lower] = lower_arr[use_lower]
        result = Image.fromarray(combined, "RGBA")
        method = "cloth_seg_combined"

    # Clean up mask artifacts
    # Higher threshold for upper channel to remove jeans ghosting
    threshold = 200 if channel == "upper" else 180
    result = cleanup_alpha_mask(result, alpha_threshold=threshold, erode_size=3, dilate_size=2)

    # Check if result has content
    opaque = count_opaque_ratio(result)
    if opaque < 0.01:
        # Channel is empty, fallback to full
        result = cleanup_alpha_mask(full, alpha_threshold=150)
        method = "cloth_seg_full_fallback"

    return result, method


def process_product_photo(img, u2netp_session):
    """
    Product photo: use u2netp (fast, ~1-3s).

    Process flow:
    1. Check if image already has transparency → skip processing
    2. Run u2netp with post_process_mask=True for cleaner edges

    Args:
        img: PIL Image (RGB or RGBA)
        u2netp_session: rembg session for u2netp

    Returns:
        Tuple of (nobg_image, method_name)
        - nobg_image: PIL RGBA image with background removed
        - method_name: "u2netp" or "skip_transparent"
    """
    rgba = img.convert("RGBA")

    # Skip if already has transparency (>15% transparent pixels)
    if has_transparency(rgba):
        return rgba, "skip_transparent"

    # Run u2netp with post-processing
    result = remove(rgba, session=u2netp_session, post_process_mask=True)
    return result, "u2netp"
