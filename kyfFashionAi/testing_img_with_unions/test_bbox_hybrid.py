"""
Test script for BOUNDING-BOX CONSTRAINED hybrid approach.

Problem with simple union:
- cloth_seg removes person BUT loses chains (fabric-only)
- u2netp keeps chains BUT keeps person (pink top, hands, shoes)
- Union = still has person

Solution:
1. Use cloth_seg to find WHERE the garment is (bounding box)
2. Expand bbox slightly to include attached accessories (chains)
3. Use u2netp mask BUT only within this expanded bbox
4. Result: garment + chains, no person upper body, no shoes
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
OUTPUT_DIR = Path(__file__).parent / "bbox_hybrid_output"
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


def resize_for_processing(img, max_size=400):
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


def get_mask_bounding_box(mask, threshold=128):
    """
    Get bounding box of non-zero pixels in mask.

    Returns:
        (y_min, y_max, x_min, x_max) or None if mask is empty
    """
    binary = (mask > threshold).astype(np.uint8)

    rows = np.any(binary > 0, axis=1)
    cols = np.any(binary > 0, axis=0)

    if not rows.any() or not cols.any():
        return None

    y_min, y_max = np.where(rows)[0][[0, -1]]
    x_min, x_max = np.where(cols)[0][[0, -1]]

    return (y_min, y_max, x_min, x_max)


def expand_bbox(bbox, img_shape, expand_ratio=0.15, expand_pixels=None):
    """
    Expand bounding box by a ratio or fixed pixels.

    Args:
        bbox: (y_min, y_max, x_min, x_max)
        img_shape: (height, width)
        expand_ratio: expand by this ratio of bbox size
        expand_pixels: if set, expand by fixed pixels instead

    Returns:
        Expanded (y_min, y_max, x_min, x_max)
    """
    y_min, y_max, x_min, x_max = bbox
    h, w = img_shape

    bbox_h = y_max - y_min
    bbox_w = x_max - x_min

    if expand_pixels is not None:
        dy = expand_pixels
        dx = expand_pixels
    else:
        dy = int(bbox_h * expand_ratio)
        dx = int(bbox_w * expand_ratio)

    # Expand (but clip to image bounds)
    y_min_new = max(0, y_min - dy)
    y_max_new = min(h - 1, y_max + dy)
    x_min_new = max(0, x_min - dx)
    x_max_new = min(w - 1, x_max + dx)

    return (y_min_new, y_max_new, x_min_new, x_max_new)


def create_bbox_mask(shape, bbox):
    """Create a binary mask with 255 inside bbox, 0 outside."""
    mask = np.zeros(shape, dtype=np.uint8)
    y_min, y_max, x_min, x_max = bbox
    mask[y_min:y_max+1, x_min:x_max+1] = 255
    return mask


def process_bbox_hybrid(img, cloth_seg_session, u2netp_session, item_type="Bottom"):
    """
    Bounding-box constrained hybrid approach.

    Steps:
    1. Run cloth_seg to get fabric mask
    2. Get bounding box of fabric region
    3. Expand bbox to include accessories (chains hang near garment)
    4. Run u2netp to get full foreground
    5. Intersect u2netp with expanded bbox -> keeps chains, removes person
    """
    # Resize if needed
    img_resized, scale = resize_for_processing(img, max_size=400)

    rgba = img_resized.convert("RGBA")
    orig_w, orig_h = rgba.size

    # Step 1: Run cloth_seg
    print("  Running cloth_seg...")
    t1 = time.time()
    cloth_raw = remove(rgba, session=cloth_seg_session)
    print(f"    cloth_seg done: {time.time() - t1:.2f}s")

    # Split channels and select based on item type
    upper, lower, full = split_cloth_seg_channels(cloth_raw, orig_h)

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
    print(f"    Using {channel_name} channel")

    # Step 2: Get bounding box of cloth region
    bbox = get_mask_bounding_box(cloth_mask, threshold=100)
    if bbox is None:
        print("    ERROR: No cloth detected!")
        return None

    y_min, y_max, x_min, x_max = bbox
    print(f"    Cloth bbox: y=[{y_min}, {y_max}], x=[{x_min}, {x_max}]")

    # Step 3: Expand bbox to capture accessories
    # Try multiple expansion levels
    bbox_small = expand_bbox(bbox, (orig_h, orig_w), expand_ratio=0.10)
    bbox_medium = expand_bbox(bbox, (orig_h, orig_w), expand_ratio=0.20)
    bbox_large = expand_bbox(bbox, (orig_h, orig_w), expand_ratio=0.30)

    print(f"    Expanded bbox (10%): y=[{bbox_small[0]}, {bbox_small[1]}]")
    print(f"    Expanded bbox (20%): y=[{bbox_medium[0]}, {bbox_medium[1]}]")
    print(f"    Expanded bbox (30%): y=[{bbox_large[0]}, {bbox_large[1]}]")

    # Step 4: Run u2netp
    print("  Running u2netp...")
    t2 = time.time()
    u2netp_result = remove(rgba, session=u2netp_session, post_process_mask=True)
    print(f"    u2netp done: {time.time() - t2:.2f}s")

    u2netp_mask = get_alpha_mask(u2netp_result)

    # Step 5: Create bbox masks and intersect with u2netp
    bbox_mask_small = create_bbox_mask((orig_h, orig_w), bbox_small)
    bbox_mask_medium = create_bbox_mask((orig_h, orig_w), bbox_medium)
    bbox_mask_large = create_bbox_mask((orig_h, orig_w), bbox_large)

    # Intersect: u2netp AND bbox -> only foreground within bbox
    hybrid_small = np.minimum(u2netp_mask, bbox_mask_small)
    hybrid_medium = np.minimum(u2netp_mask, bbox_mask_medium)
    hybrid_large = np.minimum(u2netp_mask, bbox_mask_large)

    # Also try: cloth_seg UNION (u2netp AND bbox)
    # This ensures we keep all fabric even if u2netp misses some
    union_small = np.maximum(cloth_mask, hybrid_small)
    union_medium = np.maximum(cloth_mask, hybrid_medium)
    union_large = np.maximum(cloth_mask, hybrid_large)

    # Return all results
    return {
        "cloth_only": apply_mask_to_image(img_resized, cloth_mask),
        "u2netp_only": apply_mask_to_image(img_resized, u2netp_mask),
        "bbox_10pct": apply_mask_to_image(img_resized, hybrid_small),
        "bbox_20pct": apply_mask_to_image(img_resized, hybrid_medium),
        "bbox_30pct": apply_mask_to_image(img_resized, hybrid_large),
        "union_bbox_10pct": apply_mask_to_image(img_resized, union_small),
        "union_bbox_20pct": apply_mask_to_image(img_resized, union_medium),
        "union_bbox_30pct": apply_mask_to_image(img_resized, union_large),
        "masks": {
            "cloth": cloth_mask,
            "u2netp": u2netp_mask,
            "bbox_small": bbox_mask_small,
            "bbox_medium": bbox_mask_medium,
            "hybrid_medium": hybrid_medium,
        },
        "bboxes": {
            "original": bbox,
            "small": bbox_small,
            "medium": bbox_medium,
            "large": bbox_large,
        }
    }


def crop_to_content(img, padding=10):
    """Crop image to non-transparent content with padding."""
    rgba = np.array(img.convert("RGBA"))
    alpha = rgba[:, :, 3]

    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)

    if not rows.any() or not cols.any():
        return img

    y_min, y_max = np.where(rows)[0][[0, -1]]
    x_min, x_max = np.where(cols)[0][[0, -1]]

    h, w = alpha.shape
    y_min = max(0, y_min - padding)
    y_max = min(h - 1, y_max + padding)
    x_min = max(0, x_min - padding)
    x_max = min(w - 1, x_max + padding)

    cropped = rgba[y_min:y_max+1, x_min:x_max+1]
    return Image.fromarray(cropped, "RGBA")


def draw_bbox_on_image(img, bbox, color=(255, 0, 0), thickness=2):
    """Draw a bounding box on an image for visualization."""
    img_arr = np.array(img.convert("RGB"))
    y_min, y_max, x_min, x_max = bbox
    cv2.rectangle(img_arr, (x_min, y_min), (x_max, y_max), color, thickness)
    return Image.fromarray(img_arr, "RGB")


def main():
    print("=" * 60)
    print("Bounding-Box Constrained Hybrid Test")
    print("=" * 60)

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

    # Process
    print("\nProcessing with bbox-constrained hybrid approach...")
    start = time.time()
    results = process_bbox_hybrid(img, cloth_seg_session, u2netp_session, item_type="Bottom")
    total_time = time.time() - start
    print(f"  Total processing time: {total_time:.2f}s")

    if results is None:
        print("ERROR: Processing failed!")
        return

    # Save results
    print("\nSaving results...")

    # Save original
    img.save(OUTPUT_DIR / "0_original.png")
    print("  Saved: 0_original.png")

    # Save original with bboxes drawn
    img_resized, _ = resize_for_processing(img, max_size=400)
    bbox_viz = draw_bbox_on_image(img_resized, results["bboxes"]["original"], color=(0, 255, 0))
    bbox_viz = draw_bbox_on_image(bbox_viz, results["bboxes"]["medium"], color=(255, 165, 0))
    bbox_viz.save(OUTPUT_DIR / "0_bbox_visualization.png")
    print("  Saved: 0_bbox_visualization.png (green=cloth, orange=expanded)")

    # Save each approach
    priority = ["cloth_only", "u2netp_only", "bbox_20pct", "union_bbox_20pct"]

    for i, name in enumerate(priority):
        if name in results:
            result_img = results[name]
            # Save full
            result_img.save(OUTPUT_DIR / f"1_{i}_{name}_full.png")
            print(f"  Saved: 1_{i}_{name}_full.png")
            # Save cropped
            cropped = crop_to_content(result_img)
            cropped.save(OUTPUT_DIR / f"2_{i}_{name}_cropped.png")

    # Save all other variations
    for name, result_img in results.items():
        if name in ["masks", "bboxes"] or name in priority:
            continue
        result_img.save(OUTPUT_DIR / f"3_{name}_full.png")
        print(f"  Saved: 3_{name}_full.png")

    # Save key masks
    for mask_name, mask in results["masks"].items():
        mask_img = Image.fromarray(mask, "L")
        mask_img.save(OUTPUT_DIR / f"4_mask_{mask_name}.png")
        print(f"  Saved: 4_mask_{mask_name}.png")

    print("\n" + "=" * 60)
    print("DONE! Compare these key results:")
    print("  - 1_0_cloth_only_full.png      -> Fabric only (no chains)")
    print("  - 1_1_u2netp_only_full.png     -> Full foreground (with person)")
    print("  - 1_2_bbox_20pct_full.png      -> u2netp constrained to bbox")
    print("  - 1_3_union_bbox_20pct_full.png -> cloth + bbox-constrained u2netp")
    print("")
    print("The bbox_20pct and union_bbox_20pct should:")
    print("  [x] Keep the chains (within expanded bbox)")
    print("  [x] Remove pink top/hands (above bbox)")
    print("  [x] Remove shoes (below bbox)")
    print("=" * 60)


if __name__ == "__main__":
    main()
