"""Development-only Korean source-audio quality runner. Never labels pronunciation or ending syllables."""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path

from komos.onnx import KOMOSOnnx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio", nargs="+", type=Path)
    parser.add_argument("--revision", default="main")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    for path in args.audio:
        if not path.is_file():
            parser.error(f"missing audio file: {path}")

    started = time.perf_counter()
    model = KOMOSOnnx.from_pretrained("upskyy/komos", revision=args.revision, providers=["CPUExecutionProvider"])
    loaded = time.perf_counter()
    rows = []
    for path in args.audio:
        score_started = time.perf_counter()
        rows.append({
            "file": path.name,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "overall_korean_listening_quality_mos": model.score_long_form(path),
            "inference_seconds": round(time.perf_counter() - score_started, 3),
            "interpretation_boundary": "Not pronunciation, phoneme, ending-syllable, confidence, emotion, or personality.",
        })
    result = {
        "model": "upskyy/komos",
        "revision": args.revision,
        "runtime": "komos 0.0.2 / onnxruntime 1.23.2 / CPUExecutionProvider",
        "model_load_seconds": round(loaded - started, 3),
        "files": rows,
        "status": "quality_validation",
    }
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
