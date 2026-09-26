"""Twaa (توّا) 3-year financial model — writes a formula-driven .xlsx.
Every number a reader might change lives on 'Assumptions' (blue = input, yellow = key lever).
All other sheets are formulas. Values are nominal EGP (inflation embedded in yearly inputs), ex-VAT."""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment
import sys, datetime

OUT = sys.argv[1] if len(sys.argv) > 1 else "Twaa-Financial-Model.xlsx"
F = "Arial"
BLUE, BLACK, GREEN, WHITE = "0000FF", "000000", "008000", "FFFFFF"
PLUM, CREAM, MAND, GRAY = "3A1F3D", "F9F2E7", "F9732F", "7E6F80"
YELLOW = PatternFill("solid", fgColor="FFFF00")
HEAD = PatternFill("solid", fgColor=PLUM)
SEC = PatternFill("solid", fgColor=CREAM)
SUBT = PatternFill("solid", fgColor="EFE5F0")
thin = Side(style="thin", color="D9CBBB")
EGP = '#,##0;(#,##0);"-"'
EGP1 = '#,##0.0;(#,##0.0);"-"'
PCT = '0.0%;(0.0%);"-"'
NUM = '#,##0;(#,##0);"-"'
DEC = '#,##0.00;(#,##0.00);"-"'
MULT = '0.00"x"'

def font(color=BLACK, bold=False, size=10, italic=False):
    return Font(name=F, color=color, bold=bold, size=size, italic=italic)

wb = Workbook()
wb.calculation.fullCalcOnLoad = True

# ----------------------------------------------------------------------------------------------
# ASSUMPTIONS
# ----------------------------------------------------------------------------------------------
A = wb.active; A.title = "Assumptions"
A.sheet_view.showGridLines = False
for c, w in zip("ABCDEFGH", [50, 14, 13, 13, 13, 13, 13, 66]): A.column_dimensions[c].width = w
A["A1"] = "توّا Twaa — Assumptions (all inputs live here)"; A["A1"].font = font(PLUM, True, 14)
A["A2"] = "Blue = input you can change · Yellow = key lever · Values in nominal EGP (≈10–12%/yr inflation already inside yearly inputs), ex-VAT. 2027 = Year 1 (pilot Jan, public launch Feb). Horizon: Oct 2026 – Dec 2031."
A["A2"].font = font(GRAY, italic=True, size=9)
AR = {}   # key -> row
row = 4

def section(title):
    global row
    row += 1
    for c in "ABCDEFGH": A[f"{c}{row}"].fill = HEAD
    A[f"A{row}"] = title; A[f"A{row}"].font = font(WHITE, True, 11)
    row += 1

def header(cols):
    global row
    for i, t in enumerate(cols):
        cell = A.cell(row=row, column=i + 1, value=t); cell.font = font(PLUM, True, 9); cell.fill = SEC
    row += 1

def inp(key, label, unit, vals, fmt, note="", key_lever=False):
    """vals: scalar (col C) or list for C..E (2027..2029) or C..E scenario columns."""
    global row
    A[f"A{row}"] = label; A[f"A{row}"].font = font()
    A[f"B{row}"] = unit; A[f"B{row}"].font = font(GRAY, size=9)
    vs = vals if isinstance(vals, (list, tuple)) else [vals]
    for i, v in enumerate(vs):
        c = A.cell(row=row, column=3 + i, value=v); c.font = font(BLUE); c.number_format = fmt
        if key_lever: c.fill = YELLOW
    A[f"H{row}"] = note; A[f"H{row}"].font = font(GRAY, size=9); A[f"H{row}"].alignment = Alignment(wrap_text=True, vertical="top")
    AR[key] = row; row += 1

# --- Scenario ---
section("1 · Scenario")
inp("scen", "Selected scenario (1 = Conservative, 2 = Base, 3 = Optimistic)", "#", 2, "0", "Change this one cell to switch the whole model.", True)
dv = DataValidation(type="whole", operator="between", formula1=1, formula2=3, showErrorMessage=True, error="Enter 1, 2 or 3"); A.add_data_validation(dv); dv.add(f"C{AR['scen']}")
header(["Scenario multiplier", "Unit", "Conservative", "Base", "Optimistic", "Active", "", "How it is applied"])
def scen(key, label, unit, vals, fmt, note):
    inp(key, label, unit, vals, fmt, note)
    r = AR[key]; A[f"F{r}"] = f"=INDEX(C{r}:E{r},$C${AR['scen']})"; A[f"F{r}"].font = font(); A[f"F{r}"].number_format = fmt
scen("m_cac", "Customer acquisition cost multiplier", "x", [1.25, 1.0, 0.85], MULT, "Multiplies yearly CAC.")
scen("m_ret", "Monthly retention adjustment", "pp", [-0.04, 0.0, 0.02], PCT, "Added to yearly retention (capped at 95%).")
scen("m_freq", "Order frequency multiplier", "x", [0.85, 1.0, 1.10], MULT, "Multiplies orders per active customer per month.")
scen("m_aov", "Basket size (AOV) multiplier", "x", [0.92, 1.0, 1.05], MULT, "Multiplies average order value.")

# --- Timeline & market ---
section("2 · Timeline & market")
header(["Input", "Unit", "Value", "", "", "", "", "Note / source"])
inp("start", "Model start (first pre-launch month)", "date", datetime.date(2026, 10, 1), "mmm yyyy", "Oct–Dec 2026 = pre-launch build. Jan 2027 = pilot (operating month 1). Feb 2027 = public launch.")
inp("pop", "Population of Abu El Matamir markaz", "people", 480000, NUM, "ESTIMATE — verify with CAPMAS latest census before external use.")
inp("hh", "Average household size", "people", 4.6, "0.0", "Estimate for rural Beheira; verify with CAPMAS.")
header(["Input", "Unit", "2027", "2028", "2029", "2030", "2031", "Note / source"])
inp("svc", "Share of households inside active delivery zones", "%", [0.35, 0.60, 0.80, 0.90, 0.95], PCT, "City centre first, villages zone by zone (hub 2 and 3 extend reach).")
inp("hub2", "Hub 2 (village micro-hub) opens in operating month", "#", 16, "0", "Apr 2028. Fit-out paid the month before.")
inp("hub3", "Hub 3 (village micro-hub) opens in operating month", "#", 28, "0", "Apr 2029.")

# --- Acquisition ---
section("3 · Customer acquisition & retention")
header(["Input", "Unit", "2027", "2028", "2029", "2030", "2031", "Note / source"])
inp("spend_pilot", "Acquisition spend — pilot month (Jan 2027)", "EGP", 60000, EGP, "Invite-only pilot: ~400 households, first-order vouchers.", True)
inp("spend_launch", "Acquisition spend — launch month (Feb 2027)", "EGP", 200000, EGP, "Public launch burst: flyers, WhatsApp groups, influencers, launch events, first-order 30% off.", True)
inp("spend_m3", "Acquisition spend — month 3 (Mar 2027)", "EGP", 160000, EGP, "Sustain launch momentum, start village teasers.")
inp("spend", "Acquisition spend — monthly run-rate thereafter", "EGP/month", [120000, 160000, 200000, 230000, 250000], EGP, "Paid + promo acquisition; rises with each new village zone.", True)
inp("cac", "Blended CAC (paid acquisition incl. first-order discount)", "EGP/customer", [130, 150, 170, 185, 200], EGP, "Assumption: rising as early adopters are exhausted. Validate after pilot.", True)
inp("penmax", "Maximum achievable penetration of reachable households", "%", 0.30, PCT, "Saturation guard: new-customer acquisition slows linearly as penetration approaches this ceiling.")
inp("org", "Organic & referral customers as % of paid", "%", [0.20, 0.30, 0.35, 0.38, 0.40], PCT, "Referral 50 EGP give/get, word of mouth, rider branding.")
inp("ret", "Monthly retention of active customers", "%", [0.72, 0.78, 0.81, 0.83, 0.84], PCT, "Share of last month's active customers who order again this month.", True)
inp("freq", "Orders per active customer per month", "orders", [2.8, 3.3, 3.7, 4.0, 4.2], "0.0", "Top-up behaviour: bread, milk, water, diapers several times a week.", True)

