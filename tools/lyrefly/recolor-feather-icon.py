#!/usr/bin/env python3
"""Apply a feather recolor preset to public/icons/lyrefly-feather.png."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from feather_logo_presets import ALL_PRESET_IDS, apply_to_main  # noqa: E402


def main() -> int:
    preset_id = sys.argv[1] if len(sys.argv) > 1 else "blush-mid"
    if preset_id in ("-h", "--help"):
        print("Usage: python3 tools/lyrefly/recolor-feather-icon.py <preset-id>")
        print("Presets:", ", ".join(ALL_PRESET_IDS))
        return 0
    if preset_id not in ALL_PRESET_IDS:
        print(f"Unknown preset: {preset_id}", file=sys.stderr)
        return 1
    out = apply_to_main(preset_id)
    print(f"Applied {preset_id} → {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
