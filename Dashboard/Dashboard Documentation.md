# e& Attendance Management Dashboard — Documentation

This document describes the Power BI solution in `Dashboard/PowerBI_Source/`. You do not need to read it to use the dashboard; it is the reference for whoever maintains it.

## 1. Data source

| Item | Value |
|---|---|
| Folder | `C:\Users\aeldeneiny\OneDrive - e&\alaa_data` (parameter `pDataFolder`) |
| File types | `.xlsx`, `.xlsm`, `.xls`, `.csv` — sub-folders are scanned too |
| Ignored | files starting with `~$` or `.`, hidden files, anything inside a folder named `Dashboard`, sheets whose name starts with `_`, sheets/files that do not look like an attendance extract |
| Attendance sheet detection | a sheet is used when one of its first 40 rows contains at least 5 recognised attendance headers. That row becomes the header row, so title rows above the header are fine. Footer rows (no date and no name) are dropped. |
| Required columns | `Employee Code` and `Process Date`. If an attendance sheet lacks either, refresh stops with a clear message naming the file and sheet. |
| Optional columns | all others; missing ones are added as blank. Extra columns are ignored. Column order does not matter. |
| Header matching | spelling, spacing and case are ignored (`punch out temrinal`, `Punch Out Terminal` and `PunchOutTerminal` all map to `Punch Out Terminal`). Aliases are listed in the `HeaderMap` query. |

## 2. Monthly refresh process

1. Drop the new monthly file into the data folder (any name, any sheet name).
2. Open `e& Attendance Management Dashboard.pbix`.
3. Home → **Refresh**.
4. The new month appears automatically. Slicers set to **Latest Month** follow the newest month in the data.

Nothing in the queries needs editing. If the refresh fails, the error message names the file, sheet and missing column.

Parameters (Home → Transform data → Edit parameters):

| Parameter | Default | Meaning |
|---|---|---|
| `pDataFolder` | the OneDrive folder | root folder to scan |
| `pShortHoursReviewThreshold` | 4 | **review threshold only** – Present days with fewer recorded hours are flagged "Short Working Hours (review)" |
| `pLongHoursReviewThreshold` | 12 | **review threshold only** – days with more recorded hours are flagged "Long Working Hours (review)" |
| `pStatus2IsException` | true | whether a non-blank `Status2` counts as an attendance exception |

These thresholds are not HR policy. They exist so that unusual days can be reviewed. The values in force are shown on the Exceptions page (`Review Thresholds Text` measure) and stored in the `RefreshInfo` table.

## 3. Cleaning rules (Power Query)

| Field | Rule |
|---|---|
| Text fields | trimmed, hidden characters and non-breaking spaces removed, repeated spaces collapsed, empty → blank. Spelling and case are preserved. |
| Employee Code / Agency Emp ID | text (leading zeros kept), upper-cased so `ob60802` and `OB60802` are the same employee |
| Business Unit, Client, Cost Center, Shift, Source, Pay Calendar | blank → `(Blank)` so nothing disappears from charts; the Data Quality page counts them |
| Process Date | real date. Accepts dates, Excel serial numbers, `27-AUG-2026`, `27/08/2026` (day first), `2026-08-27` |
| Punch In / Out | real date-time. Accepts date-times, Excel serials, time-only values (combined with the process date) and text such as `27-AUG-2026 04:17:07 PM`. A time-only punch-out earlier than the punch-in is moved to the next day (night shift). |
| Total Hours | `09:09` = 9 h 09 min = **9.15** decimal hours (never 9.09). Also accepts time cells, durations and Excel day fractions. `--:--` or blank → blank. Values outside 0–24 h are invalid. |
| Status | classified into **Present / Absent / Leave / Holiday / Weekend - Rest Day / Other / Unknown** using neutral keyword rules (e.g. "Weekly Off" → Rest Day, "Sick Leave" → Leave). Unrecognised values become **Other** and are listed on the Exceptions & Data Quality page. Map them in the `StatusCategoryOverrides` query (Transform data). |
| Is Justified | Y/Yes/True/1/Justified → Justified; N/No/False/0 → Not Justified; pending → Pending; **blank → Not Recorded** (never assumed to be unjustified) |
| Status2 | kept as-is; `(None)` when blank |

