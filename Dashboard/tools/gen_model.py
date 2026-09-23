#!/usr/bin/env python3
"""Generates the TMDL semantic model for the e& Attendance Management Dashboard.

Run:  python3 gen_model.py
Writes into ../PowerBI_Source/Attendance Dashboard.SemanticModel/definition
"""
import os, uuid, textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "PowerBI_Source", "Attendance Dashboard.SemanticModel"))
DEF = os.path.join(ROOT, "definition")
TABLES = os.path.join(DEF, "tables")
os.makedirs(TABLES, exist_ok=True)

def tag(seed):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "eand-attendance/" + seed))

def q(name):
    """Quote a TMDL identifier when needed."""
    if all(c.isalnum() or c == "_" for c in name):
        return name
    return "'" + name.replace("'", "''") + "'"

def indent(text, n):
    pad = "\t" * n
    return "\n".join(pad + l if l.strip() else "" for l in text.split("\n"))

# ----------------------------------------------------------------------------
# Column helper
# ----------------------------------------------------------------------------
def col(name, dtype, fmt=None, hidden=False, sort_by=None, summarize="none", key=False,
        calc_source=None, description=None, data_category=None, display_folder=None):
    lines = []
    if description:
        for d in description.split("\n"):
            lines.append(f"/// {d}")
    lines.append(f"column {q(name)}")
    body = []
    body.append(f"dataType: {dtype}")
    if key:
        body.append("isKey")
    if hidden:
        body.append("isHidden")
    if fmt:
        body.append(f"formatString: {fmt}")
    body.append(f"lineageTag: {tag('col/' + name + '/' + (calc_source or ''))}")
    if data_category:
        body.append(f"dataCategory: {data_category}")
    if display_folder:
        body.append(f"displayFolder: {display_folder}")
    body.append(f"summarizeBy: {summarize}")
    if calc_source is not None:
        body.append("isNameInferred")
        body.append("isDataTypeInferred")
        body.append(f"sourceColumn: [{calc_source}]")
    else:
        body.append(f"sourceColumn: {name}")
    if sort_by:
        body.append(f"sortByColumn: {q(sort_by)}")
    body.append("")
    body.append("annotation SummarizationSetBy = User")
    lines.append(indent("\n".join(body), 1))
    return "\n".join(lines) + "\n"

def measure(name, dax, fmt=None, folder=None, description=None, hidden=False):
    lines = []
    if description:
        for d in description.split("\n"):
            lines.append(f"/// {d}")
    dax = textwrap.dedent(dax).strip("\n")
    if "\n" in dax:
        lines.append(f"measure {q(name)} =")
        lines.append(indent(dax, 3))
    else:
        lines.append(f"measure {q(name)} = {dax}")
    body = []
    if fmt:
        body.append(f"formatString: {fmt}")
    if hidden:
        body.append("isHidden")
    if folder:
        body.append(f"displayFolder: {folder}")
    body.append(f"lineageTag: {tag('measure/' + name)}")
    lines.append(indent("\n".join(body), 1))
    return "\n".join(lines) + "\n"

def table(name, columns, partition, hidden=False, description=None, measures="", extra="", data_category=None):
    out = []
    if description:
        for d in description.split("\n"):
            out.append(f"/// {d}")
    out.append(f"table {q(name)}")
    props = []
    if hidden:
        props.append("isHidden")
    props.append(f"lineageTag: {tag('table/' + name)}")
    if data_category:
        props.append(f"dataCategory: {data_category}")
    out.append(indent("\n".join(props), 1))
    out.append("")
    if measures:
        out.append(indent(measures, 1))
    for c in columns:
        out.append(indent(c, 1))
    out.append(indent(partition, 1))
    if extra:
        out.append(indent(extra, 1))
    return "\n".join(out) + "\n"

def m_partition(name, m_code):
    m_code = m_code.rstrip("\n")
    return (f"partition {q(name)} = m\n\tmode: import\n\tsource =\n" + indent(m_code, 3) + "\n")

def dax_partition(name, dax):
    dax = textwrap.dedent(dax).strip("\n")
    return (f"partition {q(name)} = calculated\n\tmode: import\n\tsource =\n" + indent(dax, 3) + "\n")

def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

# ----------------------------------------------------------------------------
# FactAttendance
# ----------------------------------------------------------------------------
fact_m = open(os.path.join(HERE, "fact_attendance.m"), encoding="utf-8").read()