# --- Basket & mix ---
section("4 · Basket & category mix")
header(["Input", "Unit", "2027", "2028", "2029", "2030", "2031", "Note / source"])
inp("aov", "Average order value (AOV)", "EGP", [270, 315, 360, 400, 440], EGP, "Nominal, incl. ~12%/yr inflation and basket growth.", True)
inp("mix_hub", "GMV mix — Twaa-owned inventory (hub)", "% GMV", [0.62, 0.58, 0.55, 0.53, 0.52], PCT, "Groceries, household, cleaning, personal care.")
inp("mix_mp", "GMV mix — Marketplace (local merchants, partner pharmacies)", "% GMV", [0.13, 0.15, 0.17, 0.18, 0.19], PCT, "OTC pharmacy is fulfilled by licensed partner pharmacies.")
inp("mix_food", "GMV mix — Food (partner restaurants & Twaa kitchen)", "% GMV", [0.25, 0.27, 0.28, 0.29, 0.29], PCT, "")
r = row; A[f"A{r}"] = "Check: mix sums to 100%"; A[f"A{r}"].font = font(GRAY, italic=True, size=9)
for i, c in enumerate("CDEFG"): A[f"{c}{r}"] = f"=IF(ABS({c}{AR['mix_hub']}+{c}{AR['mix_mp']}+{c}{AR['mix_food']}-1)<0.0001,\"OK\",\"ERROR\")"; A[f"{c}{r}"].font = font(size=9)
AR["mixcheck"] = r; row += 1

# --- Revenue streams ---
section("5 · Revenue streams (pricing & take rates)")
header(["Input", "Unit", "2027", "2028", "2029", "2030", "2031", "Note / source"])
inp("gm_hub", "Front margin on owned inventory", "% hub GMV", [0.16, 0.17, 0.18, 0.185, 0.19], PCT, "Retail margin after purchase cost. Egyptian grocery retail typically 12–20%; improves with volume buying and private label (2029+).", True)
inp("back", "Supplier back margin (rebates, listing fees)", "% hub GMV", [0.0, 0.015, 0.025, 0.03, 0.03], PCT, "Volume rebates from distributors/brands once volume is proven.")
inp("media", "Retail media (sponsored placement, in-app banners)", "% hub GMV", [0.003, 0.008, 0.012, 0.014, 0.015], PCT, "Brand-funded visibility; sold to FMCG distributors.")
inp("c_mp", "Marketplace commission", "% MP GMV", [0.11, 0.12, 0.12, 0.12, 0.12], PCT, "Charged to merchants / partner pharmacies on each order.", True)
inp("c_food", "Food commission", "% food GMV", [0.17, 0.18, 0.18, 0.18, 0.18], PCT, "Charged to restaurants.", True)
inp("dfee", "Average delivery fee charged (city + village blend)", "EGP/order", [17, 19, 21, 23, 25], EGP, "City 10–15, villages 20–30. Free above basket threshold.", True)
inp("pay_share", "Share of orders paying delivery fee (before Twaa+)", "%", [0.55, 0.58, 0.60, 0.60, 0.60], PCT, "Rest are free via basket threshold or promotions.")
inp("sfee", "Service fee per order", "EGP/order", [3, 4, 5, 5, 6], EGP, "Small fixed fee shown transparently at checkout.")
inp("plus_price", "Twaa+ subscription price", "EGP/month", [0, 49, 59, 65, 72], EGP, "Launch Jan 2028: unlimited free delivery, double points.")
inp("plus_pct", "Twaa+ members as % of active customers", "%", [0.0, 0.05, 0.09, 0.12, 0.14], PCT, "")
inp("plus_x", "Order frequency of members vs average", "x", 1.6, MULT, "Members order more; their orders pay no delivery fee.")
inp("daas", "Delivery-as-a-Service deliveries per day (average)", "deliveries/day", [15, 60, 120, 180, 240], NUM, "Merchants' own orders delivered by Twaa riders. Starts operating month 4.")
inp("daas_fee", "DaaS fee per delivery (paid by merchant)", "EGP", [22, 25, 28, 31, 34], EGP, "")
inp("daas_start", "DaaS starts in operating month", "#", 4, "0", "")

# --- Variable costs ---
section("6 · Variable costs (per order / % of GMV)")
header(["Input", "Unit", "2027", "2028", "2029", "2030", "2031", "Note / source"])
inp("rider", "Rider cost per delivery (pay, fuel, phone, incentives)", "EGP/delivery", [27, 29, 31, 33, 35], EGP, "Per-drop pay model; batching offsets inflation.", True)
inp("drops", "Deliveries per customer order", "x", [1.06, 1.05, 1.04, 1.04, 1.03], "0.00", "Split deliveries when components can't be consolidated.")
inp("pick", "Pick & pack labour per hub order", "EGP/order", [4.0, 4.3, 4.6, 4.9, 5.2], DEC, "Applied to hub share of orders.")
inp("pack", "Packaging (branded bags, cold packs)", "EGP/order", [3.5, 3.8, 4.1, 4.4, 4.7], DEC, "")
inp("dig", "Share of GMV paid digitally (cards, wallets)", "%", [0.18, 0.28, 0.38, 0.45, 0.50], PCT, "COD dominant at launch.")
inp("gw", "Payment gateway fee", "% digital GMV", 0.023, PCT, "Typical Egyptian gateway MDR; confirm with Paymob/Fawry/Geidea quote.")
inp("promo", "Customer promotions funded by Twaa (after first order)", "% GMV", [0.040, 0.028, 0.022, 0.020, 0.020], PCT, "First-order discount sits inside CAC.")
inp("shrink", "Shrinkage, expiry & damage", "% hub GMV", [0.018, 0.015, 0.013, 0.012, 0.012], PCT, "")
inp("refund", "Refunds & compensation", "% GMV", [0.006, 0.005, 0.004, 0.004, 0.004], PCT, "")
inp("supv", "Support, SMS & WhatsApp per order", "EGP/order", [1.6, 1.8, 2.0, 2.2, 2.4], DEC, "")

# --- Fixed costs ---
section("7 · Fixed operating costs (monthly)")
header(["Input", "Unit", "2027", "2028", "2029", "2030", "2031", "Note / source"])
inp("rent", "Hub rent (per hub)", "EGP/month", [30000, 34000, 38000, 42000, 46000], EGP, "Ground-floor unit ~150–250 m² in Abu El Matamir; get 3 quotes.")
inp("util", "Hub utilities & electricity (per hub)", "EGP/month", [12000, 14000, 16000, 18000, 20000], EGP, "Chillers and freezers run 24/7.")
inp("hubteam", "Hub core team (per hub): manager, receiving, security", "EGP/month", [45000, 51000, 57000, 63000, 69000], EGP, "Pickers are variable (pick & pack).")
inp("ridermgmt", "Rider supervision & dispatch", "EGP/month", [32000, 48000, 60000, 70000, 80000], EGP, "")
inp("support", "Customer support team", "EGP/month", [30000, 45000, 55000, 65000, 75000], EGP, "")
inp("tech", "Technology team / vendor retainer", "EGP/month", [160000, 180000, 200000, 220000, 240000], EGP, "2–3 engineers + QA, or vendor maintenance.")
inp("cloud", "Cloud, maps, SMS gateway, tools", "EGP/month", [20000, 30000, 40000, 45000, 50000], EGP, "")
inp("ga", "Leadership & G&A (GM, finance, buyer, marketing, HR)", "EGP/month", [150000, 190000, 230000, 260000, 290000], EGP, "")
inp("office", "Office, legal, accounting, insurance", "EGP/month", [25000, 30000, 35000, 40000, 45000], EGP, "")
inp("brand", "Brand & community marketing (non-acquisition)", "EGP/month", [25000, 35000, 45000, 50000, 55000], EGP, "Content, sponsorships, village events.")
header(["Input", "Unit", "Value", "", "", "", "", "Note / source"])
inp("prelaunch", "Pre-launch operating cost (Oct–Dec 2026)", "EGP/month", 240000, EGP, "Hiring, training, supplier onboarding, legal, launch kit.")

# --- Capex ---
section("8 · Capital expenditure & depreciation")
header(["Input", "Unit", "Value", "", "", "", "", "Note / source"])
inp("cap_tech", "Platform build (customer app, admin, picker, rider apps)", "EGP", 2400000, EGP, "Paid evenly Oct–Dec 2026. Prototype and BRD already done.", True)
inp("cap_hub1", "Hub 1 fit-out (shelving, chillers, freezers, generator, scanners)", "EGP", 950000, EGP, "Paid Dec 2026.")
inp("cap_hubn", "Village micro-hub fit-out (hub 2 and hub 3, each)", "EGP", 650000, EGP, "Paid the month before opening.")
inp("cap_rider", "Rider kit (thermal bags, helmets, phones) at launch", "EGP", 150000, EGP, "Riders use own motorcycles (per-drop model).")
inp("life_tech", "Useful life — technology", "months", 36, "0", "")
inp("life_hub", "Useful life — hub equipment", "months", 60, "0", "")

