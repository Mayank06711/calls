"""
Test ALL 949 colors from the hierarchy.
For each reference color, feed its RGB back into get_color_name()
and verify it maps back to itself (distance = 0).
Also shows the full naming output for every single color.
"""
import json
import time
import os
from color_namer import get_color_name, rgb_to_lab, ciede2000_batch, _load_color_data, _lab_refs

def main():
    json_path = os.path.join(os.path.dirname(__file__), "color_hierarchy.json")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Warm up cache
    get_color_name(0, 0, 0)

    print(f"Testing all {len(data)} colors from color_hierarchy.json")
    print("=" * 140)
    print(f"{'#':<5} {'Hex':<10} {'XKCD Name':<28} {'Common Name':<24} {'Family':<18} {'Color Type':<20} {'Match?':<8}")
    print("=" * 140)

    mismatches = []
    total_time = 0

    for i, entry in enumerate(data):
        r, g, b = entry["xkcd_r"], entry["xkcd_g"], entry["xkcd_b"]
        expected_xkcd = entry["xkcd_color"]
        expected_common = entry["common_color"]
        expected_family = entry["color_family"]
        expected_type = entry["color_type"]
        hex_val = entry["xkcd_color_hex"]

        start = time.perf_counter()
        result = get_color_name(r, g, b)
        elapsed = (time.perf_counter() - start) * 1000
        total_time += elapsed

        matched = result["detailedName"] == expected_xkcd
        match_str = "OK" if matched else "MISMATCH"

        print(
            f"{i+1:<5} {hex_val:<10} {expected_xkcd:<28} {result['name']:<24} "
            f"{result['colorFamily']:<18} {result['colorType']:<20} {match_str:<8}"
        )

        if not matched:
            mismatches.append({
                "index": i + 1,
                "hex": hex_val,
                "rgb": (r, g, b),
                "expected": expected_xkcd,
                "got": result["detailedName"],
                "expected_common": expected_common,
                "got_common": result["name"],
            })

    print("=" * 140)
    print(f"\nRESULTS:")
    print(f"  Total colors tested: {len(data)}")
    print(f"  Exact matches:      {len(data) - len(mismatches)}")
    print(f"  Mismatches:          {len(mismatches)}")
    print(f"  Match rate:          {((len(data) - len(mismatches)) / len(data)) * 100:.1f}%")
    print(f"\nPERFORMANCE:")
    print(f"  Total time:    {total_time:.2f} ms")
    print(f"  Avg per call:  {total_time / len(data):.3f} ms")

    if mismatches:
        print(f"\nMISMATCHES ({len(mismatches)}):")
        print("-" * 100)
        for m in mismatches:
            print(
                f"  #{m['index']} {m['hex']} RGB{m['rgb']} "
                f"Expected: {m['expected']!r} -> Got: {m['got']!r} "
                f"(common: {m['expected_common']!r} vs {m['got_common']!r})"
            )

    # Summary by color family
    print(f"\n\nCOLOR FAMILY DISTRIBUTION:")
    print("-" * 50)
    families = {}
    for entry in data:
        fam = entry["color_family"]
        families[fam] = families.get(fam, 0) + 1
    for fam, count in sorted(families.items(), key=lambda x: -x[1]):
        bar = "#" * (count // 2)
        print(f"  {fam:<18} {count:>4}  {bar}")

    # Summary by common color
    print(f"\n\nCOMMON COLOR DISTRIBUTION (121 names):")
    print("-" * 60)
    commons = {}
    for entry in data:
        c = entry["common_color"]
        commons[c] = commons.get(c, 0) + 1
    for c, count in sorted(commons.items(), key=lambda x: -x[1]):
        bar = "#" * count
        print(f"  {c:<24} {count:>3}  {bar}")


if __name__ == "__main__":
    main()
