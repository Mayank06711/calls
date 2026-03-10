"""
Test script for hybrid union approach: cloth_seg UNION u2netp
This preserves metal accessories (chains, zippers, buckles) that cloth_seg removes.

Approach:
1. Run cloth_seg (fabric-only mask)
2. Run u2netp (general object mask)
3. UNION the two masks → keeps both fabric AND attached accessories
4. Apply the union mask to original image
"""
import os
import sys
import time
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import cv2
import numpy as np
from PIL import Image
from rembg import remove, new_session

# Output folder
OUTPUT_DIR = Path(__file__).parent / "hybrid_output"
OUTPUT_DIR.mkdir(exist_ok=True)

# Input image
INPUT_IMG = Path(__file__).parent / "pantscrenshot.png"


def load_sessions():
    """Load rembg sessions for both models."""
    print("Loading models...")
    start = time.time()

    # u2netp - fast general background removal
    u2netp = new_session("u2netp")
    print(f"  u2netp loaded: {time.time() - start:.2f}s")

    # u2net_cloth_seg - fabric-only segmentation (3x height output)
    cloth_seg = new_session("u2net_cloth_seg")
    print(f"  cloth_seg loaded: {time.time() - start:.2f}s")

    return u2netp, cloth_seg


def resize_for_processing(img, max_size=800):
    """Resize image if too large to prevent memory issues."""
    w, h = img.size
    if max(w, h) <= max_size:
        return img, 1.0

    scale = max_size / max(w, h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    print(f"  Resized: {w}x{h} -> {new_w}x{new_h} (scale={scale:.2f})")
    return resized, scale


def split_cloth_seg_channels(cloth_seg_result, orig_h):
    """Split cloth_seg 3x output into upper, lower, full channels."""
    w, h = cloth_seg_result.size
    upper = cloth_seg_result.crop((0, 0, w, orig_h))
    lower = cloth_seg_result.crop((0, orig_h, w, orig_h * 2))
    full = cloth_seg_result.crop((0, orig_h * 2, w, orig_h * 3))
    return upper, lower, full


def get_alpha_mask(img):
    """Extract alpha channel as numpy array (0-255)."""
    rgba = np.array(img.convert("RGBA"))
    return rgba[:, :, 3]


def apply_mask_to_image(original, mask):
    """Apply a grayscale mask to an image, returning RGBA."""
    rgba = np.array(original.convert("RGBA"))
    rgba[:, :, 3] = mask
    return Image.fromarray(rgba, "RGBA")


def dilate_mask(mask, kernel_size=5, iterations=1):
    """Dilate a mask to expand edges slightly."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.dilate(mask, kernel, iterations=iterations)


def union_masks(mask1, mask2):
    """Union two masks (max of both)."""
    return np.maximum(mask1, mask2)


def process_cloth_seg_only(img, cloth_seg_session, item_type="Bottom"):
    """Original cloth_seg approach (fabric only)."""
    rgba = img.convert("RGBA")
    orig_w, orig_h = rgba.size

    # Run cloth_seg
    cloth_raw = remove(rgba, session=cloth_seg_session)

    # Split channels
    upper, lower, full = split_cloth_seg_channels(cloth_raw, orig_h)

    # Select channel based on item type
    if item_type in ["Top", "Outerwear"]:
        result = upper
    elif item_type in ["Bottom"]:
        result = lower
    else:
        result = full

    return result


def process_u2netp_only(img, u2netp_session):
    """Original u2netp approach (general object)."""
    rgba = img.convert("RGBA")
    result = remove(rgba, session=u2netp_session, post_process_mask=True)
    return result


def process_hybrid_union(img, cloth_seg_session, u2netp_session, item_type="Bottom"):
    """
    Hybrid approach: cloth_seg UNION u2netp

    This preserves:
    - Fabric (from cloth_seg)
    - Metal accessories like chains, zippers (from u2netp)
    """
    # Resize if needed to prevent memory issues (cloth_seg needs small images)
    img_resized, scale = resize_for_processing(img, max_size=400)

    rgba = img_resized.convert("RGBA")
    orig_w, orig_h = rgba.size

    print("  Running cloth_seg...")
    t1 = time.time()
    cloth_raw = remove(rgba, session=cloth_seg_session)
    print(f"    cloth_seg done: {time.time() - t1:.2f}s")

    # Split cloth_seg channels
    upper, lower, full = split_cloth_seg_channels(cloth_raw, orig_h)

    # Select channel based on item type
    if item_type in ["Top", "Outerwear"]:
        cloth_result = upper
        channel_name = "upper"
    elif item_type in ["Bottom"]:
        cloth_result = lower
        channel_name = "lower"
    else:
        cloth_result = full
        channel_name = "full"

    cloth_mask = get_alpha_mask(cloth_result)

    print("  Running u2netp...")
    t2 = time.time()
    u2netp_result = remove(rgba, session=u2netp_session, post_process_mask=True)
    print(f"    u2netp done: {time.time() - t2:.2f}s")

    u2netp_mask = get_alpha_mask(u2netp_result)

    # Strategy 1: Simple union
    union_simple = union_masks(cloth_mask, u2netp_mask)

    # Strategy 2: Dilate cloth_mask first, then intersect with u2netp to capture nearby accessories
    # This helps capture chains that are close to the garment
    cloth_dilated = dilate_mask(cloth_mask, kernel_size=15, iterations=2)
    # Accessories = u2netp pixels that are near cloth but not in cloth
    accessories_mask = np.minimum(cloth_dilated, u2netp_mask)
    union_with_dilation = union_masks(cloth_mask, accessories_mask)

    # Strategy 3: Use cloth_seg as primary, add u2netp only where it overlaps dilated cloth region
    # This is more conservative - only adds accessories that are "attached" to the garment
    overlap_region = np.minimum(cloth_dilated, u2netp_mask)
    # Only add u2netp where cloth_seg is weak or missing but u2netp is strong
    u2netp_additions = np.where(
        (cloth_mask < 128) & (overlap_region > 128),
        overlap_region,
        0
    ).astype(np.uint8)
    union_conservative = union_masks(cloth_mask, u2netp_additions)

    # Apply masks to the resized image (not original)
    return {
        "cloth_only": apply_mask_to_image(img_resized, cloth_mask),
        "u2netp_only": apply_mask_to_image(img_resized, u2netp_mask),
        "union_simple": apply_mask_to_image(img_resized, union_simple),
        "union_dilated": apply_mask_to_image(img_resized, union_with_dilation),
        "union_conservative": apply_mask_to_image(img_resized, union_conservative),
        "masks": {
            "cloth": cloth_mask,
            "u2netp": u2netp_mask,
            "cloth_dilated": cloth_dilated,
        }
    }


def crop_to_content(img, padding=10):
    """Crop image to non-transparent content with padding."""
    rgba = np.array(img.convert("RGBA"))
    alpha = rgba[:, :, 3]

    # Find bounding box of non-transparent pixels
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)

    if not rows.any() or not cols.any():
        return img

    y_min, y_max = np.where(rows)[0][[0, -1]]
    x_min, x_max = np.where(cols)[0][[0, -1]]

    # Add padding
    h, w = alpha.shape
    y_min = max(0, y_min - padding)
    y_max = min(h - 1, y_max + padding)
    x_min = max(0, x_min - padding)
    x_max = min(w - 1, x_max + padding)

    cropped = rgba[y_min:y_max+1, x_min:x_max+1]
    return Image.fromarray(cropped, "RGBA")


def main():
    print("=" * 60)
    print("Hybrid Union Test: cloth_seg + u2netp")
    print("=" * 60)

    # Check input exists
    if not INPUT_IMG.exists():
        print(f"ERROR: Input image not found: {INPUT_IMG}")
        return

    print(f"\nInput: {INPUT_IMG}")
    print(f"Output: {OUTPUT_DIR}")

    # Load models
    u2netp_session, cloth_seg_session = load_sessions()

    # Load image
    print("\nLoading image...")
    img = Image.open(INPUT_IMG)
    print(f"  Size: {img.size}")

    # Process with hybrid approach
    print("\nProcessing with hybrid approach...")
    start = time.time()
    results = process_hybrid_union(img, cloth_seg_session, u2netp_session, item_type="Bottom")
    total_time = time.time() - start
    print(f"  Total processing time: {total_time:.2f}s")

    # Save all results
    print("\nSaving results...")

    # Save original
    img.save(OUTPUT_DIR / "0_original.png")
    print("  Saved: 0_original.png")

    # Save each approach
    for name, result_img in results.items():
        if name == "masks":
            continue

        # Save full size
        result_img.save(OUTPUT_DIR / f"1_{name}_full.png")
        print(f"  Saved: 1_{name}_full.png")

        # Save cropped version
        cropped = crop_to_content(result_img)
        cropped.save(OUTPUT_DIR / f"2_{name}_cropped.png")
        print(f"  Saved: 2_{name}_cropped.png")

    # Save masks for debugging
    for mask_name, mask in results["masks"].items():
        mask_img = Image.fromarray(mask, "L")
        mask_img.save(OUTPUT_DIR / f"3_mask_{mask_name}.png")
        print(f"  Saved: 3_mask_{mask_name}.png")

    print("\n" + "=" * 60)
    print("DONE! Check the output folder for results:")
    print(f"  {OUTPUT_DIR}")
    print("\nCompare these files:")
    print("  - 1_cloth_only_full.png    → Original cloth_seg (loses chains)")
    print("  - 1_u2netp_only_full.png   → u2netp (keeps chains but may include person)")
    print("  - 1_union_simple_full.png  → Simple union of both masks")
    print("  - 1_union_dilated_full.png → Union with dilation (recommended)")
    print("  - 1_union_conservative_full.png → Conservative union")
    print("=" * 60)


if __name__ == "__main__":
    main()