# --- Working capital & tax ---
section("9 · Working capital, tax & funding")
header(["Input", "Unit", "2027", "2028", "2029", "2030", "2031", "Note / source"])
inp("inv_floor", "Minimum inventory per hub (SKU breadth)", "EGP", [900000, 1050000, 1200000, 1350000, 1500000], EGP, "~1,500–3,000 SKUs at launch.")
header(["Input", "Unit", "Value", "", "", "", "", "Note / source"])
inp("inv_days", "Inventory days (of hub cost of goods)", "days", 14, "0", "")
inp("sup_days", "Supplier credit days", "days", 21, "0", "Local distributors typically give 14–30 days.")
inp("mer_days", "Merchant payout lag (marketplace & food)", "days", 7, "0", "Weekly settlement: cash float in Twaa's favour.")
inp("tax", "Corporate income tax rate", "%", 0.225, PCT, "Egypt Income Tax Law 91/2005, standard rate 22.5%. Losses carried forward.")
inp("seed", "Seed round (received Oct 2026)", "EGP", 20000000, EGP, "Covers pre-launch, Abu El Matamir launch and villages until the growth round.", True)
inp("sA", "Growth round (Series A) amount", "EGP", 22000000, EGP, "Funds the multi-markaz expansion; raise on proven Abu El Matamir unit economics.", True)
inp("sA_m", "Growth round — operating month received", "#", 18, "0", "Jun 2028, four months before the first expansion markaz.")
inp("fx", "Exchange rate for USD equivalents", "EGP per USD", 50, "0.0", "Display only. Assumption — update to the current CBE rate.")

section("10 · Expansion to other Beheira markazes (hub-in-a-box playbook)")
header(["Input", "Unit", "Value", "", "", "", "", "Note / source"])
inp("exp_on", "Expansion switch (1 = on, 0 = Abu El Matamir only)", "0/1", 1, "0", "Each new markaz replicates the Abu El Matamir ramp (same age curve × size factor) and shares central tech and management.", True)
inp("exp_pre", "Pre-launch cost per new markaz (one-off, month before launch)", "EGP", 350000, EGP, "Local hiring, supplier onboarding, rider recruitment, launch kit.")
header(["Input", "Unit", "2027", "2028", "2029", "2030", "2031", "Note / source"])
inp("exp_local", "Local markaz team per live markaz (lead, ops, support)", "EGP/month", [45000, 50000, 55000, 60000, 65000], EGP, "Hub rent/utilities/core team are counted via hubs operating.")
header(["Markaz (indicative — validate with demand data)", "", "Launch op. month", "Size vs Abu El Matamir", "", "", "", "Note"])
EXP = [("Hosh Issa — حوش عيسى", 22, 0.8, "Oct 2028 · adjacent markaz, shared supply routes"), ("Abu Hummus — أبو حمص", 28, 1.0, "Apr 2029"), ("Delengat — الدلنجات", 34, 0.9, "Oct 2029"), ("Kom Hamada — كوم حمادة", 40, 0.9, "Apr 2030"), ("Badr — بدر", 46, 0.7, "Oct 2030"), ("(spare slot)", 60, 0.0, "Set size > 0 to add a markaz")]
EXPR = []
for name, lm, sz, note in EXP:
    A[f"A{row}"] = name; A[f"A{row}"].font = font()
    c = A[f"C{row}"]; c.value = lm; c.font = font(BLUE); c.number_format = "0"
    c = A[f"D{row}"]; c.value = sz; c.font = font(BLUE); c.number_format = MULT
    A[f"H{row}"] = note; A[f"H{row}"].font = font(GRAY, size=9)
    EXPR.append(row); row += 1

A.freeze_panes = "C4"

# ----------------------------------------------------------------------------------------------
# MODEL (monthly)
# ----------------------------------------------------------------------------------------------
M = wb.create_sheet("Model"); M.sheet_view.showGridLines = False
N = 63; C0 = 3  # first data column C
cols = [L(C0 + i) for i in range(N)]
FIRST, LAST = cols[0], cols[-1]
M.column_dimensions["A"].width = 44; M.column_dimensions["B"].width = 12
for c in cols: M.column_dimensions[c].width = 11.5
M["A1"] = "توّا Twaa — Monthly model Oct 2026 – Dec 2031 (formulas only; edit Assumptions)"; M["A1"].font = font(PLUM, True, 13)

def ya(key, c):  # yearly lookup on Assumptions (2027..2029) using lookup-year row
    return f"INDEX(Assumptions!$C${AR[key]}:$G${AR[key]},{c}${R['ly']})"
def sa(key):     # single-value input
    return f"Assumptions!$C${AR[key]}"
def sm(key):     # active scenario multiplier
    return f"Assumptions!$F${AR[key]}"

SPEC = []  # (key, label, unit, fn(c, p, i) -> formula or None, fmt, style)
def S(key, label, unit="", fn=None, fmt=EGP, style=""):
    SPEC.append((key, label, unit, fn, fmt, style))
def H(title): SPEC.append((None, title, "", None, None, "H"))

H("Timeline")
S("date", "Month", "", lambda c, p, i: f"={sa('start')}" if i == 0 else f"=DATE(YEAR({p}{R['date']}),MONTH({p}{R['date']})+1,1)", "mmm yy", "date")
S("year", "Calendar year", "", lambda c, p, i: f"=YEAR({c}{R['date']})", "0")
S("opm", "Operating month (1 = Jan 2027 pilot)", "#", lambda c, p, i: f"=({c}{R['year']}-2027)*12+MONTH({c}{R['date']})", "0")
S("flag", "Operating flag", "0/1", lambda c, p, i: f"=IF({c}{R['opm']}>=1,1,0)", "0")
S("ly", "Assumption year (1=2027)", "#", lambda c, p, i: f"=MAX(1,MIN(5,{c}{R['year']}-2026))", "0")
S("phase", "Phase", "", lambda c, p, i: f'=IF({c}{R["opm"]}<1,"Pre-launch",IF({c}{R["opm"]}=1,"Pilot",IF({c}{R["opm"]}<{sa("hub2")},"City",IF({c}{R["opm"]}<Assumptions!$C${EXPR[0]},"Villages I","Multi-markaz"))))', "@")

H("Customers")
S("acq_am", "Acquisition marketing spend — Abu El Matamir", "EGP", lambda c, p, i: f"={c}{R['flag']}*IF({c}{R['opm']}=1,{sa('spend_pilot')},IF({c}{R['opm']}=2,{sa('spend_launch')},IF({c}{R['opm']}=3,{sa('spend_m3')},{ya('spend', c)})))", EGP)
S("cac", "Blended CAC", "EGP", lambda c, p, i: f"={ya('cac', c)}*{sm('m_cac')}", EGP, "link")
S("sat", "Saturation factor (1 = open market)", "x", lambda c, p, i: "=1" if i == 0 else f"=MAX(0,1-{p}{R['pen']}/{sa('penmax')})", DEC)
S("new_paid", "New customers — paid", "#", lambda c, p, i: f"=IF({c}{R['cac']}>0,{c}{R['acq_am']}/{c}{R['cac']}*{c}{R['sat']},0)", NUM)
S("new_org", "New customers — organic & referral", "#", lambda c, p, i: f"={c}{R['new_paid']}*{ya('org', c)}", NUM)
S("new", "New customers — total", "#", lambda c, p, i: f"={c}{R['new_paid']}+{c}{R['new_org']}", NUM, "b")
S("ret", "Monthly retention", "%", lambda c, p, i: f"=MIN(0.95,{ya('ret', c)}+{sm('m_ret')})", PCT, "link")
S("active_am", "Active customers — Abu El Matamir", "#", lambda c, p, i: f"={c}{R['new']}" if i == 0 else f"={p}{R['active_am']}*{c}{R['ret']}+{c}{R['new']}", NUM, "b")
S("hhs", "Households inside delivery zones", "#", lambda c, p, i: f"={sa('pop')}/{sa('hh')}*{ya('svc', c)}", NUM)
S("pen", "Penetration of reachable households", "%", lambda c, p, i: f"=IF({c}{R['hhs']}>0,{c}{R['active_am']}/{c}{R['hhs']},0)", PCT)