F = "FactAttendance"
fact_cols = [
    # identity (visible; the dimension versions are the ones used in slicers)
    col("Employee Code", "string", hidden=True),
    col("Agency Emp ID", "string", display_folder="Employee"),
    col("Employee Name", "string", display_folder="Employee", description="Employee name exactly as recorded on this attendance record."),
    col("Employee Name (Latest)", "string", hidden=True),
    col("Agency Emp ID (Latest)", "string", hidden=True),
    # organisation as recorded on the day (historical - never overwritten)
    col("Source Name", "string", hidden=True),
    col("Business Unit", "string", hidden=True),
    col("Client Name", "string", hidden=True),
    col("Cost Center", "string", hidden=True),
    col("Pay Calendar", "string", hidden=True),
    col("Shift Name", "string", hidden=True),
    # date & punches
    col("Process Date", "dateTime", fmt="dd-mmm-yyyy", display_folder="Attendance Day"),
    col("Process Month Start", "dateTime", fmt="mmm yyyy", hidden=True),
    col("Day", "string", display_folder="Attendance Day", description="Day name as written in the source file."),
    col("Punch In Time", "dateTime", fmt="dd-mmm-yyyy hh:nn AM/PM", display_folder="Punches"),
    col("Punch Out Time", "dateTime", fmt="dd-mmm-yyyy hh:nn AM/PM", display_folder="Punches"),
    col("Punch In Terminal", "string", display_folder="Punches"),
    col("Punch Out Terminal", "string", display_folder="Punches", description="Source header 'Punch Out Temrinal' is mapped to this column automatically."),
    col("Punch In Hour", "int64", fmt="0", hidden=True),
    col("Punch Out Hour", "int64", fmt="0", hidden=True),
    col("Punch In Hour Label", "string", display_folder="Punches", sort_by="Punch In Hour"),
    col("Punch Out Hour Label", "string", display_folder="Punches", sort_by="Punch Out Hour"),
    col("Punch In Minutes From Midnight", "double", fmt="0", hidden=True),
    col("Punch Out Minutes From Midnight", "double", fmt="0", hidden=True),
    # status
    col("Status", "string", display_folder="Status", description="Status text of this record (cleaned, spelling preserved)."),
    col("Record Status Category", "string", hidden=True),
    col("Attendance Status", "string", hidden=True, description="Status resolved at employee-day level (when a day has several records, the record with the highest attendance priority wins)."),
    col("Status Category", "string", hidden=True),
    col("Status Category Order", "int64", fmt="0", hidden=True),
    col("Status2", "string", display_folder="Status"),
    col("Status2 Category", "string", display_folder="Status", description="Status2 value, with '(None)' when blank."),
    col("Is Justified", "string", display_folder="Status"),
    col("Justification Category", "string", display_folder="Status", description="Justified / Not Justified / Pending / Not Recorded (blank is NOT assumed to mean unjustified)."),
    # hours
    col("Total Hours (Source)", "string", display_folder="Hours", description="Total Hours exactly as written in the source (e.g. 09:09 = 9 hours 9 minutes)."),
    col("Source Worked Hours", "double", fmt="0.00", display_folder="Hours", description="Total Hours converted to decimal hours (09:09 -> 9.15)."),
    col("Calculated Worked Hours", "double", fmt="0.00", display_folder="Hours", description="Punch Out minus Punch In in decimal hours. Only used when the source Total Hours is blank or invalid."),
    col("Record Worked Hours", "double", fmt="0.00", hidden=True),
    col("Worked Hours Decimal", "double", fmt="0.00", display_folder="Hours", description="Hours that drive the dashboard: source Total Hours when valid, otherwise calculated from punches. Null on exact duplicate records so hours are never double counted."),
    col("Worked Hours Basis", "string", display_folder="Hours"),
    col("Day Worked Hours", "double", fmt="0.00", display_folder="Hours", description="Total hours of the employee-day (sum of its non-duplicate records)."),
    col("Worked Hours Band", "string", display_folder="Hours", sort_by="Worked Hours Band Order"),
    col("Worked Hours Band Order", "int64", fmt="0", hidden=True),
    # keys & flags
    col("Employee Day Key", "string", hidden=True),
    col("Is Duplicate Record", "int64", fmt="0", hidden=True),
    col("Day Record Count", "int64", fmt="0", hidden=True),
    col("Is Day Primary", "int64", fmt="0", hidden=True),
    col("Multiple Records Day Flag", "int64", fmt="0", hidden=True),
    col("Punch Expected Flag", "int64", fmt="0", hidden=True),
    col("Missing Punch In Flag", "int64", fmt="0", hidden=True),
    col("Missing Punch Out Flag", "int64", fmt="0", hidden=True),
    col("Missing Both Punches Flag", "int64", fmt="0", hidden=True),
    col("Missing Punch Flag", "int64", fmt="0", hidden=True),
    col("Complete Punch Flag", "int64", fmt="0", hidden=True),
    col("Punch Out Before In Flag", "int64", fmt="0", hidden=True),
    col("Punch Crosses Midnight Flag", "int64", fmt="0", hidden=True),
    col("Status2 Flag", "int64", fmt="0", hidden=True),
    col("Day Missing Punch Flag", "int64", fmt="0", hidden=True),
    col("Day Punch Expected Flag", "int64", fmt="0", hidden=True),
    col("Day Status2 Flag", "int64", fmt="0", hidden=True),
    col("Exception Absent Flag", "int64", fmt="0", hidden=True),
    col("Exception Missing Punch Flag", "int64", fmt="0", hidden=True),
    col("Exception Unrecognised Status Flag", "int64", fmt="0", hidden=True),
    col("Exception Short Hours Flag", "int64", fmt="0", hidden=True),
    col("Exception Long Hours Flag", "int64", fmt="0", hidden=True),
    col("Exception Status2 Flag", "int64", fmt="0", hidden=True),
    col("Exception Types", "string", display_folder="Exceptions", description="All exception types recorded for this employee-day, separated by ';'."),
    col("Exception Type Count", "int64", fmt="0", hidden=True),
    col("Exception Flag", "int64", fmt="0", hidden=True),
    col("DQ Missing Employee Code", "int64", fmt="0", hidden=True),
    col("DQ Missing Employee Name", "int64", fmt="0", hidden=True),
    col("DQ Missing Process Date", "int64", fmt="0", hidden=True),
    col("DQ Missing Total Hours", "int64", fmt="0", hidden=True),
    col("DQ Invalid Total Hours", "int64", fmt="0", hidden=True),
    col("DQ Invalid Punch In", "int64", fmt="0", hidden=True),
    col("DQ Invalid Punch Out", "int64", fmt="0", hidden=True),
    col("DQ Punch Out Before In", "int64", fmt="0", hidden=True),
    col("DQ Duplicate Record", "int64", fmt="0", hidden=True),
    col("DQ Blank Status", "int64", fmt="0", hidden=True),
    col("DQ Unrecognised Status", "int64", fmt="0", hidden=True),
    col("DQ Blank Business Unit", "int64", fmt="0", hidden=True),
    col("DQ Blank Client", "int64", fmt="0", hidden=True),
    col("DQ Blank Shift", "int64", fmt="0", hidden=True),
    col("DQ Hours Differ From Punches", "int64", fmt="0", hidden=True),
    col("DQ Issue Types", "string", display_folder="Data Quality"),
    col("DQ Issue Count", "int64", fmt="0", hidden=True),
    col("DQ Issue Flag", "int64", fmt="0", hidden=True),
    col("Punch In (Unparsed)", "string", display_folder="Data Quality", description="Original Punch In text when it could not be converted to a date/time."),
    col("Punch Out (Unparsed)", "string", display_folder="Data Quality"),
    col("Process Date (Unparsed)", "string", display_folder="Data Quality"),
    # lineage
    col("Source File", "string", display_folder="Source"),
    col("Source Folder", "string", display_folder="Source"),
    col("Source Sheet", "string", display_folder="Source"),
    col("Source Row Number", "int64", fmt="0", display_folder="Source", description="Row number inside the source sheet (1 = first row of the sheet)."),
    col("Source Modified Date", "dateTime", fmt="dd-mmm-yyyy hh:nn", display_folder="Source"),
]

write(os.path.join(TABLES, "FactAttendance.tmdl"), table(
    F, fact_cols, m_partition("FactAttendance", fact_m),
    description="One row per attendance record from the monthly files. Employee-day level fields (status, hours, exceptions) are repeated on every record of the same employee-day so that distinct counts of Employee Day Key are always correct."))

# ----------------------------------------------------------------------------
# DimDate (calculated)
# ----------------------------------------------------------------------------
dimdate_dax = """
VAR _minRaw = MIN ( FactAttendance[Process Date] )
VAR _maxRaw = MAX ( FactAttendance[Process Date] )
VAR _min = IF ( ISBLANK ( _minRaw ), TODAY (), _minRaw )
VAR _max = IF ( ISBLANK ( _maxRaw ), TODAY (), _maxRaw )
VAR _start = DATE ( YEAR ( _min ), MONTH ( _min ), 1 )
VAR _end = EOMONTH ( _max, 0 )
VAR _latestMonthStart = DATE ( YEAR ( _max ), MONTH ( _max ), 1 )
RETURN
    ADDCOLUMNS (
        CALENDAR ( _start, _end ),
        "Year", YEAR ( [Date] ),
        "Quarter", "Q" & QUARTER ( [Date] ),
        "Year Quarter", YEAR ( [Date] ) & " Q" & QUARTER ( [Date] ),
        "Month Number", MONTH ( [Date] ),
        "Month Name", FORMAT ( [Date], "mmm" ),
        "Month Name Long", FORMAT ( [Date], "mmmm" ),
        "Year Month", FORMAT ( [Date], "mmm yyyy" ),
        "Year Month Sort", YEAR ( [Date] ) * 100 + MONTH ( [Date] ),
        "Month Start", DATE ( YEAR ( [Date] ), MONTH ( [Date] ), 1 ),
        "Week Start", [Date] - WEEKDAY ( [Date], 2 ) + 1,
        "Week Number", WEEKNUM ( [Date], 21 ),
        "Day", DAY ( [Date] ),
        "Day Name", FORMAT ( [Date], "dddd" ),
        "Day Name Short", FORMAT ( [Date], "ddd" ),
        "Day Of Week Number", WEEKDAY ( [Date], 2 ),
        "Is Weekend (Sat-Sun)", IF ( WEEKDAY ( [Date], 2 ) >= 6, "Weekend", "Weekday" ),
        "Reporting Month",
            IF (
                DATE ( YEAR ( [Date] ), MONTH ( [Date] ), 1 ) = _latestMonthStart,
                "Latest Month",
                FORMAT ( [Date], "mmm yyyy" )
            ),
        "Month Offset",
            ( YEAR ( [Date] ) - YEAR ( _latestMonthStart ) ) * 12 + MONTH ( [Date] ) - MONTH ( _latestMonthStart ),
        "Is Latest Month", IF ( DATE ( YEAR ( [Date] ), MONTH ( [Date] ), 1 ) = _latestMonthStart, 1, 0 )
    )
"""
dimdate_cols = [
    col("Date", "dateTime", fmt="dd-mmm-yyyy", key=True, calc_source="Date"),
    col("Year", "int64", fmt="0", calc_source="Year"),
    col("Quarter", "string", calc_source="Quarter"),
    col("Year Quarter", "string", calc_source="Year Quarter"),
    col("Month Number", "int64", fmt="0", calc_source="Month Number", hidden=True),
    col("Month Name", "string", calc_source="Month Name", sort_by="Month Number"),
    col("Month Name Long", "string", calc_source="Month Name Long", sort_by="Month Number"),
    col("Year Month", "string", calc_source="Year Month", sort_by="Year Month Sort"),
    col("Year Month Sort", "int64", fmt="0", calc_source="Year Month Sort", hidden=True),
    col("Month Start", "dateTime", fmt="mmm yyyy", calc_source="Month Start"),
    col("Week Start", "dateTime", fmt="dd-mmm-yyyy", calc_source="Week Start"),
    col("Week Number", "int64", fmt="0", calc_source="Week Number"),
    col("Day", "int64", fmt="0", calc_source="Day"),
    col("Day Name", "string", calc_source="Day Name", sort_by="Day Of Week Number"),
    col("Day Name Short", "string", calc_source="Day Name Short", sort_by="Day Of Week Number"),
    col("Day Of Week Number", "int64", fmt="0", calc_source="Day Of Week Number", hidden=True),
    col("Is Weekend (Sat-Sun)", "string", calc_source="Is Weekend (Sat-Sun)", description="Calendar weekend (Saturday/Sunday, UAE). Individual rosters may differ - use the Status field for actual rest days."),
    col("Reporting Month", "string", calc_source="Reporting Month", sort_by="Year Month Sort",
        description="Same as Year Month, except that the most recent month in the data is labelled 'Latest Month'. Selecting 'Latest Month' in a slicer keeps following the newest month after every refresh."),
    col("Month Offset", "int64", fmt="0", calc_source="Month Offset", hidden=True, description="0 = latest month in the data, -1 = previous month, ..."),
    col("Is Latest Month", "int64", fmt="0", calc_source="Is Latest Month", hidden=True),
]
write(os.path.join(TABLES, "DimDate.tmdl"), table(
    "DimDate", dimdate_cols, dax_partition("DimDate", dimdate_dax), data_category="Time",
    description="Official date table. Covers whole months from the first to the last Process Date in the data.",
    extra=""))

