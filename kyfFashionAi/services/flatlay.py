"""
Flat-lay outfit composition service.

Generates flat-lay preview images from multiple clothing items
with adaptive positioning, shadows, and color palette display.
"""
from PIL import Image, ImageDraw, ImageFilter
from config import SLOT_SIZE_LIMITS
from utils.image_utils import crop_to_content, rotate_piece


def fit_into_slot(img, slot_type, canvas_size, max_upscale=1.5):
    """
    Fit image into slot with adaptive scaling.

    Scaling rules:
    - Downscale freely if too large
    - Upscale max 1.5x (safe) to avoid blur
    - If still too small at max upscale, return smaller (positioning handles it)

    Args:
        img: PIL Image
        slot_type: "layer", "top", "bottom", "footwear", "accessory"
        canvas_size: Target canvas size (1080, 400, etc)
        max_upscale: Maximum upscale factor (1.5 = 50% larger max)

    Returns:
        Tuple of (resized_image, scale_factor_used)
    """
    img = crop_to_content(img)
    w, h = img.size
    if w == 0 or h == 0:
        return img, 1.0

    limits = SLOT_SIZE_LIMITS.get(slot_type, {"maxWidth": 450, "maxHeight": 420})

    # Scale limits for canvas size (limits are for 1080px)
    canvas_factor = canvas_size / 1080
    max_w = int(limits["maxWidth"] * canvas_factor)
    max_h = int(limits["maxHeight"] * canvas_factor)

    # Calculate scale to fit within slot limits
    scale_to_fit = min(max_w / w, max_h / h)

    # Apply scaling rules:
    # - If image is larger than slot: downscale freely
    # - If image is smaller: upscale only up to max_upscale
    if scale_to_fit >= 1.0:
        # Image is smaller than slot - limit upscaling
        scale = min(scale_to_fit, max_upscale)
    else:
        # Image is larger than slot - downscale to fit
        scale = scale_to_fit

    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))

    return img.resize((new_w, new_h), Image.LANCZOS), scale


def paste_with_shadow(canvas, piece, paste_x, paste_y, shadow_opacity=50, shadow_blur=8, shadow_offset=5):
    """
    Paste clothing piece onto canvas with drop shadow.
    
    Args:
        canvas: PIL RGBA Image (canvas to paste onto)
        piece: PIL RGBA Image (clothing item to paste)
        paste_x, paste_y: Position to paste at
        shadow_opacity: Shadow opacity (0-255)
        shadow_blur: Shadow blur radius (pixels)
        shadow_offset: Shadow offset from piece (pixels)
    """
    pw, ph = piece.size
    shadow_pad = shadow_blur * 2
    
    # Create shadow layer
    shadow = Image.new("RGBA", (pw + shadow_pad * 2, ph + shadow_pad * 2), (0, 0, 0, 0))
    alpha = piece.split()[3]
    shadow_layer = Image.new("RGBA", (pw, ph), (0, 0, 0, shadow_opacity))
    shadow_layer.putalpha(alpha)
    shadow.paste(shadow_layer, (shadow_pad, shadow_pad), shadow_layer)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=shadow_blur))
    
    # Paste shadow first (behind piece)
    sx = paste_x - shadow_pad + shadow_offset
    sy = paste_y - shadow_pad + shadow_offset
    canvas.paste(shadow, (sx, sy), shadow)
    
    # Paste piece on top
    canvas.paste(piece, (paste_x, paste_y), piece)