H("Orders & GMV")
S("freq", "Orders per active customer per month", "#", lambda c, p, i: f"={ya('freq', c)}*{sm('m_freq')}", DEC, "link")
S("orders_am", "Customer orders — Abu El Matamir", "#", lambda c, p, i: f"={c}{R['active_am']}*{c}{R['freq']}", NUM, "b")
H("Expansion markazes (same age curve × size factor)")
def _age(k, key, c):  # value of Abu El Matamir row at the same operating age as markaz k
    rr = EXPR[k]
    return f"IF(AND({sa('exp_on')}=1,{c}{R['opm']}>=Assumptions!$C${rr}),INDEX(${FIRST}{R[key]}:${LAST}{R[key]},1,{c}{R['opm']}-Assumptions!$C${rr}+4)*Assumptions!$D${rr},0)"
for k in range(len(EXP)):
    S(f"x_act{k}", f"Active customers — {EXP[k][0]}", "#", (lambda k: lambda c, p, i: "=" + _age(k, "active_am", c))(k), NUM)
for k in range(len(EXP)):
    S(f"x_ord{k}", f"Orders — {EXP[k][0]}", "#", (lambda k: lambda c, p, i: "=" + _age(k, "orders_am", c))(k), NUM)
for k in range(len(EXP)):
    S(f"x_acq{k}", f"Acquisition spend — {EXP[k][0]}", "EGP", (lambda k: lambda c, p, i: "=" + _age(k, "acq_am", c))(k), EGP)
S("x_live", "Expansion markazes live", "#", lambda c, p, i: "=" + "+".join(f"IF(AND({sa('exp_on')}=1,Assumptions!$D${EXPR[k]}>0,{c}{R['opm']}>=Assumptions!$C${EXPR[k]}),1,0)" for k in range(len(EXP))), "0")
S("x_pre", "Expansion markazes in pre-launch month", "#", lambda c, p, i: "=" + "+".join(f"IF(AND({sa('exp_on')}=1,Assumptions!$D${EXPR[k]}>0,{c}{R['opm']}=Assumptions!$C${EXPR[k]}-1),1,0)" for k in range(len(EXP))), "0")
H("Group totals")
S("markazes", "Markazes live (incl. Abu El Matamir)", "#", lambda c, p, i: f"={c}{R['flag']}+{c}{R['x_live']}", "0", "b")
S("active", "Active customers — group", "#", lambda c, p, i: f"={c}{R['active_am']}+SUM({c}{R['x_act0']}:{c}{R['x_act' + str(len(EXP) - 1)]})", NUM, "b")
S("acq", "Acquisition spend — group", "EGP", lambda c, p, i: f"={c}{R['acq_am']}+SUM({c}{R['x_acq0']}:{c}{R['x_acq' + str(len(EXP) - 1)]})", EGP)
S("orders", "Customer orders — group", "#", lambda c, p, i: f"={c}{R['orders_am']}+SUM({c}{R['x_ord0']}:{c}{R['x_ord' + str(len(EXP) - 1)]})", NUM, "b")
S("opd", "Customer orders per day", "#", lambda c, p, i: f"={c}{R['orders']}/30.4", NUM)
S("daas", "DaaS deliveries (merchants' own orders)", "#", lambda c, p, i: f"=IF({c}{R['opm']}>={sa('daas_start')},{ya('daas', c)}*30.4,0)", NUM)
S("aov", "Average order value", "EGP", lambda c, p, i: f"={ya('aov', c)}*{sm('m_aov')}", EGP, "link")
S("gmv", "GMV — total", "EGP", lambda c, p, i: f"={c}{R['orders']}*{c}{R['aov']}", EGP, "b")
S("gmv_hub", "GMV — Twaa-owned inventory", "EGP", lambda c, p, i: f"={c}{R['gmv']}*{ya('mix_hub', c)}", EGP)
S("gmv_mp", "GMV — marketplace & pharmacy partners", "EGP", lambda c, p, i: f"={c}{R['gmv']}*{ya('mix_mp', c)}", EGP)
S("gmv_food", "GMV — food", "EGP", lambda c, p, i: f"={c}{R['gmv']}*{ya('mix_food', c)}", EGP)

H("Revenue streams")
S("r_prod", "1. Product sales (owned inventory)", "EGP", lambda c, p, i: f"={c}{R['gmv_hub']}", EGP)
S("r_mp", "2. Marketplace & pharmacy commission", "EGP", lambda c, p, i: f"={c}{R['gmv_mp']}*{ya('c_mp', c)}", EGP)
S("r_food", "3. Food commission", "EGP", lambda c, p, i: f"={c}{R['gmv_food']}*{ya('c_food', c)}", EGP)
S("plus_share", "   Share of orders from Twaa+ members", "%", lambda c, p, i: f"=MIN(1,{ya('plus_pct', c)}*{sa('plus_x')})", PCT)
S("r_del", "4. Delivery fees", "EGP", lambda c, p, i: f"={c}{R['orders']}*{ya('pay_share', c)}*(1-{c}{R['plus_share']})*{ya('dfee', c)}", EGP)
S("r_svc", "5. Service fees", "EGP", lambda c, p, i: f"={c}{R['orders']}*{ya('sfee', c)}", EGP)
S("r_plus", "6. Twaa+ subscriptions", "EGP", lambda c, p, i: f"={c}{R['active']}*{ya('plus_pct', c)}*{ya('plus_price', c)}", EGP)
S("r_daas", "7. Delivery-as-a-Service fees", "EGP", lambda c, p, i: f"={c}{R['daas']}*{ya('daas_fee', c)}", EGP)
S("r_media", "8. Retail media (sponsored placement)", "EGP", lambda c, p, i: f"={c}{R['gmv_hub']}*{ya('media', c)}", EGP)
S("r_back", "9. Supplier back margin", "EGP", lambda c, p, i: f"={c}{R['gmv_hub']}*{ya('back', c)}", EGP)
S("rev", "Net revenue", "EGP", lambda c, p, i: f"=SUM({c}{R['r_prod']}:{c}{R['r_mp']})+{c}{R['r_food']}+SUM({c}{R['r_del']}:{c}{R['r_back']})", EGP, "t")
S("cogs", "Cost of goods sold (owned inventory)", "EGP", lambda c, p, i: f"={c}{R['gmv_hub']}*(1-{ya('gm_hub', c)})", EGP)
S("gp", "Gross profit", "EGP", lambda c, p, i: f"={c}{R['rev']}-{c}{R['cogs']}", EGP, "t")
S("gp_prod", "   of which product margin", "EGP", lambda c, p, i: f"={c}{R['r_prod']}-{c}{R['cogs']}", EGP)

H("Variable costs")
S("drops", "Deliveries (customer drops + DaaS)", "#", lambda c, p, i: f"={c}{R['orders']}*{ya('drops', c)}+{c}{R['daas']}", NUM)
S("v_rider", "Rider cost", "EGP", lambda c, p, i: f"={c}{R['drops']}*{ya('rider', c)}", EGP)
S("v_pick", "Pick & pack labour", "EGP", lambda c, p, i: f"={c}{R['orders']}*{ya('mix_hub', c)}*{ya('pick', c)}", EGP)
S("v_pack", "Packaging", "EGP", lambda c, p, i: f"={c}{R['orders']}*{ya('pack', c)}", EGP)
S("v_pay", "Payment gateway fees", "EGP", lambda c, p, i: f"={c}{R['gmv']}*{ya('dig', c)}*{sa('gw')}", EGP)
S("v_promo", "Customer promotions", "EGP", lambda c, p, i: f"={c}{R['gmv']}*{ya('promo', c)}", EGP)
S("v_shrink", "Shrinkage, expiry & damage", "EGP", lambda c, p, i: f"={c}{R['gmv_hub']}*{ya('shrink', c)}", EGP)
S("v_ref", "Refunds & compensation", "EGP", lambda c, p, i: f"={c}{R['gmv']}*{ya('refund', c)}", EGP)
S("v_sup", "Support & messaging", "EGP", lambda c, p, i: f"={c}{R['orders']}*{ya('supv', c)}", EGP)
S("var", "Total variable costs", "EGP", lambda c, p, i: f"=SUM({c}{R['v_rider']}:{c}{R['v_sup']})", EGP, "t")
S("cm", "Contribution margin", "EGP", lambda c, p, i: f"={c}{R['gp']}-{c}{R['var']}", EGP, "t")
S("cmo", "Contribution per customer order", "EGP", lambda c, p, i: f"=IF({c}{R['orders']}>0,{c}{R['cm']}/{c}{R['orders']},0)", EGP1)

