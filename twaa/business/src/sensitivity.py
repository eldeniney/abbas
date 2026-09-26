import json
from pycel import ExcelCompiler
path = "Twaa-Financial-Model.xlsx"; mp = json.load(open(path + ".map.json")); AR, YR = mp["AR"], mp["YR"]
xl = ExcelCompiler(filename=path)
def kp():
    return xl.evaluate(f"Annual!C{YR['k_fund']}"), xl.evaluate(f"Annual!C{YR['k_be']}"), xl.evaluate(f"Annual!H{YR['ebitda']}")
base = kp(); print("base", base)
out = {"base": base, "levers": []}
def run(label, cells, lo, hi):
    orig = {c: xl.evaluate(c) for c in cells}
    res = []
    for f in (lo, hi):
        for c in cells: xl.set_value(c, f(orig[c]))
        res.append(kp())
    for c in cells: xl.set_value(c, orig[c])
    out["levers"].append({"label": label, "low": res[0], "high": res[1]}); print(label, res)
run("Basket size (AOV) ±10%", [f"Assumptions!D{AR['m_aov']}"], lambda v: 0.9, lambda v: 1.1)
run("Monthly retention ±3 pp", [f"Assumptions!D{AR['m_ret']}"], lambda v: -0.03, lambda v: 0.03)
run("Order frequency ±10%", [f"Assumptions!D{AR['m_freq']}"], lambda v: 0.9, lambda v: 1.1)
run("Acquisition cost (CAC) ±20%", [f"Assumptions!D{AR['m_cac']}"], lambda v: 1.2, lambda v: 0.8)
run("Rider cost per delivery ±10%", [f"Assumptions!{c}{AR['rider']}" for c in "CDEFG"], lambda v: v * 1.1, lambda v: v * 0.9)
run("Retail front margin ±2 pp", [f"Assumptions!{c}{AR['gm_hub']}" for c in "CDEFG"], lambda v: v - 0.02, lambda v: v + 0.02)
json.dump(out, open(path + ".sens.json", "w"), default=str)
