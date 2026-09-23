#!/usr/bin/env python3
"""
Independent validation / data-discovery script for the e& Attendance Management Dashboard.

It re-implements the Power Query rules in Python (header detection, column mapping, cleaning, date/time/hours
parsing, employee-day resolution, exception and data-quality flags) and prints the numbers the dashboard
should show, so that report totals can be reconciled with the source files.

Usage:
    python3 validate_source.py "<data folder>" [--out report.md] [--month 2026-08] [--bu "eMinds"] [--client X] [--shift Y] [--employee CODE]

Requires: Python 3.9+, pandas, openpyxl   (pip install pandas openpyxl)
"""
import os, re, sys, math, argparse, datetime as dt
import pandas as pd

SHORT_HOURS = 4.0
LONG_HOURS = 12.0
STATUS2_IS_EXCEPTION = True
STATUS_OVERRIDES = {}   # e.g. {"wfh": "Present"}  (lower-case raw status -> category) - keep in sync with StatusCategoryOverrides

HEADER_MAP = {
    "employeecode": "Employee Code", "empcode": "Employee Code", "employeeno": "Employee Code",
    "agencyempid": "Agency Emp ID", "agencyemployeeid": "Agency Emp ID", "agencyid": "Agency Emp ID",
    "employeename": "Employee Name", "empname": "Employee Name",
    "sourcename": "Source Name", "source": "Source Name",
    "businessunit": "Business Unit", "bu": "Business Unit",
    "clientname": "Client Name", "client": "Client Name",
    "costcenter": "Cost Center", "costcentre": "Cost Center",
    "paycalendar": "Pay Calendar",
    "shiftname": "Shift Name", "shift": "Shift Name",
    "processdate": "Process Date", "date": "Process Date",
    "day": "Day", "dayname": "Day",
    "punchintime": "Punch In Time", "punchin": "Punch In Time",
    "punchouttime": "Punch Out Time", "punchout": "Punch Out Time",
    "totalhours": "Total Hours", "totalhour": "Total Hours", "workedhours": "Total Hours",
    "status": "Status",
    "punchinterminal": "Punch In Terminal", "punchintemrinal": "Punch In Terminal",
    "punchoutterminal": "Punch Out Terminal", "punchouttemrinal": "Punch Out Terminal",
    "isjustified": "Is Justified", "justified": "Is Justified",
    "status2": "Status2",
}
CANONICAL = ["Employee Code", "Agency Emp ID", "Employee Name", "Source Name", "Business Unit", "Client Name", "Cost Center", "Pay Calendar",
             "Shift Name", "Process Date", "Day", "Punch In Time", "Punch Out Time", "Total Hours", "Status", "Punch In Terminal", "Punch Out Terminal",
             "Is Justified", "Status2"]
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def nul(v):
    """True for None / NaN / NaT."""
    return v is None or v is pd.NaT or (isinstance(v, float) and math.isnan(v))


def header_key(v):
    return re.sub(r"[^a-z0-9]", "", str(v).lower()) if v is not None and not (isinstance(v, float) and math.isnan(v)) else ""


