"""Arabic (RTL) edition of the Twaa business plan page.
Reads the same evaluated model outputs as build_plan.py, so every figure matches the Excel model.
Run from twaa/business/:  python3 src/build_plan_ar.py   →  خطة-عمل-توا.html (Twaa-Business-Plan-AR.html)"""
import json, datetime, html as H, os
V = json.load(open("Twaa-Financial-Model.xlsx.values.json")); SENS = json.load(open("Twaa-Financial-Model.xlsx.sens.json"))
MAP = json.load(open("Twaa-Financial-Model.xlsx.map.json"))
B, C, O = V["2"], V["1"], V["3"]; BS = V["2_standalone"]
YEARS = ["2027", "2028", "2029", "2030", "2031"]
MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
def a(sc, k): return sc["annual"][k][1:]
def ser(n): return datetime.date(1899, 12, 30) + datetime.timedelta(days=int(float(n)))
def mon(n): d = ser(n); return f"{MONTHS_AR[d.month - 1]} {d.year}"
FX = 50
def m(x, d=1): return f"{x/1e6:,.{d}f}"
def egp(x, d=1): return f"{x/1e6:,.{d}f} مليون ج.م"
def n0(x): return f"{x:,.0f}"
e = H.escape
months = [datetime.date(2026 + (9 + i) // 12, (9 + i) % 12 + 1, 1) for i in range(MAP["N"])]
def mname(i): return f"{MONTHS_AR[months[i].month - 1]} {months[i].year}"
KB = B["kpi"]
be = mon(KB["k_be"]); fund = KB["k_fund"]
gm = a(B, "gpm")
CAT = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"]
def zc(t): return "zero" if t == 0 else "grid"
def tip(t): return f' data-tip="{e(t)}" tabindex="0"'
def rt(t): return "\u202B" + t + "\u202C"   # right-to-left embedding for Arabic labels inside left-to-right charts

# ---------------------------------------------------------------- charts (inline SVG; time axes run left→right) -------
def stacked_streams():
    groups = [("هامش التجزئة", ["gp_prod_calc"]), ("العمولات", ["r_mp", "r_food"]), ("رسوم العملاء", ["r_del", "r_svc", "r_plus"]), ("الخدمات والعلامات", ["r_daas", "r_media", "r_back"])]
    vals = []
    for yi in range(5):
        row = []
        for _, keys in groups:
            tot = 0
            for k in keys:
                tot += (a(B, "r_prod")[yi] - a(B, "cogs")[yi]) if k == "gp_prod_calc" else a(B, k)[yi]
            row.append(tot)
        vals.append(row)
    W, Ht, pl, pr, pt, pb = 760, 320, 64, 150, 16, 34
    mx = max(sum(r) for r in vals) * 1.08; step = 40e6 if mx > 120e6 else 20e6
    sx = lambda i: pl + i * ((W - pl - pr) / 5) + 18; bw = (W - pl - pr) / 5 - 36
    sy = lambda v: pt + (Ht - pt - pb) * (1 - v / mx)
    out = [f'<svg viewBox="0 0 {W} {Ht}" class="chart" role="img" aria-label="مجمل الربح حسب مجموعة مصادر الإيراد، السيناريو الأساسي 2027–2031">']
    t = 0
    while t <= mx:
        out.append(f'<line x1="{pl}" x2="{W - pr}" y1="{sy(t):.1f}" y2="{sy(t):.1f}" class="grid"/><text x="{pl - 8}" y="{sy(t) + 4:.1f}" class="ax" text-anchor="end">{t/1e6:.0f}</text>'); t += step
    for yi, row in enumerate(vals):
        y0 = 0
        for gi, v in enumerate(row):
            ytop, ybot = sy(y0 + v), sy(y0)
            h = max(0, ybot - ytop - (2 if gi < 3 else 0))
            out.append(f'<rect x="{sx(yi):.1f}" y="{ytop:.1f}" width="{bw:.1f}" height="{h:.1f}" fill="{CAT[gi]}" rx="{4 if gi == 3 else 0}"{tip(f"{YEARS[yi]} · {groups[gi][0]}: {v/1e6:,.1f} مليون ج.م ({v/sum(row)*100:.0f}%)")}/>')
            y0 += v
        out.append(f'<text x="{sx(yi) + bw/2:.1f}" y="{sy(sum(row)) - 6:.1f}" class="lbl" text-anchor="middle">{sum(row)/1e6:,.1f}</text><text x="{sx(yi) + bw/2:.1f}" y="{Ht - 12}" class="ax" text-anchor="middle">{YEARS[yi]}</text>')
    y0 = 0
    for gi, v in enumerate(vals[4]):
        ym = sy(y0 + v / 2); y0 += v
        out.append(f'<text x="{W - pr + 10}" y="{ym + 4:.1f}" class="dl">{rt(e(groups[gi][0]))}</text>')
    out.append(f'<text x="{pl - 8}" y="{pt - 4}" class="ax" text-anchor="end">مليون ج.م</text></svg>')
    legend = "".join(f'<span><i style="background:{CAT[i]}"></i>{e(g[0])}</span>' for i, g in enumerate(groups))
    table = "<table class='data'><thead><tr><th>مجموعة المصادر</th>" + "".join(f"<th>{y}</th>" for y in YEARS) + "</tr></thead><tbody>" + "".join(f"<tr><td>{e(groups[gi][0])}</td>" + "".join(f"<td>{vals[yi][gi]/1e6:,.1f}</td>" for yi in range(5)) + "</tr>" for gi in range(4)) + "</tbody></table>"
    return "".join(out), legend, table

def line_orders():
    W, Ht, pl, pr, pt, pb = 760, 300, 56, 150, 14, 30
    idx = [i for i, d in enumerate(months) if d.year >= 2027]
    series = [("المتفائل", O, "var(--c3)"), ("الأساسي", B, "var(--c1)"), ("المتحفظ", C, "var(--c2)")]
    mx = max(max(s["monthly"]["opd"][i] for i in idx) for _, s, _ in series) * 1.08
    sx = lambda j: pl + j * (W - pl - pr) / (len(idx) - 1); sy = lambda v: pt + (Ht - pt - pb) * (1 - v / mx)
    out = [f'<svg viewBox="0 0 {W} {Ht}" class="chart" role="img" aria-label="طلبات العملاء في اليوم حسب السيناريو">']
    for t in range(0, int(mx) + 1, 1000):
        out.append(f'<line x1="{pl}" x2="{W - pr}" y1="{sy(t):.1f}" y2="{sy(t):.1f}" class="grid"/><text x="{pl - 8}" y="{sy(t) + 4:.1f}" class="ax" text-anchor="end">{t:,}</text>')
    for j, i in enumerate(idx):
        if months[i].month == 1: out.append(f'<text x="{sx(j):.1f}" y="{Ht - 10}" class="ax" text-anchor="middle">{months[i].year}</text><line x1="{sx(j):.1f}" x2="{sx(j):.1f}" y1="{Ht - pb}" y2="{Ht - pb + 4}" class="axl"/>')
    for name, s, col in series:
        pts = " ".join(f"{sx(j):.1f},{sy(s['monthly']['opd'][i]):.1f}" for j, i in enumerate(idx))
        out.append(f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width="2" stroke-linejoin="round"/>')
        last = s["monthly"]["opd"][idx[-1]]
        out.append(f'<text x="{W - pr + 8}" y="{sy(last) + 4:.1f}" class="dl">{rt(f"{name} · {last:,.0f}")}</text>')
    for j, i in enumerate(idx):
        t = f"{mname(i)} · " + " · ".join(f"{nm}: {s['monthly']['opd'][i]:,.0f} طلب/يوم" for nm, s, _ in series)
        out.append(f'<rect x="{sx(j) - 5:.1f}" y="{pt}" width="10" height="{Ht - pt - pb}" class="hit"{tip(t)}/>')
    out.append("</svg>"); return "".join(out)

def cash_chart():
    W, Ht, pl, pr, pt, pb = 760, 300, 64, 120, 16, 30
    cash = B["monthly"]["cash"]; eb = B["monthly"]["ebitda"]
    mn, mx = min(0, min(cash)), max(cash) * 1.1
    sx = lambda i: pl + i * (W - pl - pr) / (len(cash) - 1); sy = lambda v: pt + (Ht - pt - pb) * (1 - (v - mn) / (mx - mn))
    out = [f'<svg viewBox="0 0 {W} {Ht}" class="chart" role="img" aria-label="رصيد النقدية، السيناريو الأساسي">']
    t = 0
    while t <= mx:
        out.append(f'<line x1="{pl}" x2="{W - pr}" y1="{sy(t):.1f}" y2="{sy(t):.1f}" class="{zc(t)}"/><text x="{pl - 8}" y="{sy(t) + 4:.1f}" class="ax" text-anchor="end">{t/1e6:.0f}</text>'); t += 10e6
    for i, d in enumerate(months):
        if d.month == 1: out.append(f'<text x="{sx(i):.1f}" y="{Ht - 10}" class="ax" text-anchor="middle">{d.year}</text>')
    area = f"{sx(0):.1f},{sy(0):.1f} " + " ".join(f"{sx(i):.1f},{sy(v):.1f}" for i, v in enumerate(cash)) + f" {sx(len(cash)-1):.1f},{sy(0):.1f}"
    out.append(f'<polygon points="{area}" class="area"/><polyline points="{" ".join(f"{sx(i):.1f},{sy(v):.1f}" for i, v in enumerate(cash))}" fill="none" stroke="var(--c1)" stroke-width="2"/>')
    for i, v in enumerate(B["monthly"]["fund"]):
        if v > 0:
            lab = "جولة البذرة" if i == 0 else "جولة النمو"
            out.append(f'<line x1="{sx(i):.1f}" x2="{sx(i):.1f}" y1="{pt}" y2="{Ht - pb}" class="mark"/><text x="{sx(i) + 4:.1f}" y="{pt + 10}" class="ann">{rt(f"{lab} · {v/1e6:.0f} مليون")}</text>')
    bi = next(i for i, v in enumerate(eb) if v > 0 and i > 20)
    out.append(f'<circle cx="{sx(bi):.1f}" cy="{sy(cash[bi]):.1f}" r="5" fill="var(--c3)" stroke="var(--surface)" stroke-width="2"/><text x="{sx(bi) - 6:.1f}" y="{sy(cash[bi]) + 20:.1f}" class="ann" text-anchor="end">{rt(f"EBITDA موجبة · {mname(bi)}")}</text>')
    lo = min(range(len(cash)), key=lambda i: cash[i] if i > 3 else 1e18)
    out.append(f'<circle cx="{sx(lo):.1f}" cy="{sy(cash[lo]):.1f}" r="4" fill="var(--c2)" stroke="var(--surface)" stroke-width="2"/><text x="{sx(lo):.1f}" y="{sy(cash[lo]) + 18:.1f}" class="ann" text-anchor="middle">{rt(f"أدنى نقطة · {cash[lo]/1e6:.1f} مليون")}</text>')
    out.append(f'<text x="{W - pr + 8}" y="{sy(cash[-1]) + 4:.1f}" class="dl">{rt(f"{cash[-1]/1e6:.1f} مليون ج.م")}</text>')
    for i, v in enumerate(cash):
        out.append(f'<rect x="{sx(i) - 5:.1f}" y="{pt}" width="10" height="{Ht - pt - pb}" class="hit"{tip(mname(i) + " · النقدية %.1f مليون · EBITDA %.2f مليون" % (v/1e6, eb[i]/1e6))}/>')
    out.append(f'<text x="{pl - 8}" y="{pt - 4}" class="ax" text-anchor="end">مليون ج.م</text></svg>'); return "".join(out)

def ebitda_bars():
    W, Ht, pl, pr, pt, pb = 760, 280, 64, 20, 18, 30
    s1, s2 = a(B, "m_ebitda"), a(B, "ebitda")
    mn, mx = min(min(s1), min(s2)) * 1.15, max(max(s1), max(s2)) * 1.15
    sy = lambda v: pt + (Ht - pt - pb) * (1 - (v - mn) / (mx - mn)); gw = (W - pl - pr) / 5; bw = gw / 2 - 16
    out = [f'<svg viewBox="0 0 {W} {Ht}" class="chart" role="img" aria-label="EBITDA على مستوى المركز مقابل EBITDA المجموعة">']
    for t in range(int(mn // 5e6) * 5, int(mx // 5e6 + 1) * 5 + 1, 5):
        v = t * 1e6
        if mn <= v <= mx: out.append(f'<line x1="{pl}" x2="{W - pr}" y1="{sy(v):.1f}" y2="{sy(v):.1f}" class="{zc(t)}"/><text x="{pl - 8}" y="{sy(v) + 4:.1f}" class="ax" text-anchor="end">{t}</text>')
    for yi in range(5):
        for k, (vals, col, nm) in enumerate([(s1, "var(--c1)", "EBITDA المركز"), (s2, "var(--c3)", "EBITDA المجموعة")]):
            v = vals[yi]; x = pl + yi * gw + 12 + k * (bw + 4); y0, y1 = sy(max(v, 0)), sy(min(v, 0))
            out.append(f'<rect x="{x:.1f}" y="{y0:.1f}" width="{bw:.1f}" height="{max(1, y1 - y0):.1f}" fill="{col}" rx="3"{tip(f"{YEARS[yi]} · {nm}: {v/1e6:,.1f} مليون ج.م")}/>')
            out.append(f'<text x="{x + bw/2:.1f}" y="{(y0 - 5) if v >= 0 else (y1 + 13):.1f}" class="lbl sm" text-anchor="middle">{v/1e6:,.1f}</text>')
        out.append(f'<text x="{pl + yi * gw + gw/2:.1f}" y="{Ht - 8}" class="ax" text-anchor="middle">{YEARS[yi]}</text>')
    out.append(f'<text x="{pl - 8}" y="{pt - 6}" class="ax" text-anchor="end">مليون ج.م</text></svg>'); return "".join(out)

LEVER_AR = {"Basket size (AOV) ±10%": "حجم السلة (AOV) ±10%", "Monthly retention ±3 pp": "الاحتفاظ الشهري ±3 نقاط", "Order frequency ±10%": "تكرار الطلب ±10%", "Acquisition cost (CAC) ±20%": "تكلفة الاستحواذ (CAC) ±20%", "Rider cost per delivery ±10%": "تكلفة المندوب للتوصيلة ±10%", "Retail front margin ±2 pp": "هامش التجزئة ±2 نقطة"}
def tornado():
    W, Ht, pl, pr, pt = 760, 40 + 44 * len(SENS["levers"]), 230, 60, 30
    base = SENS["base"][0]; vals = [(LEVER_AR.get(l["label"], l["label"]), l["low"][0], l["high"][0]) for l in SENS["levers"]]
    vals.sort(key=lambda r: -abs(r[1] - r[2]))
    lo = min(min(r[1], r[2]) for r in vals) * 0.95; hi = max(max(r[1], r[2]) for r in vals) * 1.02
    sx = lambda v: pl + (W - pl - pr) * (v - lo) / (hi - lo)
    out = [f'<svg viewBox="0 0 {W} {Ht}" class="chart" role="img" aria-label="حساسية ذروة الاحتياج التمويلي">']
    out.append(f'<line x1="{sx(base):.1f}" x2="{sx(base):.1f}" y1="{pt - 12}" y2="{Ht - 6}" class="zero"/><text x="{sx(base):.1f}" y="{pt - 16}" class="ax" text-anchor="middle">{rt(f"الأساسي {base/1e6:.1f} مليون ج.م")}</text>')
    for j, (lab, worse, better) in enumerate(vals):
        y = pt + j * 44
        out.append(f'<text x="{pl - 10}" y="{y + 20}" class="lbl" text-anchor="end">{rt(e(lab))}</text>')
        out.append(f'<rect x="{sx(base):.1f}" y="{y + 6}" width="{max(1, sx(worse) - sx(base)):.1f}" height="22" fill="var(--c2)" rx="3"{tip(f"{lab} — الحالة السلبية: ذروة التمويل {worse/1e6:.1f} مليون ج.م")}/>')
        out.append(f'<rect x="{sx(better):.1f}" y="{y + 6}" width="{max(1, sx(base) - sx(better)):.1f}" height="22" fill="var(--c3)" rx="3"{tip(f"{lab} — الحالة الإيجابية: ذروة التمويل {better/1e6:.1f} مليون ج.م")}/>')
        out.append(f'<text x="{sx(worse) + 6:.1f}" y="{y + 21}" class="ax">{worse/1e6:.1f}</text><text x="{sx(better) - 6:.1f}" y="{y + 21}" class="ax" text-anchor="end">{better/1e6:.1f}</text>')
    out.append("</svg>"); return "".join(out)

def gantt():
    lanes = [
        ("الجغرافيا", [("مدينة أبو المطامير", "2027-01", "2027-06", 1), ("القرى من الهب 1", "2027-07", "2028-03", 1), ("هبات القرى 2–3", "2028-04", "2031-12", 1), ("حوش عيسى", "2028-10", "2031-12", 3), ("أبو حمص", "2029-04", "2031-12", 3), ("الدلنجات", "2029-10", "2031-12", 3), ("كوم حمادة", "2030-04", "2031-12", 3), ("بدر", "2030-10", "2031-12", 3)]),
        ("المنتج", [("بناء التطبيقات والـ OMS والتوزيع", "2026-10", "2026-12", 1), ("سوبر ماركت + أكل + صيدلية", "2027-01", "2027-12", 1), ("توصيل القرى المجدول", "2027-07", "2027-12", 4), ("توّا+ والمحفظة والولاء", "2028-01", "2028-06", 2), ("توزيع آلي و ETA", "2028-07", "2029-03", 4), ("التخصيص ومنصة الإعلانات", "2029-01", "2029-12", 2), ("بوابة الموردين والتنبؤ", "2030-01", "2031-03", 4)]),
        ("العمليات", [("تجهيز الهب 1 والمخزون", "2026-11", "2026-12", 1), ("أسطول المناديب وضبط الكاش", "2027-01", "2027-06", 1), ("خطوط القرى", "2027-07", "2028-03", 4), ("دليل هب في صندوق", "2028-04", "2028-09", 2), ("شراء إقليمي وعلامة خاصة", "2029-01", "2031-12", 4)]),
        ("الإيراد", [("هامش · عمولات · رسوم", "2027-01", "2031-12", 1), ("التوصيل كخدمة", "2027-04", "2031-12", 3), ("إعلانات التطبيق", "2027-06", "2031-12", 2), ("توّا+ · حوافز الموردين", "2028-01", "2031-12", 4)]),
        ("التمويل", [("البذرة 20 مليون", "2026-10", "2026-12", 2), ("جولة النمو 22 مليون", "2028-04", "2028-06", 2), ("نمو مربح", "2030-11", "2031-12", 3)]),
    ]
    start = datetime.date(2026, 10, 1); end = datetime.date(2032, 1, 1); total = (end - start).days
    W, pl, pr, rowh, lanepad = 1000, 110, 10, 26, 12
    CW = 6.6
    def x(ds, endm=False):
        y, mo = map(int, ds.split("-")); d = datetime.date(y, mo, 1)
        if endm: d = datetime.date(y + (mo // 12), mo % 12 + 1, 1)
        return pl + (W - pl - pr) * (d - start).days / total
    y = 30; out = []; bands = []
    for lane, items in lanes:
        rows_end = []; assign = []
        for it in items:
            xs, xe = x(it[1]), x(it[2], True); tw = len(it[0]) * CW + 12
            ext = xe if (xe - xs) > tw else xe + tw
            for ri, re_ in enumerate(rows_end):
                if xs > re_ + 6: rows_end[ri] = ext; assign.append(ri); break
            else: rows_end.append(ext); assign.append(len(rows_end) - 1)
        h = len(rows_end) * rowh + lanepad
        bands.append((lane, y, h))
        for it, ri in zip(items, assign):
            xs, xe = x(it[1]), x(it[2], True); yy = y + 6 + ri * rowh
            txt = it[0]; wpx = xe - xs
            out.append(f'<rect x="{xs:.1f}" y="{yy}" width="{max(3, wpx - 2):.1f}" height="{rowh - 6}" rx="4" fill="{CAT[it[3] - 1]}" class="gbar"{tip(f"{lane}: {txt} · {it[1]} ← {it[2]}")}/>')
            if wpx > len(txt) * CW + 12: out.append(f'<text x="{xe - 6:.1f}" y="{yy + 14}" class="gtxt" text-anchor="end">{rt(e(txt))}</text>')
            else: out.append(f'<text x="{xe + 4:.1f}" y="{yy + 14}" class="gtxt out" text-anchor="start">{rt(e(txt))}</text>')
        y += h
    Ht = y + 8
    head = [f'<svg viewBox="0 0 {W} {Ht}" class="chart gantt" role="img" aria-label="خارطة الطريق 2026–2031">']
    for yr in range(2027, 2032):
        xx = x(f"{yr}-01"); head.append(f'<line x1="{xx:.1f}" x2="{xx:.1f}" y1="18" y2="{Ht}" class="grid"/><text x="{xx + 4:.1f}" y="14" class="ax">{yr}</text>')
    for lane, yy, h in bands:
        head.append(f'<line x1="0" x2="{W}" y1="{yy}" y2="{yy}" class="lane"/><text x="0" y="{yy + 18}" class="lanet">{rt(lane)}</text>')
    return "".join(head + out) + "</svg>"

s_chart, s_legend, s_table = stacked_streams()

# ---------------------------------------------------------------- content -----------------
def tbl(head, rows, cls="data"):
    return f"<table class='{cls}'><thead><tr>" + "".join(f"<th>{h}</th>" for h in head) + "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table>"
detail = [("prod", "هامش منتجات توّا (مخزون مملوك)", "العميل، ضمن سعر الرف", "نشتري من موزعي البحيرة ونبيع بسعر الرف. هامش أمامي 16% ← 19%.", "يناير 2027"),
 ("r_mp", "عمولة التجار والصيدليات", "التجار المحليون والصيدليات الشريكة", "11–12% من قيمة طلب التاجر، تُخصم عند التسوية الأسبوعية.", "يناير 2027"),
 ("r_food", "عمولة المطاعم", "المطاعم", "17–18% من قيمة طلب الأكل.", "يناير 2027"),
 ("r_del", "رسوم التوصيل", "العميل", "17 ← 25 ج.م في المتوسط (المدينة أقل والقرى أعلى). مجاني فوق حد معين ولمشتركي توّا+.", "يناير 2027"),
 ("r_svc", "رسوم الخدمة", "العميل", "3 ← 6 ج.م للطلب، ظاهرة بوضوح عند الدفع.", "يناير 2027"),
 ("r_plus", "اشتراك توّا+", "العميل", "49 ← 72 ج.م شهرياً: توصيل مجاني بلا حدود، نقاط مضاعفة، دعم أولوية.", "يناير 2028"),
 ("r_daas", "التوصيل كخدمة", "التجار لطلباتهم الخاصة", "22 ← 34 ج.م للتوصيلة بمناديب توّا.", "أبريل 2027"),
 ("r_media", "إعلانات داخل التطبيق", "علامات السلع الاستهلاكية والموزعون", "أماكن مدفوعة وبانرات، 0.3% ← 1.5% من مبيعات المخزون المملوك.", "منتصف 2027"),
 ("r_back", "حوافز الموردين", "الموزعون والعلامات", "خصومات الكمية ورسوم الإدراج، حتى 3% من مبيعات المخزون المملوك.", "يناير 2028")]
tot31 = sum((a(B, "r_prod")[4] - a(B, "cogs")[4]) if k == "prod" else a(B, k)[4] for k, *_ in detail)
streams_rows = []
for k, name, who, price, start in detail:
    vals = [(a(B, "r_prod")[i] - a(B, "cogs")[i]) if k == "prod" else a(B, k)[i] for i in range(5)]
    streams_rows.append([f"<b>{name}</b>", who, price, start, m(vals[0]), m(vals[2]), m(vals[4]), f"{vals[4]/tot31*100:.0f}%"])

SC = (("المتحفظ", C), ("الأساسي", B), ("المتفائل", O))
def scen_rows(keys):
    rows = []
    for lab, k, f in keys:
        for i, (nm, sc) in enumerate(SC):
            rows.append([f"<b>{lab}</b>" if i == 0 else "", nm] + [f(v) for v in a(sc, k)])
    return rows
scen_tbl = tbl(["المؤشر", "السيناريو"] + YEARS, scen_rows([("طلبات/يوم (ديسمبر)", "opd_dec", n0), ("قيمة الطلبات GMV (مليون)", "gmv", m), ("مجمل الربح (مليون)", "gp", m), ("EBITDA (مليون)", "ebitda", m), ("النقدية في ديسمبر (مليون)", "cash", m)]), "data scen")
pl_rows = []
for lab, k, f in [("المراكز العاملة (ديسمبر)", "markazes", n0), ("الهبات العاملة (ديسمبر)", "hubs", n0), ("العملاء النشطون (ديسمبر)", "active", n0), ("طلبات/يوم (ديسمبر)", "opd_dec", n0), ("طلبات العملاء", "orders", n0), ("قيمة الطلبات GMV", "gmv", m), ("صافي الإيراد", "rev", m), ("مجمل الربح", "gp", m), ("نسبة الاستقطاع (مجمل الربح ÷ GMV)", "gpm", lambda v: f"{v*100:.1f}%"), ("هامش المساهمة", "cm", m), ("المساهمة لكل طلب (ج.م)", "cmo", lambda v: f"{v:,.1f}"), ("المصروفات التشغيلية شاملة الاستحواذ", "fixed", m), ("EBITDA على مستوى المركز", "m_ebitda", m), ("التكاليف المركزية", "central", m), ("EBITDA", "ebitda", m), ("صافي الدخل", "ni", m), ("الإنفاق الرأسمالي", "capex", m), ("التدفق النقدي الحر", "fcf", m), ("رصيد النقدية (ديسمبر)", "cash", m)]:
    vals = a(B, k); pl_rows.append([f"<b>{lab}</b>" if k in ("gmv", "gp", "ebitda", "cash") else lab] + [f(v) for v in vals])
pl_tbl = tbl(["السيناريو الأساسي (مليون ج.م ما لم يُذكر)"] + YEARS, pl_rows, "data pl")

UE_AR = [("Average order value (GMV per order)", "متوسط قيمة الطلب (GMV للطلب)"), ("Product margin (owned inventory)", "هامش المنتجات (مخزون مملوك)"), ("Marketplace commission", "عمولة السوق والصيدليات"), ("Food commission", "عمولة المطاعم"), ("Delivery fee", "رسوم التوصيل"), ("Service fee", "رسوم الخدمة"), ("Twaa+ (allocated per order)", "توّا+ (موزعة على الطلب)"), ("DaaS fees (allocated per order)", "التوصيل كخدمة (موزعة على الطلب)"), ("Retail media", "إعلانات التطبيق"), ("Supplier back margin", "حوافز الموردين"), ("Gross profit per order (all streams)", "مجمل الربح للطلب (كل المصادر)"), ("Rider (incl. split deliveries & DaaS drops)", "المندوب (شامل التسليم المجزّأ والتوصيل كخدمة)"), ("Customer promotions", "عروض العملاء"), ("Other variable (pick, pack, payments, shrink, refunds, support)", "متغيرة أخرى (تجميع، تغليف، دفع، هالك، استرداد، دعم)"), ("Contribution per order", "المساهمة لكل طلب"), ("Fixed costs & acquisition per order", "التكاليف الثابتة والاستحواذ لكل طلب"), ("EBITDA per order", "EBITDA لكل طلب")]
BOLD = {"Gross profit per order (all streams)", "Contribution per order", "EBITDA per order", "Average order value (GMV per order)"}
ue = {r[0]: r[1:] for r in B["ue"] if r[0]}
ue_rows = [[f"<b>{ar}</b>" if en in BOLD else ar] + [f"{v:,.1f}" if isinstance(v, (int, float)) else "" for v in ue[en]] for en, ar in UE_AR if en in ue]
ue_tbl = tbl(["للطلب الواحد (ج.م)، السيناريو الأساسي"] + YEARS, ue_rows, "data ue")

opd31 = a(B, "opd_dec")[4]; gmv31 = a(B, "gmv")[4]; eb31 = a(B, "ebitda")[4]
st = [("ذروة الاحتياج التمويلي", egp(fund), f"≈ {fund/FX/1e6:,.2f} مليون دولار بسعر {FX} ج.م · بذرة 20 مليون + جولة A بـ 22 مليون"),
      ("EBITDA المجموعة موجبة", be, "السيناريو الأساسي. أبو المطامير نفسها تربح على مستوى المركز في 2029"),
      ("طلبات/يوم، ديسمبر 2031", n0(opd31), f"{n0(a(B, 'markazes')[4])} مراكز · {n0(a(B, 'hubs')[4])} هبات · {n0(a(B, 'active')[4])} عميل نشط"),
      ("قيمة الطلبات 2031", egp(gmv31, 0), f"نسبة الاستقطاع {gm[4]*100:.1f}% · EBITDA {egp(eb31)}"),
      ("مساهمة العميل مدى الحياة ÷ CAC", f"{KB['k_ltvcac']:.1f}×", f"السنة الثالثة · CAC {float(KB['k_cac']):.0f} ج.م · استرداد خلال {KB['k_payback']:.1f} شهر")]
tiles = "".join(f"<div class='tile'><div class='tl'>{e(t)}</div><div class='tv'>{e(v)}</div><div class='ts'>{e(s)}</div></div>" for t, v, s in st)
am_ms = BS["annual"]["m_ebitda"][1:]; am_eb = BS["annual"]["ebitda"][1:]
TOC = [("summary", "الملخص"), ("canvas", "نموذج العمل التجاري"), ("value", "القيمة لكل طرف"), ("revenue", "مصادر الإيراد"), ("financials", "النموذج المالي"), ("roadmap", "خارطة الطريق 2026–2031"), ("launch", "خطة الإطلاق"), ("risks", "المخاطر والحساسية"), ("funding", "التمويل واستخدامه")]

canvas = """
<div class="bmc">
 <div class="b kp"><h4>الشركاء الرئيسيون</h4><ul>
  <li>موزعو وتجار جملة السلع الاستهلاكية في البحيرة (آجال دفع وحوافز)</li><li>التجار المحليون والمخابز ومزارع الألبان</li><li>مطاعم شريكة ومطبخ توّا</li><li>صيدليات شريكة مرخّصة (أدوية بدون روشتة فقط)</li><li>بوابة الدفع والمحافظ الإلكترونية (بطاقات، ميزة، فودافون كاش، إنستاباي)</li><li>مزودو الرسائل وواتساب والخرائط</li><li>المناديب وشركاء تمويل الموتوسيكلات</li><li>كبار القرى وملاك العقارات والمجالس المحلية</li></ul></div>
 <div class="b ka"><h4>الأنشطة الرئيسية</h4><ul><li>التشكيلة والشراء والتسعير لـ 1,500–3,000 صنف</li><li>التجميع والتغليف في المتجر المظلم</li><li>التوصيل للميل الأخير وخطوط القرى</li><li>ضم التجار والمطاعم</li><li>تسويق مجتمعي وسفراء القرى</li><li>الدعم والمرتجعات والاسترداد الفوري</li><li>ضبط الدفع عند الاستلام ومطابقته</li></ul></div>
 <div class="b kr"><h4>الموارد الرئيسية</h4><ul><li>تطبيق توّا ونظام إدارة الطلبات والتوزيع</li><li>شبكة الهبات: من 1 إلى 8 متاجر مظلمة</li><li>أسطول مناديب مدرّب</li><li>علاقات وآجال الموردين</li><li>بيانات عناوين القرى والطلب</li><li>ثقة العلامة: «نجيبهالك توّا»</li></ul></div>
 <div class="b vp"><h4>عرض القيمة</h4>
  <p class="lead">كل احتياجات البيت توصل في 20–60 دقيقة، للمدينة وللقرى اللي غيرنا سايبها.</p>
  <ul><li><b>للعملاء:</b> بقالة وأكل سخن وصيدلية في سلة واحدة؛ تطبيق بالعامية المصرية؛ كاش أو إلكتروني؛ تتبع مباشر؛ استرداد فوري؛ نقاط على كل طلب</li><li><b>للتجار والمطاعم:</b> طلب جديد ومناديب من غير تعيين؛ تسوية أسبوعية</li><li><b>للعلامات:</b> رف رقمي وإعلانات في سوق ريفي غير مخدوم، ببيانات مبيعات</li><li><b>للمناديب:</b> دخل محلي ثابت بالتوصيلة</li></ul></div>
 <div class="b cr"><h4>العلاقة مع العملاء</h4><ul><li>تطبيق خدمة ذاتية ودعم واتساب بالعامية</li><li>إشعارات تتبع استباقية وكود استلام</li><li>«نقط توّا» واشتراك توّا+</li><li>سفراء القرى والحضور المجتمعي</li><li>الاسترداد الفوري للمحفظة يبني الثقة</li></ul></div>
 <div class="b ch"><h4>القنوات</h4><ul><li>أندرويد أولاً ثم iOS والويب</li><li>طلب بمساعدة على واتساب لأول مرة</li><li>جروبات فيسبوك وواتساب المحلية</li><li>فلاير في كل شنطة وتمييز المناديب</li><li>ملصقات واجهات التجار وأكشاك يوم السوق</li><li>الإحالة: ادّي 50 وخد 50 ج.م</li></ul></div>
 <div class="b cs"><h4>شرائح العملاء</h4><ul><li><b>الأسر</b> — بقالة أسبوعية وتكميلية (الأساس)</li><li><b>الشباب</b> — سناكس ومشروبات وأكل سخن</li><li><b>الاحتياج العاجل</b> — لبن وعيش وحفاضات ودواء</li><li><b>بيوت القرى</b> — غير مخدومة من التطبيقات القومية</li><li><b>التجار والمطاعم والصيدليات</b> — جانب العرض</li><li><b>علامات السلع الاستهلاكية</b> — معلنون</li><li>المشروعات الصغيرة (المرحلة 2، B2B)</li></ul></div>
 <div class="b cost"><h4>هيكل التكاليف</h4><div class="two"><ul><li>تكلفة البضاعة للمخزون المملوك (البند الأكبر)</li><li>تكلفة المندوب للتوصيلة (أكبر تكلفة تشغيلية، 27 ← 35 ج.م)</li><li>إيجار الهب والمرافق والفريق الأساسي لكل هب</li></ul><ul><li>استحواذ العملاء والعروض</li><li>التقنية المركزية والإدارة والمصروفات العمومية</li><li>رسوم الدفع والتغليف والهالك والاسترداد</li></ul></div></div>
 <div class="b rev"><h4>مصادر الإيراد</h4><div class="two"><ul><li><b>هامش التجزئة</b> على المخزون المملوك</li><li><b>عمولات</b> من التجار والصيدليات والمطاعم</li><li><b>رسوم العملاء:</b> التوصيل والخدمة وتوّا+</li></ul><ul><li><b>خدمات التجار:</b> التوصيل كخدمة</li><li><b>دخل العلامات:</b> إعلانات التطبيق وحوافز الموردين</li><li>لاحقاً: علامة خاصة، B2B، شراكات مالية</li></ul></div></div>
</div>"""

value_rows = [
 ["الأسر (المدينة)", "نقص الأصناف عند البقال، ووقت ضايع في الزحمة والطوابير", "توصيل 20–40 دقيقة، تشكيلة واسعة، أسعار عادلة، والكاش مقبول", "الطلبات لكل عميل نشط شهرياً، الاحتفاظ"],
 ["الأسر (القرى)", "مفيش تطبيق قومي بيوصل؛ مشاوير طويلة للمركز عشان الأساسيات", "رحلات قرى مجدولة وهب قريب خلال 45–75 دقيقة", "حصة القرى من الطلبات، معدل التكرار"],
 ["التجار والصيدليات المحلية", "مش قادرين على مناديب أو تطبيق؛ وصول محدود", "عرض وطلبات ومناديب؛ تسوية أسبوعية؛ بيانات طلب", "مبيعات التاجر، معدل القبول"],
 ["المطاعم", "التطبيقات الكبيرة غائبة أو مكلفة؛ التوصيل الذاتي غير منتظم", "توصيل وتسويق في مكان واحد؛ توصيل كخدمة لطلبات التليفون", "طلبات الأكل، الالتزام بوقت التجهيز"],
 ["علامات السلع والموزعون", "لا رؤية ولا بيانات في التجزئة الريفية", "أماكن مدفوعة، عينات في الشنط، بيانات مبيعات", "إيراد الإعلانات لكل هب"],
 ["المناديب", "شغل يومي غير منتظم", "أجر بالتوصيلة وحوافز وتدريب وعدة", "توصيلات/ساعة، استمرار المناديب"],
]

phases = [
 ("0 · البناء", "أكتوبر – ديسمبر 2026", "المنصة والهب 1 والإمداد جاهزين", "إغلاق جولة البذرة · بناء التطبيقات من النموذج الأولي ووثيقة المتطلبات · تجهيز الهب وتخزين 1,500 صنف · تعيين وتدريب 25 مندوب · توقيع 20 مطعم و15 تاجر و3 صيدليات شريكة · تشغيل بوابة الدفع · قائمة الجاهزية من دليل التشغيل", "نجاح كل فحوص الجاهزية؛ 3 أيام تشغيل تجريبي كاملة بطلبات الموظفين", "0.72 مليون تشغيل · 3.5 مليون رأسمالي"),
 ("1 · التجربة", "يناير 2027", "إثبات التشغيل مع مستخدمين بالدعوة", "دعوة حوالي 400 أسرة (أسر الموظفين والتجار وقيادات المجتمع) في وسط المدينة · مراجعة تشغيل يومية · حل مشاكل التجميع وETA والكاش", "الالتزام بالموعد ≥ 85% · دقة الطلب ≥ 98% · التقييم ≥ 4.5 · تكرار خلال 14 يوم ≥ 40%", "60 ألف ج.م استحواذ"),
 ("2 · إطلاق المدينة", "فبراير – يونيو 2027", "الفوز بمدينة أبو المطامير", "أسبوع إطلاق عام · خصم 30% على أول طلب · إحالة 50/50 · فلاير في كل شنطة · جروبات واتساب · التوصيل كخدمة من أبريل · تجارب إعلانات مع موزعين", "طلبات/يوم ≥ 150 في مايو · مساهمة الطلب ≥ صفر · CAC ≤ 150 ج.م", "200 ألف شهر الإطلاق، ثم 120–160 ألف/شهر"),
 ("3 · القرى", "يوليو 2027 – مارس 2028", "الوصول للقرى من الهب 1", "رحلات قرى مجدولة · سفراء القرى · تواجد أسبوعي في يوم السوق · طلب بمساعدة على واتساب", "حصة القرى ≥ 25% من الطلبات · الالتزام في المناطق البعيدة ≥ 80%", "ضمن الميزانية الجارية"),
 ("4 · التكثيف والتمويل", "أبريل – سبتمبر 2028", "هبات القرى والجولة A", "افتتاح الهب 2 (أبريل 2028) · تشغيل توّا+ وحوافز الموردين · توثيق دليل «هب في صندوق» · جمع الجولة A (يونيو 2028)", "EBITDA مركز أبو المطامير تتجه للتعادل · إغلاق الجولة A", "جولة A بـ 22 مليون ج.م"),
 ("5 · الشبكة", "أكتوبر 2028 – 2031", "التكرار في مراكز البحيرة", "مركز جديد كل ستة شهور: حوش عيسى، أبو حمص، الدلنجات، كوم حمادة، بدر · شراء إقليمي · علامة خاصة", "كل مركز جديد يمشي على منحنى أبو المطامير ±20% بحلول الشهر السادس؛ وإلا يتوقف الإطلاق التالي", "350 ألف قبل الإطلاق + 650 ألف للهب لكل مركز"),
]
phase_html = "".join(f"<div class='phase'><div class='ph-h'><span class='ph-n'>{e(n)}</span><span class='ph-d'>{e(d)}</span></div><div class='ph-g'>{e(g)}</div><div class='ph-b'><div><b>اللي هيحصل</b><p>{e(act)}</p></div><div><b>بوابة الانتقال</b><p>{e(gate)}</p></div><div><b>الميزانية (ج.م)</b><p>{e(bud)}</p></div></div></div>" for n, d, g, act, gate, bud in phases)

cal = [
 ("الأسبوع −10 إلى −8", "توقيع عقد الهب؛ طلب الأرفف والثلاجات", "تجميد نطاق النسخة الأولى؛ بدء البناء", "التفاوض مع أهم 40 موزع", "هوية العلامة والشنط والزي", "تعيين المناديب والمجمّعين"),
 ("الأسبوع −7 إلى −5", "التجهيز؛ استلام أول مخزون", "تطبيقات الإدارة والمجمّع والمندوب في الاختبار", "توقيع المطاعم والصيدليات", "تشويق في جروبات واتساب وفيسبوك المحلية", "تدريب الفريق على الإجراءات والكاش"),
 ("الأسبوع −4 (يناير)", "فتح التجربة لـ 400 أسرة مدعوة", "إصلاحات يومية؛ متابعة اللوحات", "سد فجوات التشكيلة من بحث التجربة", "جمع آراء وشهادات", "مراجعة تشغيل يومية"),
 ("الأسبوع −1", "اعتماد الجاهزية", "اختبار ضغط؛ اختبار دفع حقيقي", "عروض الإطلاق متفق عليها مع العلامات", "حجز إعلام أسبوع الإطلاق", "ورديات المناديب للذروة"),
 ("الأسبوع 0 (1 فبراير)", "الإطلاق العام", "غرفة عمليات جاهزة", "مخزون احتياطي +30%", "حدث إطلاق، مؤثرين، 30% على أول طلب", "الكل على التوزيع"),
 ("الأسبوع +1 إلى +4", "تثبيت مستوى الخدمة", "تنفيذ أهم 10 إصلاحات", "مراجعة أسعار أسبوعية", "دفعة الإحالة وفلاير في كل شنطة", "تعيين مناديب حسب الطلب"),
 ("الأسبوع +5 إلى +8", "تجربة التوصيل كخدمة مع 5 تجار", "توصيل القرى المجدول", "مفاوضات حوافز الموزعين", "أكشاك يوم السوق في قريتين", "تجارب خطوط القرى"),
 ("الأسبوع +9 إلى +12", "مراجعة البوابة: نروح القرى؟", "تصميم توّا+", "تجربة إعلانات التطبيق", "برنامج سفراء القرى", "البحث عن موقع الهب 2"),
]
cal_tbl = tbl(["التوقيت", "العمليات", "المنتج والتقنية", "الإمداد والشركاء", "التسويق", "الفريق"], [list(r) for r in cal], "data cal")

mkt = [("خصم أول طلب (30%، داخل CAC)", 25), ("جروبات واتساب وفيسبوك المحلية والمحتوى", 20), ("مؤثرون محليون وحدث الإطلاق", 15), ("فلاير من باب لباب وفي كل شنطة", 15), ("أكشاك يوم السوق وأبواب المدارس", 10), ("مكافآت الإحالة (50/50 ج.م)", 10), ("تمييز المناديب وواجهات المحلات", 5)]
mkt_html = "".join(f"<div class='mk'><span class='mk-l'>{e(l)}</span><span class='mk-b'><i style='width:{p*3}%'></i></span><span class='mk-v'>{p}% · {200*p/100:.0f} ألف ج.م</span></div>" for l, p in mkt)

risks = [
 ("كثافة طلب ضعيفة في القرى", "اقتصاديات الهب محتاجة حوالي 250+ طلب/يوم", "رحلات قرى مجدولة، هبات القرى بس لما الكثافة تثبت، وبوابة لكل توسع"),
 ("تكلفة الاستحواذ تغلى", "تغيّر CAC ±20% يحرّك الاحتياج التمويلي حوالي 6–7 مليون ج.م", "الإحالة والفلاير في الشنطة أولاً؛ وقف الإنفاق المدفوع في المناطق اللي LTV/CAC فيها أقل من 2"),
 ("تسرّب الكاش عند الاستلام", "الكاش حوالي 80% من المدفوعات عند الإطلاق", "كود استلام، حدود كاش للمندوب، توريد يومي، كاش باك على المحفظة للتحول للدفع الإلكتروني"),
 ("دخول اللاعبين القوميين للبحيرة", "ضغط في الأسعار والعروض", "تشكيلة محلية وتغطية قرى صعب يقلدوها بتكلفة قليلة؛ حصرية التجار في التوصيل كخدمة"),
 ("التضخم وسعر الصرف", "التكاليف والأسعار بتتحرك شهرياً", "مدخلات سنوية متضخمة أصلاً؛ تسعير شهري؛ آجال الموردين تحمي النقدية"),
 ("توافر وجودة المناديب", "مخاطر على مستوى الخدمة والعلامة", "أجر بالتوصيلة وحوافز وتدريب وتوزيع حسب التقييم"),
 ("تنظيم الصيدليات", "الأدوية بروشتة مقيّدة", "أدوية بدون روشتة فقط عبر صيدليات شريكة مرخّصة؛ رفع الروشتة خارج النسخة الأولى"),
]
risk_tbl = tbl(["الخطر", "ليه مهم", "التخفيف"], [[f"<b>{e(r)}</b>", e(w), e(mi)] for r, w, mi in risks], "data")

mo = B["monthly"]; opm = mo["opm"]
def sum_where(k, cond): return sum(v for v, o in zip(mo[k], opm) if cond(o))
seed_cap = sum_where("capex", lambda o: o <= 17); seed_loss = -sum_where("ebitda", lambda o: 1 <= o <= 17); seed_pre = sum_where("f_pre", lambda o: o <= 0)
seed_wc = sum_where("dnwc", lambda o: o <= 17)
a_cap = sum_where("capex", lambda o: o >= 18); a_loss = -sum(min(0, v) for v, o in zip(mo["ebitda"], opm) if o >= 18)
uof = tbl(["استخدام التمويل (السيناريو الأساسي)", "البذرة · أكتوبر 2026 ← مايو 2028", "الجولة A · من يونيو 2028"], [
 ["بناء المنصة والهبات (رأسمالي)", egp(seed_cap), egp(a_cap)],
 ["عمليات ما قبل الإطلاق", egp(seed_pre), "—"],
 ["الخسائر التشغيلية حتى التمويل الذاتي", egp(seed_loss), egp(a_loss)],
 ["رأس المال العامل (المخزون بعد آجال الموردين والتجار)", egp(seed_wc), "تمويل ذاتي (رأس مال عامل سالب)"],
 ["<b>حجم الجولة</b>", "<b>20.0 مليون ج.م</b>", "<b>22.0 مليون ج.م</b>"]], "data")

css = """
/* Layout: two-column report — sticky contents rail on the right (RTL), long-form plan on the left. */
:root{--bg:#FBF7F1;--surface:#FFFFFF;--panel:#F4ECE1;--ink:#241626;--ink2:#4E3F50;--muted:#6E5F70;--line:#E4D8CB;--plum:#3A1F3D;--accent:#C4541B;--c1:#86458C;--c2:#EE6A26;--c3:#0E9AA7;--c4:#B98E14;--head-bg:#3A1F3D;--head-ink:#F9F2E7;--f-display:"Baloo Bhaijaan 2","IBM Plex Sans Arabic",sans-serif;--f-body:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#150D17;--surface:#1D1320;--panel:#26192A;--ink:#F3EAF2;--ink2:#D8CAD9;--muted:#B3A2B5;--line:#3A2B3D;--plum:#E2C7E5;--accent:#F08A4B;--c1:#B27BB8;--c2:#E0662A;--c3:#16A7B3;--c4:#B98E14;--head-bg:#2C1B30;--head-ink:#F9F2E7;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#150D17;--surface:#1D1320;--panel:#26192A;--ink:#F3EAF2;--ink2:#D8CAD9;--muted:#B3A2B5;--line:#3A2B3D;--plum:#E2C7E5;--accent:#F08A4B;--c1:#B27BB8;--c2:#E0662A;--c3:#16A7B3;--c4:#B98E14;--head-bg:#2C1B30;--head-ink:#F9F2E7;color-scheme:dark}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:15.5px/1.75 var(--f-body);font-variant-numeric:tabular-nums}
.wrap{display:grid;grid-template-columns:230px minmax(0,1fr);gap:40px;max-width:1280px;margin:0 auto;padding-inline:24px}
nav.toc{position:sticky;top:0;align-self:start;padding:28px 0;font-size:14px}nav.toc .brand{font-family:var(--f-display);font-weight:800;font-size:30px;color:var(--plum);line-height:1}nav.toc .brand span{color:var(--accent);font-size:18px;margin-inline-start:6px}nav.toc .tag{color:var(--muted);font-size:12.5px;margin:6px 0 18px}
nav.toc a{display:block;color:var(--ink2);text-decoration:none;padding:6px 10px;border-radius:6px}nav.toc a:hover,nav.toc a:focus-visible{background:var(--panel);color:var(--ink);outline:none}
nav.toc .dl{margin-top:18px;display:grid;gap:8px}nav.toc .dl a{background:var(--plum);color:var(--bg);font-weight:600;text-align:center}nav.toc .dl a.alt{background:transparent;border:1px solid var(--line);color:var(--ink)}
main{padding-block:28px 80px;min-width:0}
header.top h1{font-family:var(--f-display);font-size:42px;line-height:1.15;margin:8px 0 6px;color:var(--plum);text-wrap:balance;font-weight:800}header.top .sub{color:var(--ink2);max-width:760px;font-size:16.5px}
.eyebrow{letter-spacing:.02em;font-size:13px;font-weight:700;color:var(--accent)}
section{padding-top:40px;scroll-margin-top:10px}section h2{font-family:var(--f-display);font-size:30px;color:var(--plum);margin:0 0 6px;font-weight:800;text-wrap:balance}section .intro{color:var(--ink2);max-width:780px;margin:0 0 18px}
h3{font-size:16.5px;margin:26px 0 8px;color:var(--ink)}
.tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:22px 0 8px}.tile{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px}.tl{font-size:12.5px;color:var(--muted);font-weight:700}.tv{font-family:var(--f-display);font-weight:800;font-size:24px;color:var(--plum);line-height:1.3;margin:6px 0 4px}.ts{font-size:12.5px;color:var(--ink2);line-height:1.6}
.callout{background:var(--panel);border-radius:10px;padding:14px 16px;margin:14px 0;color:var(--ink2)}.callout b{color:var(--ink)}
.bmc{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));grid-template-rows:auto auto auto;gap:8px}
.bmc .b{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:12px 14px;font-size:14px}.bmc h4{margin:0 0 6px;font-size:14.5px;color:var(--plum)}.bmc ul{margin:0;padding-inline-start:18px}.bmc li{margin:3px 0}
.kp{grid-column:1/3;grid-row:1/3}.ka{grid-column:3/5;grid-row:1}.kr{grid-column:3/5;grid-row:2}.vp{grid-column:5/7;grid-row:1/3;background:var(--plum)!important;color:var(--bg)}.vp h4,.vp b{color:var(--bg)!important}.vp .lead{font-family:var(--f-display);font-size:19px;line-height:1.45;margin:4px 0 10px;font-weight:700}
.cr{grid-column:7/9;grid-row:1}.ch{grid-column:7/9;grid-row:2}.cs{grid-column:9/11;grid-row:1/3}.cost{grid-column:1/6;grid-row:3}.rev{grid-column:6/11;grid-row:3}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
table.data{width:100%;border-collapse:collapse;font-size:14px;margin:8px 0 12px;background:var(--surface);border:1px solid var(--line);border-radius:8px;overflow:hidden}
table.data th{background:var(--head-bg);color:var(--head-ink);text-align:right;font-weight:600;padding:8px 10px;font-size:13px}table.data td{padding:7px 10px;border-top:1px solid var(--line);vertical-align:top}
table.pl td,table.scen td,table.ue td{white-space:nowrap}table.pl td:first-child,table.ue td:first-child{white-space:normal}table.pl td:not(:first-child),table.scen td:nth-child(n+3),table.ue td:not(:first-child){text-align:left;direction:ltr}table.pl th:not(:first-child),table.scen th:nth-child(n+3),table.ue th:not(:first-child){text-align:left}
table.cal td{font-size:13px}table.scen tr:nth-child(3n+1) td{border-top:2px solid var(--line)}table.data tr:hover td{background:var(--panel)}
.tw{overflow-x:auto}
.chart{width:100%;height:auto;display:block;direction:ltr}.chart text{font-family:var(--f-body)}.chart .grid{stroke:var(--line);stroke-width:1}.chart .zero{stroke:var(--muted);stroke-width:1.2}.chart .ax{fill:var(--muted);font-size:11.5px}.chart .axl{stroke:var(--muted)}.chart .lbl{fill:var(--ink);font-size:12px;font-weight:600}.chart .lbl.sm{font-size:11px}.chart .dl{fill:var(--ink2);font-size:12.5px;font-weight:600}.chart .ann{fill:var(--ink2);font-size:11.5px}.chart .mark{stroke:var(--muted);stroke-dasharray:4 4}.chart .area{fill:var(--c1);opacity:.14}.chart .hit{fill:transparent}.chart .hit:hover,.chart .hit:focus{fill:var(--ink);opacity:.06}
.chart rect[data-tip]:not(.hit):hover,.chart rect[data-tip]:not(.hit):focus{opacity:.8;outline:none}
.gantt .lane{stroke:var(--line)}.gantt .lanet{fill:var(--plum);font-size:13px;font-weight:700}.gantt .gtxt{fill:#fff;font-size:11.5px;font-weight:600}.gantt .gtxt.out{fill:var(--ink2)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:12px 0}.card h3{margin-top:0}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--ink2);margin:4px 0 6px}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-inline-end:6px;vertical-align:-1px}
details.tv{margin:6px 0}details.tv summary{cursor:pointer;color:var(--accent);font-size:13.5px;font-weight:600}
.phase{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:10px 0}.ph-h{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.ph-n{font-family:var(--f-display);font-weight:800;font-size:20px;color:var(--plum)}.ph-d{font-size:13.5px;color:var(--accent);font-weight:600}.ph-g{color:var(--ink2);font-weight:600;margin:2px 0 8px}.ph-b{display:grid;grid-template-columns:1.6fr 1.2fr .8fr;gap:14px;font-size:14px}.ph-b p{margin:2px 0 0;color:var(--ink2)}.ph-b b{font-size:12.5px;color:var(--muted)}
.mk{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1.4fr) 140px;gap:10px;align-items:center;font-size:14px;padding:5px 0;border-bottom:1px solid var(--line)}.mk-b{height:10px;background:var(--panel);border-radius:5px;overflow:hidden}.mk-b i{display:block;height:100%;background:var(--c1);border-radius:5px}.mk-v{text-align:left;color:var(--ink2)}
#tt{position:fixed;pointer-events:none;background:var(--ink);color:var(--bg);padding:7px 10px;border-radius:6px;font-size:13px;max-width:340px;z-index:10;opacity:0;transition:opacity .12s;line-height:1.5}
footer{color:var(--muted);font-size:13px;margin-top:40px;border-top:1px solid var(--line);padding-top:14px}
a{color:var(--accent)}:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media (max-width:1000px){.wrap{grid-template-columns:1fr;gap:0}nav.toc{position:static;padding:16px 0 0}nav.toc a{display:inline-block}nav.toc .dl{display:flex}.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.bmc{grid-template-columns:1fr 1fr}.bmc .b{grid-column:auto!important;grid-row:auto!important}.vp,.cost,.rev{grid-column:1/-1!important}.ph-b,.two{grid-template-columns:1fr}header.top h1{font-size:30px}}
@media (max-width:560px){.wrap{padding-inline:16px}.tiles{grid-template-columns:1fr}.bmc{grid-template-columns:1fr}.mk{grid-template-columns:1fr 110px}.mk-b{display:none}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}#tt{transition:none}}
@media print{nav.toc{display:none}.wrap{display:block}section{break-inside:avoid-page}}
"""
js = """
const tt=document.getElementById('tt');function show(el,x,y){tt.textContent=el.getAttribute('data-tip');tt.style.opacity=1;const r=tt.getBoundingClientRect();let L=x-r.width-14,T=y+14;if(L<8)L=x+14;if(T+r.height>innerHeight-8)T=y-r.height-14;tt.style.left=L+'px';tt.style.top=T+'px'}
document.querySelectorAll('[data-tip]').forEach(el=>{el.addEventListener('mousemove',ev=>show(el,ev.clientX,ev.clientY));el.addEventListener('mouseleave',()=>tt.style.opacity=0);el.addEventListener('focus',()=>{const b=el.getBoundingClientRect();show(el,b.left+b.width/2,b.top)});el.addEventListener('blur',()=>tt.style.opacity=0)});
"""

html = f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>خطة عمل توّا 2026–2031</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>{css}</style></head><body><div id="tt" role="tooltip"></div>
<div class="wrap"><nav class="toc" aria-label="الأقسام"><div class="brand">توّا<span>Twaa</span></div><div class="tag">نجيبهالك توّا · خطة العمل</div>
{''.join(f'<a href="#{i}">{t}</a>' for i, t in TOC)}
<div class="dl"><a href="Twaa-Financial-Model-AR.xlsx" download>تحميل النموذج المالي (Excel)</a><a class="alt" href="Twaa-Business-Plan.html">English version</a></div></nav>
<main>
<header class="top" id="summary"><div class="eyebrow">تجارة سريعة محلية · البحيرة، مصر · السيناريو الأساسي</div>
<h1>خطة عمل توّا 2026–2031</h1>
<p class="sub">توّا بتوصّل البقالة والأكل السخن واحتياجات الصيدلية خلال 20–60 دقيقة لأبو المطامير وقراها، وبعدين بتكرر نفس دليل تشغيل الهب في مراكز البحيرة. كل رقم في الصفحة دي جاي من النموذج المالي في Excel؛ غيّر أي افتراض هناك والخطة بتتغير معاه.</p></header>
<div class="tiles">{tiles}</div>
<div class="callout"><b>الفكرة في سطر:</b> المركز الواحد بيغطي تكلفة هباته ومناديبه وتسويقه بحلول سنته التالتة؛ وشبكة من ستة مراكز بتغطي التقنية والإدارة المشتركة وتخلي EBITDA الشركة موجبة في {be}. التوسع مشروط ببوابة: المركز الجديد يفتح بس لما اللي قبله يمشي على منحنى أبو المطامير.</div>

<section id="canvas"><div class="eyebrow">01</div><h2>نموذج العمل التجاري</h2><p class="intro">متجر تجارة سريعة منضبط قائم على المخزون المملوك، ومعاه سوق للتجار وتوصيل كخدمة على نفس المناديب. المخزون المملوك بيدي هامش وموثوقية؛ السوق والمطاعم بيوسّعوا السلة؛ وشبكة المناديب هي الأصل اللي كل المصادر بتشاركه.</p>{canvas}</section>

<section id="value"><div class="eyebrow">02</div><h2>القيمة لكل طرف في المنصة</h2><p class="intro">توّا منصة متعددة الأطراف. كل طرف عنده مشكلة مختلفة، وبياخد وعد مختلف، وبيتقاس برقم مختلف.</p><div class="tw">{tbl(["مين", "مشكلته النهارده", "وعد توّا", "بنقيسه إزاي"], value_rows)}</div></section>

<section id="revenue"><div class="eyebrow">03</div><h2>مصادر الإيراد</h2><p class="intro">تسع مصادر من أربع جهات دافعة: العملاء والتجار والمطاعم والعلامات. معروضة كمجمل ربح (اللي توّا بتحتفظ بيه)، عشان هامش المخزون المملوك يبقى قابل للمقارنة بالعمولات والرسوم. السيناريو الأساسي، بالمليون جنيه.</p>
<div class="tw">{tbl(["المصدر", "مين بيدفع", "التسعير", "يبدأ", "2027", "2029", "2031", "الحصة 2031"], streams_rows)}</div>
<div class="card"><h3>مجمل الربح حسب مجموعة المصادر، 2027–2031</h3><div class="legend">{s_legend}</div>{s_chart}<details class="tv"><summary>اعرضها كجدول (مليون ج.م)</summary>{s_table}</details></div>
<div class="callout"><b>ليه المزيج مهم:</b> هامش التجزئة حوالي {((a(B,'r_prod')[4]-a(B,'cogs')[4])/tot31*100):.0f}% من مجمل الربح في 2031، لكن أسرع المصادر نمواً هي اللي مش محتاجة مندوب إضافي: العمولات والإعلانات وحوافز الموردين. نسبة الاستقطاع بتطلع من {gm[0]*100:.1f}% من GMV في 2027 لـ {gm[4]*100:.1f}% في 2031.</div>
<h3>الطلب الواحد بيكسب كام وبيكلّف كام</h3><div class="tw">{ue_tbl}</div></section>

<section id="financials"><div class="eyebrow">04</div><h2>النموذج المالي</h2><p class="intro">نموذج شهري من أكتوبر 2026 لديسمبر 2031، بالجنيه الاسمي من غير ضريبة القيمة المضافة. العملاء بيتحددوا بإنفاق الاستحواذ ÷ CAC والاحتفاظ وحد تشبّع السوق؛ وكل مركز جديد بيمشي على منحنى عمر أبو المطامير مضروب في حجمه. ثلاث سيناريوهات بتحرّك CAC والاحتفاظ والتكرار وحجم السلة مع بعض.</p>
<div class="card"><h3>طلبات العملاء في اليوم حسب السيناريو (المجموعة)</h3>{line_orders()}</div>
<div class="card"><h3>رصيد النقدية، السيناريو الأساسي</h3>{cash_chart()}</div><div class="card"><h3>EBITDA على مستوى المركز مقابل المجموعة، السيناريو الأساسي (مليون ج.م)</h3><div class="legend"><span><i style="background:var(--c1)"></i>EBITDA المركز (قبل التكاليف المركزية)</span><span><i style="background:var(--c3)"></i>EBITDA المجموعة</span></div>{ebitda_bars()}</div>
<h3>قائمة الدخل والنقدية، السيناريو الأساسي</h3><div class="tw">{pl_tbl}</div>
<h3>ثلاث سيناريوهات</h3><p class="intro">المتحفظ: CAC ×1.25، الاحتفاظ −4 نقاط، التكرار ×0.85، السلة ×0.92. المتفائل: CAC ×0.85، الاحتفاظ +2 نقطة، التكرار ×1.1، السلة ×1.05. السيناريو المتحفظ ما بيمولش نفسه بالجولتين، وده بالظبط سبب إن التوسع مشروط ببوابات.</p><div class="tw">{scen_tbl}</div>
<div class="callout"><b>أبو المطامير لوحدها:</b> EBITDA على مستوى المركز {'، '.join(f"{y}: {v/1e6:,.1f} مليون" for y, v in zip(YEARS, am_ms))}. كشركة مستقلة شايلة كل التكاليف المركزية، EBITDA المجموعة بتفضل سالبة لحد 2031 ({am_eb[4]/1e6:,.1f} مليون في 2031)، يعني نسخة المركز الواحد إثبات للفكرة مش هي البيزنس.</div>
<h3>الافتراضات الرئيسية (الأساسي)</h3><div class="tw">{tbl(["المحرّك", "2027", "2029", "2031", "ملاحظة"], [
 ["متوسط قيمة الطلب (ج.م)", "270", "360", "440", "اسمي؛ شامل التضخم"],
 ["الاحتفاظ الشهري بالعملاء النشطين", "72%", "81%", "84%", "يتأكد في التجربة"],
 ["طلبات العميل النشط شهرياً", "2.8", "3.7", "4.2", "سلوك الطلبات التكميلية"],
 ["CAC المجمّع (ج.م)", "130", "170", "200", "شامل خصم أول طلب"],
 ["حصة المخزون المملوك من GMV", "62%", "55%", "52%", "السوق والأكل بيكبروا"],
 ["هامش التجزئة الأمامي", "16%", "18%", "19%", "علامة خاصة من 2029"],
 ["تكلفة المندوب للتوصيلة (ج.م)", "27", "31", "35", "أجر بالتوصيلة"],
 ["المدفوعات الإلكترونية", "18%", "38%", "50%", "الكاش هو الأساس عند الإطلاق"]])}</div>
<p class="intro">كل مدخل، بمصدره أو مبرره، موجود في ورقة <b>الافتراضات</b> في النموذج المالي. أرقام السكان والأسر تقديرية ولازم تتأكد من الجهاز المركزي للتعبئة العامة والإحصاء؛ والضريبة على أساس سعر الشركات في مصر 22.5% مع ترحيل الخسائر.</p></section>

<section id="roadmap"><div class="eyebrow">05</div><h2>خارطة الطريق 2026–2031</h2><p class="intro">خمس مسارات بتتحرك مع بعض: بنشتغل فين، المنتج بيعمل إيه، العمليات بتكبر إزاي، أنهي مصادر إيراد شغالة، والشركة بتتموّل إزاي. المحور الزمني من الشمال لليمين.</p>
<div class="card tw" style="min-width:0">{gantt()}</div>
<div class="legend"><span><i style="background:var(--c1)"></i>أساسي / شغال</span><span><i style="background:var(--c2)"></i>تحقيق دخل وتمويل</span><span><i style="background:var(--c3)"></i>توسع</span><span><i style="background:var(--c4)"></i>بناء قدرات</span></div></section>

<section id="launch"><div class="eyebrow">06</div><h2>خطة الإطلاق</h2><p class="intro">ست مراحل، كل واحدة ليها بوابة. بننتقل للمرحلة اللي بعدها بس لما مؤشرات البوابة تتحقق؛ لو لأ، بنصلح التشغيل قبل ما نصرف أكتر على النمو.</p>
{phase_html}
<h3>تقويم الإطلاق: من عشر أسابيع قبل لحد اتناشر أسبوع بعد الإطلاق العام (1 فبراير 2027)</h3><div class="tw">{cal_tbl}</div>
<h3>مزيج تسويق شهر الإطلاق (200 ألف ج.م)</h3><div class="card">{mkt_html}</div>
<div class="callout"><b>جاهزية الإطلاق:</b> المنطقة بتفتح بس لما قائمة فحص دليل التشغيل تعدّي: المخزون محمّل، الأسعار متراجعة، المناطق والمواعيد متظبطة، المناديب والمجمّعين متدربين، الدفع والكاش والاسترداد متجربين من الأول للآخر، والدعم جاهز وطريقة التصعيد واضحة.</div></section>

<section id="risks"><div class="eyebrow">07</div><h2>المخاطر والحساسية</h2><p class="intro">إيه أكتر حاجة بتحرّك ذروة الاحتياج التمويلي، محرّك واحد كل مرة، مقابل السيناريو الأساسي {egp(fund)}. البرتقالي هو الحالة السلبية والفيروزي الحالة الإيجابية.</p>
<div class="card">{tornado()}</div><div class="tw">{risk_tbl}</div></section>

<section id="funding"><div class="eyebrow">08</div><h2>التمويل واستخدامه</h2><p class="intro">جولتين بإجمالي 42 مليون ج.م (≈ {42e6/FX/1e6:.2f} مليون دولار بسعر {FX} ج.م)، وأقل رصيد نقدي في النموذج {egp(KB['k_min'])}. البذرة بتثبت مركز واحد؛ والجولة A بتموّل الشبكة بعد ما اقتصاديات وحدة أبو المطامير تثبت.</p><div class="tw">{uof}</div>
<div class="callout"><b>معالم يقدر المستثمرين يحاسبونا عليها:</b> تحقيق مؤشرات التجربة (يناير 2027) · 150 طلب/يوم ومساهمة طلب غير سالبة (منتصف 2027) · القرى 25% من الطلبات (الربع الأول 2028) · تعادل EBITDA مركز أبو المطامير (2029) · ستة مراكز شغالة (2030) · EBITDA المجموعة موجبة ({be}).</div>
<footer>توّا · Twaa — خطة عمل مولّدة من Twaa-Financial-Model.xlsx (السيناريو الأساسي ما لم يُذكر). بالجنيه الاسمي من غير ضريبة القيمة المضافة؛ المعادل بالدولار بسعر {FX} ج.م للاسترشاد فقط. الأرقام تقديرات تخطيطية وليست توقعات لنتائج فعلية.</footer></section>
</main></div><script>{js}</script></body></html>"""
OUT = "Twaa-Business-Plan-AR.html"
open(OUT, "w").write(html)
if os.environ.get("PUBLISH_OUT"):
    gh = "https://github.com/eldeniney/abbas/raw/claude/twaa-quick-commerce-design-tfgzjq/twaa/business/Twaa-Financial-Model-AR.xlsx"
    pub = html.replace('href="Twaa-Financial-Model-AR.xlsx" download', f'href="{gh}" target="_blank" rel="noopener"')
    pub = pub.replace('<a class="alt" href="Twaa-Business-Plan.html">English version</a>', '')
    open(os.environ["PUBLISH_OUT"], "w").write(pub)
print("written", OUT, len(html) // 1024, "KB")