# ----------------------------------------------------------------------------
# Simple dimensions (calculated from the fact - the fact keeps history)
# ----------------------------------------------------------------------------
def simple_dim(tname, cname, desc):
    cols = [col(cname, "string", key=True, calc_source=cname)]
    part = dax_partition(tname, f"DISTINCT ( FactAttendance[{cname}] )")
    write(os.path.join(TABLES, f"{tname}.tmdl"), table(tname, cols, part, description=desc))

simple_dim("DimBusinessUnit", "Business Unit", "Business Units as recorded on attendance records ('(Blank)' when the source is empty).")
simple_dim("DimClient", "Client Name", "Clients as recorded on attendance records.")
simple_dim("DimCostCenter", "Cost Center", "Cost Centers as recorded on attendance records.")
simple_dim("DimShift", "Shift Name", "Shifts as recorded on attendance records.")
simple_dim("DimSource", "Source Name", "Source (e.g. OUTSOURCE) as recorded on attendance records.")
simple_dim("DimPayCalendar", "Pay Calendar", "Pay Calendar as recorded on attendance records.")

# DimEmployee
dimemp_dax = """
ADDCOLUMNS (
    DISTINCT ( FactAttendance[Employee Code] ),
    "Employee Name",
        LOOKUPVALUE ( FactAttendance[Employee Name (Latest)], FactAttendance[Employee Code], [Employee Code] ),
    "Agency Emp ID",
        LOOKUPVALUE ( FactAttendance[Agency Emp ID (Latest)], FactAttendance[Employee Code], [Employee Code] )
)
"""
dimemp_cols = [
    col("Employee Code", "string", key=True, calc_source="Employee Code"),
    col("Employee Name", "string", calc_source="Employee Name", description="Name from the employee's most recent attendance record."),
    col("Agency Emp ID", "string", calc_source="Agency Emp ID"),
]
write(os.path.join(TABLES, "DimEmployee.tmdl"), table(
    "DimEmployee", dimemp_cols, dax_partition("DimEmployee", dimemp_dax),
    description="One row per Employee Code with the latest recorded name and agency ID. Business Unit, Client, Cost Center and Shift are deliberately NOT stored here because they can change over time - they stay on each attendance record."))

# DimStatus
dimstatus_dax = """
ADDCOLUMNS (
    DISTINCT ( FactAttendance[Attendance Status] ),
    "Status Category",
        LOOKUPVALUE ( FactAttendance[Status Category], FactAttendance[Attendance Status], [Attendance Status] ),
    "Status Category Order",
        LOOKUPVALUE ( FactAttendance[Status Category Order], FactAttendance[Attendance Status], [Attendance Status] )
)
"""
dimstatus_cols = [
    col("Attendance Status", "string", key=True, calc_source="Attendance Status", description="Status text resolved at employee-day level."),
    col("Status Category", "string", calc_source="Status Category", sort_by="Status Category Order", description="Present / Absent / Leave / Holiday / Weekend - Rest Day / Other / Unknown. 'Other' values are listed on the Exceptions & Data Quality page and can be mapped in the StatusCategoryOverrides query."),
    col("Status Category Order", "int64", fmt="0", calc_source="Status Category Order", hidden=True),
]
write(os.path.join(TABLES, "DimStatus.tmdl"), table("DimStatus", dimstatus_cols, dax_partition("DimStatus", dimstatus_dax),
    description="Attendance status values and their category."))

# Disconnected helper tables
exc_types = ["Absent", "Missing Punch", "Unrecognised Status", "Short Working Hours (review)", "Long Working Hours (review)", "Status2 Condition"]
dax_rows = ", ".join('{ "%s", %d }' % (t, i + 1) for i, t in enumerate(exc_types))
write(os.path.join(TABLES, "DimExceptionType.tmdl"), table("DimExceptionType",
    [col("Exception Type", "string", key=True, calc_source="Exception Type", sort_by="Exception Type Order"),
     col("Exception Type Order", "int64", fmt="0", calc_source="Exception Type Order", hidden=True)],
    dax_partition("DimExceptionType", f'DATATABLE ( "Exception Type", STRING, "Exception Type Order", INTEGER, {{ {dax_rows} }} )'),
    description="Exception types (disconnected helper table used with the measure 'Exception Days by Type')."))

dq_types = ["Missing Employee Code", "Missing Employee Name", "Missing Process Date", "Missing Total Hours (Present)", "Invalid Total Hours",
            "Invalid Punch In", "Invalid Punch Out", "Punch Out Before Punch In", "Duplicate Record", "Blank Status", "Unrecognised Status",
            "Blank Business Unit", "Blank Client", "Blank Shift"]
dax_rows = ", ".join('{ "%s", %d }' % (t, i + 1) for i, t in enumerate(dq_types))
write(os.path.join(TABLES, "DimDQIssueType.tmdl"), table("DimDQIssueType",
    [col("Issue Type", "string", key=True, calc_source="Issue Type", sort_by="Issue Type Order"),
     col("Issue Type Order", "int64", fmt="0", calc_source="Issue Type Order", hidden=True)],
    dax_partition("DimDQIssueType", f'DATATABLE ( "Issue Type", STRING, "Issue Type Order", INTEGER, {{ {dax_rows} }} )'),
    description="Data-quality issue types (disconnected helper table used with the measure 'DQ Issue Records by Type')."))

