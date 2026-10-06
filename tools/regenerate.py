#!/usr/bin/env python3
"""Re-scan videos/<clip>/ and rewrite the DATA block in static/js/data.js.

Run after adding, removing or renaming clips:
    python3 tools/regenerate.py

Clips prefixed with a number ("0_foo", "3_bar") sort first, in numeric order;
the prefix is stripped from the label shown in the dropdown.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEOS = os.path.join(ROOT, "videos")
JS = os.path.join(ROOT, "static", "js", "data.js")

METHODS = ["VideoMaMa++", "VideoMaMa", "MatAnyone2", "MatAnyone", "MaGGIe", "MGM_inthewild"]


def order_key(name):
    m = re.match(r"^(\d+)_(.*)$", name)
    return (0, int(m.group(1)), m.group(2)) if m else (1, 0, name)


def main():
    if not os.path.isdir(VIDEOS):
        sys.exit(f"no videos/ directory at {VIDEOS}")

    clips = sorted(
        (d for d in os.listdir(VIDEOS) if os.path.isdir(os.path.join(VIDEOS, d))),
        key=order_key,
    )

    avail = {
        c: {
            m: os.path.exists(os.path.join(VIDEOS, c, m, "pred_alpha.mp4"))
            and os.path.exists(os.path.join(VIDEOS, c, m, "pred_greenscreen.mp4"))
            for m in METHODS
        }
        for c in clips
    }

    complete = all(all(v.values()) for v in avail.values())
    data = {"clips": clips, "availability": None if complete else avail}

    src = open(JS, encoding="utf-8").read()
    blob = "  const DATA = " + json.dumps(data, indent=2).replace("\n", "\n  ") + ";"
    new, n = re.subn(r"  const DATA = \{.*?\n  \};", blob, src, count=1, flags=re.S)
    if n != 1:
        sys.exit("could not locate the DATA block in data.js")

    open(JS, "w", encoding="utf-8").write(new)
    print(f"{len(clips)} clips written to {os.path.relpath(JS, ROOT)}"
          + ("" if complete else "  (some methods missing -> availability map emitted)"))


if __name__ == "__main__":
    main()
