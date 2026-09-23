# e& Attendance Management Dashboard — build kit

This folder contains the complete Power BI project (PBIP / TMDL / PBIR source) for the attendance dashboard,
plus the validation tools and documentation. It was authored without access to the real data files, so the
last step — opening the project in Power BI Desktop and saving it as `.pbix` — happens on your Windows PC.

## Produce the PBIX (about 5 minutes)

1. Copy the whole `Dashboard` folder to `C:\Users\aeldeneiny\OneDrive - e&\alaa_data\Dashboard\`.
2. Make sure Power BI Desktop is up to date (File → Options → Preview features → **Power BI Project (.pbip) save option** and **Store reports using enhanced metadata format (PBIR)** must be enabled on older versions; on 2025+ versions they are on by default).
3. Double-click `Dashboard\PowerBI_Source\Attendance Dashboard.pbip`.
4. If Desktop asks about the data folder or privacy levels: keep the folder parameter as it is and choose *Organizational*/*Ignore privacy levels*.
5. Home → **Refresh**. The first refresh reads every file in `alaa_data`.
6. Check the **Exceptions** page → *Data Quality Issues by Type* and *Unrecognised Status Values*. If a status such as `WFH` shows as *Other* and should count as Present, add it to the `StatusCategoryOverrides` query (Transform data) and refresh again.
7. File → **Save as** → `C:\Users\aeldeneiny\OneDrive - e&\alaa_data\Dashboard\e& Attendance Management Dashboard.pbix` (choose the `.pbix` type).
8. Close and re-open the `.pbix` to confirm it renders.

If Desktop reports an error when opening or refreshing, copy the message (and the file/sheet it names) — the
PBIP source is text, so every error can be fixed in the generator scripts in `tools/` and regenerated.

## Reconcile the numbers

With Python 3 and `pip install pandas openpyxl`:

```
python tools\validate_source.py "C:\Users\aeldeneiny\OneDrive - e&\alaa_data" --out validation.md
```

The script prints the data-discovery QA summary (distinct statuses, months, duplicates, missing punches …) and
the expected values of every headline measure per month, Business Unit and Client, using the same rules as the
Power Query code. Compare them with the dashboard totals. Filters: `--month 2026-08`, `--bu eMinds`,
`--client SMB-41984`, `--shift "..."`, `--employee OB60802`.

## Folder contents

| Path | Purpose |
|---|---|
| `PowerBI_Source/Attendance Dashboard.pbip` | project file to open in Power BI Desktop |
| `PowerBI_Source/Attendance Dashboard.SemanticModel/` | TMDL model: Power Query (`definition/expressions.tmdl`, `tables/FactAttendance.tmdl`), dimensions, 166 measures (`tables/_Measures.tmdl`) |
| `PowerBI_Source/Attendance Dashboard.Report/` | PBIR report: 8 pages, 228 visuals, e& theme |
| `Dashboard Documentation.md` | data source, refresh process, model, business definitions, limitations |
| `tools/` | generators and validators (see documentation §9) |
| `sample_data/` | synthetic test files that exercise the edge cases — **do not copy into the real data folder** |
