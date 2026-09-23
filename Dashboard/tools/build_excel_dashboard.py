#!/usr/bin/env python3
"""Builds the self-contained Excel version of the e& Attendance Management Dashboard.

Sheets: Dashboard | Raw Data (paste here) | Settings | Calc (formulas) | Employees (helper)
Usage: python3 build_excel_dashboard.py [output.xlsx] [--sample]   (--sample pre-fills Raw Data with synthetic rows)
"""
import os, sys, csv, datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.chart.series import SeriesLabel
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.comments import Comment

OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "e& Attendance Management Dashboard.xlsx"))
SAMPLE = "--sample" in sys.argv

N_FILL = 15000          # rows pre-filled with formulas in Calc (fill down to extend)
N_MAX = 30000           # fixed range size used by every aggregate formula
for a in sys.argv:
    if a.startswith("--rows="): N_FILL = int(a.split("=")[1])
    if a.startswith("--emp="): EMP_OVERRIDE = int(a.split("=")[1])
R1, RN = 2, N_MAX + 1   # data rows in Raw Data / Calc

RED = "E60000"; CHAR = "2E2E2E"; GREY = "6B6B6B"; LINE = "E6E6E6"; LIGHT = "F4F4F4"; WHITE = "FFFFFF"
GREEN = "2E7D5B"; SLATE = "7A8CA3"; GOLD = "C9A227"; NEUT = "BDBDBD"
FONT = "Arial"

def font(size=10, bold=False, color=CHAR, italic=False):
    return Font(name=FONT, size=size, bold=bold, color=color, italic=italic)

def fill(hexv):
    return PatternFill("solid", start_color=hexv, end_color=hexv)

thin = Side(style="thin", color=LINE)
BORDER = Border(top=thin, bottom=thin, left=thin, right=thin)

wb = Workbook()
ws_dash = wb.active; ws_dash.title = "Dashboard"
ws_raw = wb.create_sheet("Raw Data")
ws_set = wb.create_sheet("Settings")
ws_calc = wb.create_sheet("Calc")
ws_emp = wb.create_sheet("Employees")

# ----------------------------------------------------------------------------------------------
# Raw Data
# ----------------------------------------------------------------------------------------------
HEADERS = ["Employee Code", "Agency Emp ID", "Employee Name", "Source Name", "Business Unit", "Client Name", "Cost Center", "Pay Calendar",
           "Shift Name", "Process Date", "Day", "Punch In Time", "Punch Out Time", "Total Hours", "Status", "Punch In Terminal", "Punch Out Terminal",
           "Is Justified", "Status2"]
for i, h in enumerate(HEADERS, 1):
    c = ws_raw.cell(row=1, column=i, value=h)
    c.font = font(10, True, WHITE); c.fill = fill(RED); c.alignment = Alignment(vertical="center")
    ws_raw.column_dimensions[L(i)].width = 18
ws_raw.column_dimensions["C"].width = 30; ws_raw.column_dimensions["G"].width = 26; ws_raw.column_dimensions["I"].width = 26
ws_raw.column_dimensions["L"].width = 24; ws_raw.column_dimensions["M"].width = 24; ws_raw.column_dimensions["P"].width = 30; ws_raw.column_dimensions["Q"].width = 30
ws_raw.freeze_panes = "A2"
ws_raw.auto_filter.ref = f"A1:S{N_FILL + 1}"
# text format for code columns so leading zeros survive
for col in ("A", "B"):
    for r in range(2, N_FILL + 2):
        ws_raw[f"{col}{r}"].number_format = "@"

example = ["OB60802", "PT117692", "AHMED MOHSEN SAYED SALEH", "OUTSOURCE", "eMinds", "SMB-41984", "20085-SMB-SALES-CW41984", "48 Hours Weekly",
           "SMB DIGITAL BACK OFFICE", "27-AUG-2026", "Thursday", "27-AUG-2026 07:07:48 AM", "27-AUG-2026 04:17:07 PM", "09:09", "Present",
           "SHJ-HRB-L03-D040 LOBBY ENTRY", "SHJ-MSCP-GF-GATE04-TS EXIT EXIT", "", ""]
if SAMPLE:
    rows = []
    sd = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sample_data", "attendance_2026-08.csv")
    with open(sd, encoding="utf-8") as f:
        rd = csv.reader(f); next(rd)
        rows = [r for r in rd]
    # add two more months from the Excel samples via pandas
    import pandas as pd
    for fn in ("Attendance June 2026.xlsx", "JUL-2026_attendance_export.xlsx"):
        df = pd.read_excel(os.path.join(os.path.dirname(sd), fn), header=None, dtype=object)
        top = df.head(5).values.tolist()
        hidx = next(i for i, r in enumerate(top) if "Employee Code" in [str(x) for x in r])
        hdr = [str(x) for x in df.iloc[hidx].tolist()]
        hdr = [h if h != "Punch Out Terminal" else "Punch Out Temrinal" for h in hdr]
        body = df.iloc[hidx + 1:]
        idx = [hdr.index(h if h != "Punch Out Terminal" else "Punch Out Temrinal") for h in HEADERS]
        for _, r in body.iterrows():
            vals = [r.iloc[i] for i in idx]
            if str(vals[0]) in ("Total", "nan") and str(vals[9]) == "nan":
                continue
            rows.append(["" if str(v) == "nan" else v for v in vals])
    for r_i, r in enumerate(rows[:N_FILL], start=2):
        for c_i, v in enumerate(r, 1):
            ws_raw.cell(row=r_i, column=c_i, value=v)
    print("sample rows:", len(rows))
else:
    for c_i, v in enumerate(example, 1):
        ws_raw.cell(row=2, column=c_i, value=v)
        ws_raw.cell(row=2, column=c_i).font = font(10, color="0000FF")
    ws_raw["A2"].comment = Comment("Example row showing the expected format. Delete it before pasting real data.", "Dashboard")

# ----------------------------------------------------------------------------------------------
# Settings
# ----------------------------------------------------------------------------------------------
ws_set["A1"] = "Settings"; ws_set["A1"].font = font(14, True, RED)
ws_set["A3"] = "Selected month (yyyy-mm)"; ws_set["B3"] = '=IF(MAX(Calc!$B$2:$B$30001)=0,"",TEXT(MAX(Calc!$B$2:$B$30001),"yyyy-mm"))'
ws_set["A4"] = "Short hours review threshold (hrs)"; ws_set["B4"] = 4
ws_set["A5"] = "Long hours review threshold (hrs)"; ws_set["B5"] = 12
ws_set["A6"] = "Treat non-blank Status2 as exception (1 = yes)"; ws_set["B6"] = 1
for r in (3, 4, 5, 6):
    ws_set[f"B{r}"].font = font(10, color="0000FF"); ws_set[f"B{r}"].fill = fill("FFFF00")
