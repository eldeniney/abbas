import json, sys, math, datetime
from pycel import ExcelCompiler
path = sys.argv[1]; mp = json.load(open(path + ".map.json"))
AR, R, YR = mp["AR"], mp["R"], mp["YR"]
from openpyxl.utils import get_column_letter as L
cols = [L(3 + i) for i in range(mp["N"])]
xl = ExcelCompiler(filename=path)
def ev(ref):
    v = xl.evaluate(ref)
    return v
out = {}
errors = []
xl.evaluate(f"Assumptions!C{AR['scen']}")
for scen in (1, 2, 3):
    xl.set_value(f"Assumptions!C{AR['scen']}", scen)
    res = {"annual": {}, "monthly": {}, "kpi": {}}
    for k, r in YR.items():
        if k.startswith("k_"):
            res["kpi"][k] = ev(f"Annual!C{r}")
        else:
            res["annual"][k] = [ev(f"Annual!{c}{r}") for c in "CDEFGH"]
    for k in ["opd", "orders", "active", "gmv", "rev", "gp", "cm", "cmo", "ebitda", "cash", "cum_fcf", "fcf", "hubs", "r_prod", "r_mp", "r_food", "r_del", "r_svc", "r_plus", "r_daas", "r_media", "r_back", "cogs", "fixed", "var", "f_acq", "pen", "new", "sat", "markazes", "orders_am", "active_am", "x_live", "acq", "nwc", "capex", "fund", "opm", "da", "taxp", "dnwc", "f_pre", "m_ebitda", "central"]:
        res["monthly"][k] = [ev(f"Model!{c}{R[k]}") for c in cols]
    res["dates"] = [str(ev(f"Model!{c}{R['date']}")) for c in cols]
    # Unit economics + revenue streams sheet
    res["ue"] = [[ev(f"'Unit Economics'!{c}{r}") for c in "ABCDEF"] for r in range(3, 26)]
    res["rs"] = [[ev(f"'Revenue Streams'!{c}{r}") for c in "BGHIJKL"] for r in range(4, mp["rs_total"] + 2)]
    res["mixcheck"] = [ev(f"Assumptions!{c}{AR['mixcheck']}") for c in "CDEFG"]
    out[scen] = res
    # error scan on a sample of everything
    def bad(v): return isinstance(v, str) and v.startswith("#") or (isinstance(v, float) and (math.isnan(v) or math.isinf(v)))
    for k, vs in res["annual"].items():
        if any(bad(v) for v in vs): errors.append((scen, "Annual", k, vs))
    for k, vs in res["monthly"].items():
        if any(bad(v) for v in vs): errors.append((scen, "Model", k, [v for v in vs if bad(v)][:2]))
    for k, v in res["kpi"].items():
        if bad(v): errors.append((scen, "KPI", k, v))
xl.evaluate(f"Assumptions!C{AR['exp_on']}")
for scen in (1, 2):
    xl.set_value(f"Assumptions!C{AR['scen']}", scen); xl.set_value(f"Assumptions!C{AR['exp_on']}", 0)
    res = {"annual": {k: [ev(f"Annual!{c}{r}") for c in "CDEFGH"] for k, r in YR.items() if not k.startswith("k_")}, "kpi": {k: ev(f"Annual!C{r}") for k, r in YR.items() if k.startswith("k_")}}
    out[f"{scen}_standalone"] = res
    print("standalone", scen, "ebitda", [round(v/1e6,2) for v in res["annual"]["ebitda"]], "markaz", [round(v/1e6,2) for v in res["annual"]["m_ebitda"]], "opd", [round(v) for v in res["annual"]["opd_dec"]], res["kpi"]["k_be"], round(res["kpi"]["k_fund"]/1e6,2))
xl.set_value(f"Assumptions!C{AR['exp_on']}", 1)
xl.set_value(f"Assumptions!C{AR['scen']}", 2)
# full scan of every formula cell in Model for scenario 2
import openpyxl
wb = openpyxl.load_workbook(path)
cnt = 0
for ws in wb.worksheets:
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value, str) and c.value.startswith("="):
                cnt += 1
                try:
                    v = xl.evaluate(f"'{ws.title}'!{c.coordinate}")
                except Exception as e:
                    errors.append(("eval", ws.title, c.coordinate, str(e)[:120])); continue
                if isinstance(v, str) and v.startswith("#"): errors.append(("val", ws.title, c.coordinate, v))
print("formulas evaluated:", cnt, "errors:", len(errors))
for e in errors[:25]: print(e)
def fmt(x): return f"{x/1e6:,.2f}M" if isinstance(x, (int, float)) and abs(x) >= 1e5 else (f"{x:,.1f}" if isinstance(x, float) else str(x))
for s in (1, 2, 3):
    a = out[s]["annual"]; k = out[s]["kpi"]
    print(f"\n=== scenario {s} ===  mix {out[s]['mixcheck']}")
    for key in ["markazes", "hubs", "active", "opd_dec", "orders", "gmv", "rev", "gp", "gpm", "cmo", "fixed", "ebitda", "ni", "fcf", "cash"]:
        print(f"{key:9}", [fmt(v) for v in a[key]])
    print({kk: (str(v) if not isinstance(v, float) else round(v, 2)) for kk, v in k.items()})
json.dump(out, open(path + ".values.json", "w"), default=str)
