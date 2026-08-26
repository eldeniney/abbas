"""
Build a SUB Request tracker template (.xlsx).

Only the first four columns are constrained by Excel data validation
(SUB Req Number, MRC, Party ID, Closed Date). The remaining columns are
deliberately free text, because their values are not standardised.

Usage:  python scripts/build_sub_request_template.py [output.xlsx]
"""

import sys
from datetime import date

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Protection, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

# ---------------------------------------------------------------- settings --
OUTPUT = sys.argv[1] if len(sys.argv) > 1 else "SUB_Request_Tracker_Template.xlsx"

SHEET_DATA = "SUB Requests"
SHEET_RULES = "Rules"

FIRST_ROW = 2          # first data-entry row (also the sample row)
LAST_ROW = 1001        # last data-entry row covered by validation
PROTECT_PASSWORD = "Sub2026"

# Closed Date must fall inside July 2026.
DATE_MIN = date(2026, 7, 1)
DATE_MAX = date(2026, 7, 31)
EXCEL_EPOCH = date(1899, 12, 30)


def serial(d: date) -> int:
    """Excel 1900-system date serial number."""
    return (d - EXCEL_EPOCH).days


# ------------------------------------------------------------------ styles --
FONT = "Arial"
NAVY = "1F3864"
TEAL = "2F6F6F"
GREY_BG = "F2F2F2"
RED_BG = "FFC7CE"

hdr_font = Font(name=FONT, size=10, bold=True, color="FFFFFF")
hdr_fill_locked = PatternFill("solid", fgColor=NAVY)     # validated columns
hdr_fill_free = PatternFill("solid", fgColor=TEAL)       # free-text columns
hdr_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

body_font = Font(name=FONT, size=10)
sample_font = Font(name=FONT, size=10, italic=True, color="808080")
title_font = Font(name=FONT, size=14, bold=True, color=NAVY)
bold_font = Font(name=FONT, size=10, bold=True)

thin = Side(style="thin", color="BFBFBF")
box = Border(left=thin, right=thin, top=thin, bottom=thin)

# ----------------------------------------------------------- column layout --
# key, header, width, number_format, sample value, validated?
COLUMNS = [
    ("sub_req",   "SUB Req Number",  16, "0",           1000123,                True),
    ("mrc",       "MRC",             12, "#,##0.00",    249.50,                 True),
    ("party_id",  "Party ID",        14, "0",           8801234,                True),
    ("closed",    "Closed Date",     14, "dd-mmm-yyyy", date(2026, 7, 15),      True),
    ("kam_pt",    "KAM PT",          12, "@",           "PT-01",                False),
    ("kam_name",  "KAM Name",        22, "@",           "Sample KAM Name",      False),
    ("tl_name",   "TL Name",         22, "@",           "Sample TL Name",       False),
    ("dir_name",  "Director Name",   22, "@",           "Sample Director Name", False),
    ("product",   "Product",         20, "@",           "Fiber Broadband",      False),
    ("rataplan",  "Rataplan Group",  20, "@",           "Group A",              False),
    ("remark",    "Remark",          40, "@",           "Sample remark - free text, optional", False),
]
COL_IX = {key: i + 1 for i, (key, *_rest) in enumerate(COLUMNS)}
LAST_COL_LETTER = get_column_letter(len(COLUMNS))
LAST_VALIDATED_LETTER = get_column_letter(sum(1 for c in COLUMNS if c[5]))


def col(key: str) -> str:
    return get_column_letter(COL_IX[key])


def rng(key: str) -> str:
    c = col(key)
    return f"{c}{FIRST_ROW}:{c}{LAST_ROW}"


wb = Workbook()

# ======================================================== Data-entry tab ====
ws = wb.active
ws.title = SHEET_DATA

for i, (key, header, width, numfmt, sample, validated) in enumerate(COLUMNS, start=1):
    letter = get_column_letter(i)
    c = ws.cell(row=1, column=i, value=header)
    c.font = hdr_font
    c.fill = hdr_fill_locked if validated else hdr_fill_free
    c.alignment = hdr_align
    c.border = box
    ws.column_dimensions[letter].width = width

    align = Alignment(vertical="center",
                      horizontal="left" if numfmt == "@" else "right",
                      wrap_text=(key == "remark"))

    # sample row
    s = ws.cell(row=FIRST_ROW, column=i, value=sample)
    s.font = sample_font
    s.number_format = numfmt
    s.border = box
    s.alignment = align

    # empty rows ready for input
    for r in range(FIRST_ROW + 1, LAST_ROW + 1):
        e = ws.cell(row=r, column=i)
        e.font = body_font
        e.number_format = numfmt
        e.border = box
        e.alignment = align

