"""
Test script for SUBTRACT-BASED hybrid approach.

Problem with bbox approach:
- Pants waistband is at top of image (y=0)
- Bounding box includes almost entire image
- Doesn't remove the pink top/hands

New approach:
1. cloth_seg "upper" channel = pink top/jacket the person is holding
2. cloth_seg "lower" channel = the pants we want
3. u2netp = full foreground (pants + chains + pink top + hands + shoes)
4. SUBTRACT: u2netp MINUS dilated(upper) = removes the pink top!
5. INTERSECT with dilated(lower) bbox = removes shoes, keeps chains
"""
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import cv2
import numpy as np
from PIL import Image
from rembg import remove, new_session

OUTPUT_DIR = Path(__file__).parent / "subtract_hybrid_output"
OUTPUT_DIR.mkdir(exist_ok=True)

INPUT_IMG = Path(__file__).parent / "pantscrenshot.png"


def load_sessions():
    print("Loading models...")
    start = time.time()
    u2netp = new_session("u2netp")
    print(f"  u2netp loaded: {time.time() - start:.2f}s")
    cloth_seg = new_session("u2net_cloth_seg")
    print(f"  cloth_seg loaded: {time.time() - start:.2f}s")
    return u2netp, cloth_seg


def resize_for_processing(img, max_size=400):
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
    w, h = cloth_seg_result.size
    upper = cloth_seg_result.crop((0, 0, w, orig_h))
    lower = cloth_seg_result.crop((0, orig_h, w, orig_h * 2))
    full = cloth_seg_result.crop((0, orig_h * 2, w, orig_h * 3))
    return upper, lower, full


def get_alpha_mask(img):
    rgba = np.array(img.convert("RGBA"))
    return rgba[:, :, 3]


def apply_mask_to_image(original, mask):
    rgba = np.array(original.convert("RGBA"))
    rgba[:, :, 3] = mask
    return Image.fromarray(rgba, "RGBA")


def dilate_mask(mask, kernel_size=5, iterations=1):
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.dilate(mask, kernel, iterations=iterations)


def erode_mask(mask, kernel_size=3, iterations=1):
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.erode(mask, kernel, iterations=iterations)


def get_mask_bounding_box(mask, threshold=128):
    binary = (mask > threshold).astype(np.uint8)
    rows = np.any(binary > 0, axis=1)
    cols = np.any(binary > 0, axis=0)
    if not rows.any() or not cols.any():
        return None
    y_min, y_max = np.where(rows)[0][[0, -1]]
    x_min, x_max = np.where(cols)[0][[0, -1]]
    return (y_min, y_max, x_min, x_max)


def expand_bbox(bbox, img_shape, expand_ratio=0.15):
    y_min, y_max, x_min, x_max = bbox
    h, w = img_shape
    bbox_h = y_max - y_min
    bbox_w = x_max - x_min
    dy = int(bbox_h * expand_ratio)
    dx = int(bbox_w * expand_ratio)
    return (max(0, y_min - dy), min(h - 1, y_max + dy), max(0, x_min - dx), min(w - 1, x_max + dx))


def create_bbox_mask(shape, bbox):
    mask = np.zeros(shape, dtype=np.uint8)
    y_min, y_max, x_min, x_max = bbox
    mask[y_min:y_max+1, x_min:x_max+1] = 255
    return mask