H("Fixed costs & EBITDA")
S("hubs", "Hubs operating", "#", lambda c, p, i: f"={c}{R['flag']}*(1+IF({c}{R['opm']}>={sa('hub2')},1,0)+IF({c}{R['opm']}>={sa('hub3')},1,0))+{c}{R['x_live']}", "0")
S("f_hub", "Hub rent, utilities & core team", "EGP", lambda c, p, i: f"={c}{R['hubs']}*({ya('rent', c)}+{ya('util', c)}+{ya('hubteam', c)})", EGP)
S("f_rid", "Rider supervision & dispatch", "EGP", lambda c, p, i: f"={c}{R['flag']}*{ya('ridermgmt', c)}", EGP)
S("f_sup", "Customer support team", "EGP", lambda c, p, i: f"={c}{R['flag']}*{ya('support', c)}", EGP)
S("f_tech", "Technology team & infrastructure", "EGP", lambda c, p, i: f"={c}{R['flag']}*({ya('tech', c)}+{ya('cloud', c)})", EGP)
S("f_ga", "Leadership, G&A, office & legal", "EGP", lambda c, p, i: f"={c}{R['flag']}*({ya('ga', c)}+{ya('office', c)})", EGP)
S("f_brand", "Brand & community marketing", "EGP", lambda c, p, i: f"={c}{R['flag']}*{ya('brand', c)}", EGP)
S("f_local", "Local markaz teams (expansion)", "EGP", lambda c, p, i: f"={c}{R['x_live']}*{ya('exp_local', c)}", EGP)
S("f_pre", "Pre-launch operating cost", "EGP", lambda c, p, i: f"=(1-{c}{R['flag']})*{sa('prelaunch')}+{c}{R['x_pre']}*{sa('exp_pre')}", EGP)
S("f_acq", "Acquisition marketing", "EGP", lambda c, p, i: f"={c}{R['acq']}", EGP)
S("fixed", "Total operating expenses (excl. variable)", "EGP", lambda c, p, i: f"=SUM({c}{R['f_hub']}:{c}{R['f_acq']})", EGP, "t")
S("ebitda", "EBITDA", "EGP", lambda c, p, i: f"={c}{R['cm']}-{c}{R['fixed']}", EGP, "T")
S("central", "Central costs (technology, leadership & G&A, brand)", "EGP", lambda c, p, i: f"={c}{R['f_tech']}+{c}{R['f_ga']}+{c}{R['f_brand']}", EGP)
S("m_ebitda", "Markaz-level EBITDA (before central costs)", "EGP", lambda c, p, i: f"={c}{R['ebitda']}+{c}{R['central']}", EGP, "b")
S("ebitda_gmv", "EBITDA margin (% of GMV)", "%", lambda c, p, i: f"=IF({c}{R['gmv']}>0,{c}{R['ebitda']}/{c}{R['gmv']},0)", PCT)

H("Depreciation, tax & net income")
S("cx_tech", "Capex — platform build", "EGP", lambda c, p, i: f"=IF({c}{R['opm']}<=0,{sa('cap_tech')}/3,0)", EGP)
S("cx_hub", "Capex — hubs & rider kit", "EGP", lambda c, p, i: f"=IF({c}{R['opm']}=0,{sa('cap_hub1')}+{sa('cap_rider')},0)+IF({c}{R['opm']}={sa('hub2')}-1,{sa('cap_hubn')},0)+IF({c}{R['opm']}={sa('hub3')}-1,{sa('cap_hubn')},0)+{c}{R['x_pre']}*{sa('cap_hubn')}", EGP)
S("capex", "Total capex", "EGP", lambda c, p, i: f"={c}{R['cx_tech']}+{c}{R['cx_hub']}", EGP, "b")
S("cum_tech", "Cumulative technology capex", "EGP", lambda c, p, i: f"={c}{R['cx_tech']}" if i == 0 else f"={p}{R['cum_tech']}+{c}{R['cx_tech']}", EGP)
S("cum_hub", "Cumulative hub capex", "EGP", lambda c, p, i: f"={c}{R['cx_hub']}" if i == 0 else f"={p}{R['cum_hub']}+{c}{R['cx_hub']}", EGP)
S("da", "Depreciation & amortisation", "EGP", lambda c, p, i: f"={c}{R['flag']}*({c}{R['cum_tech']}/{sa('life_tech')}+{c}{R['cum_hub']}/{sa('life_hub')})", EGP)
S("ebit", "EBIT", "EGP", lambda c, p, i: f"={c}{R['ebitda']}-{c}{R['da']}", EGP, "b")
S("cum_ebit", "Cumulative EBIT (loss carry-forward)", "EGP", lambda c, p, i: f"={c}{R['ebit']}" if i == 0 else f"={p}{R['cum_ebit']}+{c}{R['ebit']}", EGP)
S("taxable", "Taxable profit after losses", "EGP", lambda c, p, i: f"=MAX(0,MIN({c}{R['ebit']},{c}{R['cum_ebit']}))", EGP)
S("taxp", "Income tax", "EGP", lambda c, p, i: f"={c}{R['taxable']}*{sa('tax')}", EGP)
S("ni", "Net income", "EGP", lambda c, p, i: f"={c}{R['ebit']}-{c}{R['taxp']}", EGP, "T")

H("Working capital & cash")
S("inv", "Inventory", "EGP", lambda c, p, i: f"=IF({c}{R['opm']}>=0,MAX({ya('inv_floor', c)}*MAX(1,{c}{R['hubs']}),{c}{R['cogs']}/30.4*{sa('inv_days')}),0)", EGP)
S("ap", "Supplier payables", "EGP", lambda c, p, i: f"={c}{R['cogs']}/30.4*{sa('sup_days')}", EGP)
S("mp_pay", "Merchant & restaurant payables", "EGP", lambda c, p, i: f"=({c}{R['gmv_mp']}-{c}{R['r_mp']}+{c}{R['gmv_food']}-{c}{R['r_food']})/30.4*{sa('mer_days')}", EGP)
S("nwc", "Net working capital", "EGP", lambda c, p, i: f"={c}{R['inv']}-{c}{R['ap']}-{c}{R['mp_pay']}", EGP)
S("dnwc", "Change in working capital", "EGP", lambda c, p, i: f"={c}{R['nwc']}" if i == 0 else f"={c}{R['nwc']}-{p}{R['nwc']}", EGP)
S("ocf", "Operating cash flow", "EGP", lambda c, p, i: f"={c}{R['ebitda']}-{c}{R['taxp']}-{c}{R['dnwc']}", EGP)
S("fcf", "Free cash flow", "EGP", lambda c, p, i: f"={c}{R['ocf']}-{c}{R['capex']}", EGP, "b")
S("cum_fcf", "Cumulative free cash flow (before funding)", "EGP", lambda c, p, i: f"={c}{R['fcf']}" if i == 0 else f"={p}{R['cum_fcf']}+{c}{R['fcf']}", EGP)
S("fund", "Equity funding received", "EGP", lambda c, p, i: f"=IF({c}{R['opm']}=-2,{sa('seed')},0)+IF({c}{R['opm']}={sa('sA_m')},{sa('sA')},0)", EGP)
S("cash", "Cash balance (end of month)", "EGP", lambda c, p, i: f"={c}{R['fcf']}+{c}{R['fund']}" if i == 0 else f"={p}{R['cash']}+{c}{R['fcf']}+{c}{R['fund']}", EGP, "T")

H("Helpers")
S("pos", "EBITDA positive (1/0)", "", lambda c, p, i: f"=IF({c}{R['ebitda']}>0,1,0)", "0")
S("pos_cum", "Positive months so far", "", lambda c, p, i: f"={c}{R['pos']}" if i == 0 else f"={p}{R['pos_cum']}+{c}{R['pos']}", "0")
S("first_pos", "First EBITDA-positive month", "", lambda c, p, i: f"=IF(AND({c}{R['pos']}=1,{c}{R['pos_cum']}=1),{c}{R['date']},0)", "mmm yy")
S("cpos", "Contribution positive (1/0)", "", lambda c, p, i: f"=IF(AND({c}{R['cm']}>0,{c}{R['flag']}=1),1,0)", "0")
S("cpos_cum", "Contribution-positive months so far", "", lambda c, p, i: f"={c}{R['cpos']}" if i == 0 else f"={p}{R['cpos_cum']}+{c}{R['cpos']}", "0")
S("first_cpos", "First contribution-positive month", "", lambda c, p, i: f"=IF(AND({c}{R['cpos']}=1,{c}{R['cpos_cum']}=1),{c}{R['date']},0)", "mmm yy")