### Hours: which value drives the dashboard

| Column | Meaning |
|---|---|
| `Total Hours (Source)` | the text exactly as in the file |
| `Source Worked Hours` | the source value converted to decimal hours |
| `Calculated Worked Hours` | Punch Out − Punch In in decimal hours (only when both punches are valid and the span is ≤ 24 h) |
| `Worked Hours Decimal` | **drives every hours measure**: the source value when valid, otherwise the calculated value, otherwise blank. Blank on exact duplicate records so hours are never double counted. |
| `Worked Hours Basis` | Source Total Hours / Calculated from Punches / Not Available |
| `Day Worked Hours` | total of the employee-day (sum of its non-duplicate records) — used for hour bands and the review thresholds |

The measure **Days Using Calculated Hours** shows how many days relied on the fallback.

## 4. Employee-day grain

* `Employee Day Key` = Employee Code + Process Date. All "days" measures are distinct counts of this key.
* **Exact duplicate records** (identical in every source column, even across files) are kept but flagged (`Is Duplicate Record`) and excluded from hours; `Duplicate Records` is shown on the Data Quality page.
* **Several different records on the same employee-day** are kept. The day's status is resolved with the priority Present → Other → Leave → Holiday → Rest Day → Absent → Unknown, hours are summed, and the day is listed under `Multiple-Record Employee Days` for review.
* Records without Employee Code or Process Date have no key; they never count as employee-days and appear under Data Quality.

## 5. Model structure (star schema)

| Table | Type | Notes |
|---|---|---|
| `FactAttendance` | Power Query | one row per source record + employee-day fields + flags + lineage (`Source File`, `Source Folder`, `Source Sheet`, `Source Row Number`, `Source Modified Date`) |
| `DimDate` | DAX calculated, marked as date table | whole months from first to last Process Date. `Reporting Month` labels the newest month "Latest Month". `Month Offset` = 0 for the latest month. |
| `DimEmployee` | DAX calculated | Employee Code, latest Employee Name, latest Agency Emp ID. Business Unit / Client / Cost Center / Shift are **not** stored here because they change over time; they stay on each record. |
| `DimBusinessUnit`, `DimClient`, `DimCostCenter`, `DimShift`, `DimSource`, `DimPayCalendar` | DAX calculated | distinct values as recorded |
| `DimStatus` | DAX calculated | Attendance Status → Status Category |
| `DimExceptionType`, `DimDQIssueType`, `DimHour`, `DimInsight` | disconnected helpers | used with `Exception Days by Type`, `DQ Issue Records by Type`, punch-hour charts and the insight panel |
| `RefreshInfo` | Power Query, hidden | refresh timestamp and parameter values |
| `_Measures` | measures only | display folders 01 Workforce … 09 Employee 360 |

All relationships are one-to-many, single direction, dimension → fact. Technical keys and flags are hidden.

## 6. Business definitions