ws.row_dimensions[1].height = 30
ws.freeze_panes = "A2"
ws.auto_filter.ref = f"A1:{LAST_COL_LETTER}{LAST_ROW}"

# ------------------------------------- validations (first four columns only) --
def add_dv(key, **kw):
    dv = DataValidation(allow_blank=True, showErrorMessage=True,
                        showInputMessage=True, errorStyle="stop", **kw)
    ws.add_data_validation(dv)
    dv.add(rng(key))
    return dv


sr = col("sub_req")
dv = add_dv(
    "sub_req",
    type="custom",
    # whole number, positive, and not already used elsewhere in the column
    formula1=(f"AND(ISNUMBER({sr}{FIRST_ROW}),{sr}{FIRST_ROW}=INT({sr}{FIRST_ROW}),"
              f"{sr}{FIRST_ROW}>0,"
              f"COUNTIF(${sr}${FIRST_ROW}:${sr}${LAST_ROW},{sr}{FIRST_ROW})=1)"),
)
dv.promptTitle = "SUB Req Number"
dv.prompt = "Whole number only. No text, no decimals, no duplicates."
dv.errorTitle = "Invalid SUB Req Number"
dv.error = ("This must be a positive whole number and must not already exist "
            "in this column. Text, decimals and duplicates are not allowed.")

dv = add_dv("mrc", type="decimal", operator="between",
            formula1="0", formula2="1000000")
dv.promptTitle = "MRC"
dv.prompt = "Numeric amount between 0 and 1,000,000. No text."
dv.errorTitle = "Invalid MRC"
dv.error = "MRC must be a number between 0 and 1,000,000. Text is not allowed."

dv = add_dv("party_id", type="whole", operator="between",
            formula1="1", formula2="999999999999")
dv.promptTitle = "Party ID"
dv.prompt = "Whole number only. No text, no spaces, no dashes."
dv.errorTitle = "Invalid Party ID"
dv.error = "Party ID must be a whole number. Text and symbols are not allowed."

dv = add_dv("closed", type="date", operator="between",
            formula1=str(serial(DATE_MIN)), formula2=str(serial(DATE_MAX)))
dv.promptTitle = "Closed Date"
dv.prompt = f"Date between {DATE_MIN:%d-%b-%Y} and {DATE_MAX:%d-%b-%Y} only."
dv.errorTitle = "Date outside July 2026"
dv.error = (f"Closed Date must be a real date between {DATE_MIN:%d-%b-%Y} and "
            f"{DATE_MAX:%d-%b-%Y}. Anything outside July 2026 is rejected.")

# Columns E-K (KAM PT ... Remark) are intentionally left with no validation:
# their values are not standardised, so anything may be typed there.

# ------------------------------------------------- conditional formatting --
data_range = f"A{FIRST_ROW}:{LAST_COL_LETTER}{LAST_ROW}"
required_range = f"A{FIRST_ROW}:{LAST_VALIDATED_LETTER}{LAST_ROW}"

# a validated field left blank on a row that has been started
ws.conditional_formatting.add(
    required_range,
    FormulaRule(
        formula=[f'AND(COUNTA($A{FIRST_ROW}:${LAST_COL_LETTER}{FIRST_ROW})>0,'
                 f'A{FIRST_ROW}="")'],
        fill=PatternFill("solid", bgColor=RED_BG),
        stopIfTrue=False,
    ),
)
# banded look for readability
ws.conditional_formatting.add(
    data_range,
    FormulaRule(formula=["MOD(ROW(),2)=0"],
                fill=PatternFill("solid", bgColor=GREY_BG), stopIfTrue=False),
)

# ---------------------------------------------------------- sheet locking --
# Everything is locked by default; unlock only the data-entry grid.
unlocked = Protection(locked=False)
for r in range(FIRST_ROW, LAST_ROW + 1):
    for c_ix in range(1, len(COLUMNS) + 1):
        ws.cell(row=r, column=c_ix).protection = unlocked

ws.protection.set_password(PROTECT_PASSWORD)
ws.protection.sheet = True
ws.protection.selectLockedCells = False
ws.protection.selectUnlockedCells = False
ws.protection.formatCells = True
ws.protection.formatColumns = False
ws.protection.formatRows = False
ws.protection.insertRows = True
ws.protection.deleteRows = True
ws.protection.sort = False
ws.protection.autoFilter = False