# assign rows
R = {}; r = 3
for key, label, unit, fn, fmt, style in SPEC:
    if style == "H": r += 1
    if key: R[key] = r
    r += 1
# write
r = 3
for key, label, unit, fn, fmt, style in SPEC:
    if style == "H":
        r += 1
        for ci in range(1, C0 + N): M.cell(row=r, column=ci).fill = SUBT
        M.cell(row=r, column=1, value=label).font = font(PLUM, True, 10)
        r += 1; continue
    M.cell(row=r, column=1, value=label).font = font(bold=style in ("b", "t", "T"))
    M.cell(row=r, column=2, value=unit).font = font(GRAY, size=9)
    for i, c in enumerate(cols):
        p = cols[i - 1] if i else None
        cell = M[f"{c}{r}"]; cell.value = fn(c, p, i); cell.number_format = fmt
        cell.font = font(GREEN if style == "link" else BLACK, bold=style in ("t", "T", "date"))
        if style == "T": cell.fill = PatternFill("solid", fgColor="FFF3EC")
        if style == "date": cell.fill = SEC; cell.alignment = Alignment(horizontal="center")
    if style in ("t", "T"):
        for ci in range(1, C0 + N): M.cell(row=r, column=ci).border = Border(top=thin)
    r += 1
M.freeze_panes = f"C{R['date'] + 1}"
FIRST, LAST = cols[0], cols[-1]
def rng(key): return f"Model!${FIRST}${R[key]}:${LAST}${R[key]}"

# ----------------------------------------------------------------------------------------------
# ANNUAL
# ----------------------------------------------------------------------------------------------
Y = wb.create_sheet("Annual"); Y.sheet_view.showGridLines = False
Y.column_dimensions["A"].width = 44; Y.column_dimensions["B"].width = 10
for c in "CDEFGH": Y.column_dimensions[c].width = 15
Y["A1"] = "توّا Twaa — Annual summary (EGP, nominal)"; Y["A1"].font = font(PLUM, True, 13)
Y["A2"] = "Year"; Y["A2"].font = font(PLUM, True)
years = ["2026", "2027", "2028", "2029", "2030", "2031"]
for i, yv in enumerate(years):
    c = Y.cell(row=2, column=3 + i, value=yv); c.font = font(WHITE, True); c.fill = HEAD; c.alignment = Alignment(horizontal="center")
Y["C3"] = "Pre-launch"; Y["D3"] = "Year 1"; Y["E3"] = "Year 2"; Y["F3"] = "Year 3"; Y["G3"] = "Year 4"; Y["H3"] = "Year 5"
for c in "CDEFGH": Y[f"{c}3"].font = font(GRAY, size=9); Y[f"{c}3"].alignment = Alignment(horizontal="center")
YR = {}; yr = 4
def ysum(key, label, fmt=EGP, bold=False, kind="sum"):
    global yr
    Y.cell(row=yr, column=1, value=label).font = font(bold=bold)
    for i, yv in enumerate(years):
        col = L(3 + i)
        if kind == "sum": f = f"=SUMIF(Model!${FIRST}${R['year']}:${LAST}${R['year']},{yv},{rng(key)})"
        elif kind == "dec": f = f"=IFERROR(INDEX({rng(key)},MATCH(DATE({yv},12,1),Model!${FIRST}${R['date']}:${LAST}${R['date']},0)),0)"
        else: f = kind(col)
        cc = Y[f"{col}{yr}"]; cc.value = f; cc.number_format = fmt; cc.font = font(bold=bold)
        if bold: cc.border = Border(top=thin)
    YR[key] = yr; yr += 1
def yhead(t):
    global yr
    yr += 1
    for ci in range(1, 9): Y.cell(row=yr, column=ci).fill = SUBT
    Y.cell(row=yr, column=1, value=t).font = font(PLUM, True); yr += 1
yhead("Customers & volume")
ysum("markazes", "Markazes live (December)", "0", kind="dec")
ysum("hubs", "Hubs operating (December)", "0", kind="dec")
ysum("active", "Active customers (December)", NUM, kind="dec")
ysum("active_am", "   of which Abu El Matamir", NUM, kind="dec")
ysum("new", "New customers acquired", NUM)
ysum("orders", "Customer orders", NUM, True)
ysum("orders_am", "   of which Abu El Matamir", NUM)
ysum("opd_dec", "Orders per day (December)", NUM, kind=lambda c: f"=IFERROR(INDEX({rng('opd')},MATCH(DATE({Y[c+'2'].value},12,1),Model!${FIRST}${R['date']}:${LAST}${R['date']},0)),0)")
ysum("daas", "DaaS deliveries", NUM)
ysum("gmv", "GMV", EGP, True)
yhead("Revenue streams")
for k, lab in [("r_prod", "1. Product sales (owned inventory)"), ("r_mp", "2. Marketplace & pharmacy commission"), ("r_food", "3. Food commission"), ("r_del", "4. Delivery fees"), ("r_svc", "5. Service fees"), ("r_plus", "6. Twaa+ subscriptions"), ("r_daas", "7. Delivery-as-a-Service fees"), ("r_media", "8. Retail media"), ("r_back", "9. Supplier back margin")]:
    ysum(k, lab)
ysum("rev", "Net revenue", EGP, True)
ysum("cogs", "Cost of goods sold", EGP)
ysum("gp", "Gross profit", EGP, True)
ysum("gpm", "Gross profit % of GMV (take rate)", PCT, kind=lambda c: f"=IF({c}{YR['gmv']}>0,{c}{YR['gp']}/{c}{YR['gmv']},0)")
yhead("Costs & profitability")
ysum("var", "Variable costs", EGP)
ysum("v_rider", "   of which rider cost", EGP)
ysum("v_promo", "   of which customer promotions", EGP)
ysum("cm", "Contribution margin", EGP, True)
ysum("cmo", "Contribution per order", EGP1, kind=lambda c: f"=IF({c}{YR['orders']}>0,{c}{YR['cm']}/{c}{YR['orders']},0)")
ysum("fixed", "Operating expenses (incl. acquisition)", EGP)
ysum("f_acq", "   of which acquisition marketing", EGP)
ysum("central", "Central costs (tech, leadership & G&A, brand)", EGP)
ysum("m_ebitda", "Markaz-level EBITDA (before central costs)", EGP, True)
ysum("ebitda", "EBITDA", EGP, True)
ysum("ebitda_gmv", "EBITDA % of GMV", PCT, kind=lambda c: f"=IF({c}{YR['gmv']}>0,{c}{YR['ebitda']}/{c}{YR['gmv']},0)")
ysum("da", "Depreciation & amortisation", EGP)
ysum("taxp", "Income tax", EGP)
ysum("ni", "Net income", EGP, True)
yhead("Cash")
ysum("capex", "Capex", EGP)
ysum("dnwc", "Change in working capital", EGP)
ysum("fcf", "Free cash flow", EGP, True)
ysum("fund", "Equity funding", EGP)
ysum("cash", "Cash balance (December)", EGP, True, kind="dec")
yhead("Headline metrics")
def kpi(label, formula, fmt):
    global yr
    Y.cell(row=yr, column=1, value=label).font = font(bold=True)
    c = Y[f"C{yr}"]; c.value = formula; c.number_format = fmt; c.font = font(bold=True); c.fill = PatternFill("solid", fgColor="FFF3EC")
    yr += 1; return yr - 1
