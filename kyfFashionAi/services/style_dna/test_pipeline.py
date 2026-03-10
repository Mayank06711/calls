"""Standalone test for the Style DNA pipeline.

Usage (from venv):
    cd kyfFashionAi
    ../venv/Scripts/python -m services.style_dna.test_pipeline --tag "option_b_v1"
    ../venv/Scripts/python -m services.style_dna.test_pipeline --tag "final_run" --only monkey,bird
    ../venv/Scripts/python -m services.style_dna.test_pipeline --summary-only
"""

import sys
import json
import argparse
import logging
import os
import time
import uuid
from datetime import datetime

import psutil

# Add parent to path so we can run as module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services.style_dna.pipeline import analyze_style_dna

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

TEST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "test_full_photo")
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_JSON = os.path.join(OUTPUT_DIR, "test_results.json")  # latest run (overwritten)

process = psutil.Process(os.getpid())


def get_mem_mb():
    """Current RSS memory in MB."""
    return process.memory_info().rss / (1024 * 1024)


def compact_result(img_name, result, elapsed, mem_after, mem_delta):
    """One-line compact summary for stdout."""
    if not result:
        return f"  FAILED | {elapsed:.2f}s | {mem_after:.0f}MB"

    parts = []
    body = result.get("body")
    face = result.get("face")
    skin = result.get("skin")
    hair = result.get("hair")

    parts.append(f"B:{'Y' if body else '-'}")
    parts.append(f"F:{'Y' if face else '-'}")
    parts.append(f"S:{'Y' if skin else '-'}")
    parts.append(f"H:{'Y' if hair else '-'}")

    warns = result.get("warnings")
    if warns:
        parts.append(f"W:{','.join(warns)}")

    parts.append(f"{elapsed:.2f}s")
    parts.append(f"{mem_after:.0f}MB({mem_delta:+.0f})")

    return "  " + " | ".join(parts)


def main():
    parser = argparse.ArgumentParser(description="Style DNA pipeline tester")
    parser.add_argument("--tag", "-t", default=None, help="Tag/label for this run (searchable in JSON)")
    parser.add_argument("--only", default=None, help="Comma-separated substrings to filter images (e.g. monkey,bird)")
    parser.add_argument("--summary-only", action="store_true", help="Only print summary, skip per-image details")
    args = parser.parse_args()

    run_id = uuid.uuid4().hex[:8]
    run_tag = args.tag or run_id
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    images = sorted(
        [f for f in os.listdir(TEST_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    )

    # Filter if --only provided
    if args.only:
        filters = [f.strip().lower() for f in args.only.split(",")]
        images = [img for img in images if any(f in img.lower() for f in filters)]

    if not images:
        print(f"No test images found in {TEST_DIR}")
        return

    total_count = len(images)
    baseline_mem = get_mem_mb()
    total_start = time.perf_counter()
    peak_mem = baseline_mem
    all_results = {}
    warn_summary = {}  # warning_type -> count

    print(f"\n=== RUN: {run_tag} | {timestamp} | id:{run_id} ===")
    print(f"Images: {total_count} | Baseline RAM: {baseline_mem:.0f}MB")
    print("=" * 80)

    for i, img_name in enumerate(images, 1):
        img_path = os.path.join(TEST_DIR, img_name)

        mem_before = get_mem_mb()
        img_start = time.perf_counter()

        try:
            result = analyze_style_dna(image_path=img_path)
        except Exception as e:
            print(f"[{i}/{total_count}] {img_name}")
            print(f"  FAILED: {e}")
            result = None

        img_elapsed = time.perf_counter() - img_start
        mem_after = get_mem_mb()
        mem_delta = mem_after - mem_before
        if mem_after > peak_mem:
            peak_mem = mem_after

        # Track warnings
        if result and result.get("warnings"):
            for w in result["warnings"]:
                warn_summary[w] = warn_summary.get(w, 0) + 1

        # Store result
        all_results[img_name] = {
            "result": result,
            "perf": {
                "timeSeconds": round(img_elapsed, 2),
                "ramMB": round(mem_after, 1),
                "ramDeltaMB": round(mem_delta, 1),
            },
        }

        # Print compact line
        if not args.summary_only:
            line = compact_result(img_name, result, img_elapsed, mem_after, mem_delta)
            print(f"[{i:2d}/{total_count}] {img_name[:50]:<50s}")
            print(line)

    total_elapsed = time.perf_counter() - total_start
    avg_time = total_elapsed / total_count if total_count > 0 else 0
    final_mem = get_mem_mb()

    # ── Summary ──────────────────────────────────────────────────────────
    summary = {
        "totalImages": total_count,
        "totalTimeSeconds": round(total_elapsed, 2),
        "avgTimePerImage": round(avg_time, 2),
        "baselineRAM_MB": round(baseline_mem, 1),
        "peakRAM_MB": round(peak_mem, 1),
        "finalRAM_MB": round(final_mem, 1),
        "netRAMGrowth_MB": round(final_mem - baseline_mem, 1),
        "warningCounts": warn_summary,
    }

    # Save to JSON — both "latest" (overwritten) and timestamped archive
    output = {
        "_run_tag": run_tag,
        "_run_id": run_id,
        "_timestamp": timestamp,
        "summary": summary,
        "results": all_results,
    }
    with open(OUTPUT_JSON, "w") as f:
        json.dump(output, f, indent=2, default=str)
    # Archive copy with run ID so old runs are never lost
    archive_path = os.path.join(OUTPUT_DIR, f"test_results_{run_id}_{run_tag}.json")
    with open(archive_path, "w") as f:
        json.dump(output, f, indent=2, default=str)

    # ── Aggregate stats for quick comparison ─────────────────────────────
    body_shapes = {}
    body_methods = {}
    monk_tones = {}
    undertones = {}
    for entry in all_results.values():
        r = entry.get("result") or {}
        body = r.get("body")
        if body:
            s = body.get("shape", "?")
            body_shapes[s] = body_shapes.get(s, 0) + 1
            m = body.get("classificationMethod", "?")
            body_methods[m] = body_methods.get(m, 0) + 1
        skin = r.get("skin")
        if skin:
            mt = skin.get("monkTone")
            if mt is not None:
                monk_tones[mt] = monk_tones.get(mt, 0) + 1
            ut = skin.get("undertone")
            if ut:
                undertones[ut] = undertones.get(ut, 0) + 1

    summary["bodyShapes"] = body_shapes
    summary["bodyMethods"] = body_methods
    summary["monkTones"] = monk_tones
    summary["undertones"] = undertones

    # ── Print summary ────────────────────────────────────────────────────
    print(f"\n{'=' * 80}")
    print(f"SUMMARY — tag:{run_tag} id:{run_id}")
    print(f"{'=' * 80}")
    print(f"  Images:    {total_count}")
    print(f"  Total:     {total_elapsed:.1f}s | Avg: {avg_time:.2f}s/img")
    print(f"  RAM:       baseline={baseline_mem:.0f}MB peak={peak_mem:.0f}MB final={final_mem:.0f}MB (+{final_mem - baseline_mem:.0f}MB)")
    if warn_summary:
        print(f"  Warnings:  {warn_summary}")
    print(f"  Body:      shapes={body_shapes}")
    print(f"             methods={body_methods}")
    print(f"  Monk:      {monk_tones}")
    print(f"  Undertone: {undertones}")
    print(f"  JSON:      {OUTPUT_JSON}")
    print(f"  Archive:   {archive_path}")
    print(f"{'=' * 80}")


if __name__ == "__main__":
    main()
