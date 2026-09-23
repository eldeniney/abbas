# Attendance source validation

Folder: `Dashboard/sample_data` (synthetic test data)  
Generated: 23 Sep 2026 06:31

## Data discovery (QA summary)
- Files used: 3 -> Attendance June 2026.xlsx, JUL-2026_attendance_export.xlsx, attendance_2026-08.csv
- Records: 5,541 | distinct employees: 60 | employee-days: 5,520
- Process Date range: 2026-06-01 to 2026-08-31 | months: ['2026-06', '2026-07', '2026-08']
- Records without Employee Code: 3 | without Process Date: 6
- Exact duplicate records: 6 | employee-days with several records: 6
- Total Hours blank on Present records: 203 | invalid Total Hours: 0
- Missing punch in: 83 | missing punch out: 146 | both: 23
- Hours basis: {'Source Total Hours': 3480, 'Not Available': 2049, 'Calculated from Punches': 12}
- Distinct Status (10): Present = 3,424, Weekly Off = 1,094, WEEKEND = 472, Absent = 152, present = 142, PRESENT = 128, Annual Leave = 57, Sick Leave = 43, WFH = 16, (blank) = 13
- Distinct Status2 (2): (blank) = 5,531, Late In = 10
- Distinct Is Justified (3): (blank) = 5,440, N = 52, Y = 49
- Distinct Source Name (1): OUTSOURCE = 5,541
- Distinct Business Unit (3): eMinds = 3,267, Etisalat Services = 2,270, (Blank) = 4
- Distinct Pay Calendar (3): 40 Hours Weekly = 2,270, 48 Hours Weekly = 2,167, 45 Hours Weekly = 1,104
- Status -> category: Present -> Present, Weekly Off -> Weekend / Rest Day, WEEKEND -> Weekend / Rest Day, Sick Leave -> Leave, Annual Leave -> Leave, Absent -> Absent, (blank) -> Unknown, WFH -> Other, present -> Present, PRESENT -> Present
- Employees whose Business Unit / Client / Cost Center / Shift changes over time: Business Unit: 2, Client Name: 1, Cost Center: 1, Shift Name: 1

| Month | Records | Employees | Files |
|---|---|---|---|
| 2026-06 | 1,805 | 60 | 1 |
| 2026-07 | 1,865 | 60 | 1 |
| 2026-08 | 1,865 | 60 | 1 |

## Expected dashboard figures
### All data

| Metric | Value |
|---|---|
| Attendance Records | 5,541 |
| Duplicate Records | 6 |
| Active Employees | 60 |
| Employee Days | 5,520 |
| Present Days | 3,679 |
| Absent Days | 152 |
| Leave Days | 100 |
| Holiday Days | 0 |
| Rest Days | 1,560 |
| Other Status Days | 16 |
| Unknown Status Days | 13 |
| Total Worked Hours | 32132.92 |
| Worked Days | 3,461 |
| Missing Punch Days | 205 |
| Punch-Expected Days | 3,679 |
| Exception Days | 410 |
| Employees With Exceptions | 60 |
| Multiple-Record Employee Days | 6 |
| DQ Issue Records | 254 |
| Present % of Recorded Days | 0.6665 |
| Avg Hours / Worked Day | 9.28 |
| Missing Punch % | 0.0557 |

### Month 2026-06

| Metric | Value |
|---|---|
| Attendance Records | 1,805 |
| Duplicate Records | 2 |
| Active Employees | 60 |
| Employee Days | 1,800 |
| Present Days | 1,233 |
| Absent Days | 42 |
| Leave Days | 38 |
| Holiday Days | 0 |
| Rest Days | 480 |
| Other Status Days | 4 |
| Unknown Status Days | 3 |
| Total Worked Hours | 10683.17 |
| Worked Days | 1,155 |
| Missing Punch Days | 74 |
| Punch-Expected Days | 1,233 |
| Exception Days | 132 |
| Employees With Exceptions | 54 |
| Multiple-Record Employee Days | 2 |
| DQ Issue Records | 84 |
| Present % of Recorded Days | 0.685 |
| Avg Hours / Worked Day | 9.25 |
| Missing Punch % | 0.06 |

### Month 2026-07

| Metric | Value |
|---|---|
| Attendance Records | 1,865 |
| Duplicate Records | 2 |
| Active Employees | 60 |
| Employee Days | 1,860 |
| Present Days | 1,288 |
| Absent Days | 53 |
| Leave Days | 33 |
| Holiday Days | 0 |
| Rest Days | 480 |
| Other Status Days | 3 |
| Unknown Status Days | 3 |
| Total Worked Hours | 11353.02 |
| Worked Days | 1,223 |
| Missing Punch Days | 61 |
| Punch-Expected Days | 1,288 |
| Exception Days | 127 |
| Employees With Exceptions | 54 |
| Multiple-Record Employee Days | 2 |
| DQ Issue Records | 71 |
| Present % of Recorded Days | 0.6925 |
| Avg Hours / Worked Day | 9.28 |
| Missing Punch % | 0.0474 |

### Month 2026-08

| Metric | Value |
|---|---|
| Attendance Records | 1,865 |
| Duplicate Records | 2 |
| Active Employees | 60 |
| Employee Days | 1,860 |
| Present Days | 1,158 |
| Absent Days | 57 |
| Leave Days | 29 |
| Holiday Days | 0 |
| Rest Days | 600 |
| Other Status Days | 9 |
| Unknown Status Days | 7 |
| Total Worked Hours | 10059.95 |
| Worked Days | 1,083 |
| Missing Punch Days | 70 |
| Punch-Expected Days | 1,158 |
| Exception Days | 151 |
| Employees With Exceptions | 58 |
| Multiple-Record Employee Days | 2 |
| DQ Issue Records | 93 |
| Present % of Recorded Days | 0.6226 |
| Avg Hours / Worked Day | 9.29 |
| Missing Punch % | 0.0604 |

### By Business Unit (selection)
| Business Unit | Employees | Employee Days | Present % | Exception Days | Missing Punch % | Total Hours |
|---|---|---|---|---|---|---|
| (Blank) | 1 | 4 | 0.5 | 0 | 0.0 | 19.12 |
| Etisalat Services | 25 | 2,270 | 0.6665 | 158 | 0.0502 | 12,761.62 |
| eMinds | 36 | 3,246 | 0.6667 | 252 | 0.0596 | 19,352.18 |

### By Client (selection)
| Client | Employees | Employee Days | Present % | Exception Days | Missing Punch % | Total Hours |
|---|---|---|---|---|---|---|
| CONSUMER-22011 | 12 | 1,104 | 0.6685 | 89 | 0.0678 | 6,505.57 |
| ENTERPRISE-30510 | 13 | 1,166 | 0.6698 | 78 | 0.0499 | 7,013.63 |
| ENTERPRISE-30511 | 12 | 1,104 | 0.663 | 80 | 0.0505 | 5,747.98 |
| SMB-41984 | 12 | 1,042 | 0.6679 | 86 | 0.0647 | 6,283.82 |
| SMB-41985 | 12 | 1,104 | 0.663 | 77 | 0.0464 | 6,581.92 |