write(os.path.join(TABLES, "DimHour.tmdl"), table("DimHour",
    [col("Hour", "int64", fmt="0", key=True, calc_source="Hour"),
     col("Hour Label", "string", calc_source="Hour Label", sort_by="Hour")],
    dax_partition("DimHour", 'SELECTCOLUMNS ( GENERATESERIES ( 0, 23, 1 ), "Hour", [Value], "Hour Label", FORMAT ( [Value], "00" ) & ":00" )'),
    description="Hours of the day 00:00-23:00 (disconnected helper for punch-time distributions)."))

insight_rows = [(1, "Workforce"), (2, "Attendance"), (3, "Working Hours"), (4, "Missing Punches"), (5, "Exceptions"), (6, "Focus Area")]
dax_rows = ", ".join('{ %d, "%s" }' % r for r in insight_rows)
write(os.path.join(TABLES, "DimInsight.tmdl"), table("DimInsight",
    [col("Insight Order", "int64", fmt="0", key=True, calc_source="Insight Order", hidden=True),
     col("Area", "string", calc_source="Area", sort_by="Insight Order")],
    dax_partition("DimInsight", f'DATATABLE ( "Insight Order", INTEGER, "Area", STRING, {{ {dax_rows} }} )'),
    description="Rows for the management insight panel (each row shows one dynamic statement)."))

# RefreshInfo (M)
refresh_m = """let
    Source = #table(
        type table [#"Refresh DateTime" = datetime, #"Data Folder" = text, #"Short Hours Threshold" = number, #"Long Hours Threshold" = number, #"Status2 Treated As Exception" = logical],
        {{DateTime.LocalNow(), pDataFolder, pShortHoursReviewThreshold, pLongHoursReviewThreshold, pStatus2IsException}}
    )
in
    Source"""
write(os.path.join(TABLES, "RefreshInfo.tmdl"), table("RefreshInfo",
    [col("Refresh DateTime", "dateTime", fmt="dd-mmm-yyyy hh:nn"),
     col("Data Folder", "string"),
     col("Short Hours Threshold", "double", fmt="0.0"),
     col("Long Hours Threshold", "double", fmt="0.0"),
     col("Status2 Treated As Exception", "boolean", fmt='"""TRUE"";""TRUE"";""FALSE"""')],
    m_partition("RefreshInfo", refresh_m), hidden=True,
    description="One row written at every refresh: refresh timestamp and the parameter values in force."))

# ----------------------------------------------------------------------------
# _Measures
# ----------------------------------------------------------------------------
M = []
def add(name, dax, fmt=None, folder=None, description=None, hidden=False):
    M.append(measure(name, dax, fmt, folder, description, hidden))

PCT = "0.0%"
INT = "#,0"
HRS = '#,0 "hrs"'
HRS1 = '0.0 "hrs"'
MOM = "+0.0%;-0.0%;0.0%"
PP = '+0.0 "pp";-0.0 "pp";0.0 "pp"'
DATE = "dd-mmm-yyyy"

# --- 01 Workforce
W = "01 Workforce"
add("Active Employees", "DISTINCTCOUNTNOBLANK ( FactAttendance[Employee Code] )", INT, W, "Number of distinct employees with at least one attendance record in the selected context.")
add("Employee Days", "DISTINCTCOUNTNOBLANK ( FactAttendance[Employee Day Key] )", INT, W, "Distinct employee-days (Employee Code + Process Date). Several records on the same day count once.")
add("Attendance Records", "COUNTROWS ( FactAttendance )", INT, W, "Raw rows loaded from the source files (including exact duplicates).")
add("Attendance Records (Excl. Duplicates)", "CALCULATE ( COUNTROWS ( FactAttendance ), FactAttendance[Is Duplicate Record] = 0 )", INT, W)
add("Avg Daily Employees", "AVERAGEX ( VALUES ( DimDate[Date] ), [Active Employees] )", INT, W, "Average number of employees with a record per calendar day that has data.")
add("Days With Data", "DISTINCTCOUNTNOBLANK ( FactAttendance[Process Date] )", INT, W)
add("Employees Present (1+ Day)", 'CALCULATE ( [Active Employees], FactAttendance[Status Category] = "Present" )', INT, W)
add("Employees With Exceptions", "CALCULATE ( [Active Employees], FactAttendance[Exception Flag] = 1 )", INT, W)
add("Employees With Missing Punch", "CALCULATE ( [Active Employees], FactAttendance[Day Missing Punch Flag] = 1 )", INT, W)

# --- 02 Attendance
A = "02 Attendance"
for label, cat in [("Present", "Present"), ("Absent", "Absent"), ("Leave", "Leave"), ("Holiday", "Holiday"), ("Rest Day", "Weekend / Rest Day"), ("Other Status", "Other"), ("Unknown Status", "Unknown")]:
    add(f"{label} Days", f'CALCULATE ( [Employee Days], FactAttendance[Status Category] = "{cat}" )', INT, A, f"Employee-days whose resolved status category is '{cat}'.")
add("Present % of Recorded Days", "DIVIDE ( [Present Days], [Employee Days] )", PCT, A, "Share of recorded employee-days with a Present status. The source does not contain a roster, so this is a share of RECORDED days, not a true attendance rate.")
add("Absent % of Recorded Days", "DIVIDE ( [Absent Days], [Employee Days] )", PCT, A)
add("Leave % of Recorded Days", "DIVIDE ( [Leave Days], [Employee Days] )", PCT, A)
add("Other Status % of Recorded Days", "DIVIDE ( [Other Status Days] + [Unknown Status Days], [Employee Days] )", PCT, A)
add("Present % (Excl. Leave & Rest Days)", "DIVIDE ( [Present Days], [Employee Days] - [Leave Days] - [Holiday Days] - [Rest Days] )", PCT, A, "Present days divided by recorded days that are not Leave, Holiday or Rest days. Still based on recorded days only.")
add("Status Share %", "DIVIDE ( [Employee Days], CALCULATE ( [Employee Days], REMOVEFILTERS ( DimStatus ) ) )", PCT, A)

