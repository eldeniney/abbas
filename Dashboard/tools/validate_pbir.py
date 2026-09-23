#!/usr/bin/env python3
"""Validates every JSON file of the PBIR report against Microsoft's published schemas
(https://github.com/microsoft/json-schemas).

Usage: python3 validate_pbir.py <path-to-json-schemas-repo-clone>
"""
import os, sys, json, glob
from jsonschema import Draft7Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT7

SCHEMAS = sys.argv[1]
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "PowerBI_Source", "Attendance Dashboard.Report"))
PREFIX = "https://developer.microsoft.com/json-schemas/"


def retrieve(uri):
    rel = uri.split("#")[0][len(PREFIX):]
    path = os.path.join(SCHEMAS, rel)
    if not os.path.exists(path):
        # embedded variants are not always published; the plain schema is equivalent apart from the
        # standalone-only requirement of a "$schema" property
        path = path.replace("schema-embedded.json", "schema.json")
    doc = json.load(open(path, encoding="utf-8"))
    if uri.endswith("schema-embedded.json") and isinstance(doc.get("required"), list):
        doc["required"] = [r for r in doc["required"] if r != "$schema"]
    doc["$id"] = uri.split("#")[0]
    return Resource.from_contents(doc, default_specification=DRAFT7)


registry = Registry(retrieve=retrieve)
errors = 0
checked = 0
files = glob.glob(os.path.join(ROOT, "**", "*.json"), recursive=True) + [os.path.join(ROOT, "definition.pbir")]
for f in sorted(files):
    if "StaticResources" in f:
        continue
    d = json.load(open(f, encoding="utf-8"))
    url = d.get("$schema")
    if not url:
        print("NO SCHEMA:", f)
        continue
    schema = retrieve(url).contents
    v = Draft7Validator(schema, registry=registry)
    errs = sorted(v.iter_errors(d), key=lambda e: list(e.absolute_path))
    checked += 1
    for e in errs:
        errors += 1
        print(f"ERROR {os.path.relpath(f, ROOT)}: {'/'.join(str(p) for p in e.absolute_path)}: {e.message[:400]}")
print(f"Checked {checked} files, {errors} schema errors")
sys.exit(1 if errors else 0)