def draw_color_palette_vertical(canvas, outfit_colors, position="right"):
    """
    Draw color palette as vertical circles on the side of flat-lay canvas.
    Only includes 1 dominant color per slot (layer, top, bottom, footwear).

    Args:
        canvas: PIL Image (canvas to draw on)
        outfit_colors: list of colors [{hex, rgb, slot, name}, ...]
        position: "left" or "right"
    
    Returns:
        Modified canvas with color palette drawn
    """
    canvas_w, canvas_h = canvas.size
    draw = ImageDraw.Draw(canvas)

    # Dedupe by slot (only 1 color per slot) then by hex
    seen_slots = set()
    seen_hex = set()
    unique_colors = []

    for c in outfit_colors:
        slot = c.get("slot", "unknown")
        hex_val = c["hex"]

        # Only 1 color per slot type
        if slot not in seen_slots and hex_val not in seen_hex:
            seen_slots.add(slot)
            seen_hex.add(hex_val)
            unique_colors.append(c)

        if len(unique_colors) >= 4:  # Max 4 colors (layer, top, bottom, footwear)
            break

    if not unique_colors:
        return canvas

    # Circle sizing
    circle_r = 18
    spacing = 50
    total_height = len(unique_colors) * spacing

    # Position on canvas (right side, vertically centered)
    if position == "right":
        cx = canvas_w - 45
    else:
        cx = 45

    start_y = (canvas_h - total_height) // 2 + circle_r

    for i, color in enumerate(unique_colors):
        cy = start_y + i * spacing
        r, g, b = color["rgb"]

        # Circle with subtle border
        draw.ellipse(
            [cx - circle_r, cy - circle_r, cx + circle_r, cy + circle_r],
            fill=(r, g, b),
            outline=(180, 180, 180),
            width=2
        )

    return canvas


