#!/usr/bin/env python3
"""
Validate the generated PBIR report files against Microsoft's published JSON schemas.

Schemas are fetched from https://github.com/microsoft/json-schemas (raw) into a
local cache directory and resolved offline afterwards.

Usage:  python3 tools/validate_pbir.py [--schema-dir DIR]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

try:
    from jsonschema import Draft7Validator
    from referencing import Registry, Resource
    from referencing.jsonschema import DRAFT7
except ImportError:  # pragma: no cover
    sys.exit("pip install jsonschema referencing")

RAW = "https://raw.githubusercontent.com/microsoft/json-schemas/main"
HOST = "https://developer.microsoft.com/json-schemas"
ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "PrimeSalesPerformance.Report"


def fetch(rel: str, cache: Path) -> Path:
    p = cache / rel
    if not p.exists():
        p.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["curl", "-sSf", "-o", str(p), f"{RAW}/{rel}"], check=True)
    return p


def load_store(cache: Path, roots: list[str]) -> dict:
    """Download the root schemas plus everything they reference; key by URL."""
    store: dict[str, dict] = {}
    queue = list(roots)
    seen = set()
    while queue:
        rel = queue.pop()
        if rel in seen:
            continue
        seen.add(rel)
        path = fetch(rel, cache)
        doc = json.loads(path.read_text())
        url = f"{HOST}/{rel}"
        store[url] = doc
        # some $id values spell "schema.embedded.json" while refs use "schema-embedded.json"
        if "$id" in doc:
            store[doc["$id"]] = doc
        for ref in set(re.findall(r'"\$ref"\s*:\s*"([^#"][^"]*?)(?:#[^"]*)?"', path.read_text())):
            queue.append(os.path.normpath(os.path.join(os.path.dirname(rel), ref)))
    return store


def validate(doc: dict, schema_url: str, store: dict) -> list[str]:
    schema = store[schema_url]
    registry = Registry().with_resources((url, Resource(contents=doc_, specification=DRAFT7)) for url, doc_ in store.items())
    v = Draft7Validator(schema, registry=registry)
    errs = []
    for e in sorted(v.iter_errors(doc), key=lambda e: list(e.path)):
        loc = "/".join(str(p) for p in e.path) or "<root>"
        errs.append(f"  {loc}: {e.message[:300]}")
    return errs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--schema-dir", default=str(Path(os.environ.get("PBIR_SCHEMA_CACHE", Path.home() / ".cache" / "pbir-schemas"))))
    args = ap.parse_args()
    cache = Path(args.schema_dir)

    roots = [
        "fabric/item/report/definition/visualContainer/2.0.0/schema.json",
        "fabric/item/report/definition/page/2.0.0/schema.json",
        "fabric/item/report/definition/report/2.0.0/schema.json",
        "fabric/item/report/definition/pagesMetadata/1.0.0/schema.json",
        "fabric/item/report/definitionProperties/2.0.0/schema.json",
        "fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
        "fabric/gitIntegration/platformProperties/2.0.0/schema.json",
        "fabric/pbip/pbipProperties/1.0.0/schema.json",
    ]
    store = load_store(cache, roots)

    checks: list[tuple[Path, str]] = [
        (ROOT / "PrimeSalesPerformance.pbip", f"{HOST}/fabric/pbip/pbipProperties/1.0.0/schema.json"),
        (REPORT_DIR / "definition.pbir", f"{HOST}/fabric/item/report/definitionProperties/2.0.0/schema.json"),
        (REPORT_DIR / ".platform", f"{HOST}/fabric/gitIntegration/platformProperties/2.0.0/schema.json"),
        (ROOT / "PrimeSalesPerformance.SemanticModel" / ".platform", f"{HOST}/fabric/gitIntegration/platformProperties/2.0.0/schema.json"),
        (ROOT / "PrimeSalesPerformance.SemanticModel" / "definition.pbism", f"{HOST}/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json"),
        (REPORT_DIR / "definition" / "report.json", f"{HOST}/fabric/item/report/definition/report/2.0.0/schema.json"),
        (REPORT_DIR / "definition" / "pages" / "pages.json", f"{HOST}/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json"),
    ]
    for page_json in sorted((REPORT_DIR / "definition" / "pages").glob("*/page.json")):
        checks.append((page_json, f"{HOST}/fabric/item/report/definition/page/2.0.0/schema.json"))
    for vis in sorted((REPORT_DIR / "definition" / "pages").glob("*/visuals/*/visual.json")):
        checks.append((vis, f"{HOST}/fabric/item/report/definition/visualContainer/2.0.0/schema.json"))

    failed = 0
    for path, schema_url in checks:
        errs = validate(json.loads(path.read_text()), schema_url, store)
        if errs:
            failed += 1
            print(f"FAIL {path.relative_to(ROOT)}")
            print("\n".join(errs))
    print(f"validated {len(checks)} files, {failed} failed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