# --- 03 Hours
H = "03 Hours"
add("Total Worked Hours", "SUM ( FactAttendance[Worked Hours Decimal] )", HRS, H, "Sum of worked hours (source Total Hours, or hours calculated from punches when the source value is blank/invalid). Exact duplicate records are excluded.")
add("Worked Days", "CALCULATE ( [Employee Days], FactAttendance[Day Worked Hours] > 0 )", INT, H, "Employee-days with recorded hours greater than zero.")
add("Avg Hours / Worked Day", "DIVIDE ( [Total Worked Hours], [Worked Days] )", HRS1, H, "Total worked hours divided by employee-days that have hours > 0 (absent/leave days are not in the denominator).")
add("Avg Hours / Employee", "DIVIDE ( [Total Worked Hours], [Active Employees] )", HRS1, H, "Total worked hours divided by active employees in the selected period.")
add("Median Hours / Worked Day", "CALCULATE ( MEDIAN ( FactAttendance[Day Worked Hours] ), FactAttendance[Is Day Primary] = 1, FactAttendance[Day Worked Hours] > 0 )", HRS1, H)
add("Min Hours / Worked Day", "CALCULATE ( MIN ( FactAttendance[Day Worked Hours] ), FactAttendance[Is Day Primary] = 1, FactAttendance[Day Worked Hours] > 0 )", HRS1, H)
add("Max Hours / Worked Day", "CALCULATE ( MAX ( FactAttendance[Day Worked Hours] ), FactAttendance[Is Day Primary] = 1 )", HRS1, H)
add("Days Using Calculated Hours", 'CALCULATE ( [Employee Days], FactAttendance[Worked Hours Basis] = "Calculated from Punches" )', INT, H, "Employee-days whose hours had to be calculated from punches because the source Total Hours was blank or invalid.")
add("Avg Punch In Minutes", "CALCULATE ( AVERAGE ( FactAttendance[Punch In Minutes From Midnight] ), FactAttendance[Is Duplicate Record] = 0 )", "0", H + "\\Punch", hidden=True)
add("Avg Punch Out Minutes", "CALCULATE ( AVERAGE ( FactAttendance[Punch Out Minutes From Midnight] ), FactAttendance[Is Duplicate Record] = 0 )", "0", H + "\\Punch", hidden=True)
add("Avg Punch In Time", """
VAR _m = [Avg Punch In Minutes]
RETURN
    IF ( ISBLANK ( _m ), BLANK (), FORMAT ( TIME ( 0, ROUND ( _m, 0 ), 0 ), "hh:mm AM/PM" ) )
""", None, H + "\\Punch", "Average punch-in clock time, computed from minutes since midnight (not from text).")
add("Avg Punch Out Time", """
VAR _m = [Avg Punch Out Minutes]
RETURN
    IF ( ISBLANK ( _m ), BLANK (), FORMAT ( TIME ( 0, ROUND ( _m, 0 ), 0 ), "hh:mm AM/PM" ) )
""", None, H + "\\Punch")
add("Avg Punch In (Decimal Hours)", "DIVIDE ( [Avg Punch In Minutes], 60 )", "0.00", H + "\\Punch", "Average punch-in time as decimal hours (7.5 = 07:30) for charts.")
add("Avg Punch Out (Decimal Hours)", "DIVIDE ( [Avg Punch Out Minutes], 60 )", "0.00", H + "\\Punch")
add("Punch In Records by Hour", "CALCULATE ( COUNTROWS ( FactAttendance ), FactAttendance[Is Duplicate Record] = 0, TREATAS ( VALUES ( DimHour[Hour] ), FactAttendance[Punch In Hour] ) )", INT, H + "\\Punch", "Use with DimHour[Hour Label] on the axis.")
add("Punch Out Records by Hour", "CALCULATE ( COUNTROWS ( FactAttendance ), FactAttendance[Is Duplicate Record] = 0, TREATAS ( VALUES ( DimHour[Hour] ), FactAttendance[Punch Out Hour] ) )", INT, H + "\\Punch")

# --- 04 Exceptions
E = "04 Exceptions"
add("Exception Days", "CALCULATE ( [Employee Days], FactAttendance[Exception Flag] = 1 )", INT, E, "Employee-days with at least one attendance exception: Absent, Missing Punch, Unrecognised Status, Short/Long hours (review thresholds) or a Status2 condition.")
add("Exception % of Recorded Days", "DIVIDE ( [Exception Days], [Employee Days] )", PCT, E)
add("Exception Days per Employee", "DIVIDE ( [Exception Days], [Employees With Exceptions] )", "0.0", E)
add("Exception Days - Absent", "CALCULATE ( [Employee Days], FactAttendance[Exception Absent Flag] = 1 )", INT, E + "\\By Type")
add("Exception Days - Missing Punch", "CALCULATE ( [Employee Days], FactAttendance[Exception Missing Punch Flag] = 1 )", INT, E + "\\By Type")
add("Exception Days - Unrecognised Status", "CALCULATE ( [Employee Days], FactAttendance[Exception Unrecognised Status Flag] = 1 )", INT, E + "\\By Type")
add("Exception Days - Short Hours (review)", "CALCULATE ( [Employee Days], FactAttendance[Exception Short Hours Flag] = 1 )", INT, E + "\\By Type", "Present days with hours below the configurable review threshold (pShortHoursReviewThreshold). Not a policy violation.")
add("Exception Days - Long Hours (review)", "CALCULATE ( [Employee Days], FactAttendance[Exception Long Hours Flag] = 1 )", INT, E + "\\By Type", "Days with hours above the configurable review threshold (pLongHoursReviewThreshold). Not a policy violation.")
add("Exception Days - Status2 Condition", "CALCULATE ( [Employee Days], FactAttendance[Exception Status2 Flag] = 1 )", INT, E + "\\By Type", "Days with a non-blank Status2 value (controlled by parameter pStatus2IsException).")
add("Exception Days by Type", """
SWITCH (
    SELECTEDVALUE ( DimExceptionType[Exception Type] ),
    "Absent", [Exception Days - Absent],
    "Missing Punch", [Exception Days - Missing Punch],
    "Unrecognised Status", [Exception Days - Unrecognised Status],
    "Short Working Hours (review)", [Exception Days - Short Hours (review)],
    "Long Working Hours (review)", [Exception Days - Long Hours (review)],
    "Status2 Condition", [Exception Days - Status2 Condition],
    [Exception Days]
)
""", INT, E, "Exception days split by DimExceptionType. A day with two exception types appears under both; the total is distinct days.")
add("Missing Punch Days", "CALCULATE ( [Employee Days], FactAttendance[Day Missing Punch Flag] = 1 )", INT, E + "\\Punch", "Employee-days where a punch was expected (Present status or one punch recorded) but Punch In and/or Punch Out is missing.")
add("Missing Punch In Days", "CALCULATE ( [Employee Days], FactAttendance[Missing Punch In Flag] = 1 )", INT, E + "\\Punch")
add("Missing Punch Out Days", "CALCULATE ( [Employee Days], FactAttendance[Missing Punch Out Flag] = 1 )", INT, E + "\\Punch")
add("Missing Both Punches Days", "CALCULATE ( [Employee Days], FactAttendance[Missing Both Punches Flag] = 1 )", INT, E + "\\Punch")
add("Punch-Expected Days", "CALCULATE ( [Employee Days], FactAttendance[Day Punch Expected Flag] = 1 )", INT, E + "\\Punch", "Employee-days where punches are expected: Present status or at least one punch recorded. Absent / Leave / Rest days without punches are excluded.")
add("Complete Punch Days", "CALCULATE ( [Employee Days], FactAttendance[Day Punch Expected Flag] = 1, FactAttendance[Day Missing Punch Flag] = 0 )", INT, E + "\\Punch")
add("Missing Punch %", "DIVIDE ( [Missing Punch Days], [Punch-Expected Days] )", PCT, E + "\\Punch", "Missing Punch Days divided by Punch-Expected Days.")
add("Missing Punch Records", "CALCULATE ( COUNTROWS ( FactAttendance ), FactAttendance[Missing Punch Flag] = 1, FactAttendance[Is Duplicate Record] = 0 )", INT, E + "\\Punch")
add("Justified Exception Days", 'CALCULATE ( [Exception Days], FactAttendance[Justification Category] = "Justified" )', INT, E + "\\Justification")
add("Not Justified Exception Days", 'CALCULATE ( [Exception Days], FactAttendance[Justification Category] = "Not Justified" )', INT, E + "\\Justification", "Exception days where Is Justified explicitly says No.")
add("Pending Justification Days", 'CALCULATE ( [Exception Days], FactAttendance[Justification Category] = "Pending" )', INT, E + "\\Justification")
add("Justification Not Recorded Days", 'CALCULATE ( [Exception Days], FactAttendance[Justification Category] = "Not Recorded" )', INT, E + "\\Justification", "Exception days where Is Justified is blank. Blank is NOT treated as unjustified.")
add("Justified % (Where Recorded)", "DIVIDE ( [Justified Exception Days], [Justified Exception Days] + [Not Justified Exception Days] )", PCT, E + "\\Justification")
add("Latest Exception Date", "CALCULATE ( MAX ( FactAttendance[Process Date] ), FactAttendance[Exception Flag] = 1 )", DATE, E)
add("Review Reasons", """
VAR _a = [Exception Days - Absent]
VAR _m = [Exception Days - Missing Punch]
VAR _u = [Exception Days - Unrecognised Status]
VAR _s = [Exception Days - Short Hours (review)]
VAR _l = [Exception Days - Long Hours (review)]
VAR _s2 = [Exception Days - Status2 Condition]
VAR _txt =
    IF ( _a > 0, "Absent " & _a & " | ", "" )
        & IF ( _m > 0, "Missing punch " & _m & " | ", "" )
        & IF ( _u > 0, "Unrecognised status " & _u & " | ", "" )
        & IF ( _s > 0, "Short hours " & _s & " | ", "" )
        & IF ( _l > 0, "Long hours " & _l & " | ", "" )
        & IF ( _s2 > 0, "Status2 " & _s2 & " | ", "" )
RETURN
    IF ( LEN ( _txt ) > 3, LEFT ( _txt, LEN ( _txt ) - 3 ), BLANK () )
""", None, E, "Plain-language list of the exception counts behind an employee's review ranking. No score is computed.")
add("Exception % Colour", """
VAR _overall =
    CALCULATE (
        [Exception % of Recorded Days],
        REMOVEFILTERS ( DimBusinessUnit, DimClient, DimCostCenter, DimShift, DimSource, DimPayCalendar, DimEmployee )
    )
RETURN
    IF ( [Exception % of Recorded Days] > 1.5 * _overall && [Employee Days] >= 20, "#E60000", "#2E2E2E" )
""", None, E + "\\Formatting", "Font colour helper: red when the row's exception rate is more than 1.5x the overall rate for the same period (minimum 20 employee-days).", hidden=True)
add("Missing Punch % Colour", """
VAR _overall =
    CALCULATE (
        [Missing Punch %],
        REMOVEFILTERS ( DimBusinessUnit, DimClient, DimCostCenter, DimShift, DimSource, DimPayCalendar, DimEmployee )
    )
RETURN
    IF ( [Missing Punch %] > 1.5 * _overall && [Punch-Expected Days] >= 20, "#E60000", "#2E2E2E" )
""", None, E + "\\Formatting", hidden=True)