def draw_flat_lay(items, canvas_size=1080, bg_color=(245, 245, 240), include_palette=True):
    """
    Compose flat-lay outfit image with adaptive positioning.

    Layout principles:
    - Max 1.5x upscale to avoid blur
    - Items should be close together (top overlaps bottom ~5%)
    - Layer + Top overlap naturally (layer peeks from behind)
    - Color palette on right side (1 color per slot max)

    Args:
        items: dict with keys "top", "bottom", "layer", "footwear"
               each value is (img, colors) tuple or None
               - img: PIL RGBA Image (background removed)
               - colors: list of color dicts [{hex, rgb, name, percentage}, ...]
        canvas_size: Canvas size in pixels (default: 1080)
        bg_color: Background color as (r, g, b) tuple (default: light beige)
        include_palette: If True, draw color palette on right side

    Returns:
        PIL Image (RGBA) with flat-lay composition
    """
    # Always create opaque canvas
    if bg_color is None:
        bg_color = (245, 245, 240)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (*bg_color, 255))

    # Extract images and collect colors (1 dominant color per slot)
    outfit_colors = []

    def get_img_colors(key):
        if key in items and items[key] is not None:
            img, colors = items[key]
            if colors and len(colors) > 0:
                # Add slot info and only take dominant color
                color_with_slot = colors[0].copy()
                color_with_slot["slot"] = key
                outfit_colors.append(color_with_slot)
            return img
        return None

    layer_img = get_img_colors("layer")
    top_img = get_img_colors("top")
    bottom_img = get_img_colors("bottom")
    footwear_img = get_img_colors("footwear")

    # Full canvas height (palette is on side, not bottom)
    content_height = canvas_size

    # ── Pre-calculate all piece sizes for adaptive layout ──
    layer_piece, layer_scale = None, 1.0
    top_piece, top_scale = None, 1.0
    bot_piece, bot_scale = None, 1.0
    shoe_piece, shoe_scale = None, 1.0

    lw, lh, tw, th, bw, bh, sw, sh = 0, 0, 0, 0, 0, 0, 0, 0

    if layer_img:
        layer_piece, layer_scale = fit_into_slot(layer_img.copy(), "layer", canvas_size)
        layer_piece = rotate_piece(layer_piece, -8)
        lw, lh = layer_piece.size

    if top_img:
        top_piece, top_scale = fit_into_slot(top_img.copy(), "top", canvas_size)
        top_piece = rotate_piece(top_piece, 3)
        tw, th = top_piece.size

    if bottom_img:
        bot_piece, bot_scale = fit_into_slot(bottom_img.copy(), "bottom", canvas_size)
        bot_piece = rotate_piece(bot_piece, -1)
        bw, bh = bot_piece.size

    if footwear_img:
        shoe_piece, shoe_scale = fit_into_slot(footwear_img.copy(), "footwear", canvas_size)
        sw, sh = shoe_piece.size

    # ── Calculate total height and center vertically ──
    # Items should overlap for natural layered look (no gaps)
    top_overlap = int(th * 0.10) if (top_piece or layer_piece) and bot_piece else 0  # 10% overlap
    bottom_overlap = int(bh * 0.05) if bot_piece and shoe_piece else 0  # 5% overlap

    upper_height = max(lh, th) if (layer_piece or top_piece) else 0
    total_height = upper_height + bh + sh - top_overlap - bottom_overlap

    # Small top margin
    top_margin = max(30, int((content_height - total_height) * 0.15))

    # ── Layer + Top positioning ──
    upper_bottom_y = top_margin  # Track where upper section ends

    if layer_piece and top_piece:
        # Layer peeks out ~45% from behind top (tighter grouping)
        overlap_ratio = 0.45

        # Combined width of the group (layer partially hidden)
        visible_layer_width = int(lw * (1 - overlap_ratio))
        group_width = visible_layer_width + tw

        # Center the group on canvas (shift left slightly to leave room for palette)
        group_start_x = (canvas_size - group_width) // 2 - 20

        # Layer position (left side of group)
        lx = group_start_x
        ly = top_margin

        # Top position (overlapping layer more)
        tx = group_start_x + visible_layer_width - int(tw * 0.08)  # More overlap
        ty = top_margin + int(lh * 0.06)  # Slightly lower than layer

        # Paste layer first (behind), then top (in front)
        paste_with_shadow(canvas, layer_piece, lx, ly, shadow_opacity=35, shadow_blur=10)
        paste_with_shadow(canvas, top_piece, tx, ty, shadow_opacity=45, shadow_blur=8)

        upper_bottom_y = max(ly + lh, ty + th)

    elif layer_piece:
        # Only layer, center it
        lx = (canvas_size - lw) // 2 - 20
        ly = top_margin
        paste_with_shadow(canvas, layer_piece, lx, ly, shadow_opacity=35, shadow_blur=10)
        upper_bottom_y = ly + lh

    elif top_piece:
        # Only top, center it
        tx = (canvas_size - tw) // 2 - 20
        ty = top_margin
        paste_with_shadow(canvas, top_piece, tx, ty, shadow_opacity=45, shadow_blur=8)
        upper_bottom_y = ty + th

    # ── Bottom (jeans/pants) - overlaps upper section by ~10% ──
    bottom_bottom_y = upper_bottom_y

    if bot_piece:
        bx = (canvas_size - bw) // 2 - 10  # Slight left shift
        # Position with overlap (negative gap)
        if upper_bottom_y > top_margin:
            by = upper_bottom_y - top_overlap  # Overlap upper section
        else:
            by = top_margin  # No upper section, start from top
        paste_with_shadow(canvas, bot_piece, bx, by, shadow_opacity=45, shadow_blur=8)
        bottom_bottom_y = by + bh

    # ── Footwear - positioned below bottom with slight overlap ──
    if shoe_piece:
        # Position with slight overlap
        if bottom_bottom_y > upper_bottom_y:
            sy = bottom_bottom_y - bottom_overlap
        elif upper_bottom_y > top_margin:
            sy = upper_bottom_y + 20
        else:
            sy = top_margin + 50

        # Ensure shoes don't overflow canvas
        max_shoe_y = content_height - sh - 20
        sy = min(sy, max_shoe_y)

        # Left shoe (rotated -8°)
        left_shoe = rotate_piece(shoe_piece.copy(), -8)
        lsx = int(canvas_size * 0.32) - left_shoe.size[0] // 2
        paste_with_shadow(canvas, left_shoe, lsx, sy, shadow_opacity=40, shadow_blur=6)

        # Right shoe (rotated +8°)
        right_shoe = rotate_piece(shoe_piece.copy(), 8)
        rsx = int(canvas_size * 0.62) - right_shoe.size[0] // 2
        paste_with_shadow(canvas, right_shoe, rsx, sy, shadow_opacity=40, shadow_blur=6)

    # ── Color palette on right side ──
    if include_palette and outfit_colors:
        canvas = draw_color_palette_vertical(canvas, outfit_colors, position="right")

    return canvas
