import json, datetime, html as H
V = json.load(open("Twaa-Financial-Model.xlsx.values.json")); SENS = json.load(open("Twaa-Financial-Model.xlsx.sens.json"))
MAP = json.load(open("Twaa-Financial-Model.xlsx.map.json"))
B, C, O = V["2"], V["1"], V["3"]; BS = V["2_standalone"]
YEARS = ["2027", "2028", "2029", "2030", "2031"]
def a(sc, k): return sc["annual"][k][1:]          # 2027..2031
def ser(n): d = datetime.date(1899, 12, 30) + datetime.timedelta(days=int(float(n))); return d
def mon(n): return ser(n).strftime("%b %Y")
FX = 50
def m(x, d=1): return f"{x/1e6:,.{d}f}M"
def egp(x, d=1): return f"EGP {x/1e6:,.{d}f}M"
def n0(x): return f"{x:,.0f}"
e = H.escape
months = [datetime.date(2026 + (9 + i) // 12, (9 + i) % 12 + 1, 1) for i in range(MAP["N"])]
KB = B["kpi"]
be = mon(KB["k_be"]); fund = KB["k_fund"]
gm = a(B, "gpm")

# ---------------------------------------------------------------- charts (inline SVG) -------
CAT = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"]
def zc(t): return 'zero' if t == 0 else 'grid'
def rnd(i): return 'Seed' if i == 0 else 'Series A'
def mname(i): return months[i].strftime('%b %Y')
def tip(t): return f' data-tip="{e(t)}" tabindex="0"'
def stacked_streams():
    groups = [("Retail margin", ["gp_prod_calc"]), ("Commissions", ["r_mp", "r_food"]), ("Customer fees", ["r_del", "r_svc", "r_plus"]), ("Services & brands", ["r_daas", "r_media", "r_back"])]
    vals = []
    for yi in range(5):
        row = []
        for name, keys in groups:
            tot = 0
            for k in keys:
                tot += (a(B, "r_prod")[yi] - a(B, "cogs")[yi]) if k == "gp_prod_calc" else a(B, k)[yi]
            row.append(tot)
        vals.append(row)
    W, Ht, pl, pr, pt, pb = 760, 320, 64, 150, 16, 34
    mx = max(sum(r) for r in vals) * 1.08; step = 40e6 if mx > 120e6 else 20e6
    sx = lambda i: pl + i * ((W - pl - pr) / 5) + 18; bw = (W - pl - pr) / 5 - 36
    sy = lambda v: pt + (Ht - pt - pb) * (1 - v / mx)
    out = [f'<svg viewBox="0 0 {W} {Ht}" class="chart" role="img" aria-label="Gross profit by revenue stream group, base case, 2027 to 2031">']
    t = 0
    while t <= mx:
        out.append(f'<line x1="{pl}" x2="{W - pr}" y1="{sy(t):.1f}" y2="{sy(t):.1f}" class="grid"/><text x="{pl - 8}" y="{sy(t) + 4:.1f}" class="ax" text-anchor="end">{t/1e6:.0f}M</text>'); t += step
    for yi, row in enumerate(vals):
        y0 = 0
        for gi, v in enumerate(row):
            ytop, ybot = sy(y0 + v), sy(y0)
            h = max(0, ybot - ytop - (2 if gi < 3 else 0))
            rx = 4 if gi == 3 else 0
            out.append(f'<rect x="{sx(yi):.1f}" y="{ytop + (0 if gi == 3 else 0):.1f}" width="{bw:.1f}" height="{h:.1f}" fill="{CAT[gi]}" rx="{rx}"{tip(f"{YEARS[yi]} · {groups[gi][0]}: EGP {v/1e6:,.1f}M ({v/sum(row)*100:.0f}%)")}/>')
            y0 += v
        out.append(f'<text x="{sx(yi) + bw/2:.1f}" y="{sy(sum(row)) - 6:.1f}" class="lbl" text-anchor="middle">{sum(row)/1e6:,.1f}M</text><text x="{sx(yi) + bw/2:.1f}" y="{Ht - 12}" class="ax" text-anchor="middle">{YEARS[yi]}</text>')
    y0 = 0
    for gi, v in enumerate(vals[4]):
        ym = sy(y0 + v / 2); y0 += v
        out.append(f'<text x="{W - pr + 10}" y="{ym + 4:.1f}" class="dl">{e(groups[gi][0])}</text>')
    out.append("</svg>")
    legend = "".join(f'<span><i style="background:{CAT[i]}"></i>{e(g[0])}</span>' for i, g in enumerate(groups))
    table = "<table class='data'><thead><tr><th>Stream group</th>" + "".join(f"<th>{y}</th>" for y in YEARS) + "</tr></thead><tbody>" + "".join(f"<tr><td>{e(groups[gi][0])}</td>" + "".join(f"<td>{vals[yi][gi]/1e6:,.1f}</td>" for yi in range(5)) + "</tr>" for gi in range(4)) + "</tbody></table>"
    return "".join(out), legend, table
def line_orders():
    W, Ht, pl, pr, pt, pb = 760, 300, 56, 150, 14, 30
    idx = [i for i, d in enumerate(months) if d.year >= 2027]
    series = [("Optimistic", O, "var(--c3)"), ("Base", B, "var(--c1)"), ("Conservative", C, "var(--c2)")]
    mx = max(max(s["monthly"]["opd"][i] for i in idx) for _, s, _ in series) * 1.08
    sx = lambda j: pl + j * (W - pl - pr) / (len(idx) - 1); sy = lambda v: pt + (Ht - pt - pb) * (1 - v / mx)
    out = [f'<svg viewBox="0 0 {W} {Ht}" class="chart" role="img" aria-label="Customer orders per day by scenario">']
    for t in range(0, int(mx) + 1, 1000):
        out.append(f'<line x1="{pl}" x2="{W - pr}" y1="{sy(t):.1f}" y2="{sy(t):.1f}" class="grid"/><text x="{pl - 8}" y="{sy(t) + 4:.1f}" class="ax" text-anchor="end">{t:,}</text>')
    for j, i in enumerate(idx):
        if months[i].month == 1: out.append(f'<text x="{sx(j):.1f}" y="{Ht - 10}" class="ax" text-anchor="middle">{months[i].year}</text><line x1="{sx(j):.1f}" x2="{sx(j):.1f}" y1="{Ht - pb}" y2="{Ht - pb + 4}" class="axl"/>')
    for name, s, col in series:
        pts = " ".join(f"{sx(j):.1f},{sy(s['monthly']['opd'][i]):.1f}" for j, i in enumerate(idx))
        out.append(f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width="2" stroke-linejoin="round"/>')
        last = s["monthly"]["opd"][idx[-1]]
        out.append(f'<text x="{W - pr + 8}" y="{sy(last) + 4:.1f}" class="dl">{name} · {last:,.0f}</text>')
    # hover columns
    for j, i in enumerate(idx):
        t = f"{months[i].strftime('%b %Y')} · " + " · ".join(f"{nm}: {s['monthly']['opd'][i]:,.0f}/day" for nm, s, _ in series)
        out.append(f'<rect x="{sx(j) - 5:.1f}" y="{pt}" width="10" height="{Ht - pt - pb}" class="hit"{tip(t)}/>')
    out.append("</svg>"); return "".join(out)
def cash_chart():
    W, Ht, pl, pr, pt, pb = 760, 300, 64, 110, 16, 30
    cash = B["monthly"]["cash"]; eb = B["monthly"]["ebitda"]
    mn, mx = min(0, min(cash)) , max(cash) * 1.1
    sx = lambda i: pl + i * (W - pl - pr) / (len(cash) - 1); sy = lambda v: pt + (Ht - pt - pb) * (1 - (v - mn) / (mx - mn))
    out = [f'<svg viewBox="0 0 {W} {Ht}" class="chart" role="img" aria-label="Cash balance, base case">']
    step = 10e6
    t = 0
    while t <= mx:
        out.append(f'<line x1="{pl}" x2="{W - pr}" y1="{sy(t):.1f}" y2="{sy(t):.1f}" class="{zc(t)}"/><text x="{pl - 8}" y="{sy(t) + 4:.1f}" class="ax" text-anchor="end">{t/1e6:.0f}M</text>'); t += step
    for i, d in enumerate(months):
        if d.month == 1: out.append(f'<text x="{sx(i):.1f}" y="{Ht - 10}" class="ax" text-anchor="middle">{d.year}</text>')
    area = f"{sx(0):.1f},{sy(0):.1f} " + " ".join(f"{sx(i):.1f},{sy(v):.1f}" for i, v in enumerate(cash)) + f" {sx(len(cash)-1):.1f},{sy(0):.1f}"
    out.append(f'<polygon points="{area}" class="area"/><polyline points="{" ".join(f"{sx(i):.1f},{sy(v):.1f}" for i, v in enumerate(cash))}" fill="none" stroke="var(--c1)" stroke-width="2"/>')
    for i, v in enumerate(B["monthly"]["fund"]):
        if v > 0:
            out.append(f'<line x1="{sx(i):.1f}" x2="{sx(i):.1f}" y1="{pt}" y2="{Ht - pb}" class="mark"/><text x="{sx(i) + 4:.1f}" y="{pt + 10}" class="ann">{rnd(i)} · EGP {v/1e6:.0f}M</text>')
    bi = next(i for i, v in enumerate(eb) if v > 0 and i > 20)
    out.append(f'<circle cx="{sx(bi):.1f}" cy="{sy(cash[bi]):.1f}" r="5" fill="var(--c3)" stroke="var(--surface)" stroke-width="2"/><text x="{sx(bi) - 6:.1f}" y="{sy(cash[bi]) + 20:.1f}" class="ann" text-anchor="end">EBITDA positive · {mname(bi)}</text>')
    lo = min(range(len(cash)), key=lambda i: cash[i] if i > 3 else 1e18)
    out.append(f'<circle cx="{sx(lo):.1f}" cy="{sy(cash[lo]):.1f}" r="4" fill="var(--c2)" stroke="var(--surface)" stroke-width="2"/><text x="{sx(lo):.1f}" y="{sy(cash[lo]) + 18:.1f}" class="ann" text-anchor="middle">Low point · EGP {cash[lo]/1e6:.1f}M</text>')
    out.append(f'<text x="{W - pr + 8}" y="{sy(cash[-1]) + 4:.1f}" class="dl">EGP {cash[-1]/1e6:.1f}M</text>')
    for i, v in enumerate(cash):
        out.append(f'<rect x="{sx(i) - 5:.1f}" y="{pt}" width="10" height="{Ht - pt - pb}" class="hit"{tip(mname(i) + " · cash EGP %.1fM · EBITDA EGP %.2fM" % (v/1e6, eb[i]/1e6))}/>')
    out.append("</svg>"); return "".join(out)
def ebitda_bars():
    W, Ht, pl, pr, pt, pb = 760, 280, 64, 20, 16, 30
    s1, s2 = a(B, "m_ebitda"), a(B, "ebitda")
    mn, mx = min(min(s1), min(s2)) * 1.15, max(max(s1), max(s2)) * 1.15
    sy = lambda v: pt + (Ht - pt - pb) * (1 - (v - mn) / (mx - mn)); gw = (W - pl - pr) / 5; bw = gw / 2 - 16
    out = [f'<svg viewBox="0 0 {W} {Ht}" class="chart" role="img" aria-label="Markaz-level EBITDA versus group EBITDA, base case">']
    for t in range(int(mn // 5e6) * 5, int(mx // 5e6 + 1) * 5 + 1, 5):
        v = t * 1e6
        if mn <= v <= mx: out.append(f'<line x1="{pl}" x2="{W - pr}" y1="{sy(v):.1f}" y2="{sy(v):.1f}" class="{zc(t)}"/><text x="{pl - 8}" y="{sy(v) + 4:.1f}" class="ax" text-anchor="end">{t}M</text>')
    for yi in range(5):
        for k, (vals, col, nm) in enumerate([(s1, "var(--c1)", "Markaz-level EBITDA"), (s2, "var(--c3)", "Group EBITDA")]):
            v = vals[yi]; x = pl + yi * gw + 12 + k * (bw + 4); y0, y1 = sy(max(v, 0)), sy(min(v, 0))
            out.append(f'<rect x="{x:.1f}" y="{y0:.1f}" width="{bw:.1f}" height="{max(1, y1 - y0):.1f}" fill="{col}" rx="3"{tip(f"{YEARS[yi]} · {nm}: EGP {v/1e6:,.1f}M")}/>')
            out.append(f'<text x="{x + bw/2:.1f}" y="{(y0 - 5) if v >= 0 else (y1 + 13):.1f}" class="lbl sm" text-anchor="middle">{v/1e6:,.1f}</text>')
        out.append(f'<text x="{pl + yi * gw + gw/2:.1f}" y="{Ht - 8}" class="ax" text-anchor="middle">{YEARS[yi]}</text>')
    out.append("</svg>"); return "".join(out)
def tornado():
    W, Ht, pl, pr, pt = 760, 40 + 44 * len(SENS["levers"]), 230, 60, 30
    base = SENS["base"][0]; vals = [(l["label"], l["low"][0], l["high"][0]) for l in SENS["levers"]]
    vals.sort(key=lambda r: -abs(r[1] - r[2]))
    lo = min(min(r[1], r[2]) for r in vals) * 0.95; hi = max(max(r[1], r[2]) for r in vals) * 1.02
    sx = lambda v: pl + (W - pl - pr) * (v - lo) / (hi - lo)
    out = [f'<svg viewBox="0 0 {W} {Ht}" class="chart" role="img" aria-label="Sensitivity of peak funding need">']
    out.append(f'<line x1="{sx(base):.1f}" x2="{sx(base):.1f}" y1="{pt - 12}" y2="{Ht - 6}" class="zero"/><text x="{sx(base):.1f}" y="{pt - 16}" class="ax" text-anchor="middle">Base EGP {base/1e6:.1f}M</text>')
    for j, (lab, worse, better) in enumerate(vals):
        y = pt + j * 44
        out.append(f'<text x="{pl - 10}" y="{y + 20}" class="lbl" text-anchor="end">{e(lab)}</text>')
        out.append(f'<rect x="{sx(base):.1f}" y="{y + 6}" width="{max(1, sx(worse) - sx(base)):.1f}" height="22" fill="var(--c2)" rx="3"{tip(f"{lab} — adverse: peak funding EGP {worse/1e6:.1f}M")}/>')
        out.append(f'<rect x="{sx(better):.1f}" y="{y + 6}" width="{max(1, sx(base) - sx(better)):.1f}" height="22" fill="var(--c3)" rx="3"{tip(f"{lab} — favourable: peak funding EGP {better/1e6:.1f}M")}/>')
        out.append(f'<text x="{sx(worse) + 6:.1f}" y="{y + 21}" class="ax">{worse/1e6:.1f}</text><text x="{sx(better) - 6:.1f}" y="{y + 21}" class="ax" text-anchor="end">{better/1e6:.1f}</text>')
    out.append("</svg>"); return "".join(out)
def gantt():
    lanes = [
        ("Geography", [("Abu El Matamir city", "2027-01", "2027-06", 1), ("Villages via hub 1", "2027-07", "2028-03", 1), ("Village hubs 2–3", "2028-04", "2031-12", 1), ("Hosh Issa", "2028-10", "2031-12", 3), ("Abu Hummus", "2029-04", "2031-12", 3), ("Delengat", "2029-10", "2031-12", 3), ("Kom Hamada", "2030-04", "2031-12", 3), ("Badr", "2030-10", "2031-12", 3)]),
        ("Product", [("Build: apps, OMS, dispatch", "2026-10", "2026-12", 1), ("Supermarket + food + pharmacy", "2027-01", "2027-12", 1), ("Scheduled village delivery", "2027-07", "2027-12", 4), ("Twaa+, wallet, loyalty tiers", "2028-01", "2028-06", 2), ("Automated dispatch & ETA", "2028-07", "2029-03", 4), ("Personalisation & ads platform", "2029-01", "2029-12", 2), ("Supplier portal & forecasting", "2030-01", "2031-03", 4)]),
        ("Operations", [("Hub 1 fit-out & stock", "2026-11", "2026-12", 1), ("Rider fleet & COD controls", "2027-01", "2027-06", 1), ("Village routes", "2027-07", "2028-03", 4), ("Hub-in-a-box playbook", "2028-04", "2028-09", 2), ("Regional buying & private label", "2029-01", "2031-12", 4)]),
        ("Revenue", [("Margin · commissions · fees", "2027-01", "2031-12", 1), ("DaaS", "2027-04", "2031-12", 3), ("Retail media", "2027-06", "2031-12", 2), ("Twaa+ · back margin", "2028-01", "2031-12", 4)]),
        ("Funding", [("Seed EGP 20M", "2026-10", "2026-12", 2), ("Series A EGP 22M", "2028-04", "2028-06", 2), ("Profitable growth", "2030-11", "2031-12", 3)]),
    ]
    start = datetime.date(2026, 10, 1); end = datetime.date(2032, 1, 1); total = (end - start).days
    W, pl, pr, rowh, lanepad = 1000, 110, 10, 26, 12
    def x(ds, endm=False):
        y, mo = map(int, ds.split("-")); d = datetime.date(y, mo, 1)
        if endm: d = datetime.date(y + (mo // 12), mo % 12 + 1, 1)
        return pl + (W - pl - pr) * (d - start).days / total
    y = 30; out = []; bands = []
    for lane, items in lanes:
        # pack items into rows
        rows = []
        for it in items:
            placed = False
            for r in rows:
                if x(it[1]) > r[-1] + 4: r.append(x(it[2], True)); it_row = rows.index(r); placed = True; break
            if not placed: rows.append([x(it[2], True)]); it_row = len(rows) - 1
            it += (it_row,) if False else ()
        # recompute rows assignment deterministically
        rows_end = []; assign = []
        for it in items:
            xs, xe = x(it[1]), x(it[2], True); tw = len(it[0]) * 6.3 + 10
            ext = xe if (xe - xs) > tw else xe + tw
            for ri, re_ in enumerate(rows_end):
                if xs > re_ + 6: rows_end[ri] = ext; assign.append(ri); break
            else: rows_end.append(ext); assign.append(len(rows_end) - 1)
        h = len(rows_end) * rowh + lanepad
        bands.append((lane, y, h))
        for it, ri in zip(items, assign):
            xs, xe = x(it[1]), x(it[2], True); yy = y + 6 + ri * rowh
            col = CAT[it[3] - 1]
            txt = it[0]; wpx = xe - xs
            out.append(f'<rect x="{xs:.1f}" y="{yy}" width="{max(3, wpx - 2):.1f}" height="{rowh - 6}" rx="4" fill="{col}" class="gbar"{tip(f"{lane}: {txt} · {it[1]} → {it[2]}")}/>')
            if wpx > len(txt) * 6.3 + 10: out.append(f'<text x="{xs + 6:.1f}" y="{yy + 14}" class="gtxt">{e(txt)}</text>')
            else: out.append(f'<text x="{xe + 4:.1f}" y="{yy + 14}" class="gtxt out">{e(txt)}</text>')
        y += h
    Ht = y + 8
    head = [f'<svg viewBox="0 0 {W} {Ht}" class="chart gantt" role="img" aria-label="Roadmap 2026 to 2031">']
    for yr in range(2027, 2032):
        xx = x(f"{yr}-01"); head.append(f'<line x1="{xx:.1f}" x2="{xx:.1f}" y1="18" y2="{Ht}" class="grid"/><text x="{xx + 4:.1f}" y="14" class="ax">{yr}</text>')
    for lane, yy, h in bands:
        head.append(f'<line x1="0" x2="{W}" y1="{yy}" y2="{yy}" class="lane"/><text x="0" y="{yy + 18}" class="lanet">{lane}</text>')
    nowx = x("2026-10"); 
    return "".join(head + out) + "</svg>"

s_chart, s_legend, s_table = stacked_streams()

# ---------------------------------------------------------------- content -----------------
def tbl(head, rows, cls="data"):
    return f"<table class='{cls}'><thead><tr>" + "".join(f"<th>{h}</th>" for h in head) + "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table>"
streams_rows = []
names = {"prod": "Product margin (owned inventory)", "r_mp": "Marketplace & pharmacy commission", "r_food": "Food commission", "r_del": "Delivery fees", "r_svc": "Service fee", "r_plus": "Twaa+ subscription", "r_daas": "Delivery-as-a-Service", "r_media": "Retail media", "r_back": "Supplier back margin"}
detail = [("prod", "هامش منتجات توّا", "Customer, inside shelf price", "Buy from Beheira distributors, sell at shelf price. Front margin 16% → 19%.", "Jan 2027"),
 ("r_mp", "عمولة التجار والصيدليات", "Local merchants, partner pharmacies", "11–12% of the merchant's order value, deducted at weekly payout.", "Jan 2027"),
 ("r_food", "عمولة المطاعم", "Restaurants", "17–18% of food order value.", "Jan 2027"),
 ("r_del", "رسوم التوصيل", "Customer", "EGP 17 → 25 blended (city lower, villages higher). Free above a basket threshold and for Twaa+.", "Jan 2027"),
 ("r_svc", "رسوم الخدمة", "Customer", "EGP 3 → 6 per order, shown transparently at checkout.", "Jan 2027"),
 ("r_plus", "اشتراك توّا+", "Customer", "EGP 49 → 72 per month: unlimited free delivery, double points, priority support.", "Jan 2028"),
 ("r_daas", "التوصيل كخدمة", "Merchants, for their own orders", "EGP 22 → 34 per delivery by Twaa riders.", "Apr 2027"),
 ("r_media", "إعلانات داخل التطبيق", "FMCG brands & distributors", "Sponsored slots and banners, 0.3% → 1.5% of owned-inventory GMV.", "Mid-2027"),
 ("r_back", "حوافز الموردين", "Distributors & brands", "Volume rebates and listing fees, up to 3% of owned-inventory GMV.", "Jan 2028")]
tot31 = sum((a(B, "r_prod")[4] - a(B, "cogs")[4]) if k == "prod" else a(B, k)[4] for k, *_ in detail)
for k, ar, who, price, start in detail:
    vals = [(a(B, "r_prod")[i] - a(B, "cogs")[i]) if k == "prod" else a(B, k)[i] for i in range(5)]
    streams_rows.append([f"<b>{names[k]}</b><div class='ar'>{ar}</div>", who, price, start, m(vals[0]), m(vals[2]), m(vals[4]), f"{vals[4]/tot31*100:.0f}%"])

def scen_rows(keys):
    rows = []
    for lab, k, f in keys:
        for nm, sc in (("Conservative", C), ("Base", B), ("Optimistic", O)):
            vals = a(sc, k)
            rows.append([f"<b>{lab}</b>" if nm == "Conservative" else "", nm] + [f(v) for v in vals])
    return rows
scen_tbl = tbl(["Metric", "Scenario"] + YEARS, scen_rows([("Orders per day (Dec)", "opd_dec", n0), ("GMV", "gmv", m), ("Gross profit", "gp", m), ("EBITDA", "ebitda", m), ("Cash (Dec)", "cash", m)]), "data scen")
pl_rows = []
for lab, k, f in [("Markazes live (Dec)", "markazes", n0), ("Hubs operating (Dec)", "hubs", n0), ("Active customers (Dec)", "active", n0), ("Orders per day (Dec)", "opd_dec", n0), ("Customer orders", "orders", n0), ("GMV", "gmv", m), ("Net revenue", "rev", m), ("Gross profit", "gp", m), ("Take rate (gross profit ÷ GMV)", "gpm", lambda v: f"{v*100:.1f}%"), ("Contribution margin", "cm", m), ("Contribution per order (EGP)", "cmo", lambda v: f"{v:,.1f}"), ("Operating expenses incl. acquisition", "fixed", m), ("Markaz-level EBITDA", "m_ebitda", m), ("Central costs", "central", m), ("EBITDA", "ebitda", m), ("Net income", "ni", m), ("Capex", "capex", m), ("Free cash flow", "fcf", m), ("Cash balance (Dec)", "cash", m)]:
    vals = a(B, k); pl_rows.append([f"<b>{lab}</b>" if k in ("gmv", "gp", "ebitda", "cash") else lab] + [f(v) for v in vals])
pl_tbl = tbl(["Base case (EGP)"] + YEARS, pl_rows, "data pl")

ue = {r[0]: r[1:] for r in B["ue"] if r[0]}
ue_rows = []
for lab in ["Average order value (GMV per order)", "Product margin (owned inventory)", "Marketplace commission", "Food commission", "Delivery fee", "Service fee", "Twaa+ (allocated per order)", "DaaS fees (allocated per order)", "Retail media", "Supplier back margin", "Gross profit per order (all streams)", "Rider (incl. split deliveries & DaaS drops)", "Customer promotions", "Other variable (pick, pack, payments, shrink, refunds, support)", "Contribution per order", "Fixed costs & acquisition per order", "EBITDA per order"]:
    if lab in ue:
        bold = lab in ("Gross profit per order (all streams)", "Contribution per order", "EBITDA per order", "Average order value (GMV per order)")
        ue_rows.append([f"<b>{lab}</b>" if bold else lab] + [f"{v:,.1f}" if isinstance(v, (int, float)) else "" for v in ue[lab]])
ue_tbl = tbl(["Per customer order (EGP), base"] + YEARS, ue_rows, "data ue")

# stat tiles
opd31 = a(B, "opd_dec")[4]; gmv31 = a(B, "gmv")[4]; eb31 = a(B, "ebitda")[4]
st = [("Peak funding need", egp(fund), f"≈ ${fund/FX/1e6:,.2f}M at EGP {FX}/USD · seed EGP 20M + Series A EGP 22M"),
      ("Group EBITDA positive", be, "Base case. Abu El Matamir itself is markaz-profitable in 2029"),
      ("Orders per day, Dec 2031", n0(opd31), f"{n0(a(B, 'markazes')[4])} markazes · {n0(a(B, 'hubs')[4])} hubs · {n0(a(B, 'active')[4])} active customers"),
      ("GMV 2031", egp(gmv31, 0), f"Take rate {gm[4]*100:.1f}% · EBITDA {egp(eb31)}"),
      ("Lifetime contribution ÷ CAC", f"{KB['k_ltvcac']:.1f}×", f"Year 3 · CAC EGP {float(KB['k_cac']):.0f} · payback {KB['k_payback']:.1f} months")]
tiles = "".join(f"<div class='tile'><div class='tl'>{e(t)}</div><div class='tv'>{e(v)}</div><div class='ts'>{e(s)}</div></div>" for t, v, s in st)

am_ms = BS["annual"]["m_ebitda"][1:]; am_eb = BS["annual"]["ebitda"][1:]

TOC = [("summary", "Summary"), ("canvas", "Business model canvas"), ("value", "Value for each side"), ("revenue", "Revenue streams"), ("financials", "Financial model"), ("roadmap", "Roadmap 2026–2031"), ("launch", "Launch plan"), ("risks", "Risks & sensitivities"), ("funding", "Funding & use of funds")]

canvas = f"""
<div class="bmc">
 <div class="b kp"><h4>Key partners <span class="ar">الشركاء</span></h4><ul>
  <li>FMCG distributors and wholesalers in Beheira (credit terms, rebates)</li><li>Local merchants, bakeries and dairy farms</li><li>Partner restaurants and a Twaa kitchen</li><li>Licensed partner pharmacies (OTC only)</li><li>Payment gateway and mobile wallets (cards, Meeza, Vodafone Cash, InstaPay)</li><li>SMS / WhatsApp providers, maps</li><li>Rider pool; motorcycle financing partners</li><li>Village leaders, landlords, local councils</li></ul></div>
 <div class="b ka"><h4>Key activities <span class="ar">الأنشطة</span></h4><ul><li>Assortment, buying and pricing for 1,500–3,000 SKUs</li><li>Dark-store picking and packing</li><li>Last-mile dispatch and village routing</li><li>Merchant and restaurant onboarding</li><li>Community marketing, village ambassadors</li><li>Support, returns and instant refunds</li><li>Cash-on-delivery control and reconciliation</li></ul></div>
 <div class="b kr"><h4>Key resources <span class="ar">الموارد</span></h4><ul><li>Twaa app, OMS and dispatch platform</li><li>Hub network: 1 → 8 dark stores</li><li>Trained rider fleet</li><li>Supplier relationships and credit</li><li>Village address and demand data</li><li>Brand trust: <span class="ar">نجيبهالك توّا</span></li></ul></div>
 <div class="b vp"><h4>Value propositions <span class="ar">القيمة</span></h4>
  <p class="lead">Everything the house needs, delivered in 20–60 minutes, to the city and the villages others ignore.</p>
  <ul><li><b>Customers:</b> groceries, hot food and pharmacy in one basket; Egyptian-Arabic app; cash or digital; live tracking; instant refunds; points on every order</li><li><b>Merchants &amp; restaurants:</b> new demand plus riders without hiring any; weekly payouts</li><li><b>Brands:</b> a digital shelf and ads in an untapped rural market, with sales data</li><li><b>Riders:</b> steady local per-drop income</li></ul></div>
 <div class="b cr"><h4>Customer relationships <span class="ar">العلاقة</span></h4><ul><li>Self-service app, WhatsApp support in Egyptian Arabic</li><li>Proactive tracking notifications, delivery code</li><li>نقط توّا loyalty and Twaa+ membership</li><li>Village ambassadors, community presence</li><li>Instant wallet refunds build trust</li></ul></div>
 <div class="b ch"><h4>Channels <span class="ar">القنوات</span></h4><ul><li>Android app first, iOS and web</li><li>Assisted WhatsApp ordering for first-timers</li><li>Local Facebook and WhatsApp groups</li><li>Flyers in every bag, rider branding</li><li>Merchant storefront stickers, souq-day booths</li><li>Referral: give EGP 50, get EGP 50</li></ul></div>
 <div class="b cs"><h4>Customer segments <span class="ar">الشرائح</span></h4><ul><li><b>Families</b> — weekly and top-up grocery (core)</li><li><b>Young adults</b> — snacks, drinks, hot food</li><li><b>Urgent needs</b> — milk, bread, diapers, medicine</li><li><b>Village households</b> — underserved by national apps</li><li><b>Merchants, restaurants, pharmacies</b> — supply side</li><li><b>FMCG brands</b> — advertisers</li><li>Small businesses (Phase 2, B2B)</li></ul></div>
 <div class="b cost"><h4>Cost structure <span class="ar">التكاليف</span></h4><div class="two"><ul><li>Cost of goods on owned inventory (largest line)</li><li>Rider cost per delivery (largest operating cost, EGP 27 → 35)</li><li>Hub rent, utilities and core team per hub</li></ul><ul><li>Customer acquisition and promotions</li><li>Central technology, leadership and G&amp;A</li><li>Payment fees, packaging, shrinkage, refunds</li></ul></div></div>
 <div class="b rev"><h4>Revenue streams <span class="ar">مصادر الإيراد</span></h4><div class="two"><ul><li><b>Retail margin</b> on owned inventory</li><li><b>Commissions</b> from merchants, pharmacies, restaurants</li><li><b>Customer fees:</b> delivery, service, Twaa+</li></ul><ul><li><b>Merchant services:</b> Delivery-as-a-Service</li><li><b>Brand income:</b> retail media, supplier back margin</li><li>Later: private label, B2B, fintech partnerships</li></ul></div></div>
</div>"""

value_rows = [
 ["Households (city)", "Stock-outs at the corner shop, time lost in traffic and queues", "20–40 min delivery, wide assortment, fair prices, cash accepted", "Orders per active customer per month, retention"],
 ["Households (villages)", "No national app delivers; long trips to the markaz for basics", "Scheduled village runs and a local hub within 45–75 min", "Village share of orders, repeat rate"],
 ["Local merchants & pharmacies", "Can't afford riders or an app; limited reach", "Listing, orders and riders; weekly payout; demand data", "Merchant GMV, acceptance rate"],
 ["Restaurants", "Aggregators absent or expensive; own delivery unreliable", "Delivery and marketing in one; DaaS for their own phone orders", "Food orders, prep-time SLA"],
 ["FMCG brands & distributors", "No visibility or data in rural retail", "Sponsored placement, sampling in bags, sell-out data", "Retail-media revenue per hub"],
 ["Riders", "Irregular day labour", "Per-drop pay, incentives, training and kit", "Drops per hour, rider retention"],
]

phases = [
 ("0 · Build", "Oct – Dec 2026", "Platform, hub 1 and supply ready", "Seed closed · apps built from the prototype and BRD · hub fit-out and 1,500 SKUs stocked · 25 riders hired and trained · 20 restaurants, 15 merchants, 3 partner pharmacies signed · payment gateway live · readiness checklist from the ops blueprint", "All readiness checks pass; 3 full dry-run days with staff orders", "EGP 0.72M opex · EGP 3.5M capex"),
 ("1 · Pilot", "Jan 2027", "Prove the operation with invited users", "Invite ~400 households (staff families, merchants, community leaders) in the city centre · daily ops review · fix picking, ETA and COD issues", "On-time ≥ 85% · order accuracy ≥ 98% · rating ≥ 4.5 · repeat within 14 days ≥ 40%", "EGP 60k acquisition"),
 ("2 · City launch", "Feb – Jun 2027", "Win Abu El Matamir city", "Public launch week · first-order 30% off · referral EGP 50/50 · flyers in every bag · WhatsApp groups · DaaS from April · retail-media pilots with 2 distributors", "Orders/day ≥ 150 by May · contribution per order ≥ 0 · CAC ≤ EGP 150", "EGP 200k launch month, EGP 120–160k/month"),
 ("3 · Villages", "Jul 2027 – Mar 2028", "Reach the villages from hub 1", "Scheduled village runs · village ambassadors · weekly souq-day presence · assisted WhatsApp ordering", "Village share ≥ 25% of orders · outer-zone on-time ≥ 80%", "Within run-rate budget"),
 ("4 · Densify & raise", "Apr – Sep 2028", "Village hubs and Series A", "Hub 2 opens (Apr 2028) · Twaa+ and supplier rebates live · document the hub-in-a-box playbook · raise Series A (Jun 2028)", "Abu El Matamir markaz-level EBITDA trending to break-even · Series A closed", "EGP 22M Series A"),
 ("5 · Network", "Oct 2028 – 2031", "Replicate across Beheira", "One new markaz every six months: Hosh Issa, Abu Hummus, Delengat, Kom Hamada, Badr · regional buying · private label", "Each new markaz hits the Abu El Matamir curve within ±20% by month 6; otherwise pause the next launch", "Pre-launch EGP 350k + hub EGP 650k per markaz"),
]
phase_html = "".join(f"<div class='phase'><div class='ph-h'><span class='ph-n'>{e(n)}</span><span class='ph-d'>{e(d)}</span></div><div class='ph-g'>{e(g)}</div><div class='ph-b'><div><b>What happens</b><p>{e(act)}</p></div><div><b>Gate to move on</b><p>{e(gate)}</p></div><div><b>Budget</b><p>{e(bud)}</p></div></div></div>" for n, d, g, act, gate, bud in phases)

cal = [
 ("W−10 to W−8", "Sign hub lease; order shelving and chillers", "Freeze MVP scope; start build", "Negotiate top-40 distributors", "Brand kit, bags, uniforms", "Recruit riders and pickers"),
 ("W−7 to W−5", "Fit-out; receive first stock", "Admin, picker and rider apps in QA", "Sign restaurants and pharmacies", "Teaser in local WhatsApp and Facebook groups", "Train staff on SOPs and COD"),
 ("W−4 (Jan)", "Pilot opens to ~400 invited households", "Daily fixes; monitor dashboards", "Fill assortment gaps from pilot searches", "Collect testimonials", "Daily ops review"),
 ("W−1", "Readiness sign-off", "Load test; payment live test", "Launch promos agreed with brands", "Launch-week media booked", "Rider shifts for peak"),
 ("W0 (1 Feb)", "Public launch", "War-room on call", "Stock buffer +30%", "Launch event, influencers, 30% first order", "All hands on dispatch"),
 ("W+1 to W+4", "Stabilise SLA", "Ship top-10 fixes", "Weekly price checks", "Referral push, flyers in every bag", "Recruit riders to demand"),
 ("W+5 to W+8", "DaaS pilot with 5 merchants", "Scheduled village delivery", "Distributor rebates talks", "Souq-day booths in 2 villages", "Village route trials"),
 ("W+9 to W+12", "Gate review: go to villages?", "Twaa+ design", "Retail-media pilot", "Village ambassador programme", "Hub 2 site search"),
]
cal_tbl = tbl(["When", "Operations", "Product & tech", "Supply & partners", "Marketing", "People"], [list(r) for r in cal], "data cal")

mkt = [("First-order discount (30%, inside CAC)", 25), ("WhatsApp & Facebook local groups, content", 20), ("Local influencers & launch event", 15), ("Flyers door-to-door and in every bag", 15), ("Souq-day and school-gate booths", 10), ("Referral rewards (EGP 50 / 50)", 10), ("Rider and storefront branding", 5)]
mkt_html = "".join(f"<div class='mk'><span class='mk-l'>{e(l)}</span><span class='mk-b'><i style='width:{p*3}%'></i></span><span class='mk-v'>{p}% · EGP {200*p/100:.0f}k</span></div>" for l, p in mkt)

risks = [
 ("Low order density in villages", "Hub economics need ~250+ orders/day", "Scheduled village runs, village hubs only when density proves out, gate each expansion"),
 ("Customer acquisition gets expensive", "CAC ±20% moves funding need by ~EGP 6–7M", "Referral and in-bag flyers first; stop paid spend in zones with LTV/CAC < 2"),
 ("Cash-on-delivery leakage", "COD is ~80% of payments at launch", "Delivery code, rider cash limits, daily deposit, wallet cashback to shift digital"),
 ("National players move into Beheira", "Price and promo pressure", "Local assortment and village coverage they can't match cheaply; merchant exclusivity on DaaS"),
 ("Inflation and FX", "Costs and prices move monthly", "Yearly inputs already inflate; reprice monthly; supplier credit terms protect cash"),
 ("Rider availability and quality", "SLA and brand risk", "Per-drop pay plus incentives, training, rating-based allocation"),
 ("Pharmacy regulation", "Prescription drugs are restricted", "OTC only through licensed partner pharmacies; prescription upload stays out of MVP"),
]
risk_tbl = tbl(["Risk", "Why it matters", "Mitigation"], [[f"<b>{e(r)}</b>", e(w), e(mi)] for r, w, mi in risks], "data")

# use of funds (base) — seed period (to May 2028) and Series A period
mo = B["monthly"]; opm = mo["opm"]
def sum_where(k, cond): return sum(v for v, o in zip(mo[k], opm) if cond(o))
seed_cap = sum_where("capex", lambda o: o <= 17); seed_loss = -sum_where("ebitda", lambda o: 1 <= o <= 17); seed_pre = sum_where("f_pre", lambda o: o <= 0)
seed_wc = sum_where("dnwc", lambda o: o <= 17); seed_tax = sum_where("taxp", lambda o: o <= 17)
seed_used = seed_cap + seed_loss + seed_pre + seed_wc
a_cap = sum_where("capex", lambda o: o >= 18); a_loss = -sum(min(0, v) for v, o in zip(mo["ebitda"], opm) if o >= 18)
uof = tbl(["Use of funds (base case)", "Seed · Oct 2026 → May 2028", "Series A · Jun 2028 →"], [
 ["Platform build and hubs (capex)", egp(seed_cap), egp(a_cap)],
 ["Pre-launch operations", egp(seed_pre), "—"],
 ["Operating losses until self-funding", egp(seed_loss), egp(a_loss)],
 ["Working capital (inventory net of supplier and merchant credit)", egp(seed_wc), "Self-financing (negative working capital)"],
 ["<b>Round size</b>", "<b>EGP 20.0M</b>", "<b>EGP 22.0M</b>"]], "data")

css = """
:root{--bg:#FBF7F1;--surface:#FFFFFF;--panel:#F4ECE1;--ink:#241626;--ink2:#4E3F50;--muted:#6E5F70;--line:#E4D8CB;--plum:#3A1F3D;--accent:#C4541B;--c1:#86458C;--c2:#EE6A26;--c3:#0E9AA7;--c4:#B98E14;--ok:#2E7D4F;--warn:#9A6B00;--bad:#B23A3A;--head-bg:#3A1F3D;--head-ink:#F9F2E7}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#150D17;--surface:#1D1320;--panel:#26192A;--ink:#F3EAF2;--ink2:#D8CAD9;--muted:#B3A2B5;--line:#3A2B3D;--plum:#E2C7E5;--accent:#F08A4B;--c1:#B27BB8;--c2:#E0662A;--c3:#16A7B3;--c4:#B98E14;--ok:#5FC08A;--warn:#E3B341;--bad:#F07B7B;--head-bg:#2C1B30;--head-ink:#F9F2E7}}
:root[data-theme="dark"]{--bg:#150D17;--surface:#1D1320;--panel:#26192A;--ink:#F3EAF2;--ink2:#D8CAD9;--muted:#B3A2B5;--line:#3A2B3D;--plum:#E2C7E5;--accent:#F08A4B;--c1:#B27BB8;--c2:#E0662A;--c3:#16A7B3;--c4:#B98E14;--ok:#5FC08A;--warn:#E3B341;--bad:#F07B7B;--head-bg:#2C1B30;--head-ink:#F9F2E7}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 "IBM Plex Sans","IBM Plex Sans Arabic",system-ui,sans-serif;font-variant-numeric:tabular-nums}
.ar{font-family:"IBM Plex Sans Arabic","IBM Plex Sans",sans-serif;direction:rtl;unicode-bidi:isolate;color:var(--muted);font-weight:500}
.wrap{display:grid;grid-template-columns:220px minmax(0,1fr);gap:40px;max-width:1280px;margin:0 auto;padding:0 24px}
nav.toc{position:sticky;top:0;align-self:start;padding:28px 0;font-size:13.5px}nav.toc .brand{font-family:"Baloo Bhaijaan 2",sans-serif;font-weight:800;font-size:26px;color:var(--plum);line-height:1}nav.toc .brand span{color:var(--accent)}nav.toc .tag{color:var(--muted);font-size:12px;margin:4px 0 18px}
nav.toc a{display:block;color:var(--ink2);text-decoration:none;padding:6px 10px;border-radius:6px}nav.toc a:hover,nav.toc a:focus-visible{background:var(--panel);color:var(--ink);outline:none}
nav.toc .dl{margin-top:18px;display:grid;gap:8px}nav.toc .dl a{background:var(--plum);color:var(--bg);font-weight:600;text-align:center}nav.toc .dl a.alt{background:transparent;border:1px solid var(--line);color:var(--ink)}
main{padding:28px 0 80px;min-width:0}
header.top h1{font-family:"Baloo Bhaijaan 2",sans-serif;font-size:40px;line-height:1.1;margin:8px 0 6px;color:var(--plum);text-wrap:balance;font-weight:800}header.top .sub{color:var(--ink2);max-width:760px;font-size:16px}
.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:11.5px;font-weight:600;color:var(--accent)}
section{padding-top:40px;scroll-margin-top:10px}section h2{font-family:"Baloo Bhaijaan 2",sans-serif;font-size:28px;color:var(--plum);margin:0 0 6px;font-weight:800;text-wrap:balance}section .intro{color:var(--ink2);max-width:780px;margin:0 0 18px}
h3{font-size:16px;margin:26px 0 8px;color:var(--ink)}
.tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:22px 0 8px}.tile{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px}.tl{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em}.tv{font-family:"Baloo Bhaijaan 2",sans-serif;font-weight:800;font-size:26px;color:var(--plum);line-height:1.2;margin:6px 0 4px}.ts{font-size:12.5px;color:var(--ink2);line-height:1.45}
.callout{border-left:0;background:var(--panel);border-radius:10px;padding:14px 16px;margin:14px 0;color:var(--ink2)}.callout b{color:var(--ink)}
.bmc{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));grid-template-rows:auto auto auto;gap:8px}
.bmc .b{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:12px 14px;font-size:13.5px}.bmc h4{margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--plum);display:flex;justify-content:space-between;gap:8px}.bmc h4 .ar{text-transform:none;letter-spacing:0;font-size:13px}.bmc ul{margin:0;padding-left:18px}.bmc li{margin:3px 0}
.kp{grid-column:1/3;grid-row:1/3}.ka{grid-column:3/5;grid-row:1}.kr{grid-column:3/5;grid-row:2}.vp{grid-column:5/7;grid-row:1/3;background:var(--plum)!important;color:var(--bg)}.vp h4,.vp h4 .ar,.vp b{color:var(--bg)!important}.vp .lead{font-family:"Baloo Bhaijaan 2",sans-serif;font-size:18px;line-height:1.3;margin:4px 0 10px;font-weight:700}
.cr{grid-column:7/9;grid-row:1}.ch{grid-column:7/9;grid-row:2}.cs{grid-column:9/11;grid-row:1/3}.cost{grid-column:1/6;grid-row:3}.rev{grid-column:6/11;grid-row:3}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
table.data{width:100%;border-collapse:collapse;font-size:13.5px;margin:8px 0 12px;background:var(--surface);border:1px solid var(--line);border-radius:8px;overflow:hidden}
table.data th{background:var(--head-bg);color:var(--head-ink);text-align:left;font-weight:600;padding:8px 10px;font-size:12.5px}table.data td{padding:7px 10px;border-top:1px solid var(--line);vertical-align:top}
table.pl td,table.scen td,table.ue td{white-space:nowrap}table.pl td:first-child,table.ue td:first-child{white-space:normal}table.pl td:not(:first-child),table.scen td:nth-child(n+3),table.ue td:not(:first-child){text-align:right}table.pl th:not(:first-child),table.scen th:nth-child(n+3),table.ue th:not(:first-child){text-align:right}
table.cal td{font-size:12.5px}table.scen tr:nth-child(3n+1) td{border-top:2px solid var(--line)}table.data tr:hover td{background:var(--panel)}
.tw{overflow-x:auto}
.chart{width:100%;height:auto;display:block}.chart .grid{stroke:var(--line);stroke-width:1}.chart .zero{stroke:var(--muted);stroke-width:1.2}.chart .ax{fill:var(--muted);font-size:11.5px}.chart .axl{stroke:var(--muted)}.chart .lbl{fill:var(--ink);font-size:12px;font-weight:600}.chart .lbl.sm{font-size:11px}.chart .dl{fill:var(--ink2);font-size:12px;font-weight:600}.chart .ann{fill:var(--ink2);font-size:11.5px}.chart .mark{stroke:var(--muted);stroke-dasharray:4 4}.chart .area{fill:var(--c1);opacity:.14}.chart .hit{fill:transparent}.chart .hit:hover,.chart .hit:focus{fill:var(--ink);opacity:.06}
.chart rect[data-tip]:not(.hit):hover,.chart rect[data-tip]:not(.hit):focus{opacity:.8;outline:none}
.gantt .lane{stroke:var(--line)}.gantt .lanet{fill:var(--plum);font-size:12.5px;font-weight:700}.gantt .gtxt{fill:#fff;font-size:11px;font-weight:600}.gantt .gtxt.out{fill:var(--ink2)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:12px 0}.card h3{margin-top:0}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--ink2);margin:4px 0 6px}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
details.tv{margin:6px 0}details.tv summary{cursor:pointer;color:var(--accent);font-size:13px;font-weight:600}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.phase{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:10px 0}.ph-h{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.ph-n{font-family:"Baloo Bhaijaan 2",sans-serif;font-weight:800;font-size:19px;color:var(--plum)}.ph-d{font-size:13px;color:var(--accent);font-weight:600}.ph-g{color:var(--ink2);font-weight:600;margin:2px 0 8px}.ph-b{display:grid;grid-template-columns:1.6fr 1.2fr .8fr;gap:14px;font-size:13.5px}.ph-b p{margin:2px 0 0;color:var(--ink2)}.ph-b b{font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.mk{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1.4fr) 130px;gap:10px;align-items:center;font-size:13.5px;padding:5px 0;border-bottom:1px solid var(--line)}.mk-b{height:10px;background:var(--panel);border-radius:5px;overflow:hidden}.mk-b i{display:block;height:100%;background:var(--c1);border-radius:5px}.mk-v{text-align:right;color:var(--ink2)}
#tt{position:fixed;pointer-events:none;background:var(--ink);color:var(--bg);padding:7px 10px;border-radius:6px;font-size:12.5px;max-width:340px;z-index:10;opacity:0;transition:opacity .12s;line-height:1.4}
footer{color:var(--muted);font-size:12.5px;margin-top:40px;border-top:1px solid var(--line);padding-top:14px}
a{color:var(--accent)}:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media (max-width:1000px){.wrap{grid-template-columns:1fr;gap:0}nav.toc{position:static;padding:16px 0 0}nav.toc a{display:inline-block}nav.toc .dl{display:flex}.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.bmc{grid-template-columns:1fr 1fr}.bmc .b{grid-column:auto!important;grid-row:auto!important}.vp,.cost,.rev{grid-column:1/-1!important}.grid2,.ph-b,.two{grid-template-columns:1fr}header.top h1{font-size:30px}}
@media (max-width:560px){.wrap{padding:0 16px}.tiles{grid-template-columns:1fr}.bmc{grid-template-columns:1fr}.mk{grid-template-columns:1fr 90px}.mk-b{display:none}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}#tt{transition:none}}
@media print{nav.toc{display:none}.wrap{display:block}section{break-inside:avoid-page}}
"""
js = """
const tt=document.getElementById('tt');function show(el,x,y){tt.textContent=el.getAttribute('data-tip');tt.style.opacity=1;const r=tt.getBoundingClientRect();let L=x+14,T=y+14;if(L+r.width>innerWidth-8)L=x-r.width-14;if(T+r.height>innerHeight-8)T=y-r.height-14;tt.style.left=L+'px';tt.style.top=T+'px'}
document.querySelectorAll('[data-tip]').forEach(el=>{el.addEventListener('mousemove',ev=>show(el,ev.clientX,ev.clientY));el.addEventListener('mouseleave',()=>tt.style.opacity=0);el.addEventListener('focus',()=>{const b=el.getBoundingClientRect();show(el,b.left+b.width/2,b.top)});el.addEventListener('blur',()=>tt.style.opacity=0)});
"""

html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Twaa Business Plan 2026–2031</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@700;800&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet">
<style>{css}</style></head><body><div id="tt" role="tooltip"></div>
<div class="wrap"><nav class="toc" aria-label="Sections"><div class="brand">توّا <span>Twaa</span></div><div class="tag">نجيبهالك توّا · Business plan</div>
{''.join(f'<a href="#{i}">{t}</a>' for i, t in TOC)}
<div class="dl"><a href="Twaa-Financial-Model.xlsx" download>Download the Excel model</a></div></nav>
<main>
<header class="top" id="summary"><div class="eyebrow">Hyperlocal quick commerce · Beheira, Egypt · Base case</div>
<h1>Twaa business plan 2026–2031</h1>
<p class="sub">Twaa (توّا) delivers groceries, hot food and pharmacy essentials in 20–60 minutes to Abu El Matamir and its villages, then replicates the same hub playbook across Beheira's markazes. Every number on this page comes from the Excel model; change an assumption there and the plan moves with it.</p></header>
<div class="tiles">{tiles}</div>
<div class="callout"><b>The thesis in one line:</b> one markaz pays for its own hubs, riders and marketing by its third year; a network of six markazes pays for the shared technology and management and turns the company EBITDA-positive in {be}. Expansion is gated: a new markaz opens only when the previous one tracks the Abu El Matamir curve.</div>

<section id="canvas"><div class="eyebrow">01</div><h2>Business model canvas</h2><p class="intro">A controlled, inventory-led quick-commerce retailer with a marketplace and delivery-as-a-service layered on the same riders. Owned inventory gives margin and reliability; the marketplace and restaurants widen the basket; the rider network is the asset every stream shares.</p>{canvas}</section>

<section id="value"><div class="eyebrow">02</div><h2>Value for each side of the platform</h2><p class="intro">Twaa is multi-sided. Each side has a different problem, gets a different promise and is measured by a different number.</p><div class="tw">{tbl(["Who", "Their problem today", "What Twaa promises", "How we measure it"], value_rows)}</div></section>

<section id="revenue"><div class="eyebrow">03</div><h2>Revenue streams</h2><p class="intro">Nine streams from four payers: customers, merchants, restaurants and brands. Shown as gross profit (what Twaa keeps), which makes owned-inventory margin comparable with commissions and fees. Base case, EGP.</p>
<div class="tw">{tbl(["Stream", "Who pays", "Pricing", "Starts", "2027", "2029", "2031", "Share 2031"], streams_rows)}</div>
<div class="card"><h3>Gross profit by stream group, 2027–2031</h3><div class="legend">{s_legend}</div>{s_chart}<details class="tv"><summary>Show as a table (EGP millions)</summary>{s_table}</details></div>
<div class="callout"><b>Why the mix matters:</b> retail margin is ~{((a(B,'r_prod')[4]-a(B,'cogs')[4])/tot31*100):.0f}% of gross profit in 2031, but the fastest-growing streams are the ones that need no extra rider: commissions, retail media and supplier back margin. Take rate rises from {gm[0]*100:.1f}% of GMV in 2027 to {gm[4]*100:.1f}% in 2031.</div>
<h3>What one order earns and costs</h3><div class="tw">{ue_tbl}</div></section>

<section id="financials"><div class="eyebrow">04</div><h2>Financial model</h2><p class="intro">Monthly model, October 2026 to December 2031, in nominal EGP excluding VAT. Customers are driven by acquisition spend ÷ CAC, retention and a market-saturation guard; each new markaz follows the Abu El Matamir age curve scaled by size. Three scenarios flex CAC, retention, frequency and basket size together.</p>
<div class="card"><h3>Customer orders per day, by scenario (group)</h3>{line_orders()}</div>
<div class="card"><h3>Cash balance, base case</h3>{cash_chart()}</div><div class="card"><h3>Markaz-level vs group EBITDA, base case (EGP M)</h3><div class="legend"><span><i style="background:var(--c1)"></i>Markaz-level EBITDA (before central costs)</span><span><i style="background:var(--c3)"></i>Group EBITDA</span></div>{ebitda_bars()}</div>
<h3>Base-case P&amp;L and cash (EGP)</h3><div class="tw">{pl_tbl}</div>
<h3>Three scenarios</h3><p class="intro">Conservative: CAC ×1.25, retention −4 pp, frequency ×0.85, basket ×0.92. Optimistic: CAC ×0.85, retention +2 pp, frequency ×1.1, basket ×1.05. The conservative case does not fund itself with the two rounds, which is exactly why expansion is gated.</p><div class="tw">{scen_tbl}</div>
<div class="callout"><b>Abu El Matamir on its own:</b> markaz-level EBITDA of {', '.join(f"{y} {v/1e6:,.1f}M" for y, v in zip(YEARS, am_ms))}. As a stand-alone company carrying all central costs, group EBITDA stays negative to 2031 ({am_eb[4]/1e6:,.1f}M in 2031), so the single-markaz version is a proof of concept, not the business.</div>
<h3>Key assumptions (base)</h3><div class="tw">{tbl(["Driver", "2027", "2029", "2031", "Note"], [
 ["Average order value (EGP)", "270", "360", "440", "Nominal; includes inflation"],
 ["Monthly retention of active customers", "72%", "81%", "84%", "Validate in pilot"],
 ["Orders per active customer per month", "2.8", "3.7", "4.2", "Top-up behaviour"],
 ["Blended CAC (EGP)", "130", "170", "200", "Includes first-order discount"],
 ["Owned inventory share of GMV", "62%", "55%", "52%", "Marketplace and food grow"],
 ["Retail front margin", "16%", "18%", "19%", "Private label from 2029"],
 ["Rider cost per delivery (EGP)", "27", "31", "35", "Per-drop model"],
 ["Payments made digitally", "18%", "38%", "50%", "COD dominant at launch"]])}</div>
<p class="intro">Every input, with its source or rationale, is on the <b>Assumptions</b> sheet of the Excel model. Population and household figures are estimates to verify with CAPMAS; tax uses Egypt's 22.5% corporate rate with losses carried forward.</p></section>

<section id="roadmap"><div class="eyebrow">05</div><h2>Roadmap 2026–2031</h2><p class="intro">Five lanes that move together: where we operate, what the product does, how operations scale, which revenue streams are live, and how the company is funded.</p>
<div class="card tw" style="min-width:0">{gantt()}</div>
<div class="legend"><span><i style="background:var(--c1)"></i>Core / live</span><span><i style="background:var(--c2)"></i>Monetisation & funding</span><span><i style="background:var(--c3)"></i>Expansion</span><span><i style="background:var(--c4)"></i>Capability build</span></div></section>

<section id="launch"><div class="eyebrow">06</div><h2>Launch plan</h2><p class="intro">Six phases, each with a gate. We move to the next phase only when the gate KPIs are met; if not, we fix the operation before spending more on growth.</p>
{phase_html}
<h3>Launch calendar: ten weeks before to twelve weeks after public launch (1 February 2027)</h3><div class="tw">{cal_tbl}</div>
<h3>Launch-month marketing mix (EGP 200k)</h3><div class="card">{mkt_html}</div>
<div class="callout"><b>Launch readiness:</b> the zone opens only when the operating blueprint's checklist passes: stock loaded, prices verified, zones and hours configured, riders and pickers trained, payments, COD and refunds tested end to end, support staffed and escalation defined.</div></section>

<section id="risks"><div class="eyebrow">07</div><h2>Risks and sensitivities</h2><p class="intro">What moves the peak funding need most, one lever at a time, against the base case of {egp(fund)}. Orange is the adverse case, teal the favourable one.</p>
<div class="card">{tornado()}</div><div class="tw">{risk_tbl}</div></section>

<section id="funding"><div class="eyebrow">08</div><h2>Funding and use of funds</h2><p class="intro">Two rounds, EGP 42M in total (≈ ${42e6/FX/1e6:.2f}M at EGP {FX}/USD), with the lowest modelled cash balance at {egp(KB['k_min'])}. The seed proves one markaz; the Series A funds the network once Abu El Matamir's unit economics are proven.</p><div class="tw">{uof}</div>
<div class="callout"><b>Milestones investors can hold us to:</b> pilot KPIs met (Jan 2027) · 150 orders/day and non-negative contribution per order (mid-2027) · villages at 25% of orders (Q1 2028) · Abu El Matamir markaz-level EBITDA break-even (2029) · six markazes live (2030) · group EBITDA-positive ({be}).</div>
<footer>Twaa · توّا — business plan generated from Twaa-Financial-Model.xlsx (base case unless stated). Nominal EGP, excluding VAT; USD equivalents at EGP {FX}/USD for reference only. Figures are planning estimates, not forecasts of actual results.</footer></section>
</main></div><script>{js}</script></body></html>"""
open("Twaa-Business-Plan.html", "w").write(html)
# Hosted variant: the artifact host cannot serve .xlsx, so link the workbook on GitHub.
import os
if os.environ.get("PUBLISH_OUT"):
    gh = "https://github.com/eldeniney/abbas/raw/claude/twaa-quick-commerce-design-tfgzjq/twaa/business/Twaa-Financial-Model.xlsx"
    open(os.environ["PUBLISH_OUT"], "w").write(html.replace('href="Twaa-Financial-Model.xlsx" download', 'href="%s" target="_blank" rel="noopener"' % gh))
print("written", len(html) // 1024, "KB")