def clean_text(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if isinstance(v, (dt.datetime, dt.date, dt.time)):
        return str(v)
    s = str(v).replace("\u00a0", " ").replace("\t", " ")
    s = "".join(ch for ch in s if ch >= " ")
    s = " ".join(s.split())
    return s or None


def parse_date(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if isinstance(v, pd.Timestamp):
        return v.date()
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    if isinstance(v, (int, float)):
        if 20000 < v < 80000:
            return (dt.datetime(1899, 12, 30) + dt.timedelta(days=float(v))).date()
        return None
    s = str(v).strip().upper()
    if not s:
        return None
    if len(s) > 10 and s[10] == "T":
        s = s[:10] + " " + s[11:]
    part = s.split(" ")[0]
    parts = [p for p in re.split(r"[-/.]", part) if p]
    try:
        if len(parts) == 3:
            p0, p1, p2 = parts
            if p1[:3] in MONTHS:
                y = int(p2); y = 2000 + y if y < 100 else y
                return dt.date(y, MONTHS.index(p1[:3]) + 1, int(p0))
            if len(p0) == 4:
                return dt.date(int(p0), int(p1), int(p2))
            y = int(p2); y = 2000 + y if y < 100 else y
            return dt.date(y, int(p1), int(p0))
    except Exception:
        pass
    try:
        return pd.to_datetime(str(v), dayfirst=True).date()
    except Exception:
        return None


def parse_datetime(v, base):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if isinstance(v, pd.Timestamp):
        return v.to_pydatetime()
    if isinstance(v, dt.datetime):
        return v
    if isinstance(v, dt.time):
        return dt.datetime.combine(base, v) if base else None
    if isinstance(v, dt.date):
        return None
    if isinstance(v, (int, float)):
        if 0 <= v < 1:
            return dt.datetime.combine(base, dt.time(0)) + dt.timedelta(days=float(v)) if base else None
        if 20000 < v < 80000:
            return dt.datetime(1899, 12, 30) + dt.timedelta(days=float(v))
        return None
    s = str(v).strip().upper()
    if not s:
        return None
    if len(s) > 10 and s[10] == "T":
        s = s[:10] + " " + s[11:]
    tokens = [t for t in s.split(" ") if t]
    time_tokens = [t for t in tokens if ":" in t]
    date_tokens = [t for t in tokens if ":" not in t and t not in ("AM", "PM")]
    ampm = "PM" if "PM" in tokens else ("AM" if "AM" in tokens else "")
    d = parse_date(date_tokens[0]) if date_tokens else base
    try:
        if time_tokens and d:
            bits = time_tokens[0].split(":")
            h = int(bits[0]); m = int(bits[1]) if len(bits) > 1 else 0; sec = int(float(bits[2])) if len(bits) > 2 else 0
            if ampm == "PM" and h < 12:
                h += 12
            if ampm == "AM" and h == 12:
                h = 0
            return dt.datetime.combine(d, dt.time(h, m, sec))
    except Exception:
        pass
    try:
        return pd.to_datetime(str(v), dayfirst=True).to_pydatetime()
    except Exception:
        return None


def parse_hours(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if isinstance(v, dt.time):
        return v.hour + v.minute / 60 + v.second / 3600
    if isinstance(v, dt.timedelta):
        return v.total_seconds() / 3600
    if isinstance(v, (pd.Timestamp, dt.datetime)):
        return (v - dt.datetime(1899, 12, 30)).total_seconds() / 3600
    if isinstance(v, (int, float)):
        return v * 24 if 0 <= v < 1 else None
    s = str(v).strip()
    if not re.search(r"\d", s):
        return None
    bits = s.split(":")
    if len(bits) >= 2:
        try:
            return int(bits[0]) + int(bits[1]) / 60 + (float(bits[2]) / 3600 if len(bits) > 2 else 0)
        except Exception:
            return None
    return None


def status_category(s):
    k = s.strip().lower() if isinstance(s, str) else ""
    if k == "":
        return "Unknown"
    if k in STATUS_OVERRIDES:
        return STATUS_OVERRIDES[k]
    if "absent" in k or k in ("a", "ab"):
        return "Absent"
    if "present" in k or k == "p":
        return "Present"
    if any(w in k for w in ("leave", "vacation", "sick", "maternity", "paternity")):
        return "Leave"
    if "holiday" in k:
        return "Holiday"
    k2 = re.sub(r"[ \-_/]", "", k)
    if any(w in k2 for w in ("weekend", "weekoff", "weeklyoff", "restday", "dayoff", "offday")) or k in ("off", "wo", "w/o"):
        return "Weekend / Rest Day"
    return "Other"


PRIORITY = {"Present": 1, "Other": 2, "Leave": 3, "Holiday": 4, "Weekend / Rest Day": 5, "Absent": 6, "Unknown": 7}


def justification_category(s):
    k = s.strip().lower() if isinstance(s, str) else ""
    if k == "":
        return "Not Recorded"
    if k in ("y", "yes", "true", "1", "justified", "approved"):
        return "Justified"
    if k in ("n", "no", "false", "0", "not justified", "unjustified", "rejected"):
        return "Not Justified"
    if "pending" in k or "await" in k:
        return "Pending"
    return "Other: " + s


# ----------------------------------------------------------------------------------------------------------
def read_sheet(df_raw, sheet, fname):
    top = df_raw.head(40).values.tolist()
    scores = [len({header_key(v) for v in row} & set(HEADER_MAP)) for row in top]
    if not scores or max(scores) < 5:
        return None
    hidx = scores.index(max(scores))
    header = top[hidx]
    mapping = {}
    for i, h in enumerate(header):
        canon = HEADER_MAP.get(header_key(h))
        if canon and canon not in mapping.values():
            mapping[i] = canon
    found = set(mapping.values())
    missing = [c for c in ("Employee Code", "Process Date") if c not in found]
    if missing:
        raise SystemExit(f"Attendance source error: {fname} / {sheet} is missing required column(s): {missing}")
    data = df_raw.iloc[hidx + 1:].copy()
    data = data[[i for i in mapping]].rename(columns=mapping)
    data["Source Row Number"] = range(hidx + 2, hidx + 2 + len(data))
    for c in CANONICAL:
        if c not in data.columns:
            data[c] = None
    data["Source Sheet"] = sheet
    # drop blank / footer / repeated header rows
    def keep(r):
        return not (clean_text(r["Process Date"]) is None and clean_text(r["Employee Name"]) is None) and header_key(r["Employee Code"]) != "employeecode"
    data = data[data.apply(keep, axis=1)]
    return data[CANONICAL + ["Source Sheet", "Source Row Number"]]


def read_folder(folder):
    frames = []
    files = []
    for root, dirs, fs in os.walk(folder):
        if os.path.basename(root).lower() == "dashboard":
            dirs[:] = []
            continue
        for f in sorted(fs):
            ext = os.path.splitext(f)[1].lower()
            if ext not in (".xlsx", ".xlsm", ".xls", ".csv") or f.startswith("~$") or f.startswith("."):
                continue
            files.append(os.path.join(root, f))
    for path in files:
        fname = os.path.basename(path)
        sheets = {}
        if path.lower().endswith(".csv"):
            with open(path, "r", encoding="utf-8-sig", errors="replace") as fh:
                first = fh.readline()
            delim = max([",", ";", "\t"], key=lambda d: first.count(d))
            sheets["CSV"] = pd.read_csv(path, header=None, sep=delim, dtype=object, encoding="utf-8-sig", keep_default_na=False, na_values=[""])
        else:
            xl = pd.ExcelFile(path)
            for sh in xl.sheet_names:
                if sh.startswith("_"):
                    continue
                sheets[sh] = xl.parse(sh, header=None, dtype=object)
        used = 0
        for sh, raw in sheets.items():
            part = read_sheet(raw, sh, fname)
            if part is None:
                continue
            part["Source File"] = fname
            part["Source Folder"] = os.path.dirname(path)
            part["Source Modified Date"] = dt.datetime.fromtimestamp(os.path.getmtime(path))
            frames.append(part); used += 1
        print(f"  {fname}: {'used ' + str(used) + ' sheet(s)' if used else 'ignored (no attendance sheet)'}")
    if not frames:
        raise SystemExit("No attendance data found.")
    return pd.concat(frames, ignore_index=True)


def transform(df):
    text_cols = ["Employee Code", "Agency Emp ID", "Employee Name", "Source Name", "Business Unit", "Client Name", "Cost Center", "Pay Calendar",
                 "Shift Name", "Day", "Status", "Punch In Terminal", "Punch Out Terminal", "Is Justified", "Status2"]
    for c in text_cols:
        df[c] = df[c].map(clean_text).astype(object).where(lambda x: x.notna(), None)
    for c in ("Employee Code", "Agency Emp ID"):
        df[c] = df[c].map(lambda v: v.upper() if isinstance(v, str) else v)
    raw_date, raw_in, raw_out, raw_hours = df["Process Date"], df["Punch In Time"], df["Punch Out Time"], df["Total Hours"]
    df["Process Date"] = raw_date.map(parse_date)
    df["Punch In Time"] = [parse_datetime(v, d) for v, d in zip(raw_in, df["Process Date"])]
    outs = []
    for v, d, pi in zip(raw_out, df["Process Date"], df["Punch In Time"]):
        po = parse_datetime(v, d)
        time_only = isinstance(v, dt.time) or (isinstance(v, (int, float)) and not isinstance(v, bool) and 0 <= v < 1) or (isinstance(v, str) and "-" not in v and "/" not in v)
        if time_only and not nul(po) and not nul(pi) and po < pi:
            po = po + dt.timedelta(days=1)
        outs.append(po)
    df["Punch Out Time"] = outs
    df["Source Worked Hours"] = raw_hours.map(parse_hours)
    df["Total Hours (Source)"] = raw_hours.map(clean_text)
    df["Punch In (Unparsed)"] = [clean_text(v) if clean_text(v) is not None and nul(p) else None for v, p in zip(raw_in, df["Punch In Time"])]
    df["Punch Out (Unparsed)"] = [clean_text(v) if clean_text(v) is not None and nul(p) else None for v, p in zip(raw_out, df["Punch Out Time"])]
    df["Process Date (Unparsed)"] = [clean_text(v) if clean_text(v) is not None and nul(p) else None for v, p in zip(raw_date, df["Process Date"])]

    def calc(pi, po):
        if not nul(pi) and not nul(po) and po > pi:
            h = (po - pi).total_seconds() / 3600
            return round(h, 4) if h <= 24 else None
        return None
    df["Calculated Worked Hours"] = [calc(a, b) for a, b in zip(df["Punch In Time"], df["Punch Out Time"])]
    df["Source Hours Valid"] = df["Source Worked Hours"].map(lambda h: 1 if not nul(h) and 0 <= h <= 24 else 0)
    df["Record Worked Hours"] = [round(s, 4) if ok else (None if nul(c) else c) for s, ok, c in zip(df["Source Worked Hours"], df["Source Hours Valid"], df["Calculated Worked Hours"])]
    df["Worked Hours Basis"] = ["Source Total Hours" if ok else ("Calculated from Punches" if not nul(c) else "Not Available") for ok, c in zip(df["Source Hours Valid"], df["Calculated Worked Hours"])]
    df["Record Status Category"] = df["Status"].map(status_category)
    df["Record Status Priority"] = df["Record Status Category"].map(PRIORITY)
    df["Justification Category"] = df["Is Justified"].map(justification_category)
    df["Status2 Category"] = df["Status2"].map(lambda s: s if isinstance(s, str) else "(None)")
    df["Status2 Flag"] = df["Status2"].map(lambda s: 1 if isinstance(s, str) else 0)
    df["Punch Expected Flag"] = [(1 if c == "Present" or not nul(pi) or not nul(po) else 0) for c, pi, po in zip(df["Record Status Category"], df["Punch In Time"], df["Punch Out Time"])]
    df["Missing Punch In Flag"] = [(1 if nul(pi) and pe == 1 else 0) for pi, pe in zip(df["Punch In Time"], df["Punch Expected Flag"])]
    df["Missing Punch Out Flag"] = [(1 if nul(po) and pe == 1 else 0) for po, pe in zip(df["Punch Out Time"], df["Punch Expected Flag"])]
    df["Missing Both Punches Flag"] = ((df["Missing Punch In Flag"] == 1) & (df["Missing Punch Out Flag"] == 1)).astype(int)
    df["Missing Punch Flag"] = ((df["Missing Punch In Flag"] == 1) | (df["Missing Punch Out Flag"] == 1)).astype(int)
    df["Punch Out Before In Flag"] = [(1 if not nul(pi) and not nul(po) and po < pi else 0) for pi, po in zip(df["Punch In Time"], df["Punch Out Time"])]
    df["Employee Day Key"] = [f"{c}|{d:%Y%m%d}" if not nul(c) and not nul(d) else None for c, d in zip(df["Employee Code"], df["Process Date"])]
    df["Index"] = range(len(df))
    sig_cols = ["Employee Code", "Agency Emp ID", "Employee Name", "Source Name", "Business Unit", "Client Name", "Cost Center", "Pay Calendar", "Shift Name",
                "Process Date", "Day", "Punch In Time", "Punch Out Time", "Total Hours (Source)", "Status", "Punch In Terminal", "Punch Out Terminal", "Is Justified", "Status2"]
    def _s(v):
        return "" if v is None or (isinstance(v, float) and math.isnan(v)) else str(v)
    df["RowSig"] = ["|".join(_s(v) for v in row) for row in df[sig_cols].itertuples(index=False)]
    first = df.groupby("RowSig")["Index"].transform("min")
    df["Is Duplicate Record"] = (df["Index"] != first).astype(int)
    df["Worked Hours Decimal"] = [None if d or nul(h) else h for d, h in zip(df["Is Duplicate Record"], df["Record Worked Hours"])]
    df["Status Sort Key"] = df["Record Status Priority"].astype(str) + "|" + df["Record Status Category"] + "|" + df["Status"].fillna("")
    keyed = df["Employee Day Key"].fillna("__null__")
    g = df.groupby(keyed)
    df["Day Record Count"] = g["Is Duplicate Record"].transform(lambda s: (1 - s).sum())
    df["Day First Index"] = g["Index"].transform("min")
    df["Day Status Sort"] = g["Status Sort Key"].transform("min")
    df["Day Worked Hours"] = g["Worked Hours Decimal"].transform(lambda s: s.dropna().sum() if s.notna().any() else None)
    df["Day Missing Punch Flag"] = g["Missing Punch Flag"].transform("max")
    df["Day Punch Expected Flag"] = g["Punch Expected Flag"].transform("max")
    df["Day Status2 Flag"] = g["Status2 Flag"].transform("max")
    df["Is Day Primary"] = ((df["Employee Day Key"].notna()) & (df["Index"] == df["Day First Index"])).astype(int)
    df["Multiple Records Day Flag"] = ((df["Employee Day Key"].notna()) & (df["Day Record Count"] > 1)).astype(int)
    df["Status Category"] = df["Day Status Sort"].map(lambda s: s.split("|")[1])
    df["Attendance Status"] = df["Day Status Sort"].map(lambda s: s.split("|")[2] or "(Blank)")
    dh = df["Day Worked Hours"]
    df["Exception Absent Flag"] = (df["Status Category"] == "Absent").astype(int)
    df["Exception Missing Punch Flag"] = (df["Day Missing Punch Flag"] == 1).astype(int)
    df["Exception Unrecognised Status Flag"] = df["Status Category"].isin(["Other", "Unknown"]).astype(int)
    df["Exception Short Hours Flag"] = ((df["Status Category"] == "Present") & dh.notna() & (dh > 0) & (dh < SHORT_HOURS)).astype(int)
    df["Exception Long Hours Flag"] = (dh.notna() & (dh > LONG_HOURS)).astype(int)
    df["Exception Status2 Flag"] = ((df["Day Status2 Flag"] == 1) & STATUS2_IS_EXCEPTION).astype(int)
    exc_cols = ["Exception Absent Flag", "Exception Missing Punch Flag", "Exception Unrecognised Status Flag", "Exception Short Hours Flag", "Exception Long Hours Flag", "Exception Status2 Flag"]
    df["Exception Flag"] = (df[exc_cols].sum(axis=1) > 0).astype(int)
    df["DQ Missing Employee Code"] = df["Employee Code"].isna().astype(int)
    df["DQ Missing Employee Name"] = df["Employee Name"].isna().astype(int)
    df["DQ Missing Process Date"] = df["Process Date"].isna().astype(int)
    df["DQ Missing Total Hours"] = (df["Total Hours (Source)"].isna() & (df["Record Status Category"] == "Present")).astype(int)
    df["DQ Invalid Total Hours"] = [(1 if isinstance(t, str) and ok == 0 and re.search(r"\d", t) else 0) for t, ok in zip(df["Total Hours (Source)"], df["Source Hours Valid"])]
    df["DQ Invalid Punch In"] = df["Punch In (Unparsed)"].notna().astype(int)
    df["DQ Invalid Punch Out"] = df["Punch Out (Unparsed)"].notna().astype(int)
    df["DQ Punch Out Before In"] = df["Punch Out Before In Flag"]
    df["DQ Duplicate Record"] = df["Is Duplicate Record"]
    df["DQ Blank Status"] = df["Status"].isna().astype(int)
    df["DQ Unrecognised Status"] = (df["Record Status Category"] == "Other").astype(int)
    df["DQ Blank Business Unit"] = df["Business Unit"].isna().astype(int)
    df["DQ Blank Client"] = df["Client Name"].isna().astype(int)
    df["DQ Blank Shift"] = df["Shift Name"].isna().astype(int)
    dq_cols = ["DQ Missing Employee Code", "DQ Missing Employee Name", "DQ Missing Process Date", "DQ Missing Total Hours", "DQ Invalid Total Hours", "DQ Invalid Punch In",
               "DQ Invalid Punch Out", "DQ Punch Out Before In", "DQ Duplicate Record", "DQ Blank Status", "DQ Unrecognised Status", "DQ Blank Business Unit", "DQ Blank Client", "DQ Blank Shift"]
    df["DQ Issue Flag"] = (df[dq_cols].sum(axis=1) > 0).astype(int)
    for c in ("Source Name", "Business Unit", "Client Name", "Cost Center", "Pay Calendar", "Shift Name"):
        df[c] = df[c].fillna("(Blank)")
    return df


def summarise(df, title):
    days = df[df["Employee Day Key"].notna()]
    ed = days.drop_duplicates("Employee Day Key")
    out = {
        "Attendance Records": len(df),
        "Duplicate Records": int(df["Is Duplicate Record"].sum()),
        "Active Employees": df["Employee Code"].nunique(),
        "Employee Days": len(ed),
        "Present Days": int((ed["Status Category"] == "Present").sum()),
        "Absent Days": int((ed["Status Category"] == "Absent").sum()),
        "Leave Days": int((ed["Status Category"] == "Leave").sum()),
        "Holiday Days": int((ed["Status Category"] == "Holiday").sum()),
        "Rest Days": int((ed["Status Category"] == "Weekend / Rest Day").sum()),
        "Other Status Days": int((ed["Status Category"] == "Other").sum()),
        "Unknown Status Days": int((ed["Status Category"] == "Unknown").sum()),
        "Total Worked Hours": round(float(df["Worked Hours Decimal"].dropna().sum()), 2),
        "Worked Days": int((ed["Day Worked Hours"].fillna(0) > 0).sum()),
        "Missing Punch Days": int((ed["Day Missing Punch Flag"] == 1).sum()),
        "Punch-Expected Days": int((ed["Day Punch Expected Flag"] == 1).sum()),
        "Exception Days": int((ed["Exception Flag"] == 1).sum()),
        "Employees With Exceptions": ed.loc[ed["Exception Flag"] == 1, "Employee Code"].nunique(),
        "Multiple-Record Employee Days": int((ed["Multiple Records Day Flag"] == 1).sum()),
        "DQ Issue Records": int(df["DQ Issue Flag"].sum()),
    }
    out["Present % of Recorded Days"] = round(out["Present Days"] / out["Employee Days"], 4) if out["Employee Days"] else None
    out["Avg Hours / Worked Day"] = round(out["Total Worked Hours"] / out["Worked Days"], 2) if out["Worked Days"] else None
    out["Missing Punch %"] = round(out["Missing Punch Days"] / out["Punch-Expected Days"], 4) if out["Punch-Expected Days"] else None
    lines = [f"### {title}", "", "| Metric | Value |", "|---|---|"] + [f"| {k} | {v:,} |" if isinstance(v, int) else f"| {k} | {v} |" for k, v in out.items()]
    return "\n".join(lines), out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--out", default=None)
    ap.add_argument("--month", default=None, help="YYYY-MM to filter")
    ap.add_argument("--bu"); ap.add_argument("--client"); ap.add_argument("--shift"); ap.add_argument("--employee")
    a = ap.parse_args()
    print("Reading", a.folder)
    raw = read_folder(a.folder)
    df = transform(raw)
    md = ["# Attendance source validation", "", f"Folder: `{a.folder}`  ", f"Generated: {dt.datetime.now():%d %b %Y %H:%M}", ""]
    # ---- Phase-1 style QA summary ----
    md.append("## Data discovery (QA summary)")
    md.append(f"- Files used: {df['Source File'].nunique()} -> " + ", ".join(sorted(df['Source File'].unique())))
    md.append(f"- Records: {len(df):,} | distinct employees: {df['Employee Code'].nunique():,} | employee-days: {df['Employee Day Key'].nunique():,}")
    d = df["Process Date"].dropna()
    md.append(f"- Process Date range: {min(d)} to {max(d)} | months: {sorted({f'{x:%Y-%m}' for x in d})}")
    md.append(f"- Records without Employee Code: {int(df['DQ Missing Employee Code'].sum())} | without Process Date: {int(df['DQ Missing Process Date'].sum())}")
    md.append(f"- Exact duplicate records: {int(df['Is Duplicate Record'].sum())} | employee-days with several records: {int(df.drop_duplicates('Employee Day Key')['Multiple Records Day Flag'].sum())}")
    md.append(f"- Total Hours blank on Present records: {int(df['DQ Missing Total Hours'].sum())} | invalid Total Hours: {int(df['DQ Invalid Total Hours'].sum())}")
    md.append(f"- Missing punch in: {int(df['Missing Punch In Flag'].sum())} | missing punch out: {int(df['Missing Punch Out Flag'].sum())} | both: {int(df['Missing Both Punches Flag'].sum())}")
    md.append(f"- Hours basis: {df['Worked Hours Basis'].value_counts().to_dict()}")
    for c in ("Status", "Status2", "Is Justified", "Source Name", "Business Unit", "Pay Calendar"):
        vc = df[c].fillna("(blank)").value_counts()
        md.append(f"- Distinct {c} ({len(vc)}): " + ", ".join(f"{k} = {v:,}" for k, v in vc.head(25).items()))
    md.append("- Status -> category: " + ", ".join(f"{k} -> {v}" for k, v in df.drop_duplicates('Status')[['Status', 'Record Status Category']].fillna('(blank)').values))
    chg = df.groupby("Employee Code")[["Business Unit", "Client Name", "Cost Center", "Shift Name"]].nunique()
    md.append(f"- Employees whose Business Unit / Client / Cost Center / Shift changes over time: " + ", ".join(f"{c}: {int((chg[c] > 1).sum())}" for c in chg.columns))
    per_month = df[df["Process Date"].notna()].assign(M=lambda x: x["Process Date"].map(lambda v: f"{v:%Y-%m}")).groupby("M").agg(records=("Index", "size"), employees=("Employee Code", "nunique"), files=("Source File", "nunique"))
    md.append(""); md.append("| Month | Records | Employees | Files |"); md.append("|---|---|---|---|")
    for m, r in per_month.iterrows():
        md.append(f"| {m} | {r['records']:,} | {r['employees']:,} | {r['files']} |")
    md.append("")
    # ---- reconciliation numbers ----
    sel = df.copy()
    label = "All data"
    if a.month:
        sel = sel[sel["Process Date"].map(lambda v: v is not None and f"{v:%Y-%m}" == a.month)]; label = a.month
    if a.bu:
        sel = sel[sel["Business Unit"] == a.bu]; label += f" / BU {a.bu}"
    if a.client:
        sel = sel[sel["Client Name"] == a.client]; label += f" / Client {a.client}"
    if a.shift:
        sel = sel[sel["Shift Name"] == a.shift]; label += f" / Shift {a.shift}"
    if a.employee:
        sel = sel[sel["Employee Code"] == a.employee.upper()]; label += f" / Employee {a.employee}"
    md.append("## Expected dashboard figures")
    t, _ = summarise(sel, label); md.append(t); md.append("")
    if not a.month:
        for m in sorted({f"{x:%Y-%m}" for x in d}):
            t, _ = summarise(df[df["Process Date"].map(lambda v: v is not None and f"{v:%Y-%m}" == m)], f"Month {m}"); md.append(t); md.append("")
    md.append("### By Business Unit (selection)")
    md.append("| Business Unit | Employees | Employee Days | Present % | Exception Days | Missing Punch % | Total Hours |"); md.append("|---|---|---|---|---|---|---|")
    for bu, part in sel.groupby("Business Unit"):
        _, o = summarise(part, bu)
        md.append(f"| {bu} | {o['Active Employees']:,} | {o['Employee Days']:,} | {o['Present % of Recorded Days']} | {o['Exception Days']:,} | {o['Missing Punch %']} | {o['Total Worked Hours']:,} |")
    md.append(""); md.append("### By Client (selection)")
    md.append("| Client | Employees | Employee Days | Present % | Exception Days | Missing Punch % | Total Hours |"); md.append("|---|---|---|---|---|---|---|")
    for cl, part in sel.groupby("Client Name"):
        _, o = summarise(part, cl)
        md.append(f"| {cl} | {o['Active Employees']:,} | {o['Employee Days']:,} | {o['Present % of Recorded Days']} | {o['Exception Days']:,} | {o['Missing Punch %']} | {o['Total Worked Hours']:,} |")
    text = "\n".join(md)
    print(text)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(text)
        print("\nWritten:", a.out)


if __name__ == "__main__":
    main()