# --- 05 Month Comparison
C = "05 Month Comparison"
def pm_block(base, fmt, mom_fmt=None, pp=False, kind="neutral", label=None):
    """Creates <base> PM, <base> MoM, <base> MoM % (or pp change) and a KPI subtitle/colour pair."""
    add(f"{base} PM", f"CALCULATE ( [{base}], DATEADD ( DimDate[Date], -1, MONTH ) )", fmt, C, f"{base} for the previous month (same day range shifted back one month).")
    if pp:
        add(f"{base} Change (pp)", f"IF ( ISBLANK ( [{base}] ) || ISBLANK ( [{base} PM] ), BLANK (), ( [{base}] - [{base} PM] ) * 100 )", PP, C, "Percentage-point change versus the previous month.")
    else:
        add(f"{base} MoM", f"IF ( ISBLANK ( [{base}] ) || ISBLANK ( [{base} PM] ), BLANK (), [{base}] - [{base} PM] )", fmt, C)
        add(f"{base} MoM %", f"DIVIDE ( [{base} MoM], [{base} PM] )", MOM, C)
    # subtitle text
    if pp:
        delta_expr = f"[{base} Change (pp)]"
        delta_fmt = 'FORMAT ( _d, "+0.0;-0.0;0.0" ) & " pp"'
        pm_fmt = 'FORMAT ( _pm, "0.0%" )'
    else:
        delta_expr = f"[{base} MoM %]"
        delta_fmt = 'FORMAT ( _d, "+0.0%;-0.0%;0.0%" )'
        pm_fmt = 'FORMAT ( _pm, "' + ("#,0.0" if fmt == HRS1 else "#,0") + '" )'
    add(f"KPI Note - {base}", f"""
VAR _cur = [{base}]
VAR _pm = [{base} PM]
VAR _d = {delta_expr}
RETURN
    IF (
        ISBLANK ( _pm ) || ISBLANK ( _cur ),
        "No previous-month data",
        IF ( _d > 0, UNICHAR ( 9650 ) & " ", IF ( _d < 0, UNICHAR ( 9660 ) & " ", UNICHAR ( 9644 ) & " " ) )
            & {delta_fmt} & " vs prev. month (" & {pm_fmt} & ")"
    )
""", None, C + "\\KPI Notes", hidden=True)
    if kind == "neutral":
        colour = '"#6B6B6B"'
    elif kind == "up_good":
        colour = 'IF ( _d > 0, "#2E7D5B", IF ( _d < 0, "#E60000", "#6B6B6B" ) )'
    else:  # up_bad
        colour = 'IF ( _d > 0, "#E60000", IF ( _d < 0, "#2E7D5B", "#6B6B6B" ) )'
    add(f"KPI Colour - {base}", f"""
VAR _d = {delta_expr}
RETURN
    IF ( ISBLANK ( _d ), "#6B6B6B", {colour} )
""", None, C + "\\KPI Notes", hidden=True)

pm_block("Active Employees", INT, kind="neutral")
pm_block("Employee Days", INT, kind="neutral")
pm_block("Avg Daily Employees", INT, kind="neutral")
pm_block("Present % of Recorded Days", PCT, pp=True, kind="up_good")
pm_block("Total Worked Hours", HRS, kind="neutral")
pm_block("Avg Hours / Worked Day", HRS1, kind="neutral")
pm_block("Exception Days", INT, kind="up_bad")
pm_block("Exception % of Recorded Days", PCT, pp=True, kind="up_bad")
pm_block("Missing Punch Days", INT, kind="up_bad")
pm_block("Missing Punch %", PCT, pp=True, kind="up_bad")
pm_block("Present Days", INT, kind="neutral")
pm_block("Absent Days", INT, kind="up_bad")

# --- 06 Data Quality
D = "06 Data Quality"
add("DQ Issue Records", "CALCULATE ( COUNTROWS ( FactAttendance ), FactAttendance[DQ Issue Flag] = 1 )", INT, D, "Records with at least one data-integrity issue (missing key fields, invalid dates/times/hours, duplicates, blank organisation fields, unrecognised status). Missing punches are counted as attendance exceptions, not here.")
add("Data Quality % (Clean Records)", "1 - DIVIDE ( [DQ Issue Records], [Attendance Records] )", PCT, D, "Share of records without any data-integrity issue.")
dq_measure_map = [
    ("Missing Employee Code Records", "DQ Missing Employee Code", "Missing Employee Code"),
    ("Missing Employee Name Records", "DQ Missing Employee Name", "Missing Employee Name"),
    ("Missing Process Date Records", "DQ Missing Process Date", "Missing Process Date"),
    ("Missing Total Hours Records (Present)", "DQ Missing Total Hours", "Missing Total Hours (Present)"),
    ("Invalid Total Hours Records", "DQ Invalid Total Hours", "Invalid Total Hours"),
    ("Invalid Punch In Records", "DQ Invalid Punch In", "Invalid Punch In"),
    ("Invalid Punch Out Records", "DQ Invalid Punch Out", "Invalid Punch Out"),
    ("Punch Out Before Punch In Records", "DQ Punch Out Before In", "Punch Out Before Punch In"),
    ("Duplicate Records", "DQ Duplicate Record", "Duplicate Record"),
    ("Blank Status Records", "DQ Blank Status", "Blank Status"),
    ("Unrecognised Status Records", "DQ Unrecognised Status", "Unrecognised Status"),
    ("Blank Business Unit Records", "DQ Blank Business Unit", "Blank Business Unit"),
    ("Blank Client Records", "DQ Blank Client", "Blank Client"),
    ("Blank Shift Records", "DQ Blank Shift", "Blank Shift"),
]
for mname, colname, _ in dq_measure_map:
    add(mname, f"CALCULATE ( COUNTROWS ( FactAttendance ), FactAttendance[{colname}] = 1 )", INT, D + "\\By Issue")
