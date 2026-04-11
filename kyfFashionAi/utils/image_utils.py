"""
Image utility functions for wardrobe processing.
"""
import numpy as np
from PIL import Image


def has_transparency(img):
    """Check if image has significant transparency (>15% transparent pixels)."""
    if img.mode != "RGBA":
        return False
    alpha = np.array(img.split()[3])
    transparent_ratio = np.sum(alpha < 30) / alpha.size
    return transparent_ratio > 0.15


def count_opaque_ratio(img):
    """Count ratio of opaque pixels (alpha > 128) in image."""
    if img.mode != "RGBA":
        return 1.0
    alpha = np.array(img.split()[3])
    return np.sum(alpha > 128) / alpha.size


def crop_to_content(img, alpha_threshold=128):
    """
    Crop image to bounding box of opaque pixels.
    Uses alpha_threshold to ignore faint/semi-transparent pixels.
    
    Args:
        img: PIL Image in RGBA mode
        alpha_threshold: Minimum alpha value to consider opaque (0-255)
    
    Returns:
        Cropped PIL Image
    """
    rgba = img.convert("RGBA")
    alpha = np.array(rgba.split()[3])

    # Find rows and cols with pixels above threshold
    opaque_mask = alpha > alpha_threshold
    rows = np.any(opaque_mask, axis=1)
    cols = np.any(opaque_mask, axis=0)

    if not np.any(rows) or not np.any(cols):
        return img

    # Get bounding box
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]

    # Add small padding (2px)
    pad = 2
    rmin = max(0, rmin - pad)
    rmax = min(alpha.shape[0] - 1, rmax + pad)
    cmin = max(0, cmin - pad)
    cmax = min(alpha.shape[1] - 1, cmax + pad)

    return rgba.crop((cmin, rmin, cmax + 1, rmax + 1))


def rotate_piece(piece, angle):
    """Rotate image piece by angle (in degrees). Negative = clockwise."""
    if angle == 0:
        return piece
    return piece.rotate(-angle, resample=Image.BICUBIC, expand=True)
