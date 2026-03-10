"""
Test the color namer with various RGB values.
Compares old 11-name system vs new detailed naming.
"""
import time
from color_namer import get_color_name


def old_color_name_approx(r, g, b):
    """The current 11-name system from colors.py for comparison."""
    r2, g2, b2 = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(r2, g2, b2), min(r2, g2, b2)
    diff = mx - mn

    if diff == 0:
        h = 0
    elif mx == r2:
        h = (60 * ((g2 - b2) / diff) + 360) % 360
    elif mx == g2:
        h = (60 * ((b2 - r2) / diff) + 120) % 360
    else:
        h = (60 * ((r2 - g2) / diff) + 240) % 360

    s = 0 if mx == 0 else (diff / mx) * 255
    v = mx * 255

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


# Test cases: (r, g, b, description)
TEST_COLORS = [
    # === BASIC PURE COLORS ===
    (255, 0, 0, "Pure Red"),
    (0, 255, 0, "Pure Green"),
    (0, 0, 255, "Pure Blue"),
    (255, 255, 255, "Pure White"),
    (0, 0, 0, "Pure Black"),
    (128, 128, 128, "Mid Gray"),
    (255, 255, 0, "Pure Yellow"),
    (255, 0, 255, "Pure Magenta"),
    (0, 255, 255, "Pure Cyan"),

    # === FASHION-RELEVANT COLORS ===
    (0, 0, 128, "Navy"),
    (128, 0, 0, "Maroon"),
    (245, 245, 220, "Beige"),
    (128, 128, 0, "Olive"),
    (0, 128, 128, "Teal"),
    (255, 127, 80, "Coral"),
    (224, 176, 255, "Mauve/Lavender"),
    (46, 139, 87, "Sea Green"),
    (139, 69, 19, "Saddle Brown"),
    (218, 165, 32, "Goldenrod"),
    (178, 132, 190, "Dusty Purple"),
    (188, 143, 143, "Rosy Brown"),
    (210, 180, 140, "Tan"),
    (255, 218, 185, "Peach Puff"),
    (112, 128, 144, "Slate Gray"),
    (169, 169, 169, "Dark Gray"),
    (245, 222, 179, "Wheat"),
    (205, 92, 92, "Indian Red"),

    # === SUBTLE FASHION SHADES ===
    (188, 212, 176, "Sage/Mint"),
    (227, 207, 187, "Sand/Cream"),
    (183, 110, 121, "Dusty Rose"),
    (74, 78, 105, "Charcoal Blue"),
    (150, 113, 23, "Dark Mustard"),
    (86, 47, 14, "Chocolate Brown"),
    (52, 52, 52, "Near Black"),
    (240, 240, 240, "Off White"),
    (220, 20, 60, "Crimson"),
    (75, 0, 130, "Indigo"),
    (255, 165, 0, "Orange"),
    (138, 43, 226, "Blue Violet"),

    # === TRICKY EDGE CASES ===
    (100, 100, 95, "Warm Gray"),
    (95, 100, 100, "Cool Gray"),
    (200, 200, 180, "Off White/Cream"),
    (50, 50, 60, "Very Dark Blue-Gray"),
    (180, 100, 80, "Terracotta"),
    (100, 80, 60, "Brown-ish"),
]


def hex_from_rgb(r, g, b):
    return f"#{r:02x}{g:02x}{b:02x}"


def main():
    print("=" * 100)
    print(f"{'Description':<22} {'Hex':<10} {'Old (11 names)':<16} {'New Name':<22} {'Family':<16} {'Detailed':<22}")
    print("=" * 100)

    # Warm up cache
    get_color_name(0, 0, 0)

    total_time = 0
    count = 0

    for r, g, b, desc in TEST_COLORS:
        old_name = old_color_name_approx(r, g, b)

        start = time.perf_counter()
        result = get_color_name(r, g, b)
        elapsed = (time.perf_counter() - start) * 1000  # ms

        total_time += elapsed
        count += 1

        hex_val = hex_from_rgb(r, g, b)
        improved = " *" if old_name.lower() != result["name"].lower() else ""

        print(
            f"{desc:<22} {hex_val:<10} {old_name:<16} {result['name']:<22} "
            f"{result['colorFamily']:<16} {result['detailedName']:<22}{improved}"
        )

    print("=" * 100)
    print(f"\nPerformance:")
    print(f"  Total lookups: {count}")
    print(f"  Total time:    {total_time:.2f} ms")
    print(f"  Avg per call:  {total_time / count:.3f} ms")
    print(f"\n  * = name improved from old 11-bucket system")


if __name__ == "__main__":
    main()