add("Invalid DateTime Records", "[Invalid Punch In Records] + [Invalid Punch Out Records]", INT, D + "\\By Issue")
add("Missing Punch In Records", "CALCULATE ( COUNTROWS ( FactAttendance ), FactAttendance[Missing Punch In Flag] = 1, FactAttendance[Is Duplicate Record] = 0 )", INT, D + "\\By Issue")
add("Missing Punch Out Records", "CALCULATE ( COUNTROWS ( FactAttendance ), FactAttendance[Missing Punch Out Flag] = 1, FactAttendance[Is Duplicate Record] = 0 )", INT, D + "\\By Issue")
add("Missing Both Punches Records", "CALCULATE ( COUNTROWS ( FactAttendance ), FactAttendance[Missing Both Punches Flag] = 1, FactAttendance[Is Duplicate Record] = 0 )", INT, D + "\\By Issue")
add("Multiple-Record Employee Days", "CALCULATE ( [Employee Days], FactAttendance[Multiple Records Day Flag] = 1 )", INT, D, "Employee-days that have more than one (non-identical) record. Not necessarily an error - listed for review.")
add("Hours Differ From Punches Records", "CALCULATE ( COUNTROWS ( FactAttendance ), FactAttendance[DQ Hours Differ From Punches] = 1 )", INT, D, "Informational: records where source Total Hours and punch-to-punch duration differ by more than 30 minutes (breaks, rounding). Not counted as a data-quality issue.")
add("Unrecognised Status Values", 'CALCULATE ( DISTINCTCOUNT ( FactAttendance[Status] ), FactAttendance[Record Status Category] = "Other" )', INT, D, "Number of distinct Status values that the keyword rules could not classify. Map them in the StatusCategoryOverrides query.")
switch_rows = "\n".join(f'    "{issue}", [{mname}],' for mname, _, issue in dq_measure_map)
add("DQ Issue Records by Type", f"""
SWITCH (
    SELECTEDVALUE ( DimDQIssueType[Issue Type] ),
{switch_rows}
    [DQ Issue Records]
)
""", INT, D, "Use with DimDQIssueType[Issue Type] on the axis.")

# --- 07 Refresh Information
R = "07 Refresh Information"
add("Latest Data Date", "CALCULATE ( MAX ( FactAttendance[Process Date] ), REMOVEFILTERS () )", DATE, R, "Most recent Process Date in the whole dataset (ignores slicers).")
add("Earliest Data Date", "CALCULATE ( MIN ( FactAttendance[Process Date] ), REMOVEFILTERS () )", DATE, R)
add("Latest Month", 'FORMAT ( [Latest Data Date], "mmmm yyyy" )', None, R)
add("Last Refresh", "MAX ( RefreshInfo[Refresh DateTime] )", "dd-mmm-yyyy hh:nn", R, "Timestamp written by Power Query at the last refresh.")
add("Months Loaded", "CALCULATE ( DISTINCTCOUNTNOBLANK ( FactAttendance[Process Month Start] ), REMOVEFILTERS () )", INT, R)
add("Source Files Loaded", "CALCULATE ( DISTINCTCOUNT ( FactAttendance[Source File] ), REMOVEFILTERS () )", INT, R)
add("Selected Period", """
VAR _mn = MIN ( FactAttendance[Process Date] )
VAR _mx = MAX ( FactAttendance[Process Date] )
RETURN
    IF (
        ISBLANK ( _mn ),
        "No data for the current selection",
        IF (
            FORMAT ( _mn, "yyyymm" ) = FORMAT ( _mx, "yyyymm" ),
            FORMAT ( _mn, "mmmm yyyy" ),
            FORMAT ( _mn, "dd mmm yyyy" ) & " - " & FORMAT ( _mx, "dd mmm yyyy" )
        )
    )
""", None, R, "Period covered by the data in the current filter context.")
add("Data Status Line", """
"Data through " & FORMAT ( [Latest Data Date], "dd mmm yyyy" )
    & "   |   Refreshed " & FORMAT ( [Last Refresh], "dd mmm yyyy hh:mm AM/PM" )
    & "   |   " & [Months Loaded] & " months, " & [Source Files Loaded] & " files"
""", None, R)
add("Records Summary Line", """
FORMAT ( [Attendance Records], "#,0" ) & " records   |   " & FORMAT ( [Active Employees], "#,0" ) & " employees   |   " & [Selected Period]
""", None, R)
add("Review Thresholds Text", """
"Review thresholds (configurable, not HR policy): short < "
    & FORMAT ( MAX ( RefreshInfo[Short Hours Threshold] ), "0.#" ) & " hrs  |  long > "
    & FORMAT ( MAX ( RefreshInfo[Long Hours Threshold] ), "0.#" ) & " hrs  |  Status2 as exception: "
    & IF ( MAX ( RefreshInfo[Status2 Treated As Exception] ), "Yes", "No" )
""", None, R)

# --- 08 Insights
I = "08 Insights"
add("Insight - Workforce", """
VAR _cur = [Employee Days]
VAR _pm = [Employee Days PM]
VAR _emp = [Active Employees]
RETURN
    IF (
        ISBLANK ( _cur ),
        "No attendance records in the current selection.",
        FORMAT ( _emp, "#,0" ) & " employees and " & FORMAT ( _cur, "#,0" ) & " employee-days recorded"
            & IF (
                ISBLANK ( _pm ),
                " (no previous month to compare).",
                ", " & IF ( _cur >= _pm, "up ", "down " ) & FORMAT ( ABS ( DIVIDE ( _cur - _pm, _pm ) ), "0.0%" )
                    & " versus the previous month (" & FORMAT ( _pm, "#,0" ) & ")."
            )
    )
""", None, I)
add("Insight - Attendance", """
VAR _cur = [Present % of Recorded Days]
VAR _pm = [Present % of Recorded Days PM]
RETURN
    IF (
        ISBLANK ( _cur ),
        BLANK (),
        "Present share of recorded days is " & FORMAT ( _cur, "0.0%" )
            & IF (
                ISBLANK ( _pm ),
                ".",
                " (" & FORMAT ( ( _cur - _pm ) * 100, "+0.0;-0.0;0.0" ) & " pp versus the previous month)."
            )
            & " Absent " & FORMAT ( [Absent % of Recorded Days], "0.0%" ) & ", leave " & FORMAT ( [Leave % of Recorded Days], "0.0%" ) & "."
    )
""", None, I)
add("Insight - Hours", """
VAR _cur = [Avg Hours / Worked Day]
VAR _pm = [Avg Hours / Worked Day PM]
RETURN
    IF (
        ISBLANK ( _cur ),
        BLANK (),
        "Average " & FORMAT ( _cur, "0.0" ) & " hrs per worked day across " & FORMAT ( [Total Worked Hours], "#,0" ) & " total hours"
            & IF (
                ISBLANK ( _pm ),
                ".",
                ", " & IF ( _cur >= _pm, "up ", "down " ) & FORMAT ( ABS ( _cur - _pm ), "0.0" ) & " hrs versus the previous month."
            )
    )
""", None, I)
add("Insight - Missing Punches", """
VAR _cur = [Missing Punch %]
VAR _pm = [Missing Punch % PM]
VAR _days = [Missing Punch Days]
RETURN
    IF (
        ISBLANK ( [Punch-Expected Days] ),
        BLANK (),
        FORMAT ( _days, "#,0" ) & " employee-days have a missing punch (" & FORMAT ( _cur, "0.0%" ) & " of punch-expected days)"
            & IF (
                ISBLANK ( _pm ),
                ".",
                ", " & IF ( _cur >= _pm, "up ", "down " ) & FORMAT ( ABS ( _cur - _pm ) * 100, "0.0" ) & " pp versus the previous month."
            )
    )
""", None, I)
add("Insight - Exceptions", """
VAR _tot = [Exception Days]
VAR _t =
    ADDCOLUMNS ( VALUES ( DimBusinessUnit[Business Unit] ), "@ex", [Exception Days] )
VAR _top = TOPN ( 1, _t, [@ex], DESC )
VAR _name = MAXX ( _top, DimBusinessUnit[Business Unit] )
VAR _ex = MAXX ( _top, [@ex] )
RETURN
    IF (
        ISBLANK ( _tot ) || _tot = 0,
        "No attendance exceptions recorded in the current selection.",
        FORMAT ( _tot, "#,0" ) & " exception days (" & FORMAT ( [Exception % of Recorded Days], "0.0%" ) & " of recorded days). "
            & _name & " has the largest share: " & FORMAT ( DIVIDE ( _ex, _tot ), "0%" ) & " (" & FORMAT ( _ex, "#,0" ) & " days)."
    )
""", None, I)
add("Insight - Focus Area", """
VAR _minDays = 50
VAR _t =
    FILTER (
        ADDCOLUMNS ( VALUES ( DimClient[Client Name] ), "@pe", [Punch-Expected Days], "@mp", [Missing Punch %] ),
        [@pe] >= _minDays && NOT ISBLANK ( [@mp] ) && [@mp] > 0
    )
VAR _top = TOPN ( 1, _t, [@mp], DESC )
VAR _name = MAXX ( _top, DimClient[Client Name] )
VAR _mp = MAXX ( _top, [@mp] )
RETURN
    IF (
        ISBLANK ( _name ),
        "No client with at least " & _minDays & " punch-expected days has missing punches.",
        _name & " has the highest missing-punch rate: " & FORMAT ( _mp, "0.0%" ) & " (clients with at least " & _minDays & " punch-expected days)."
    )
""", None, I)
add("Insight Text", """
SWITCH (
    SELECTEDVALUE ( DimInsight[Insight Order] ),
    1, [Insight - Workforce],
    2, [Insight - Attendance],
    3, [Insight - Hours],
    4, [Insight - Missing Punches],
    5, [Insight - Exceptions],
    6, [Insight - Focus Area]
)
""", None, I, "Dynamic, factual statements derived from the current filter context. Shown in the insight panel (rows come from DimInsight).")