| Measure | Definition |
|---|---|
| Active Employees | distinct Employee Codes with at least one record in the selection |
| Employee Days | distinct employee-days |
| Present / Absent / Leave / Holiday / Rest / Other / Unknown Days | employee-days by resolved status category |
| Present % of Recorded Days | Present Days ÷ Employee Days. The source has no roster, so this is a share of **recorded** days, not a true attendance rate. |
| Present % (Excl. Leave & Rest Days) | Present Days ÷ (Employee Days − Leave − Holiday − Rest Days) |
| Total Worked Hours | sum of `Worked Hours Decimal` (duplicates excluded) |
| Worked Days | employee-days with hours > 0 |
| Avg Hours / Worked Day | Total Worked Hours ÷ Worked Days (absent / leave days are not in the denominator) |
| Avg Hours / Employee | Total Worked Hours ÷ Active Employees |
| Punch-Expected Days | employee-days with a Present status or at least one punch |
| Missing Punch Days | punch-expected days with Punch In and/or Punch Out missing |
| Missing Punch % | Missing Punch Days ÷ Punch-Expected Days |
| Exception Days | employee-days with at least one of: Absent, Missing Punch, Unrecognised Status (Other/Unknown), Short Working Hours (review), Long Working Hours (review), Status2 Condition |
| Exception % of Recorded Days | Exception Days ÷ Employee Days |
| Justified / Not Justified / Pending / Justification Not Recorded | exception days by `Is Justified` category |
| Justified % (Where Recorded) | Justified ÷ (Justified + Not Justified) |
| Review Reasons | plain list of the exception counts behind an employee's ranking (there is no score) |
| DQ Issue Records | records with a data-integrity issue: missing code/name/date, blank or invalid Total Hours on Present records, unparseable punch/date text, punch-out before punch-in, exact duplicate, blank status, unrecognised status, blank Business Unit / Client / Shift |
| Data Quality % (Clean Records) | 1 − DQ Issue Records ÷ Attendance Records |
| … PM | same measure for the previous month (`DATEADD(DimDate[Date], -1, MONTH)`) |
| … MoM / MoM % | absolute / relative change versus the previous month |
| … Change (pp) | percentage-point change for rates |
| Latest Data Date, Earliest Data Date, Months Loaded, Source Files Loaded | dataset-wide (ignore slicers) |
| Last Refresh | timestamp written by Power Query at refresh time (local machine time in Desktop, UTC in the Power BI service) |

Conditional formatting on the attention tables turns a rate red when it is more than 1.5× the overall rate for the same period and the row has at least 20 employee-days. This is a visual review aid, not a policy threshold.

## 7. Report pages

| Page | Purpose |
|---|---|
| Overview | 7 KPIs with previous-month notes, 13-month trends (ignore the month slicer), Business Unit view, factual insight panel, management attention table |
| Attendance | status mix by month / Business Unit / Shift / weekday, BU → Client → Cost Center matrix |
| Hours | hours trends, hour bands, punch pattern by weekday, punch-in / punch-out by hour of day, averages by BU and Shift |
| Workforce | headcount by BU / Client / Shift / Source / Pay Calendar and a four-level matrix |
| Exceptions | exception trend by type, exceptions by BU, data-quality issues by type, *Employees Requiring Attendance Review* ranking, exportable exception records |
| Employee 360 | drill-through page (right-click an employee → Drill through). Hidden from the page list. |
| Records | full exportable record list with an employee search slicer |
| Tooltip - Summary | hidden tooltip page used by Business Unit / Client charts |

Slicers (Year, Reporting Month, Business Unit, Client, Cost Center, Shift, Source, Pay Calendar, Status Category) are synchronised across the analytical pages. The employee slicer on the Records page is local. The Reporting Month slicer defaults to **Latest Month**.

## 8. Known data limitations

* No official shift schedule (start/end times) is in the source, so **no Late / Early-departure metric** is computed. Punch-time distributions are descriptive only.
* No roster / expected-attendance list, so **attendance rates are shares of recorded days**.
* The meaning of `Status2` and of a blank `Is Justified` is not documented in the source. Status2 is treated as a review condition (switchable by parameter); blank justification is reported as "Not Recorded".
* Attendance hours are **not productivity**.
* If a night-shift punch-out carries the same date as the punch-in in the source (date-time text), the record is flagged "Punch Out Before Punch In" rather than silently corrected; the source Total Hours still drives the hours.
* `.xls` (Excel 97-2003) files need the Microsoft Access Database Engine on the refreshing machine; `.xlsx`/`.csv` need nothing extra.

## 9. Maintenance

* `tools/gen_model.py` and `tools/gen_report.py` regenerate the PBIP source files; `tools/validate_pbir.py` and `tools/check_references.py` check them. Only needed if you change the design outside Power BI Desktop.
* `tools/validate_source.py "<data folder>" --out report.md` profiles the real files (distinct statuses, months, duplicates, missing punches) and prints the totals the dashboard should show for every month, Business Unit and Client. Filters: `--month 2026-08 --bu eMinds --client SMB-41984 --shift "..." --employee OB60802`.
* `tools/make_sample_data.py` creates synthetic test files covering the edge cases (do not mix them with real data).