def process_subtract_hybrid(img, cloth_seg_session, u2netp_session, item_type="Bottom"):
    """
    Subtract-based hybrid approach for "Bottom" items.

    For BOTTOM items (pants, skirts):
    1. cloth_seg upper = other clothes (top, jacket) -> SUBTRACT this
    2. cloth_seg lower = the pants -> use bbox to limit area
    3. u2netp = full foreground
    4. Result = u2netp - upper_dilated, constrained to lower_bbox
    """
    img_resized, scale = resize_for_processing(img, max_size=400)
    rgba = img_resized.convert("RGBA")
    orig_w, orig_h = rgba.size

    # Run cloth_seg
    print("  Running cloth_seg...")
    t1 = time.time()
    cloth_raw = remove(rgba, session=cloth_seg_session)
    print(f"    cloth_seg done: {time.time() - t1:.2f}s")

    upper, lower, full = split_cloth_seg_channels(cloth_raw, orig_h)

    upper_mask = get_alpha_mask(upper)
    lower_mask = get_alpha_mask(lower)
    full_mask = get_alpha_mask(full)

    print(f"    Upper mask pixels > 128: {np.sum(upper_mask > 128)}")
    print(f"    Lower mask pixels > 128: {np.sum(lower_mask > 128)}")

    # Run u2netp
    print("  Running u2netp...")
    t2 = time.time()
    u2netp_result = remove(rgba, session=u2netp_session, post_process_mask=True)
    print(f"    u2netp done: {time.time() - t2:.2f}s")

    u2netp_mask = get_alpha_mask(u2netp_result)

    # Strategy 1: Simple subtract upper from u2netp
    # Dilate upper mask to ensure we remove all of the top
    upper_dilated = dilate_mask(upper_mask, kernel_size=15, iterations=2)

    # Binary threshold upper to be more aggressive
    upper_binary = np.where(upper_dilated > 50, 255, 0).astype(np.uint8)

    # Subtract: keep u2netp where upper is NOT present
    subtract_simple = np.where(upper_binary > 128, 0, u2netp_mask).astype(np.uint8)

    # Strategy 2: Also constrain to lower bbox (removes shoes)
    lower_bbox = get_mask_bounding_box(lower_mask, threshold=100)
    if lower_bbox:
        # Expand bbox slightly for chains
        lower_bbox_exp = expand_bbox(lower_bbox, (orig_h, orig_w), expand_ratio=0.15)
        bbox_mask = create_bbox_mask((orig_h, orig_w), lower_bbox_exp)
        print(f"    Lower bbox (expanded): y=[{lower_bbox_exp[0]}, {lower_bbox_exp[1]}]")

        # Constrain to bbox
        subtract_bbox = np.minimum(subtract_simple, bbox_mask)
    else:
        subtract_bbox = subtract_simple
        print("    No lower bbox found, skipping bbox constraint")

    # Strategy 3: Union with original lower mask to ensure we keep all fabric
    union_result = np.maximum(lower_mask, subtract_bbox)

    # Strategy 4: More aggressive - also erode the upper mask from subtracted result
    # This helps with edge cases where upper/lower overlap at waist

    # Strategy 5: Vertical cut - find where upper mask ends, cut above that
    upper_rows = np.any(upper_mask > 128, axis=1)
    if upper_rows.any():
        upper_bottom_y = np.where(upper_rows)[0][-1]  # Last row with upper content
        print(f"    Upper channel ends at y={upper_bottom_y}")

        # Create vertical cut mask - everything above upper_bottom_y is removed
        vertical_cut = np.zeros_like(u2netp_mask)
        cut_y = max(0, upper_bottom_y - 10)  # Small margin
        vertical_cut[cut_y:, :] = 255

        subtract_vertical = np.minimum(u2netp_mask, vertical_cut)
    else:
        subtract_vertical = u2netp_mask
        print("    No upper content detected")

    # Combine vertical cut with lower bbox
    if lower_bbox:
        final_vertical = np.minimum(subtract_vertical, bbox_mask)
    else:
        final_vertical = subtract_vertical

    return {
        "cloth_upper": apply_mask_to_image(img_resized, upper_mask),
        "cloth_lower": apply_mask_to_image(img_resized, lower_mask),
        "u2netp_only": apply_mask_to_image(img_resized, u2netp_mask),
        "subtract_upper": apply_mask_to_image(img_resized, subtract_simple),
        "subtract_upper_bbox": apply_mask_to_image(img_resized, subtract_bbox),
        "union_result": apply_mask_to_image(img_resized, union_result),
        "vertical_cut": apply_mask_to_image(img_resized, final_vertical),
        "masks": {
            "upper": upper_mask,
            "upper_dilated": upper_dilated,
            "lower": lower_mask,
            "u2netp": u2netp_mask,
            "subtract_simple": subtract_simple,
            "vertical_cut_mask": vertical_cut if upper_rows.any() else np.zeros_like(u2netp_mask),
        }
    }


def crop_to_content(img, padding=10):
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


def main():
    print("=" * 60)
    print("Subtract-Based Hybrid Test (for BOTTOM items)")
    print("=" * 60)

    if not INPUT_IMG.exists():
        print(f"ERROR: Input image not found: {INPUT_IMG}")
        return

    print(f"\nInput: {INPUT_IMG}")
    print(f"Output: {OUTPUT_DIR}")

    u2netp_session, cloth_seg_session = load_sessions()

    print("\nLoading image...")
    img = Image.open(INPUT_IMG)
    print(f"  Size: {img.size}")

    print("\nProcessing with subtract-based hybrid approach...")
    start = time.time()
    results = process_subtract_hybrid(img, cloth_seg_session, u2netp_session, item_type="Bottom")
    total_time = time.time() - start
    print(f"  Total processing time: {total_time:.2f}s")

    print("\nSaving results...")
    img.save(OUTPUT_DIR / "0_original.png")

    # Priority outputs
    priority = [
        ("cloth_upper", "Upper channel (what we subtract)"),
        ("cloth_lower", "Lower channel (pants fabric)"),
        ("u2netp_only", "Full foreground (with person)"),
        ("subtract_upper", "u2netp minus upper"),
        ("subtract_upper_bbox", "Subtracted + bbox constraint"),
        ("vertical_cut", "Vertical cut approach"),
    ]

    for i, (name, desc) in enumerate(priority):
        if name in results:
            result_img = results[name]
            result_img.save(OUTPUT_DIR / f"1_{i}_{name}_full.png")
            print(f"  Saved: 1_{i}_{name}_full.png - {desc}")
            cropped = crop_to_content(result_img)
            cropped.save(OUTPUT_DIR / f"2_{i}_{name}_cropped.png")

    # Save masks
    for mask_name, mask in results["masks"].items():
        mask_img = Image.fromarray(mask, "L")
        mask_img.save(OUTPUT_DIR / f"3_mask_{mask_name}.png")
        print(f"  Saved: 3_mask_{mask_name}.png")

    print("\n" + "=" * 60)
    print("KEY RESULTS TO CHECK:")
    print("  1_3_subtract_upper_full.png -> Removes pink top")
    print("  1_4_subtract_upper_bbox_full.png -> Also removes shoes")
    print("  1_5_vertical_cut_full.png -> Cuts above upper channel")
    print("")
    print("Expected:")
    print("  [x] Pants visible")
    print("  [x] Chains preserved (from u2netp)")
    print("  [x] Pink top/hands removed")
    print("  [x] Shoes removed (below bbox)")
    print("=" * 60)


if __name__ == "__main__":
    main()