# --- 09 Employee 360
X = "09 Employee 360"
add("Employee Header", 'SELECTEDVALUE ( DimEmployee[Employee Name], IF ( HASONEVALUE ( DimEmployee[Employee Code] ), "(Name not recorded)", "Select one employee (drill through from any table)" ) )', None, X)
add("Employee Sub Header", """
VAR _code = SELECTEDVALUE ( DimEmployee[Employee Code] )
VAR _agency = SELECTEDVALUE ( DimEmployee[Agency Emp ID] )
RETURN
    IF ( ISBLANK ( _code ), BLANK (), "Employee Code " & _code & IF ( ISBLANK ( _agency ), "", "   |   Agency Emp ID " & _agency ) )
""", None, X)
add("Employee Assignment", """
VAR _bu = CONCATENATEX ( VALUES ( FactAttendance[Business Unit] ), FactAttendance[Business Unit], ", " )
VAR _cl = CONCATENATEX ( VALUES ( FactAttendance[Client Name] ), FactAttendance[Client Name], ", " )
VAR _cc = CONCATENATEX ( VALUES ( FactAttendance[Cost Center] ), FactAttendance[Cost Center], ", " )
VAR _sh = CONCATENATEX ( VALUES ( FactAttendance[Shift Name] ), FactAttendance[Shift Name], ", " )
VAR _src = CONCATENATEX ( VALUES ( FactAttendance[Source Name] ), FactAttendance[Source Name], ", " )
RETURN
    IF (
        ISBLANK ( [Attendance Records] ),
        BLANK (),
        "Business Unit: " & _bu & "   |   Client: " & _cl & "   |   Cost Center: " & _cc & "   |   Shift: " & _sh & "   |   Source: " & _src
    )
""", None, X, "Assignments recorded in the selected period. Several values appear when the employee changed Client / Cost Center / Shift.")

measures_text = "".join(M)
write(os.path.join(TABLES, "_Measures.tmdl"), table(
    "_Measures",
    [col("Measure Holder", "string", hidden=True, calc_source="Measure Holder")],
    dax_partition("_Measures", 'ROW ( "Measure Holder", BLANK () )'),
    description="All report measures, organised in display folders.",
    measures=measures_text))

# ----------------------------------------------------------------------------
# relationships, model, database, pbism, platform, pbip
# ----------------------------------------------------------------------------
rels = [
    ("DimDate", "Date", "Process Date"),
    ("DimEmployee", "Employee Code", "Employee Code"),
    ("DimBusinessUnit", "Business Unit", "Business Unit"),
    ("DimClient", "Client Name", "Client Name"),
    ("DimCostCenter", "Cost Center", "Cost Center"),
    ("DimShift", "Shift Name", "Shift Name"),
    ("DimSource", "Source Name", "Source Name"),
    ("DimPayCalendar", "Pay Calendar", "Pay Calendar"),
    ("DimStatus", "Attendance Status", "Attendance Status"),
]
rel_text = []
for dim, dcol, fcol in rels:
    rel_text.append(f"relationship {tag('rel/' + dim)}\n\tfromColumn: FactAttendance.{q(fcol)}\n\ttoColumn: {dim}.{q(dcol)}\n")
write(os.path.join(DEF, "relationships.tmdl"), "\n".join(rel_text))

table_names = ["FactAttendance", "DimDate", "DimEmployee", "DimBusinessUnit", "DimClient", "DimCostCenter", "DimShift", "DimSource",
               "DimPayCalendar", "DimStatus", "DimExceptionType", "DimDQIssueType", "DimHour", "DimInsight", "RefreshInfo", "_Measures"]
model_tmdl = """model Model
	culture: en-US
	defaultPowerBIDataSourceVersion: powerBI_V3
	sourceQueryCulture: en-GB
	dataAccessOptions
		legacyRedirects
		returnErrorValuesAsNull

annotation PBI_QueryOrder = ["pDataFolder","pShortHoursReviewThreshold","pLongHoursReviewThreshold","pStatus2IsException","StatusCategoryOverrides","fnHeaderKey","HeaderMap","CanonicalColumns","fnCleanText","fnParseDate","fnParseDateTime","fnParseHours","fnStatusCategory","fnJustificationCategory","fnReadAttendanceFile","SourceFiles","FactAttendance","RefreshInfo"]

annotation __PBI_TimeIntelligenceEnabled = 0

annotation PBI_ProTooling = ["DevMode"]

""" + "\n".join(f"ref table {q(t)}" for t in table_names) + "\n\nref cultureInfo en-US\n"
write(os.path.join(DEF, "model.tmdl"), model_tmdl)
write(os.path.join(DEF, "database.tmdl"), "database\n\tcompatibilityLevel: 1601\n")

os.makedirs(os.path.join(DEF, "cultures"), exist_ok=True)
write(os.path.join(DEF, "cultures", "en-US.tmdl"), """cultureInfo en-US

	linguisticMetadata =
			{
			  "Version": "1.0.0",
			  "Language": "en-US"
			}
		contentType: json
""")

write(os.path.join(ROOT, "definition.pbism"), """{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
  "version": "4.2",
  "settings": {
    "qnaEnabled": false
  }
}
""")
write(os.path.join(ROOT, ".platform"), """{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
  "metadata": {
    "type": "SemanticModel",
    "displayName": "Attendance Dashboard"
  },
  "config": {
    "version": "2.0",
    "logicalId": "%s"
  }
}
""" % tag("platform/semanticmodel"))

PBIP_ROOT = os.path.dirname(ROOT)
write(os.path.join(PBIP_ROOT, "Attendance Dashboard.pbip"), """{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
  "version": "1.0",
  "artifacts": [
    {
      "report": {
        "path": "Attendance Dashboard.Report"
      }
    }
  ],
  "settings": {
    "enableAutoRecovery": true
  }
}
""")
print("Model written:", ROOT, "| measures:", len(M))
