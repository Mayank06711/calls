"""
Color extraction and analysis for clothing items.
"""
import io
import math
from collections import Counter
from PIL import Image
from colorthief import ColorThief
from services.color_namer import get_color_name


def rgb_to_hex(r, g, b):
    """Convert RGB tuple to hex string."""
    return f"#{r:02x}{g:02x}{b:02x}"


def rgb_to_hsv_approx(r, g, b):
    """
    Convert RGB to HSV (approximate).
    Returns (hue, saturation, value) where:
    - hue: 0-360
    - saturation: 0-255
    - value: 0-255
    """
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(r, g, b), min(r, g, b)
    diff = mx - mn
    
    if diff == 0:
        h = 0
    elif mx == r:
        h = (60 * ((g - b) / diff) + 360) % 360
    elif mx == g:
        h = (60 * ((b - r) / diff) + 120) % 360
    else:
        h = (60 * ((r - g) / diff) + 240) % 360
    
    s = 0 if mx == 0 else (diff / mx) * 255
    v = mx * 255
    
    return h, s, v


def color_name_approx(r, g, b):
    """
    Approximate color name from RGB values.
    Returns one of: Black, White, Gray, Red, Orange, Yellow, Green, Cyan, Blue, Purple, Pink
    """
    h, s, v = rgb_to_hsv_approx(r, g, b)
    
    if v < 30:
        return "Black"
    if s < 15 and v > 200:
        return "White"
    if s < 20:
        return "Gray"
    if h < 15 or h >= 345:
        return "Red"
    if h < 45:
        return "Orange"
    if h < 70:
        return "Yellow"
    if h < 160:
        return "Green"
    if h < 200:
        return "Cyan"
    if h < 260:
        return "Blue"
    if h < 290:
        return "Purple"
    if h < 345:
        return "Pink"
    return "Red"


def _is_skin_tone(r, g, b):
    """Check if an RGB pixel is likely a skin tone using HSV range."""
    h, s, v = rgb_to_hsv_approx(r, g, b)
    # Skin tones: warm hue (0-50), moderate saturation, not too dark
    return 0 <= h <= 50 and 20 <= s <= 180 and 70 <= v <= 255


def extract_colors_from_nobg(nobg_img, color_count=4, filter_skin=False):
    """
    Extract dominant colors from background-removed image.

    Args:
        nobg_img: PIL Image in RGBA mode with transparent background
        color_count: Number of dominant colors to extract (default: 4)
        filter_skin: If True, exclude skin-tone pixels before analysis.
                     Use for person photos where skin would contaminate garment colors.

    Returns:
        List of dicts with format:
        [
            {
                "hex": "#rrggbb",
                "rgb": [r, g, b],
                "name": "Red",
                "percentage": 45.2
            },
            ...
        ]
    """
    rgba = nobg_img.convert("RGBA")
    pixels = list(rgba.getdata())

    # Extract only opaque pixels (alpha > 128)
    opaque_pixels = [(r, g, b) for r, g, b, a in pixels if a > 128]

    # Filter out skin-tone pixels for person photos
    if filter_skin and opaque_pixels:
        filtered = [(r, g, b) for r, g, b in opaque_pixels if not _is_skin_tone(r, g, b)]
        # Only use filtered if enough non-skin pixels remain (>20% of original)
        if len(filtered) > len(opaque_pixels) * 0.2:
            opaque_pixels = filtered

    if len(opaque_pixels) < 100:
        return []

    total_opaque = len(opaque_pixels)
    
    # Create square image from opaque pixels for ColorThief
    side = int(math.ceil(math.sqrt(len(opaque_pixels))))
    flat_img = Image.new("RGB", (side, side), (255, 255, 255))
    flat_pixels = flat_img.load()
    
    for idx, (r, g, b) in enumerate(opaque_pixels):
        x, y = idx % side, idx // side
        if y < side:
            flat_pixels[x, y] = (r, g, b)

    # Use ColorThief to get palette
    buf = io.BytesIO()
    flat_img.save(buf, format="PNG")
    buf.seek(0)

    ct = ColorThief(buf)
    try:
        palette = ct.get_palette(color_count=color_count, quality=5)
    except Exception:
        palette = [ct.get_color(quality=5)]

    # Count pixels by closest palette color
    color_counts = Counter()
    for pr, pg, pb in opaque_pixels:
        best = 0
        best_dist = float("inf")
        for i, (cr, cg, cb) in enumerate(palette):
            d = (pr - cr) ** 2 + (pg - cg) ** 2 + (pb - cb) ** 2
            if d < best_dist:
                best_dist = d
                best = i
        color_counts[best] += 1

    # Build result with percentages
    results = []
    for i, (r, g, b) in enumerate(palette):
        pct = (color_counts.get(i, 0) / total_opaque) * 100
        color_info = get_color_name(r, g, b)
        results.append({
            "hex": rgb_to_hex(r, g, b),
            "rgb": [r, g, b],
            "name": color_info["name"],
            "colorFamily": color_info["colorFamily"],
            "colorType": color_info["colorType"],
            "percentage": round(pct, 1),
        })

    # Sort by percentage (most dominant first)
    results.sort(key=lambda x: x["percentage"], reverse=True)
    return results