# ================================================================ Rules tab =
ws_r = wb.create_sheet(SHEET_RULES)
ws_r.column_dimensions["A"].width = 22
ws_r.column_dimensions["B"].width = 18
ws_r.column_dimensions["C"].width = 78

ws_r["A1"] = "SUB Request Tracker - how to use this file"
ws_r["A1"].font = title_font
ws_r.merge_cells("A1:C1")

legend = [
    "",
    ("HOW TO FILL IT IN", "", ""),
    ("", "1.", f"Type only in the '{SHEET_DATA}' tab, rows {FIRST_ROW} to {LAST_ROW}. "
               "Everything else on that tab is locked."),
    ("", "2.", "Dark blue headers (the first four columns) are validated - Excel rejects "
               "anything that breaks the rule. Teal headers are free text with no restriction."),
    ("", "3.", f"Row {FIRST_ROW} is a sample row (grey italic). Overwrite it with your first "
               "real record, or delete its contents."),
    ("", "4.", "A validated cell turns red when the row has been started but that value is "
               "still missing."),
    ("", "5.", f"To unlock the sheet (Review > Unprotect Sheet) the password is: {PROTECT_PASSWORD}"),
    "",
    ("VALIDATION RULES", "", ""),
]
row = 3
for item in legend:
    if item == "":
        row += 1
        continue
    a, b, c = item
    ws_r.cell(row=row, column=1, value=a).font = bold_font
    ws_r.cell(row=row, column=2, value=b).font = body_font
    cc = ws_r.cell(row=row, column=3, value=c)
    cc.font = body_font
    cc.alignment = Alignment(wrap_text=True, vertical="top")
    row += 1

FREE = "No validation - type anything (values are not standardised)."
rules = [
    ("SUB Req Number", "Whole number", "Positive whole number only. Text, decimals and "
                                       "duplicate numbers are rejected."),
    ("MRC", "Number", "Any number from 0 to 1,000,000 (decimals allowed). Text is rejected."),
    ("Party ID", "Whole number", "Whole number only. Text, spaces and dashes are rejected."),
    ("Closed Date", "Date", f"Must be a real date between {DATE_MIN:%d-%b-%Y} and "
                            f"{DATE_MAX:%d-%b-%Y}. Any date outside July 2026 is rejected."),
    ("KAM PT", "Free text", FREE),
    ("KAM Name", "Free text", FREE),
    ("TL Name", "Free text", FREE),
    ("Director Name", "Free text", FREE),
    ("Product", "Free text", FREE),
    ("Rataplan Group", "Free text", FREE),
    ("Remark", "Free text", FREE),
]

hdr = ["Column", "Type", "Rule enforced by Excel"]
for i, h in enumerate(hdr, start=1):
    c = ws_r.cell(row=row, column=i, value=h)
    c.font = hdr_font
    c.fill = hdr_fill_locked
    c.alignment = hdr_align
    c.border = box
ws_r.row_dimensions[row].height = 22
row += 1

for a, b, c in rules:
    ws_r.cell(row=row, column=1, value=a).font = bold_font
    ws_r.cell(row=row, column=2, value=b).font = body_font
    cc = ws_r.cell(row=row, column=3, value=c)
    cc.font = body_font
    cc.alignment = Alignment(wrap_text=True, vertical="top")
    for i in range(1, 4):
        ws_r.cell(row=row, column=i).border = box
    row += 1

row += 1
ws_r.cell(row=row, column=1, value="NOTES").font = bold_font
row += 1
notes = [
    "Only the first four columns are validated, as requested. KAM PT, KAM Name, TL Name, "
    "Director Name, Product, Rataplan Group and Remark accept any input.",
    f"'Closed Date' is locked to July 2026. Change DATE_MIN / DATE_MAX in "
    f"scripts/build_sub_request_template.py to move the window.",
    "Header spelling follows the original request exactly, including 'Rataplan Group'.",
    f"Validation covers rows {FIRST_ROW}-{LAST_ROW}. Row insertion is blocked so no "
    "unvalidated rows can be added inside the grid.",
]
for a in notes:
    c = ws_r.cell(row=row, column=1, value="- " + a)
    c.font = body_font
    c.alignment = Alignment(wrap_text=True, vertical="top")
    ws_r.merge_cells(start_row=row, start_column=1, end_row=row, end_column=3)
    ws_r.row_dimensions[row].height = 28
    row += 1

ws_r.sheet_view.showGridLines = False

wb.save(OUTPUT)
print(f"wrote {OUTPUT}")