YR["k_fund"] = kpi("Peak funding need (lowest cumulative free cash flow)", f"=-MIN(0,MIN({rng('cum_fcf')}))", EGP)
YR["k_be"] = kpi("First EBITDA-positive month", f"=IF(MAX({rng('first_pos')})>0,MAX({rng('first_pos')}),\"Not within horizon\")", "mmm yyyy")
YR["k_cbe"] = kpi("First contribution-positive month", f"=IF(MAX({rng('first_cpos')})>0,MAX({rng('first_cpos')}),\"Not within horizon\")", "mmm yyyy")
YR["k_min"] = kpi("Lowest cash balance with funding (must stay > 0)", f"=MIN({rng('cash')})", EGP)
YR["k_ok"] = kpi("Funding check", f"=IF(C{YR['k_min']}>0,\"OK — funded\",\"SHORTFALL — raise more\")", "@")
YR["k_ltv"] = kpi("Customer lifetime contribution, Year 3 (CM/order × orders/month ÷ churn)", f"=IFERROR(F{YR['cmo']}*Assumptions!$E${AR['freq']}*Assumptions!$F${AR['m_freq']}/(1-MIN(0.95,Assumptions!$E${AR['ret']}+Assumptions!$F${AR['m_ret']})),0)", EGP)
YR["k_cac"] = kpi("Blended CAC, Year 3", f"=Assumptions!$E${AR['cac']}*Assumptions!$F${AR['m_cac']}", EGP)
YR["k_ltvcac"] = kpi("Lifetime contribution ÷ CAC, Year 3", f"=IF(C{YR['k_cac']}>0,C{YR['k_ltv']}/C{YR['k_cac']},0)", MULT)
YR["k_payback"] = kpi("CAC payback, Year 3 (months of contribution)", f"=IFERROR(C{YR['k_cac']}/(F{YR['cmo']}*Assumptions!$E${AR['freq']}*Assumptions!$F${AR['m_freq']}),0)", '0.0" mo"')
Y.freeze_panes = "C4"

# ----------------------------------------------------------------------------------------------
# UNIT ECONOMICS
# ----------------------------------------------------------------------------------------------
U = wb.create_sheet("Unit Economics"); U.sheet_view.showGridLines = False
U.column_dimensions["A"].width = 44
for c in "BCDEF": U.column_dimensions[c].width = 14
U["A1"] = "Per customer order (EGP) — what one order earns and costs"; U["A1"].font = font(PLUM, True, 13)
for i, (yv, col) in enumerate([("2027", "D"), ("2028", "E"), ("2029", "F"), ("2030", "G"), ("2031", "H")]):
    c = U.cell(row=2, column=2 + i, value=yv); c.font = font(WHITE, True); c.fill = HEAD; c.alignment = Alignment(horizontal="center")
urow = 3
def ue(label, key, bold=False, sign=1, fmt=EGP1):
    global urow
    U.cell(row=urow, column=1, value=label).font = font(bold=bold)
    for i, col in enumerate("DEFGH"):
        cc = U.cell(row=urow, column=2 + i, value=f"=IF(Annual!{col}${YR['orders']}>0,{sign}*Annual!{col}${YR[key]}/Annual!{col}${YR['orders']},0)")
        cc.number_format = fmt; cc.font = font(GREEN, bold)
        if bold: cc.border = Border(top=thin)
    urow += 1
ue("Average order value (GMV per order)", "gmv", True)
ue("Product margin (owned inventory)", "gp", sign=1)  # placeholder replaced below
U.cell(row=urow - 1, column=1, value="Gross profit per order (all streams)")
urow += 1
U.cell(row=urow, column=1, value="Gross profit by stream").font = font(PLUM, True); urow += 1
for k, lab in [("r_mp", "Marketplace commission"), ("r_food", "Food commission"), ("r_del", "Delivery fee"), ("r_svc", "Service fee"), ("r_plus", "Twaa+ (allocated per order)"), ("r_daas", "DaaS fees (allocated per order)"), ("r_media", "Retail media"), ("r_back", "Supplier back margin")]:
    ue(lab, k)
U.cell(row=urow, column=1, value="Product margin (owned inventory)")
for i, col in enumerate("DEFGH"):
    cc = U.cell(row=urow, column=2 + i, value=f"=IF(Annual!{col}${YR['orders']}>0,(Annual!{col}${YR['r_prod']}-Annual!{col}${YR['cogs']})/Annual!{col}${YR['orders']},0)"); cc.number_format = EGP1; cc.font = font(GREEN)
urow += 2
U.cell(row=urow, column=1, value="Variable costs per order").font = font(PLUM, True); urow += 1
for k, lab in [("v_rider", "Rider (incl. split deliveries & DaaS drops)"), ("v_promo", "Customer promotions")]:
    ue(lab, k, sign=-1)
U.cell(row=urow, column=1, value="Other variable (pick, pack, payments, shrink, refunds, support)")
for i, col in enumerate("DEFGH"):
    cc = U.cell(row=urow, column=2 + i, value=f"=IF(Annual!{col}${YR['orders']}>0,-(Annual!{col}${YR['var']}-Annual!{col}${YR['v_rider']}-Annual!{col}${YR['v_promo']})/Annual!{col}${YR['orders']},0)"); cc.number_format = EGP1; cc.font = font(GREEN)
urow += 1
ue("Contribution per order", "cm", True)
ue("Fixed costs & acquisition per order", "fixed", sign=-1)
ue("EBITDA per order", "ebitda", True)

# ----------------------------------------------------------------------------------------------
# REVENUE STREAMS
# ----------------------------------------------------------------------------------------------
RS = wb.create_sheet("Revenue Streams"); RS.sheet_view.showGridLines = False
widths = [4, 32, 18, 22, 38, 12, 13, 13, 13, 13, 13, 11]
for i, w in enumerate(widths): RS.column_dimensions[L(i + 1)].width = w
RS["A1"] = "Revenue streams — who pays, how it is priced, when it starts, what it earns (gross profit, EGP)"; RS["A1"].font = font(PLUM, True, 13)
hdr = ["#", "Stream", "الاسم", "Who pays", "Pricing mechanism", "Starts", "GP 2027", "GP 2028", "GP 2029", "GP 2030", "GP 2031", "Share 2031"]
for i, t in enumerate(hdr):
    c = RS.cell(row=3, column=i + 1, value=t); c.font = font(WHITE, True, 9); c.fill = HEAD; c.alignment = Alignment(wrap_text=True)
streams = [
    ("1", "Product margin (owned inventory)", "هامش منتجات توّا", "Customer (in product price)", "Buy from distributors, sell at shelf price; front margin 16% → 21% (private label from 2029)", "Jan 2027", "prod"),
    ("2", "Marketplace & pharmacy commission", "عمولة التجار والصيدليات", "Local merchants, partner pharmacies", "11–12% of merchant order value", "Jan 2027", "r_mp"),
    ("3", "Food commission", "عمولة المطاعم", "Restaurants", "17–18% of food order value", "Jan 2027", "r_food"),
    ("4", "Delivery fees", "رسوم التوصيل", "Customer", "EGP 17–25 blended; free above basket threshold", "Jan 2027", "r_del"),
    ("5", "Service fee", "رسوم الخدمة", "Customer", "EGP 3–6 per order, shown at checkout", "Jan 2027", "r_svc"),
    ("6", "Twaa+ subscription", "اشتراك توّا+", "Customer", "EGP 49–72/month: free delivery, double points", "Jan 2028", "r_plus"),
    ("7", "Delivery-as-a-Service", "التوصيل كخدمة", "Merchants (their own orders)", "EGP 22–34 per delivery", "Apr 2027", "r_daas"),
    ("8", "Retail media", "إعلانات داخل التطبيق", "FMCG brands & distributors", "Sponsored slots, banners: 0.3% → 2% of hub GMV", "2027 (pilot deals)", "r_media"),
    ("9", "Supplier back margin", "حوافز الموردين", "Distributors & brands", "Volume rebates, listing fees: up to 3% of hub GMV", "Jan 2028", "r_back"),
]
for j, (n, name, ar, who, price, start, key) in enumerate(streams):
    rr = 4 + j
    for i, v in enumerate([n, name, ar, who, price, start]):
        c = RS.cell(row=rr, column=i + 1, value=v); c.font = font(size=9); c.alignment = Alignment(wrap_text=True, vertical="top")
    for i, col in enumerate("DEFGH"):
        f = f"=Annual!{col}${YR['r_prod']}-Annual!{col}${YR['cogs']}" if key == "prod" else f"=Annual!{col}${YR[key]}"
        c = RS.cell(row=rr, column=7 + i, value=f); c.number_format = EGP; c.font = font(GREEN, size=9)
    c = RS.cell(row=rr, column=12, value=f"=IF($K${4 + len(streams)}>0,K{rr}/$K${4 + len(streams)},0)"); c.number_format = PCT; c.font = font(size=9)
    RS.row_dimensions[rr].height = 30