ws_set["C3"] = "Dashboard!C4 drives the selected month; this is the default (latest month in the data)."
ws_set["C4"] = "Review thresholds only - not HR policy."
ws_set["A8"] = "Month list"; ws_set["A8"].font = font(10, True)
ws_set["A9"] = "First month"; ws_set["B9"] = '=IF(MIN(Calc!$B$2:$B$30001)=0,"",DATE(YEAR(MIN(Calc!$B$2:$B$30001)),MONTH(MIN(Calc!$B$2:$B$30001)),1))'
ws_set["B9"].number_format = "mmm yyyy"
for i in range(24):
    r = 10 + i
    ws_set[f"A{r}"] = f'=IF($B$9="","",IF(EDATE($B$9,{i})>MAX(Calc!$B$2:$B$30001),"",TEXT(EDATE($B$9,{i}),"yyyy-mm")))'
ws_set["D8"] = "Month names (do not edit)"; ws_set["D8"].font = font(10, True)
for i, m in enumerate(["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]):
    ws_set[f"D{9 + i}"] = m
ws_set["F8"] = "Status overrides (optional)"; ws_set["F8"].font = font(10, True)
ws_set["F9"] = "Status text"; ws_set["G9"] = "Category"; ws_set["F9"].font = font(10, True); ws_set["G9"].font = font(10, True)
ws_set["F10"] = "WFH"; ws_set["G10"] = "Present"
ws_set["F10"].font = font(10, color="0000FF"); ws_set["G10"].font = font(10, color="0000FF")
ws_set["H10"] = "Example: any status text not recognised by the keyword rules can be mapped here. Categories: Present, Absent, Leave, Holiday, Weekend / Rest Day, Other"
for r in range(11, 40):
    ws_set[f"F{r}"].fill = fill("FFFFCC"); ws_set[f"G{r}"].fill = fill("FFFFCC")
ws_set.column_dimensions["A"].width = 44; ws_set.column_dimensions["B"].width = 14; ws_set.column_dimensions["C"].width = 60
ws_set.column_dimensions["F"].width = 28; ws_set.column_dimensions["G"].width = 22
OVR = "Settings!$F$10:$G$39"

# ----------------------------------------------------------------------------------------------
# Calc (one formula row per Raw Data row)
# ----------------------------------------------------------------------------------------------
CALC_COLS = [
    ("A", "Code", '=IF(TRIM(\'Raw Data\'!A{r})="","",UPPER(TRIM(\'Raw Data\'!A{r})))'),
    ("B", "Date", '=IF(\'Raw Data\'!J{r}="","",IF(ISNUMBER(\'Raw Data\'!J{r}),INT(\'Raw Data\'!J{r}),IFERROR(IF(DAY(DATE(VALUE(RIGHT(TRIM(\'Raw Data\'!J{r}),4)),MATCH(UPPER(MID(TRIM(\'Raw Data\'!J{r}),4,3)),Settings!$D$9:$D$20,0),VALUE(LEFT(TRIM(\'Raw Data\'!J{r}),2))))=VALUE(LEFT(TRIM(\'Raw Data\'!J{r}),2)),DATE(VALUE(RIGHT(TRIM(\'Raw Data\'!J{r}),4)),MATCH(UPPER(MID(TRIM(\'Raw Data\'!J{r}),4,3)),Settings!$D$9:$D$20,0),VALUE(LEFT(TRIM(\'Raw Data\'!J{r}),2))),""),IFERROR(INT(DATEVALUE(TRIM(\'Raw Data\'!J{r}))),""))))'),
    ("C", "Month", '=IF(OR(A{r}="",B{r}=""),"",TEXT(B{r},"yyyy-mm"))'),
    ("D", "DayKey", '=IF(OR(A{r}="",B{r}=""),"",A{r}&"|"&B{r})'),
    ("E", "EmpMonthKey", '=IF(C{r}="","",A{r}&"|"&C{r})'),
    ("F", "Status Category", '=IF(C{r}="","",IFERROR(VLOOKUP(TRIM(\'Raw Data\'!O{r}),' + OVR + ',2,FALSE),IF(TRIM(\'Raw Data\'!O{r})="","Unknown",IF(ISNUMBER(SEARCH("absent",\'Raw Data\'!O{r})),"Absent",IF(ISNUMBER(SEARCH("present",\'Raw Data\'!O{r})),"Present",IF(OR(ISNUMBER(SEARCH("leave",\'Raw Data\'!O{r})),ISNUMBER(SEARCH("vacation",\'Raw Data\'!O{r})),ISNUMBER(SEARCH("sick",\'Raw Data\'!O{r}))),"Leave",IF(ISNUMBER(SEARCH("holiday",\'Raw Data\'!O{r})),"Holiday",IF(OR(ISNUMBER(SEARCH("weekend",\'Raw Data\'!O{r})),ISNUMBER(SEARCH("week off",\'Raw Data\'!O{r})),ISNUMBER(SEARCH("weekly off",\'Raw Data\'!O{r})),ISNUMBER(SEARCH("weekoff",\'Raw Data\'!O{r})),ISNUMBER(SEARCH("rest day",\'Raw Data\'!O{r})),ISNUMBER(SEARCH("day off",\'Raw Data\'!O{r})),ISNUMBER(SEARCH("off day",\'Raw Data\'!O{r})),UPPER(TRIM(\'Raw Data\'!O{r}))="OFF"),"Weekend / Rest Day","Other")))))))'),
    ("G", "Hours", '=IF(C{r}="","",IF(\'Raw Data\'!N{r}="","",IF(ISNUMBER(\'Raw Data\'!N{r}),IF(\'Raw Data\'!N{r}<1,\'Raw Data\'!N{r}*24,""),IFERROR(VALUE(LEFT(TRIM(\'Raw Data\'!N{r}),FIND(":",TRIM(\'Raw Data\'!N{r}))-1))+VALUE(MID(TRIM(\'Raw Data\'!N{r}),FIND(":",TRIM(\'Raw Data\'!N{r}))+1,2))/60,""))))'),
    ("H", "Has In", '=IF(C{r}="","",IF(TRIM(\'Raw Data\'!L{r})="",0,1))'),
    ("I", "Has Out", '=IF(C{r}="","",IF(TRIM(\'Raw Data\'!M{r})="",0,1))'),
    ("J", "Missing Punch", '=IF(C{r}="","",IF(AND(OR(F{r}="Present",H{r}=1,I{r}=1),OR(H{r}=0,I{r}=0)),1,0))'),
    ("K", "Exception", '=IF(C{r}="","",IF(OR(F{r}="Absent",F{r}="Other",F{r}="Unknown",J{r}=1,AND(F{r}="Present",G{r}<>"",G{r}>0,G{r}<Settings!$B$4),AND(G{r}<>"",G{r}>Settings!$B$5),AND(Settings!$B$6=1,TRIM(\'Raw Data\'!S{r})<>"")),1,0))'),
    ("L", "First of Day", '=IF(D{r}="","",IF(MATCH(D{r},$D$2:$D$30001,0)=ROW()-1,1,0))'),
    ("M", "First Emp-Month", '=IF(E{r}="","",IF(MATCH(E{r},$E$2:$E$30001,0)=ROW()-1,1,0))'),
    ("N", "RowSig", '=IF(C{r}="","",A{r}&"|"&B{r}&"|"&TRIM(\'Raw Data\'!L{r})&"|"&TRIM(\'Raw Data\'!M{r})&"|"&TRIM(\'Raw Data\'!N{r})&"|"&TRIM(\'Raw Data\'!O{r})&"|"&TRIM(\'Raw Data\'!E{r})&"|"&TRIM(\'Raw Data\'!F{r})&"|"&TRIM(\'Raw Data\'!I{r}))'),
    ("O", "First of Sig", '=IF(N{r}="","",IF(MATCH(N{r},$N$2:$N$30001,0)=ROW()-1,1,0))'),
    ("P", "Punch In", '=IF(C{r}="","",IF(TRIM(\'Raw Data\'!L{r})="","",IF(ISNUMBER(\'Raw Data\'!L{r}),MOD(\'Raw Data\'!L{r},1),IFERROR(TIMEVALUE(MID(TRIM(\'Raw Data\'!L{r}),FIND(" ",TRIM(\'Raw Data\'!L{r}))+1,20)),IFERROR(TIMEVALUE(TRIM(\'Raw Data\'!L{r})),"")))))'),
    ("Q", "Punch Out", '=IF(C{r}="","",IF(TRIM(\'Raw Data\'!M{r})="","",IF(ISNUMBER(\'Raw Data\'!M{r}),MOD(\'Raw Data\'!M{r},1),IFERROR(TIMEVALUE(MID(TRIM(\'Raw Data\'!M{r}),FIND(" ",TRIM(\'Raw Data\'!M{r}))+1,20)),IFERROR(TIMEVALUE(TRIM(\'Raw Data\'!M{r})),"")))))'),
    ("R", "In Hour", '=IF(P{r}="","",HOUR(P{r}))'),
    ("S", "Out Hour", '=IF(Q{r}="","",HOUR(Q{r}))'),
    ("T", "Weekday", '=IF(B{r}="","",WEEKDAY(B{r},2))'),
    ("U", "BU", '=IF(C{r}="","",IF(TRIM(\'Raw Data\'!E{r})="","(Blank)",TRIM(\'Raw Data\'!E{r})))'),
    ("V", "Client", '=IF(C{r}="","",IF(TRIM(\'Raw Data\'!F{r})="","(Blank)",TRIM(\'Raw Data\'!F{r})))'),
    ("W", "Shift", '=IF(C{r}="","",IF(TRIM(\'Raw Data\'!I{r})="","(Blank)",TRIM(\'Raw Data\'!I{r})))'),
    ("X", "First BU", '=IF(U{r}="","",IF(MATCH(U{r},$U$2:$U$30001,0)=ROW()-1,1,0))'),
    ("Y", "BU #", '=IF(X{r}=1,AH{r},"")'),
    ("Z", "First Client", '=IF(V{r}="","",IF(MATCH(V{r},$V$2:$V$30001,0)=ROW()-1,1,0))'),
    ("AA", "Client #", '=IF(Z{r}=1,AI{r},"")'),
    ("AB", "First Shift", '=IF(W{r}="","",IF(MATCH(W{r},$W$2:$W$30001,0)=ROW()-1,1,0))'),
    ("AC", "Shift #", '=IF(AB{r}=1,AJ{r},"")'),
    ("AD", "First Emp", '=IF(A{r}="","",IF(MATCH(A{r},$A$2:$A$30001,0)=ROW()-1,1,0))'),
    ("AE", "Emp #", '=IF(AD{r}=1,AK{r},"")'),
    ("AF", "Hours Band", '=IF(G{r}="","",IF(G{r}<=0,"0 No hours",IF(G{r}<4,"1 < 4 hrs",IF(G{r}<6,"2 4-6 hrs",IF(G{r}<8,"3 6-8 hrs",IF(G{r}<10,"4 8-10 hrs",IF(G{r}<12,"5 10-12 hrs","6 12+ hrs")))))))'),
    ("AH", "BU run", '=IF(X{r}="",AH{p},AH{p}+X{r})'),
    ("AI", "Client run", '=IF(Z{r}="",AI{p},AI{p}+Z{r})'),
    ("AJ", "Shift run", '=IF(AB{r}="",AJ{p},AJ{p}+AB{r})'),
    ("AK", "Emp run", '=IF(AD{r}="",AK{p},AK{p}+AD{r})'),
    ("AG", "DQ", '=IF(C{r}="",IF(OR(TRIM(\'Raw Data\'!A{r})<>"",TRIM(\'Raw Data\'!J{r})<>""),1,""),IF(OR(TRIM(\'Raw Data\'!C{r})="",AND(TRIM(\'Raw Data\'!N{r})<>"",G{r}=""),AND(F{r}="Present",TRIM(\'Raw Data\'!N{r})=""),AND(TRIM(\'Raw Data\'!L{r})<>"",P{r}=""),AND(TRIM(\'Raw Data\'!M{r})<>"",Q{r}=""),O{r}=0,F{r}="Other",F{r}="Unknown",U{r}="(Blank)",V{r}="(Blank)",W{r}="(Blank)"),1,0))'),
]
for col, name, _ in CALC_COLS:
    c = ws_calc[f"{col}1"]; c.value = name; c.font = font(9, True, WHITE); c.fill = fill(CHAR)
    ws_calc.column_dimensions[col].width = 12
for col in ("AH", "AI", "AJ", "AK"):
    ws_calc[f"{col}1"].value = ws_calc[f"{col}1"].value  # header already set
for r in range(2, N_FILL + 2):
    for col, _, f in CALC_COLS:
        ws_calc[f"{col}{r}"] = f.format(r=r, p=r - 1)
for col in ("AH", "AI", "AJ", "AK"):
    ws_calc[f"{col}1"] = 0
    ws_calc[f"B{r}"].number_format = "dd-mmm-yyyy"
    ws_calc[f"P{r}"].number_format = "hh:mm"; ws_calc[f"Q{r}"].number_format = "hh:mm"
ws_calc.freeze_panes = "A2"
ws_calc["AM1"] = "Formulas are filled to row %d. To add capacity, select the last filled row and fill down." % (N_FILL + 1)
ws_calc["AM1"].font = font(9, italic=True, color=GREY)

def C(col):  # full calc range
    return f"Calc!${col}$2:${col}$30001"

# ----------------------------------------------------------------------------------------------
# Employees helper (one row per distinct employee, metrics for the selected month)
# ----------------------------------------------------------------------------------------------
EMP_N = globals().get("EMP_OVERRIDE", 2000)
SEL = "Dashboard!$C$4"
emp_hdr = ["#", "Employee Code", "Employee Name", "Business Unit", "Client", "Employee Days", "Present Days", "Exception Days", "Missing Punch Days", "Avg Hours", "Rank Key"]
for i, h in enumerate(emp_hdr, 1):
    c = ws_emp.cell(row=1, column=i, value=h); c.font = font(9, True, WHITE); c.fill = fill(CHAR)
for r in range(2, EMP_N + 2):
    k = r - 1
    ws_emp[f"A{r}"] = k
    ws_emp[f"B{r}"] = f'=IFERROR(INDEX({C("A")},MATCH({k},{C("AE")},0)),"")'
    ws_emp[f"C{r}"] = f'=IF(B{r}="","",IFERROR(TRIM(INDEX(\'Raw Data\'!$C$2:$C$30001,MATCH(B{r},{C("A")},0))),""))'
    ws_emp[f"D{r}"] = f'=IF(B{r}="","",IFERROR(INDEX({C("U")},MATCH(B{r}&"|"&{SEL},{C("E")},0)),""))'
    ws_emp[f"E{r}"] = f'=IF(B{r}="","",IFERROR(INDEX({C("V")},MATCH(B{r}&"|"&{SEL},{C("E")},0)),""))'
    ws_emp[f"F{r}"] = f'=IF(B{r}="","",COUNTIFS({C("A")},B{r},{C("C")},{SEL},{C("L")},1))'
    ws_emp[f"G{r}"] = f'=IF(B{r}="","",COUNTIFS({C("A")},B{r},{C("C")},{SEL},{C("L")},1,{C("F")},"Present"))'
    ws_emp[f"H{r}"] = f'=IF(B{r}="","",COUNTIFS({C("A")},B{r},{C("C")},{SEL},{C("L")},1,{C("K")},1))'
    ws_emp[f"I{r}"] = f'=IF(B{r}="","",COUNTIFS({C("A")},B{r},{C("C")},{SEL},{C("L")},1,{C("J")},1))'
    ws_emp[f"J{r}"] = f'=IF(B{r}="","",IFERROR(SUMIFS({C("G")},{C("A")},B{r},{C("C")},{SEL},{C("O")},1)/COUNTIFS({C("A")},B{r},{C("C")},{SEL},{C("L")},1,{C("G")},">0"),""))'
    ws_emp[f"K{r}"] = f'=IF(B{r}="","",H{r}+I{r}/1000+{k}/100000000)'
    ws_emp[f"J{r}"].number_format = "0.0"
ws_emp.freeze_panes = "A2"
for col, w in zip("ABCDEFGHIJK", (5, 14, 30, 18, 18, 12, 12, 12, 14, 10, 12)):
    ws_emp.column_dimensions[col].width = w
EMP = lambda col: f"Employees!${col}$2:${col}${EMP_N + 1}"

# ----------------------------------------------------------------------------------------------
# Dashboard
# ----------------------------------------------------------------------------------------------
d = ws_dash
d.sheet_view.showGridLines = False
for col in range(1, 40):
    d.column_dimensions[L(col)].width = 13
d.column_dimensions["A"].width = 2; d.column_dimensions["B"].width = 30

d["B1"] = "e&"; d["B1"].font = Font(name=FONT, size=22, bold=True, color=RED)
d["C1"] = "Workforce Attendance Overview"; d["C1"].font = font(16, True)
d["C2"] = '="Data through "&IF(MAX(Calc!$B$2:$B$30001)=0,"-",TEXT(MAX(Calc!$B$2:$B$30001),"dd mmm yyyy"))&"   |   "&COUNTIF(Settings!$A$10:$A$33,"?*")&" months loaded   |   "&COUNTIF(Calc!$C$2:$C$30001,"?*")&" records"'
d["C2"].font = font(9, color=GREY)
d["B4"] = "Selected month"; d["B4"].font = font(10, True)
d["C4"] = "=Settings!B3"; d["C4"].font = font(11, True, "0000FF"); d["C4"].fill = fill("FFFF00"); d["C4"].border = BORDER
d["D4"] = "<- pick a month (yyyy-mm). Defaults to the latest month after each paste."; d["D4"].font = font(9, italic=True, color=GREY)
dv = DataValidation(type="list", formula1="=Settings!$A$10:$A$33", allow_blank=True); d.add_data_validation(dv); dv.add("C4")
d["B5"] = "Previous month"; d["B5"].font = font(10, color=GREY)
d["C5"] = '=IF(C4="","",TEXT(EDATE(DATEVALUE(C4&"-01"),-1),"yyyy-mm"))'; d["C5"].font = font(10, color=GREY)

M = "$C$4"; PM = "$C$5"
def cnt(month, *extra):
    crit = "".join(f',{C(c)},{v}' for c, v in extra)
    return f'COUNTIFS({C("C")},{month}{crit})'

# ---- KPI block -------------------------------------------------------------------------------
kpis = [
    ("Active Employees", lambda m: f'={cnt(m, ("M", 1))}', "#,##0", None),
    ("Employee Days", lambda m: f'={cnt(m, ("L", 1))}', "#,##0", None),
    ("Present % of Recorded Days", lambda m: f'=IFERROR({cnt(m, ("L", 1), ("F", chr(34) + "Present" + chr(34)))}/{cnt(m, ("L", 1))},"")', "0.0%", "pp"),
    ("Total Worked Hours", lambda m: f'=SUMIFS({C("G")},{C("C")},{m},{C("O")},1)', '#,##0 "hrs"', None),
    ("Avg Hours / Worked Day", lambda m: f'=IFERROR(SUMIFS({C("G")},{C("C")},{m},{C("O")},1)/{cnt(m, ("L", 1), ("G", chr(34) + ">0" + chr(34)))},"")', '0.0 "hrs"', None),
    ("Exception Days", lambda m: f'={cnt(m, ("L", 1), ("K", 1))}', "#,##0", None),
    ("Missing Punch %", lambda m: f'=IFERROR({cnt(m, ("L", 1), ("J", 1))}/COUNTIFS({C("C")},{m},{C("L")},1,{C("F")},"Present"),"")', "0.0%", "pp"),
]
d["B7"] = "Key figures"; d["B7"].font = font(12, True)
d["B8"] = "Measure"; d["C8"] = "Selected month"; d["D8"] = "Previous month"; d["E8"] = "Change"; d["F8"] = "Note"
for c in "BCDEF":
    d[f"{c}8"].font = font(9, True, WHITE); d[f"{c}8"].fill = fill(CHAR)
notes = {"Present % of Recorded Days": "share of recorded days - not a true attendance rate (no roster)",
         "Avg Hours / Worked Day": "days with hours > 0 only", "Missing Punch %": "of Present days",
         "Exception Days": "Absent, missing punch, unrecognised status, hours outside review thresholds, Status2"}
for i, (label, fx, fmt, kind) in enumerate(kpis):
    r = 9 + i
    d[f"B{r}"] = label; d[f"B{r}"].font = font(10)
    d[f"C{r}"] = fx(M); d[f"C{r}"].number_format = fmt; d[f"C{r}"].font = font(12, True)
    d[f"D{r}"] = fx(PM); d[f"D{r}"].number_format = fmt; d[f"D{r}"].font = font(10, color=GREY)
    if kind == "pp":
        d[f"E{r}"] = f'=IF(OR(C{r}="",D{r}=""),"",(C{r}-D{r})*100)'; d[f"E{r}"].number_format = '+0.0 "pp";-0.0 "pp";0.0 "pp"'
    else:
        d[f"E{r}"] = f'=IF(OR(C{r}="",D{r}="",D{r}=0),"",C{r}/D{r}-1)'; d[f"E{r}"].number_format = "+0.0%;-0.0%;0.0%"
    d[f"E{r}"].font = font(10)
    d[f"F{r}"] = notes.get(label, ""); d[f"F{r}"].font = font(8, italic=True, color=GREY)
    for c in "BCDE":
        d[f"{c}{r}"].border = BORDER
# colour the change cells (neutral for volumes; green/red for rates where direction matters)
d.conditional_formatting.add("E11", CellIsRule(operator="greaterThan", formula=["0"], font=Font(color=GREEN)))
d.conditional_formatting.add("E11", CellIsRule(operator="lessThan", formula=["0"], font=Font(color=RED)))
for cell in ("E14", "E15"):
    d.conditional_formatting.add(cell, CellIsRule(operator="greaterThan", formula=["0"], font=Font(color=RED)))
    d.conditional_formatting.add(cell, CellIsRule(operator="lessThan", formula=["0"], font=Font(color=GREEN)))

# ---- Status mix ------------------------------------------------------------------------------
d["B17"] = "Attendance status (selected month, employee-days)"; d["B17"].font = font(12, True)
cats = ["Present", "Absent", "Leave", "Holiday", "Weekend / Rest Day", "Other", "Unknown"]
d["B18"] = "Status"; d["C18"] = "Days"; d["D18"] = "Share"; d["E18"] = "Prev. month"
for c in "BCDE":
    d[f"{c}18"].font = font(9, True, WHITE); d[f"{c}18"].fill = fill(CHAR)
for i, cat in enumerate(cats):
    r = 19 + i
    d[f"B{r}"] = cat
    d[f"C{r}"] = f'=COUNTIFS({C("C")},{M},{C("L")},1,{C("F")},B{r})'; d[f"C{r}"].number_format = "#,##0"
    d[f"D{r}"] = f'=IFERROR(C{r}/$C$10,"")'; d[f"D{r}"].number_format = "0.0%"
    d[f"E{r}"] = f'=COUNTIFS({C("C")},{PM},{C("L")},1,{C("F")},B{r})'; d[f"E{r}"].number_format = "#,##0"; d[f"E{r}"].font = font(10, color=GREY)
    for c in "BCDE":
        d[f"{c}{r}"].border = BORDER
d["B26"] = "Unrecognised statuses appear as Other - map them on the Settings sheet."; d["B26"].font = font(8, italic=True, color=GREY)

# ---- Monthly trend ----------------------------------------------------------------------------
d["B28"] = "Monthly trend (all months in the data)"; d["B28"].font = font(12, True)
trend_hdr = ["Month", "Employees", "Employee Days", "Present %", "Total Hours", "Avg Hours / Worked Day", "Exception Days", "Exception %", "Missing Punch %"]
for i, h in enumerate(trend_hdr):
    c = d.cell(row=29, column=2 + i, value=h); c.font = font(9, True, WHITE); c.fill = fill(CHAR); c.alignment = Alignment(wrap_text=True, vertical="center")
d.row_dimensions[29].height = 30
for i in range(24):
    r = 30 + i
    m = f"$B{r}"
    d[f"B{r}"] = f"=Settings!A{10 + i}"
    d[f"C{r}"] = f'=IF({m}="","",{cnt(m, ("M", 1))})'
    d[f"D{r}"] = f'=IF({m}="","",{cnt(m, ("L", 1))})'
    d[f"E{r}"] = f'=IF({m}="","",IFERROR({cnt(m, ("L", 1), ("F", chr(34) + "Present" + chr(34)))}/D{r},""))'
    d[f"F{r}"] = f'=IF({m}="","",SUMIFS({C("G")},{C("C")},{m},{C("O")},1))'
    d[f"G{r}"] = f'=IF({m}="","",IFERROR(F{r}/{cnt(m, ("L", 1), ("G", chr(34) + ">0" + chr(34)))},""))'
    d[f"H{r}"] = f'=IF({m}="","",{cnt(m, ("L", 1), ("K", 1))})'
    d[f"I{r}"] = f'=IF({m}="","",IFERROR(H{r}/D{r},""))'
    d[f"J{r}"] = f'=IF({m}="","",IFERROR({cnt(m, ("L", 1), ("J", 1))}/COUNTIFS({C("C")},{m},{C("L")},1,{C("F")},"Present"),""))'
    for c, fmt in zip("CDEFGHIJ", ("#,##0", "#,##0", "0.0%", "#,##0", "0.0", "#,##0", "0.0%", "0.0%")):
        d[f"{c}{r}"].number_format = fmt; d[f"{c}{r}"].border = BORDER
    d[f"B{r}"].border = BORDER

# ---- Business Unit table ---------------------------------------------------------------------
d["B55"] = "Management attention by Business Unit (selected month)"; d["B55"].font = font(12, True)
bu_hdr = ["Business Unit", "Employees", "Employee Days", "Present %", "Exception Days", "Exception %", "Missing Punch %", "Avg Hours"]
for i, h in enumerate(bu_hdr):
    c = d.cell(row=56, column=2 + i, value=h); c.font = font(9, True, WHITE); c.fill = fill(CHAR); c.alignment = Alignment(wrap_text=True, vertical="center")
BU_ROWS = 15
for i in range(BU_ROWS):
    r = 57 + i; k = i + 1
    d[f"B{r}"] = f'=IFERROR(INDEX({C("U")},MATCH({k},{C("Y")},0)),"")'
    b = f"$B{r}"
    d[f"C{r}"] = f'=IF({b}="","",COUNTIFS({C("C")},{M},{C("U")},{b},{C("M")},1))'
    d[f"D{r}"] = f'=IF({b}="","",COUNTIFS({C("C")},{M},{C("U")},{b},{C("L")},1))'
    d[f"E{r}"] = f'=IF({b}="","",IFERROR(COUNTIFS({C("C")},{M},{C("U")},{b},{C("L")},1,{C("F")},"Present")/D{r},""))'
    d[f"F{r}"] = f'=IF({b}="","",COUNTIFS({C("C")},{M},{C("U")},{b},{C("L")},1,{C("K")},1))'
    d[f"G{r}"] = f'=IF({b}="","",IFERROR(F{r}/D{r},""))'
    d[f"H{r}"] = f'=IF({b}="","",IFERROR(COUNTIFS({C("C")},{M},{C("U")},{b},{C("L")},1,{C("J")},1)/COUNTIFS({C("C")},{M},{C("U")},{b},{C("L")},1,{C("F")},"Present"),""))'
    d[f"I{r}"] = f'=IF({b}="","",IFERROR(SUMIFS({C("G")},{C("C")},{M},{C("U")},{b},{C("O")},1)/COUNTIFS({C("C")},{M},{C("U")},{b},{C("L")},1,{C("G")},">0"),""))'
    for c, fmt in zip("CDEFGHI", ("#,##0", "#,##0", "0.0%", "#,##0", "0.0%", "0.0%", "0.0")):
        d[f"{c}{r}"].number_format = fmt; d[f"{c}{r}"].border = BORDER
    d[f"B{r}"].border = BORDER
d.conditional_formatting.add(f"G57:G{56 + BU_ROWS}", FormulaRule(formula=[f'AND(G57<>"",G57>1.5*$C$14/MAX($C$10,1),D57>=20)'], font=Font(color=RED, bold=True)))
d.conditional_formatting.add(f"H57:H{56 + BU_ROWS}", FormulaRule(formula=[f'AND(H57<>"",H57>1.5*$C$15,D57>=20)'], font=Font(color=RED, bold=True)))
d["B72"] = "Red = rate above 1.5x the overall rate for the month (minimum 20 employee-days). Review aid, not a policy threshold."; d["B72"].font = font(8, italic=True, color=GREY)

# ---- Client table (top 15 by employee days) ---------------------------------------------------
d["B74"] = "Top clients by employee days (selected month)"; d["B74"].font = font(12, True)
cl_hdr = ["Client", "Employees", "Employee Days", "Present %", "Exception Days", "Missing Punch %", "Avg Hours"]
for i, h in enumerate(cl_hdr):
    c = d.cell(row=75, column=2 + i, value=h); c.font = font(9, True, WHITE); c.fill = fill(CHAR); c.alignment = Alignment(wrap_text=True, vertical="center")
# helper list of all clients on Settings (cols J:L)
ws_set["J8"] = "Client helper (auto)"; ws_set["J8"].font = font(10, True)
ws_set["J9"] = "Client"; ws_set["K9"] = "Employee Days"; ws_set["L9"] = "Rank key"
CL_N = 150
for i in range(CL_N):
    r = 10 + i; k = i + 1
    ws_set[f"J{r}"] = f'=IFERROR(INDEX({C("V")},MATCH({k},{C("AA")},0)),"")'
    ws_set[f"K{r}"] = f'=IF(J{r}="","",COUNTIFS({C("C")},{M.replace("$C$4", "Dashboard!$C$4")},{C("V")},J{r},{C("L")},1))'
    ws_set[f"L{r}"] = f'=IF(J{r}="",-1,K{r}+{k}/1000000)'
for i in range(15):
    r = 76 + i; k = i + 1
    d[f"B{r}"] = f'=IFERROR(IF(LARGE(Settings!$L$10:$L${9 + CL_N},{k})<0,"",INDEX(Settings!$J$10:$J${9 + CL_N},MATCH(LARGE(Settings!$L$10:$L${9 + CL_N},{k}),Settings!$L$10:$L${9 + CL_N},0))),"")'
    b = f"$B{r}"
    d[f"C{r}"] = f'=IF({b}="","",COUNTIFS({C("C")},{M},{C("V")},{b},{C("M")},1))'
    d[f"D{r}"] = f'=IF({b}="","",COUNTIFS({C("C")},{M},{C("V")},{b},{C("L")},1))'
    d[f"E{r}"] = f'=IF({b}="","",IFERROR(COUNTIFS({C("C")},{M},{C("V")},{b},{C("L")},1,{C("F")},"Present")/D{r},""))'
    d[f"F{r}"] = f'=IF({b}="","",COUNTIFS({C("C")},{M},{C("V")},{b},{C("L")},1,{C("K")},1))'
    d[f"G{r}"] = f'=IF({b}="","",IFERROR(COUNTIFS({C("C")},{M},{C("V")},{b},{C("L")},1,{C("J")},1)/COUNTIFS({C("C")},{M},{C("V")},{b},{C("L")},1,{C("F")},"Present"),""))'
    d[f"H{r}"] = f'=IF({b}="","",IFERROR(SUMIFS({C("G")},{C("C")},{M},{C("V")},{b},{C("O")},1)/COUNTIFS({C("C")},{M},{C("V")},{b},{C("L")},1,{C("G")},">0"),""))'
    for c, fmt in zip("CDEFGH", ("#,##0", "#,##0", "0.0%", "#,##0", "0.0%", "0.0")):
        d[f"{c}{r}"].number_format = fmt; d[f"{c}{r}"].border = BORDER
    d[f"B{r}"].border = BORDER

# ---- Employees requiring review (top 20) ------------------------------------------------------
d["B93"] = "Employees requiring attendance review (selected month, ranked by exception days)"; d["B93"].font = font(12, True)
er_hdr = ["Employee Code", "Employee Name", "Business Unit", "Client", "Employee Days", "Present Days", "Exception Days", "Missing Punch Days", "Avg Hours"]
for i, h in enumerate(er_hdr):
    c = d.cell(row=94, column=2 + i, value=h); c.font = font(9, True, WHITE); c.fill = fill(CHAR); c.alignment = Alignment(wrap_text=True, vertical="center")
for i in range(20):
    r = 95 + i; k = i + 1
    d[f"B{r}"] = f'=IFERROR(IF(LARGE({EMP("K")},{k})<1,"",INDEX({EMP("B")},MATCH(LARGE({EMP("K")},{k}),{EMP("K")},0))),"")'
    for c_out, c_src in zip("CDEFGHIJ", "CDEFGHIJ"):
        d[f"{c_out}{r}"] = f'=IF($B{r}="","",INDEX({EMP(c_src)},MATCH($B{r},{EMP("B")},0)))'
    for c, fmt in zip("FGHIJ", ("#,##0", "#,##0", "#,##0", "#,##0", "0.0")):
        d[f"{c}{r}"].number_format = fmt
    for c in "BCDEFGHIJ":
        d[f"{c}{r}"].border = BORDER
d["B115"] = "Not a performance score: the list shows recorded exception counts only. Employees with no exceptions do not appear."; d["B115"].font = font(8, italic=True, color=GREY)

# ---- Right-hand side: weekday, hours bands, punch hours, data quality ---------------------------
X = "L"  # start column for side tables
def hdr(row, labels, start_col="L"):
    for i, h in enumerate(labels):
        c = d.cell(row=row, column=ord(start_col) - 64 + i, value=h); c.font = font(9, True, WHITE); c.fill = fill(CHAR); c.alignment = Alignment(wrap_text=True, vertical="center")

d["L7"] = "Weekday pattern (selected month)"; d["L7"].font = font(12, True)
hdr(8, ["Day", "Employee Days", "Present %", "Avg Hours", "Avg Punch In", "Avg Punch Out", "Missing Punch %"])
for i, day in enumerate(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]):
    r = 9 + i; wd = i + 1
    d[f"L{r}"] = day
    d[f"M{r}"] = f'=COUNTIFS({C("C")},{M},{C("T")},{wd},{C("L")},1)'
    d[f"N{r}"] = f'=IFERROR(COUNTIFS({C("C")},{M},{C("T")},{wd},{C("L")},1,{C("F")},"Present")/M{r},"")'
    d[f"O{r}"] = f'=IFERROR(SUMIFS({C("G")},{C("C")},{M},{C("T")},{wd},{C("O")},1)/COUNTIFS({C("C")},{M},{C("T")},{wd},{C("L")},1,{C("G")},">0"),"")'
    d[f"P{r}"] = f'=IFERROR(AVERAGEIFS({C("P")},{C("C")},{M},{C("T")},{wd},{C("O")},1),"")'
    d[f"Q{r}"] = f'=IFERROR(AVERAGEIFS({C("Q")},{C("C")},{M},{C("T")},{wd},{C("O")},1),"")'
    d[f"R{r}"] = f'=IFERROR(COUNTIFS({C("C")},{M},{C("T")},{wd},{C("L")},1,{C("J")},1)/COUNTIFS({C("C")},{M},{C("T")},{wd},{C("L")},1,{C("F")},"Present"),"")'
    for c, fmt in zip("MNOPQR", ("#,##0", "0.0%", "0.0", "hh:mm", "hh:mm", "0.0%")):
        d[f"{c}{r}"].number_format = fmt; d[f"{c}{r}"].border = BORDER
    d[f"L{r}"].border = BORDER

d["L17"] = "Worked hours distribution (selected month)"; d["L17"].font = font(12, True)
hdr(18, ["Hours band", "Employee Days", "Share"])
bands = ["0 No hours", "1 < 4 hrs", "2 4-6 hrs", "3 6-8 hrs", "4 8-10 hrs", "5 10-12 hrs", "6 12+ hrs"]
for i, b in enumerate(bands):
    r = 19 + i
    d[f"L{r}"] = b[2:]; d[f"S{r}"] = b  # hidden key
    d[f"M{r}"] = f'=COUNTIFS({C("C")},{M},{C("L")},1,{C("AF")},S{r})'; d[f"M{r}"].number_format = "#,##0"
    d[f"N{r}"] = f'=IFERROR(M{r}/SUM($M$19:$M$25),"")'; d[f"N{r}"].number_format = "0.0%"
    d[f"S{r}"].font = font(8, color=WHITE)
    for c in "LMN":
        d[f"{c}{r}"].border = BORDER
d["L26"] = "Descriptive bands only - they do not imply policy compliance."; d["L26"].font = font(8, italic=True, color=GREY)

d["L28"] = "Punch time by hour of day (selected month, records)"; d["L28"].font = font(12, True)
hdr(29, ["Hour", "Punch In", "Punch Out"])
for h in range(24):
    r = 30 + h
    d[f"L{r}"] = f"{h:02d}:00"
    d[f"M{r}"] = f'=COUNTIFS({C("C")},{M},{C("R")},{h},{C("O")},1)'
    d[f"N{r}"] = f'=COUNTIFS({C("C")},{M},{C("S")},{h},{C("O")},1)'
    for c in "LMN":
        d[f"{c}{r}"].border = BORDER
    d[f"M{r}"].number_format = "#,##0"; d[f"N{r}"].number_format = "#,##0"

d["L55"] = "Data quality (selected month, records)"; d["L55"].font = font(12, True)
hdr(56, ["Check", "Records"])
dq = [
    ("Records loaded", f'=COUNTIFS({C("C")},{M})'),
    ("Exact duplicate records", f'=COUNTIFS({C("C")},{M},{C("O")},0)'),
    ("Employee-days with several records", f'=COUNTIFS({C("C")},{M},{C("L")},0)-COUNTIFS({C("C")},{M},{C("O")},0)'),
    ("Missing employee name", f'=COUNTIFS({C("C")},{M},\'Raw Data\'!$C$2:$C$30001,"")'),
    ("Blank status", f'=COUNTIFS({C("C")},{M},{C("F")},"Unknown")'),
    ("Unrecognised status (Other)", f'=COUNTIFS({C("C")},{M},{C("F")},"Other")'),
    ("Blank Business Unit", f'=COUNTIFS({C("C")},{M},{C("U")},"(Blank)")'),
    ("Blank Client", f'=COUNTIFS({C("C")},{M},{C("V")},"(Blank)")'),
    ("Blank Shift", f'=COUNTIFS({C("C")},{M},{C("W")},"(Blank)")'),
    ("Total Hours blank on Present record", f'=COUNTIFS({C("C")},{M},{C("F")},"Present",\'Raw Data\'!$N$2:$N$30001,"")'),
    ("Total Hours not readable", f'=COUNTIFS({C("C")},{M},{C("G")},"",\'Raw Data\'!$N$2:$N$30001,"<>")'),
    ("Punch In not readable", f'=COUNTIFS({C("C")},{M},{C("P")},"",\'Raw Data\'!$L$2:$L$30001,"<>")'),
    ("Punch Out not readable", f'=COUNTIFS({C("C")},{M},{C("Q")},"",\'Raw Data\'!$M$2:$M$30001,"<>")'),
    ("Missing Punch In (punch expected)", f'=COUNTIFS({C("C")},{M},{C("O")},1,{C("H")},0,{C("J")},1)'),
    ("Missing Punch Out (punch expected)", f'=COUNTIFS({C("C")},{M},{C("O")},1,{C("I")},0,{C("J")},1)'),
    ("Rows with no code or unreadable date (all months)", f'=COUNTIF({C("AG")},1)-COUNTIFS({C("AG")},1,{C("C")},"?*")'),
    ("Records with any data-quality issue", f'=COUNTIFS({C("C")},{M},{C("AG")},1)'),
]
for i, (label, fx) in enumerate(dq):
    r = 57 + i
    d[f"L{r}"] = label; d[f"M{r}"] = fx; d[f"M{r}"].number_format = "#,##0"
    d[f"L{r}"].border = BORDER; d[f"M{r}"].border = BORDER
d.column_dimensions["L"].width = 40
for c in "MNOPQR":
    d.column_dimensions[c].width = 13

# ---- Charts -----------------------------------------------------------------------------------
def style(ch, title, w=18, h=7.5):
    ch.title = title; ch.width = w; ch.height = h; ch.legend.position = "b"
    ch.y_axis.majorGridlines = None

c1 = BarChart(); c1.type = "col"; style(c1, "Employee Days by Month")
c1.add_data(Reference(d, min_col=4, min_row=29, max_row=53), titles_from_data=True)
c1.set_categories(Reference(d, min_col=2, min_row=30, max_row=53)); c1.legend = None
c1.series[0].graphicalProperties.solidFill = "3A3A3A"
d.add_chart(c1, "U7")

c2 = LineChart(); style(c2, "Present % and Exception % by Month")
c2.add_data(Reference(d, min_col=5, min_row=29, max_row=53), titles_from_data=True)
c2.add_data(Reference(d, min_col=9, min_row=29, max_row=53), titles_from_data=True)
c2.set_categories(Reference(d, min_col=2, min_row=30, max_row=53))
c2.series[0].graphicalProperties.line.solidFill = "3A3A3A"; c2.series[1].graphicalProperties.line.solidFill = RED
c2.y_axis.numFmt = "0%"
d.add_chart(c2, "U23")

c3 = BarChart(); c3.type = "bar"; style(c3, "Status mix (selected month)")
c3.add_data(Reference(d, min_col=3, min_row=18, max_row=25), titles_from_data=True)
c3.set_categories(Reference(d, min_col=2, min_row=19, max_row=25)); c3.legend = None
c3.series[0].graphicalProperties.solidFill = "3A3A3A"
d.add_chart(c3, "U39")

c4 = BarChart(); c4.type = "col"; style(c4, "Punch In / Punch Out by hour of day")
c4.add_data(Reference(d, min_col=13, min_row=29, max_row=53), titles_from_data=True)
c4.add_data(Reference(d, min_col=14, min_row=29, max_row=53), titles_from_data=True)
c4.set_categories(Reference(d, min_col=12, min_row=30, max_row=53))
c4.series[0].graphicalProperties.solidFill = "3A3A3A"; c4.series[1].graphicalProperties.solidFill = NEUT
d.add_chart(c4, "U55")

c5 = BarChart(); c5.type = "col"; style(c5, "Worked hours distribution")
c5.add_data(Reference(d, min_col=13, min_row=18, max_row=25), titles_from_data=True)
c5.set_categories(Reference(d, min_col=12, min_row=19, max_row=25)); c5.legend = None
c5.series[0].graphicalProperties.solidFill = RED
d.add_chart(c5, "U71")

# ---- How to use --------------------------------------------------------------------------------
d["B118"] = "How to use"; d["B118"].font = font(12, True)
steps = ["1. Open the Raw Data sheet and paste your attendance export below the red header row (same column order as the header: Employee Code ... Status2).",
         "2. Every month, paste the new rows under the existing ones - the dashboard picks up the new month automatically and defaults to it.",
         "3. Change the selected month in the yellow cell C4 to look at any earlier month.",
         "4. Unrecognised status values show as 'Other' in the status table - map them on the Settings sheet (Status overrides).",
         "5. Capacity: formulas are pre-filled for 20,000 rows on the Calc sheet. For more rows, fill the last Calc row down (select row, drag the fill handle).",
         "6. Employee-days are counted once even if a day is repeated (exact duplicate rows are ignored); statuses are taken from the first row of each employee-day.",
         "Definitions: Present % = Present employee-days / recorded employee-days (no roster available, so not a true attendance rate). Missing Punch % = Present days with a missing punch / Present days. Hours: '09:09' = 9.15 hours."]
for i, s in enumerate(steps):
    d[f"B{119 + i}"] = s; d[f"B{119 + i}"].font = font(9, color=GREY)
d.freeze_panes = "A7"

wb.active = 0
ws_calc.sheet_properties.tabColor = "BFBFBF"; ws_emp.sheet_properties.tabColor = "BFBFBF"; ws_set.sheet_properties.tabColor = GOLD; ws_raw.sheet_properties.tabColor = RED
wb.save(OUT)
print("written", OUT)
