#!/usr/bin/env python3
"""Cross-checks that every column/measure referenced by the report exists in the semantic model,
that visual names are unique and that navigation / tooltip targets point at real pages.
Usage: python3 check_references.py <model.bim produced by the TOM check>"""
import os, sys, json, glob, re
bim = json.load(open(sys.argv[1]))
model = bim["model"]
cols = {(t["name"], c["name"]) for t in model["tables"] for c in t.get("columns", [])}
meas = {(t["name"], m["name"]) for t in model["tables"] for m in t.get("measures", [])}
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "PowerBI_Source", "Attendance Dashboard.Report", "definition"))
pages = {os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "pages", "*")) if os.path.isdir(p)}
bad = 0
names = {}
def walk(o, f):
    global bad
    if isinstance(o, dict):
        if "Column" in o and isinstance(o["Column"], dict) and "Property" in o["Column"]:
            ent = o["Column"]["Expression"]["SourceRef"].get("Entity")
            if ent and (ent, o["Column"]["Property"]) not in cols:
                bad += 1; print("MISSING COLUMN", ent, o["Column"]["Property"], "in", f)
        if "Measure" in o and isinstance(o["Measure"], dict) and "Property" in o["Measure"]:
            ent = o["Measure"]["Expression"]["SourceRef"].get("Entity")
            if ent and (ent, o["Measure"]["Property"]) not in meas:
                bad += 1; print("MISSING MEASURE", ent, o["Measure"]["Property"], "in", f)
        for k, v in o.items():
            if k in ("navigationSection", "section") and isinstance(v, dict):
                val = v["expr"]["Literal"]["Value"].strip("'")
                if val not in pages:
                    bad += 1; print("BAD PAGE TARGET", val, "in", f)
            walk(v, f)
    elif isinstance(o, list):
        for i in o: walk(i, f)
for f in glob.glob(os.path.join(ROOT, "**", "*.json"), recursive=True):
    d = json.load(open(f))
    if f.endswith("visual.json"):
        n = d["name"]
        if n in names: bad += 1; print("DUPLICATE VISUAL NAME", n, f, names[n])
        names[n] = f
    walk(d, os.path.relpath(f, ROOT))
# metadata selectors (columnWidth / columnFormatting / dataPoint) must match a queryRef in the same visual
for f in glob.glob(os.path.join(ROOT, "pages", "*", "visuals", "*", "visual.json")):
    d = json.load(open(f))
    q = d.get("visual", {}).get("query", {}).get("queryState", {})
    refs = {p["queryRef"] for role in q.values() for p in role["projections"]}
    for objname, arr in d.get("visual", {}).get("objects", {}).items():
        for o in arr:
            sel = o.get("selector", {})
            if "metadata" in sel and sel["metadata"] not in refs:
                bad += 1; print("SELECTOR NOT IN QUERY", sel["metadata"], objname, os.path.relpath(f, ROOT))
print("pages:", len(pages), "| visuals:", len(names), "| problems:", bad)
sys.exit(1 if bad else 0)