tr = 4 + len(streams)
RS.cell(row=tr, column=2, value="Total gross profit").font = font(bold=True)
for i, col in enumerate("GHIJK"):
    c = RS[f"{col}{tr}"]; c.value = f"=SUM({col}4:{col}{tr - 1})"; c.number_format = EGP; c.font = font(bold=True); c.border = Border(top=thin)
RS[f"L{tr}"] = f"=SUM(L4:L{tr - 1})"; RS[f"L{tr}"].number_format = PCT
RS.cell(row=tr + 1, column=2, value="Check vs Annual gross profit").font = font(GRAY, italic=True, size=9)
for i, col in enumerate("GHIJK"):
    ac = "DEFGH"[i]; RS[f"{col}{tr + 1}"] = f"=IF(ABS({col}{tr}-Annual!{ac}${YR['gp']})<1,\"OK\",\"ERROR\")"; RS[f"{col}{tr + 1}"].font = font(GRAY, size=9)
RS_TOTAL = tr

# ----------------------------------------------------------------------------------------------
# DASHBOARD (first sheet) with charts
# ----------------------------------------------------------------------------------------------
D = wb.create_sheet("Summary", 0); D.sheet_view.showGridLines = False
for c, w in zip("ABCDEFGHIJ", [34, 14, 14, 14, 14, 14, 3, 36, 16, 3]): D.column_dimensions[c].width = w
D["A1"] = "توّا Twaa — Financial model summary"; D["A1"].font = font(PLUM, True, 16)
D["A2"] = f"=\"Scenario: \"&INDEX({{\"Conservative\",\"Base\",\"Optimistic\"}},Assumptions!$C${AR['scen']})&\"   ·   Change it on Assumptions!C{AR['scen']}   ·   EGP, nominal, ex-VAT\""
D["A2"].font = font(MAND, True, 10)
D["A4"] = "Metric"; 
for i, t in enumerate(["2027", "2028", "2029", "2030", "2031"]): D.cell(row=4, column=2 + i, value=t)
for c in "ABCDEF": D[f"{c}4"].font = font(WHITE, True); D[f"{c}4"].fill = HEAD
rows_s = [("Orders per day (December)", "opd_dec", NUM), ("Active customers (December)", "active", NUM), ("GMV", "gmv", EGP), ("Net revenue", "rev", EGP), ("Gross profit", "gp", EGP), ("Take rate (GP % GMV)", "gpm", PCT), ("Contribution per order", "cmo", EGP1), ("EBITDA", "ebitda", EGP), ("Net income", "ni", EGP), ("Cash balance (December)", "cash", EGP)]
for j, (lab, k, fmt) in enumerate(rows_s):
    rr = 5 + j; D[f"A{rr}"] = lab; D[f"A{rr}"].font = font()
    for i, col in enumerate("DEFGH"):
        c = D.cell(row=rr, column=2 + i, value=f"=Annual!{col}${YR[k]}"); c.number_format = fmt; c.font = font(GREEN)
D["H4"] = "Headline"; D["I4"] = "Value"
for c in "HI": D[f"{c}4"].font = font(WHITE, True); D[f"{c}4"].fill = HEAD
heads = [("Peak funding need", "k_fund", EGP), ("Peak funding need (USD)", "usd", '"$"#,##0'), ("Seed + growth rounds modelled", None, EGP), ("First contribution-positive month", "k_cbe", "mmm yyyy"), ("First EBITDA-positive month", "k_be", "mmm yyyy"), ("Funding check", "k_ok", "@"), ("Lifetime contribution ÷ CAC (Y3)", "k_ltvcac", MULT), ("CAC payback (Y3)", "k_payback", '0.0" mo"')]
for j, (lab, k, fmt) in enumerate(heads):
    rr = 5 + j; D[f"H{rr}"] = lab; D[f"H{rr}"].font = font()
    c = D[f"I{rr}"]; c.value = (f"=Annual!$C${YR['k_fund']}/Assumptions!$C${AR['fx']}" if k == "usd" else f"=Annual!$C${YR[k]}" if k else f"=Assumptions!$C${AR['seed']}+Assumptions!$C${AR['sA']}"); c.number_format = fmt; c.font = font(GREEN, True)
# chart data block (hidden-ish helper rows on Summary)
D["A18"] = "Chart data — gross profit by stream (EGP)"; D["A18"].font = font(PLUM, True)
labs = ["Product margin", "Marketplace & pharmacy", "Food", "Delivery fees", "Service fees", "Twaa+", "DaaS", "Retail media", "Supplier back margin"]
for i, t in enumerate(["Stream", "2027", "2028", "2029", "2030", "2031"]): D.cell(row=19, column=1 + i, value=t).font = font(bold=True)
for j, lab in enumerate(labs):
    D.cell(row=20 + j, column=1, value=lab).font = font(size=9)
    for i, col in enumerate("GHIJK"):
        c = D.cell(row=20 + j, column=2 + i, value=f"='Revenue Streams'!{col}{4 + j}"); c.number_format = EGP; c.font = font(GREEN, size=9)
# series per stream -> transpose: use rows as series
ch2 = BarChart(); ch2.type = "col"; ch2.grouping = "stacked"; ch2.overlap = 100; ch2.title = "Gross profit by revenue stream (EGP)"; ch2.height = 9; ch2.width = 18
for j in range(len(labs)):
    ref = Reference(D, min_col=2, max_col=6, min_row=20 + j, max_row=20 + j)
    ch2.add_data(ref, from_rows=True, titles_from_data=False)
    ch2.series[-1].tx = None
from openpyxl.chart.series import SeriesLabel
for j, s in enumerate(ch2.series): s.tx = SeriesLabel(v=labs[j])
ch2.set_categories(Reference(D, min_col=2, max_col=6, min_row=19, max_row=19))
palette = ["3A1F3D", "F9732F", "B4441E", "0F7C8C", "7E6F80", "6D3FA8", "2E7D4F", "B8860B", "C9A0C9"]
for j, s in enumerate(ch2.series): s.graphicalProperties.solidFill = palette[j]; s.graphicalProperties.line.solidFill = palette[j]
D.add_chart(ch2, "H14")
lc = LineChart(); lc.title = "Customer orders per day"; lc.height = 8; lc.width = 18
lc.add_data(Reference(M, min_col=C0, max_col=C0 + N - 1, min_row=R["opd"], max_row=R["opd"]), from_rows=True, titles_from_data=False)
lc.set_categories(Reference(M, min_col=C0, max_col=C0 + N - 1, min_row=R["date"], max_row=R["date"]))
lc.series[0].graphicalProperties.line.solidFill = "3A1F3D"; lc.legend = None
D.add_chart(lc, "A38")
cc = LineChart(); cc.title = "Cash balance (EGP) and monthly EBITDA"; cc.height = 8; cc.width = 18
cc.add_data(Reference(M, min_col=C0, max_col=C0 + N - 1, min_row=R["cash"], max_row=R["cash"]), from_rows=True, titles_from_data=False)
cc.add_data(Reference(M, min_col=C0, max_col=C0 + N - 1, min_row=R["ebitda"], max_row=R["ebitda"]), from_rows=True, titles_from_data=False)
cc.series[0].tx = SeriesLabel(v="Cash balance"); cc.series[1].tx = SeriesLabel(v="EBITDA")
cc.series[0].graphicalProperties.line.solidFill = "3A1F3D"; cc.series[1].graphicalProperties.line.solidFill = "F9732F"
cc.set_categories(Reference(M, min_col=C0, max_col=C0 + N - 1, min_row=R["date"], max_row=R["date"]))
D.add_chart(cc, "H38")

# Cover / how-to on Summary
D["A31"] = "How to use this model"; D["A30"].font = font(PLUM, True)
notes = ["1. Change inputs only on the Assumptions sheet (blue text; yellow = key levers).", f"2. Switch scenario on Assumptions!C{AR['scen']}: 1 Conservative · 2 Base · 3 Optimistic.", "3. Model = monthly engine (Oct 2026 – Dec 2031). Annual, Unit Economics and Revenue Streams roll it up.", "4. Colours: blue input · black formula · green link to another sheet. All values nominal EGP ex-VAT."]
for j, t in enumerate(notes): D[f"A{32 + j}"] = t; D[f"A{32 + j}"].font = font(size=9)

wb.save(OUT)
import json
json.dump({"AR": AR, "R": R, "YR": YR, "first": FIRST, "last": LAST, "N": N, "rs_total": RS_TOTAL}, open(OUT + ".map.json", "w"))
print("saved", OUT)
