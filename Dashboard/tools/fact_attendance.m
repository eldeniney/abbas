let
    // ---------------------------------------------------------------
    // 1. Read every monthly file in the data folder and combine
    // ---------------------------------------------------------------
    Files = SourceFiles,
    WithData = Table.AddColumn(Files, "Data", each fnReadAttendanceFile([Content], [Extension], [Name]), type table),
    NoContent = Table.RemoveColumns(WithData, {"Content", "Extension"}),
    Renamed = Table.RenameColumns(NoContent, {{"Name", "Source File"}, {"Folder Path", "Source Folder"}, {"Date modified", "Source Modified Date"}}),
    Expanded = Table.ExpandTableColumn(Renamed, "Data", CanonicalColumns & {"Source Sheet", "Source Row Number"}),

    // ---------------------------------------------------------------
    // 2. Clean text fields (trim, hidden characters, empty -> null)
    // ---------------------------------------------------------------
    TextCols = {"Employee Code", "Agency Emp ID", "Employee Name", "Source Name", "Business Unit", "Client Name", "Cost Center", "Pay Calendar", "Shift Name", "Day", "Status", "Punch In Terminal", "Punch Out Terminal", "Is Justified", "Status2"},
    Cleaned = Table.TransformColumns(Expanded, List.Transform(TextCols, each {_, fnCleanText, type nullable text})),
    UpperCodes = Table.TransformColumns(Cleaned, {{"Employee Code", each if _ = null then null else Text.Upper(_), type nullable text}, {"Agency Emp ID", each if _ = null then null else Text.Upper(_), type nullable text}}),

    // ---------------------------------------------------------------
    // 3. Parse dates, punches and hours (raw values are kept for DQ)
    // ---------------------------------------------------------------
    P1 = Table.AddColumn(UpperCodes, "Process Date Parsed", each fnParseDate([Process Date]), type nullable date),
    P2 = Table.AddColumn(P1, "Punch In Parsed", each fnParseDateTime([Punch In Time], [Process Date Parsed]), type nullable datetime),
    P3 = Table.AddColumn(P2, "Punch Out Parsed0", each fnParseDateTime([Punch Out Time], [Process Date Parsed]), type nullable datetime),
    // Time-only punch-out values (no date part in the source) that fall before the punch-in belong to the next day (night shift)
    P4 = Table.AddColumn(P3, "Punch Out Parsed", each
        let
            raw = [Punch Out Time],
            timeOnly = raw is time or (raw is number and raw < 1) or (raw is text and not Text.Contains(raw, "-") and not Text.Contains(raw, "/")),
            po = [Punch Out Parsed0],
            pi = [Punch In Parsed]
        in
            if timeOnly and po <> null and pi <> null and po < pi then po + #duration(1, 0, 0, 0) else po, type nullable datetime),
    P5 = Table.AddColumn(P4, "Source Worked Hours", each fnParseHours([Total Hours]), type nullable number),
    P6 = Table.AddColumn(P5, "Total Hours (Source)", each fnCleanText([Total Hours]), type nullable text),
    P7 = Table.AddColumn(P6, "Punch In (Unparsed)", each if fnCleanText([Punch In Time]) <> null and [Punch In Parsed] = null then fnCleanText([Punch In Time]) else null, type nullable text),
    P8 = Table.AddColumn(P7, "Punch Out (Unparsed)", each if fnCleanText([Punch Out Time]) <> null and [Punch Out Parsed] = null then fnCleanText([Punch Out Time]) else null, type nullable text),
    P9 = Table.AddColumn(P8, "Process Date (Unparsed)", each if fnCleanText([Process Date]) <> null and [Process Date Parsed] = null then fnCleanText([Process Date]) else null, type nullable text),
    DropRaw = Table.RemoveColumns(P9, {"Process Date", "Punch In Time", "Punch Out Time", "Total Hours", "Punch Out Parsed0"}),
    RenParsed = Table.RenameColumns(DropRaw, {{"Process Date Parsed", "Process Date"}, {"Punch In Parsed", "Punch In Time"}, {"Punch Out Parsed", "Punch Out Time"}}),

    // ---------------------------------------------------------------
    // 4. Hours: source value drives the dashboard; punches are the fallback
    // ---------------------------------------------------------------
    H1 = Table.AddColumn(RenParsed, "Calculated Worked Hours", each
        if [Punch In Time] <> null and [Punch Out Time] <> null and [Punch Out Time] > [Punch In Time]
        then let h = Duration.TotalHours([Punch Out Time] - [Punch In Time]) in (if h <= 24 then Number.Round(h, 4) else null)
        else null, type nullable number),
    H2 = Table.AddColumn(H1, "Source Hours Valid", each if [Source Worked Hours] <> null and [Source Worked Hours] >= 0 and [Source Worked Hours] <= 24 then 1 else 0, Int64.Type),
    H3 = Table.AddColumn(H2, "Record Worked Hours", each if [Source Hours Valid] = 1 then Number.Round([Source Worked Hours], 4) else [Calculated Worked Hours], type nullable number),
    H4 = Table.AddColumn(H3, "Worked Hours Basis", each if [Source Hours Valid] = 1 then "Source Total Hours" else if [Calculated Worked Hours] <> null then "Calculated from Punches" else "Not Available", type text),

    // ---------------------------------------------------------------
    // 5. Status classification (per distinct value, then joined back)
    // ---------------------------------------------------------------
    S1 = Table.AddColumn(H4, "Status Key", each if [Status] = null then "" else Text.Lower([Status]), type text),
    StatusMap = Table.Buffer(Table.AddColumn(Table.Distinct(Table.SelectColumns(S1, {"Status Key", "Status"})), "Record Status Category", each fnStatusCategory([Status]), type text)),
    StatusMapKeyed = Table.RenameColumns(Table.Distinct(Table.SelectColumns(StatusMap, {"Status Key", "Record Status Category"}), {"Status Key"}), {{"Status Key", "Status Key_"}}),
    S2 = Table.Join(S1, "Status Key", StatusMapKeyed, "Status Key_", JoinKind.LeftOuter),
    S3 = Table.RemoveColumns(S2, {"Status Key_"}),
    S4 = Table.AddColumn(S3, "Record Status Priority", each
        let c = [Record Status Category] in
        if c = "Present" then 1 else if c = "Other" then 2 else if c = "Leave" then 3 else if c = "Holiday" then 4
        else if c = "Weekend / Rest Day" then 5 else if c = "Absent" then 6 else 7, Int64.Type),
    S5 = Table.AddColumn(S4, "Justification Category", each fnJustificationCategory([Is Justified]), type text),
    S6 = Table.AddColumn(S5, "Status2 Category", each if [Status2] = null then "(None)" else [Status2], type text),
    S7 = Table.AddColumn(S6, "Status2 Flag", each if [Status2] = null then 0 else 1, Int64.Type),

    // ---------------------------------------------------------------
    // 6. Record-level punch flags (only where a punch is expected)
    // ---------------------------------------------------------------
    K1 = Table.AddColumn(S7, "Punch Expected Flag", each if [Record Status Category] = "Present" or [Punch In Time] <> null or [Punch Out Time] <> null then 1 else 0, Int64.Type),
    K2 = Table.AddColumn(K1, "Missing Punch In Flag", each if [Punch In Time] = null and [Punch Expected Flag] = 1 then 1 else 0, Int64.Type),
    K3 = Table.AddColumn(K2, "Missing Punch Out Flag", each if [Punch Out Time] = null and [Punch Expected Flag] = 1 then 1 else 0, Int64.Type),
    K4 = Table.AddColumn(K3, "Missing Both Punches Flag", each if [Missing Punch In Flag] = 1 and [Missing Punch Out Flag] = 1 then 1 else 0, Int64.Type),
    K5 = Table.AddColumn(K4, "Missing Punch Flag", each if [Missing Punch In Flag] = 1 or [Missing Punch Out Flag] = 1 then 1 else 0, Int64.Type),
    K6 = Table.AddColumn(K5, "Complete Punch Flag", each if [Punch In Time] <> null and [Punch Out Time] <> null then 1 else 0, Int64.Type),
    K7 = Table.AddColumn(K6, "Punch Out Before In Flag", each if [Punch In Time] <> null and [Punch Out Time] <> null and [Punch Out Time] < [Punch In Time] then 1 else 0, Int64.Type),
    K8 = Table.AddColumn(K7, "Punch Crosses Midnight Flag", each if [Punch In Time] <> null and [Punch Out Time] <> null and DateTime.Date([Punch Out Time]) > DateTime.Date([Punch In Time]) then 1 else 0, Int64.Type),
    K9 = Table.AddColumn(K8, "Punch In Minutes From Midnight", each if [Punch In Time] = null then null else Time.Hour(DateTime.Time([Punch In Time])) * 60 + Time.Minute(DateTime.Time([Punch In Time])) + Time.Second(DateTime.Time([Punch In Time])) / 60, type nullable number),
    K10 = Table.AddColumn(K9, "Punch Out Minutes From Midnight", each if [Punch Out Time] = null then null else Time.Hour(DateTime.Time([Punch Out Time])) * 60 + Time.Minute(DateTime.Time([Punch Out Time])) + Time.Second(DateTime.Time([Punch Out Time])) / 60, type nullable number),
    K11 = Table.AddColumn(K10, "Punch In Hour", each if [Punch In Time] = null then null else Time.Hour(DateTime.Time([Punch In Time])), Int64.Type),
    K12 = Table.AddColumn(K11, "Punch Out Hour", each if [Punch Out Time] = null then null else Time.Hour(DateTime.Time([Punch Out Time])), Int64.Type),
    K13 = Table.AddColumn(K12, "Punch In Hour Label", each if [Punch In Hour] = null then "No Punch In" else Text.PadStart(Text.From([Punch In Hour]), 2, "0") & ":00", type text),
    K14 = Table.AddColumn(K13, "Punch Out Hour Label", each if [Punch Out Hour] = null then "No Punch Out" else Text.PadStart(Text.From([Punch Out Hour]), 2, "0") & ":00", type text),

    // ---------------------------------------------------------------
    // 7. Keys, duplicate detection, buffering
    // ---------------------------------------------------------------
    Key1 = Table.AddColumn(K14, "Employee Day Key", each if [Employee Code] = null or [Process Date] = null then null else [Employee Code] & "|" & Date.ToText([Process Date], [Format = "yyyyMMdd"]), type nullable text),
    Key2 = Table.AddIndexColumn(Key1, "Index", 0, 1),
    Key3 = Table.AddColumn(Key2, "RowSig", each Text.Combine(List.Transform(
        {[Employee Code], [Agency Emp ID], [Employee Name], [Source Name], [Business Unit], [Client Name], [Cost Center], [Pay Calendar], [Shift Name], [Process Date], [Day], [Punch In Time], [Punch Out Time], [Total Hours (Source)], [Status], [Punch In Terminal], [Punch Out Terminal], [Is Justified], [Status2]},
        each if _ = null then "" else Text.From(_)), "|"), type text),
    Buffered = Table.Buffer(Key3),
    DupGroups = Table.Group(Buffered, {"RowSig"}, {{"First Index", each List.Min([Index]), Int64.Type}}),
    DupGroupsKeyed = Table.RenameColumns(DupGroups, {{"RowSig", "RowSig_"}}),
    D1 = Table.Join(Buffered, "RowSig", DupGroupsKeyed, "RowSig_", JoinKind.LeftOuter),
    D2 = Table.AddColumn(D1, "Is Duplicate Record", each if [Index] <> [First Index] then 1 else 0, Int64.Type),
    D3 = Table.AddColumn(D2, "Worked Hours Decimal", each if [Is Duplicate Record] = 1 then null else [Record Worked Hours], type nullable number),
    D4 = Table.AddColumn(D3, "Non Duplicate", each 1 - [Is Duplicate Record], Int64.Type),
    D5 = Table.AddColumn(D4, "Status Sort Key", each Text.From([Record Status Priority]) & "|" & [Record Status Category] & "|" & (if [Status] = null then "" else [Status]), type text),
    D6 = Table.RemoveColumns(D5, {"RowSig", "RowSig_", "First Index"}),
    Buffered2 = Table.Buffer(D6),

    // ---------------------------------------------------------------
    // 8. Employee-day aggregation (one attendance day = one Employee Day Key)
    // ---------------------------------------------------------------
    DayAgg = Table.Group(Buffered2, {"Employee Day Key"}, {
        {"Day Record Count", each List.Sum([Non Duplicate]), Int64.Type},
        {"Day First Index", each List.Min([Index]), Int64.Type},
        {"Day Status Sort", each List.Min([Status Sort Key]), type text},
        {"Day Worked Hours", each List.Sum([Worked Hours Decimal]), type nullable number},
        {"Day Missing Punch Flag", each List.Max([Missing Punch Flag]), Int64.Type},
        {"Day Punch Expected Flag", each List.Max([Punch Expected Flag]), Int64.Type},
        {"Day Status2 Flag", each List.Max([Status2 Flag]), Int64.Type}
    }),
    DayAggKeyed = Table.RenameColumns(DayAgg, {{"Employee Day Key", "Employee Day Key_"}}),
    A1 = Table.Join(Buffered2, "Employee Day Key", DayAggKeyed, "Employee Day Key_", JoinKind.LeftOuter),
    A2 = Table.RemoveColumns(A1, {"Employee Day Key_"}),
    A3 = Table.AddColumn(A2, "Is Day Primary", each if [Employee Day Key] <> null and [Index] = [Day First Index] then 1 else 0, Int64.Type),
    A4 = Table.AddColumn(A3, "Multiple Records Day Flag", each if [Employee Day Key] <> null and [Day Record Count] > 1 then 1 else 0, Int64.Type),
    A5 = Table.AddColumn(A4, "Status Category", each let parts = Text.Split([Day Status Sort], "|") in parts{1}, type text),
    A6 = Table.AddColumn(A5, "Attendance Status", each let parts = Text.Split([Day Status Sort], "|") in (if parts{2} = "" then "(Blank)" else parts{2}), type text),
    A7 = Table.AddColumn(A6, "Status Category Order", each
        let c = [Status Category] in
        if c = "Present" then 1 else if c = "Absent" then 2 else if c = "Leave" then 3 else if c = "Holiday" then 4
        else if c = "Weekend / Rest Day" then 5 else if c = "Other" then 6 else 7, Int64.Type),
    A8 = Table.AddColumn(A7, "Worked Hours Band", each
        let h = [Day Worked Hours] in
        if h = null or h <= 0 then "No Hours Recorded" else if h < 4 then "< 4 hrs" else if h < 6 then "4 – 6 hrs" else if h < 8 then "6 – 8 hrs"
        else if h < 10 then "8 – 10 hrs" else if h < 12 then "10 – 12 hrs" else "12+ hrs", type text),
    A9 = Table.AddColumn(A8, "Worked Hours Band Order", each
        let h = [Day Worked Hours] in
        if h = null or h <= 0 then 0 else if h < 4 then 1 else if h < 6 then 2 else if h < 8 then 3 else if h < 10 then 4 else if h < 12 then 5 else 6, Int64.Type),

    // ---------------------------------------------------------------
    // 9. Attendance exceptions (day level, neutral wording)
    // ---------------------------------------------------------------
    E1 = Table.AddColumn(A9, "Exception Absent Flag", each if [Status Category] = "Absent" then 1 else 0, Int64.Type),
    E2 = Table.AddColumn(E1, "Exception Missing Punch Flag", each if [Day Missing Punch Flag] = 1 then 1 else 0, Int64.Type),
    E3 = Table.AddColumn(E2, "Exception Unrecognised Status Flag", each if [Status Category] = "Other" or [Status Category] = "Unknown" then 1 else 0, Int64.Type),
    E4 = Table.AddColumn(E3, "Exception Short Hours Flag", each if [Status Category] = "Present" and [Day Worked Hours] <> null and [Day Worked Hours] > 0 and [Day Worked Hours] < pShortHoursReviewThreshold then 1 else 0, Int64.Type),
    E5 = Table.AddColumn(E4, "Exception Long Hours Flag", each if [Day Worked Hours] <> null and [Day Worked Hours] > pLongHoursReviewThreshold then 1 else 0, Int64.Type),
    E6 = Table.AddColumn(E5, "Exception Status2 Flag", each if pStatus2IsException and [Day Status2 Flag] = 1 then 1 else 0, Int64.Type),
    E7 = Table.AddColumn(E6, "Exception Types", each Text.Combine(List.Select({
            if [Exception Absent Flag] = 1 then "Absent" else null,
            if [Exception Missing Punch Flag] = 1 then "Missing Punch" else null,
            if [Exception Unrecognised Status Flag] = 1 then "Unrecognised Status" else null,
            if [Exception Short Hours Flag] = 1 then "Short Working Hours (review)" else null,
            if [Exception Long Hours Flag] = 1 then "Long Working Hours (review)" else null,
            if [Exception Status2 Flag] = 1 then "Status2 Condition" else null
        }, each _ <> null), "; "), type text),
    E8 = Table.AddColumn(E7, "Exception Type Count", each [Exception Absent Flag] + [Exception Missing Punch Flag] + [Exception Unrecognised Status Flag] + [Exception Short Hours Flag] + [Exception Long Hours Flag] + [Exception Status2 Flag], Int64.Type),
    E9 = Table.AddColumn(E8, "Exception Flag", each if [Exception Type Count] > 0 then 1 else 0, Int64.Type),

    // ---------------------------------------------------------------
    // 10. Data-quality flags (record level)
    // ---------------------------------------------------------------
    Q1 = Table.AddColumn(E9, "DQ Missing Employee Code", each if [Employee Code] = null then 1 else 0, Int64.Type),
    Q2 = Table.AddColumn(Q1, "DQ Missing Employee Name", each if [Employee Name] = null then 1 else 0, Int64.Type),
    Q3 = Table.AddColumn(Q2, "DQ Missing Process Date", each if [Process Date] = null then 1 else 0, Int64.Type),
    Q4 = Table.AddColumn(Q3, "DQ Missing Total Hours", each if [Total Hours (Source)] = null and [Record Status Category] = "Present" then 1 else 0, Int64.Type),
    Q5 = Table.AddColumn(Q4, "DQ Invalid Total Hours", each if [Total Hours (Source)] <> null and [Source Hours Valid] = 0 and Text.Length(Text.Select([Total Hours (Source)], {"0".."9"})) > 0 then 1 else 0, Int64.Type),
    Q6 = Table.AddColumn(Q5, "DQ Invalid Punch In", each if [Punch In (Unparsed)] <> null then 1 else 0, Int64.Type),
    Q7 = Table.AddColumn(Q6, "DQ Invalid Punch Out", each if [Punch Out (Unparsed)] <> null then 1 else 0, Int64.Type),
    Q8 = Table.AddColumn(Q7, "DQ Punch Out Before In", each [Punch Out Before In Flag], Int64.Type),
    Q9 = Table.AddColumn(Q8, "DQ Duplicate Record", each [Is Duplicate Record], Int64.Type),
    Q10 = Table.AddColumn(Q9, "DQ Blank Status", each if [Status] = null then 1 else 0, Int64.Type),
    Q11 = Table.AddColumn(Q10, "DQ Unrecognised Status", each if [Record Status Category] = "Other" then 1 else 0, Int64.Type),
    Q12 = Table.AddColumn(Q11, "DQ Blank Business Unit", each if [Business Unit] = null then 1 else 0, Int64.Type),
    Q13 = Table.AddColumn(Q12, "DQ Blank Client", each if [Client Name] = null then 1 else 0, Int64.Type),
    Q14 = Table.AddColumn(Q13, "DQ Blank Shift", each if [Shift Name] = null then 1 else 0, Int64.Type),
    Q15 = Table.AddColumn(Q14, "DQ Hours Differ From Punches", each if [Source Hours Valid] = 1 and [Calculated Worked Hours] <> null and Number.Abs([Source Worked Hours] - [Calculated Worked Hours]) > 0.5 then 1 else 0, Int64.Type),
    Q16 = Table.AddColumn(Q15, "DQ Issue Types", each Text.Combine(List.Select({
            if [DQ Missing Employee Code] = 1 then "Missing Employee Code" else null,
            if [DQ Missing Employee Name] = 1 then "Missing Employee Name" else null,
            if [DQ Missing Process Date] = 1 then "Missing Process Date" else null,
            if [DQ Missing Total Hours] = 1 then "Missing Total Hours (Present)" else null,
            if [DQ Invalid Total Hours] = 1 then "Invalid Total Hours" else null,
            if [DQ Invalid Punch In] = 1 then "Invalid Punch In" else null,
            if [DQ Invalid Punch Out] = 1 then "Invalid Punch Out" else null,
            if [DQ Punch Out Before In] = 1 then "Punch Out Before Punch In" else null,
            if [DQ Duplicate Record] = 1 then "Duplicate Record" else null,
            if [DQ Blank Status] = 1 then "Blank Status" else null,
            if [DQ Unrecognised Status] = 1 then "Unrecognised Status" else null,
            if [DQ Blank Business Unit] = 1 then "Blank Business Unit" else null,
            if [DQ Blank Client] = 1 then "Blank Client" else null,
            if [DQ Blank Shift] = 1 then "Blank Shift" else null
        }, each _ <> null), "; "), type text),
    Q17 = Table.AddColumn(Q16, "DQ Issue Count", each [DQ Missing Employee Code] + [DQ Missing Employee Name] + [DQ Missing Process Date] + [DQ Missing Total Hours] + [DQ Invalid Total Hours] + [DQ Invalid Punch In] + [DQ Invalid Punch Out] + [DQ Punch Out Before In] + [DQ Duplicate Record] + [DQ Blank Status] + [DQ Unrecognised Status] + [DQ Blank Business Unit] + [DQ Blank Client] + [DQ Blank Shift], Int64.Type),
    Q18 = Table.AddColumn(Q17, "DQ Issue Flag", each if [DQ Issue Count] > 0 then 1 else 0, Int64.Type),

    // ---------------------------------------------------------------
    // 11. Latest employee attributes (for the Employee dimension only;
    //     historical Business Unit / Client / Shift stay on each record)
    // ---------------------------------------------------------------
    EmpSortAdded = Table.AddColumn(Q18, "Emp Sort Key", each
        (if [Process Date] = null then "00000000" else Date.ToText([Process Date], [Format = "yyyyMMdd"])) & "|" & (if [Employee Name] = null then "" else [Employee Name]) & "|" & (if [Agency Emp ID] = null then "" else [Agency Emp ID]), type text),
    EmpAgg = Table.Group(Table.SelectRows(EmpSortAdded, each [Employee Code] <> null), {"Employee Code"}, {{"Emp Latest", each List.Max([Emp Sort Key]), type text}}),
    EmpAggKeyed = Table.RenameColumns(EmpAgg, {{"Employee Code", "Employee Code_"}}),
    L1 = Table.Join(EmpSortAdded, "Employee Code", EmpAggKeyed, "Employee Code_", JoinKind.LeftOuter),
    L2 = Table.AddColumn(L1, "Employee Name (Latest)", each if [Emp Latest] = null then null else let p = Text.Split([Emp Latest], "|") in (if p{1} = "" then null else p{1}), type nullable text),
    L3 = Table.AddColumn(L2, "Agency Emp ID (Latest)", each if [Emp Latest] = null then null else let p = Text.Split([Emp Latest], "|") in (if p{2} = "" then null else p{2}), type nullable text),

    // ---------------------------------------------------------------
    // 12. Final shaping
    // ---------------------------------------------------------------
    BlankFill = Table.TransformColumns(L3, List.Transform({"Source Name", "Business Unit", "Client Name", "Cost Center", "Pay Calendar", "Shift Name"}, each {_, (v) => if v = null then "(Blank)" else v, type text})),
    MonthStart = Table.AddColumn(BlankFill, "Process Month Start", each if [Process Date] = null then null else Date.StartOfMonth([Process Date]), type nullable date),
    Removed = Table.RemoveColumns(MonthStart, {"Index", "Status Key", "Status Sort Key", "Day Status Sort", "Day First Index", "Non Duplicate", "Emp Sort Key", "Emp Latest", "Employee Code_", "Source Hours Valid", "Record Status Priority"}),
    Typed = Table.TransformColumnTypes(Removed, {
        {"Employee Code", type text}, {"Agency Emp ID", type text}, {"Employee Name", type text}, {"Source Name", type text}, {"Business Unit", type text},
        {"Client Name", type text}, {"Cost Center", type text}, {"Pay Calendar", type text}, {"Shift Name", type text}, {"Process Date", type date},
        {"Day", type text}, {"Punch In Time", type datetime}, {"Punch Out Time", type datetime}, {"Status", type text}, {"Punch In Terminal", type text},
        {"Punch Out Terminal", type text}, {"Is Justified", type text}, {"Status2", type text}, {"Source File", type text}, {"Source Folder", type text},
        {"Source Sheet", type text}, {"Source Row Number", Int64.Type}, {"Source Modified Date", type datetime}, {"Source Worked Hours", type number},
        {"Calculated Worked Hours", type number}, {"Record Worked Hours", type number}, {"Worked Hours Decimal", type number}, {"Day Worked Hours", type number},
        {"Punch In Minutes From Midnight", type number}, {"Punch Out Minutes From Midnight", type number}, {"Employee Day Key", type text},
        {"Employee Name (Latest)", type text}, {"Agency Emp ID (Latest)", type text}, {"Process Month Start", type date},
        {"Total Hours (Source)", type text}, {"Punch In (Unparsed)", type text}, {"Punch Out (Unparsed)", type text}, {"Process Date (Unparsed)", type text}
    })
in
    Typed
