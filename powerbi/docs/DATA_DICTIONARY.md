# Data dictionary and visual mapping

## Source tables (Excel tables in `data/PrimeSales_SampleData.xlsx`)

### Fact_Activations — one row per activated line / service

| Column | Type | Meaning |
| --- | --- | --- |
| ActivationID | text | Unique activation reference. Duplicates are flagged on the Data Quality page. |
| ActivationDate | date | Activation date (drives all time intelligence). |
| KAM_ID | text | Seller key → `Dim_KAM`. |
| Product_ID | text | Product key → `Dim_Product`. |
| Customer_PID | text | Customer identifier (anonymised placeholder in the sample). |
| PortIn | text | `MNP`, `FNP` or `None`. |
| Quantity | whole number | Activated units (VOA). |
| Points | decimal | Incentive points credited. |
| PointsEligible | true/false | FALSE when the activation counts as VOA but earns no points. |
| Exception Type | *calculated* | `OK`, `Duplicate ID`, `Unmapped seller`, `Unmapped product`, `Future-dated`, `Zero points (eligible)`. |

### Dim_KAM — seller hierarchy

| Column | Meaning |
| --- | --- |
| KAM_ID, KAM | Seller key and display name. |
| Team Leader, Director | Reporting line. Hierarchy `Sales Hierarchy` = Director > Team Leader > KAM. |
| Status | Active / Vacant (for portfolio coverage analysis). |

### Dim_Product

| Column | Meaning |
| --- | --- |
| Product_ID, Product | Product key and name. |
| Product Group | `Mobile`, `Fixed`, `Digital`, `Devices` (matrix columns). |
| Reporting Line | `GSM`, `Mobile Other`, `Fiber`, `WFA`, `BIB`, `Digital`, `Devices` (drives the GSM / fixed technology measures). |
| Base Points | Reference points per unit (hidden). |

### Dim_Target — one row per seller per month

| Column | Meaning |
| --- | --- |
| MonthStart | First day of the month (→ `Dim_Date[Date]`). |
| KAM_ID | → `Dim_KAM`. |
| Points Target, VOA Target | Full-month targets. |

### Dim_Date (calculated)

Date, Year, Month Number, Month (`MMM yyyy`), Month Start, Day, Weekday, Is Weekend (Sat/Sun),
Year Month (sort key), **Month Offset** (0 = month of the as-of date, −1 = previous month),
**Is Latest Month**, Relative Month.

## Measures (`_Measures`) — see `dax/measures.dax` for the full DAX

| Folder | Measures |
| --- | --- |
| 01 Core | Total Points, Total VOA, Points QTY, Activation Rows, Points per Activation, Active Sellers, Points per Active Seller, Contribution % |
| 02 Product | Mobile/Fixed/Digital/Devices VOA and Points, GSM VOA, Fiber VOA, WFA VOA, BIB VOA, MNP VOA, FNP VOA, MNP Share of GSM %, FNP Share of Fixed %, Fiber Share of Fixed %, Mobile Share of Points % |
| 03 Time | As-Of Date, Last Activation Date, Days Since Last Activation, Days Elapsed, Days In Period, Days Remaining, Points MTD, VOA MTD, Points Cumulative, Points Prev Month, Points/VOA Prev Month Same Period, Points/VOA MoM %, Daily Run-Rate (Points/VOA), Points/VOA Forecast (Run-Rate), VOA Last 7 Days, Avg Daily VOA Last 7 Days |
| 04 Target | Points Target, VOA Target, Points Target To Date, Achievement % (To Date), Achievement % (Full Month), VOA Achievement %, Gap to Target, Required Daily Run-Rate, Forecast Achievement %, Cumulative Target, Target Status, Target Status Colour |
| 05 Ranking | Seller Rank (Points), Seller Rank (VOA), Top N Value, Top N Flag, Director Rank, Director Bar Colour, Seller Activity Status, Inactive Sellers (7d+) |
| 06 Data Quality | DQ Rows Missing Seller, DQ Rows Missing Product, DQ Zero-Point Eligible Rows, DQ Future-Dated Rows, DQ Duplicate IDs, DQ Exceptions Total, DQ Exception Rate % |
| 07 Labels | Refresh Label, Period Label |

## Page 1 visual mapping (for a manual rebuild if ever needed)

| Reference visual | Visual type | Fields |
| --- | --- | --- |
| Directors - Points | Clustered bar | Axis `Dim_KAM[Director]`, Value `[Total Points]`, bar colour by `[Director Bar Colour]` (top director red) |
| Products Points | Donut | Legend `Dim_Product[Product Group]`, Value `[Total Points]`, labels = category + value |
| Daily Activation - VOA | Line | Axis `Dim_Date[Day]`, Value `[Total VOA]`, red line, labels on, axis title "Day" |
| Products VOA | Donut | Legend `Dim_Product[Product Group]`, Value `[Total VOA]` |
| Matrix | Matrix | Rows `Dim_KAM[Director]`, Columns `Dim_Product[Product Group]`, Values `[Points QTY]` (shown as QTY), `[Total Points]`; row and column totals on |
| Total GSM - VOA | Clustered bar | Axis `Dim_KAM[KAM]`, Value `[GSM VOA]` |
| MNP - VOA | Clustered bar | Axis `Dim_KAM[KAM]`, Value `[MNP VOA]` |
| Total Fixed - VOA | Stacked bar | Axis `Dim_KAM[KAM]`, Legend `Dim_Product[Product]`, Value `[Fixed VOA]`; BIB dark red, Fiber green, WFA red |
| FNP - VOA | Clustered bar | Axis `Dim_KAM[KAM]`, Value `[FNP VOA]` |
| Devices - Points | Clustered bar | Axis `Dim_KAM[KAM]`, Value `[Devices Points]` |
| Digital - Points | Clustered bar | Axis `Dim_KAM[KAM]`, Value `[Digital Points]` |
| Header slicers | Dropdown slicers | `Dim_KAM[Director]`, `Dim_KAM[Team Leader]`, `Dim_Date[Month]` (single select) |
| Refresh stamp | Card | `[Refresh Label]` |
| Page filter | — | `Dim_Date[Is Latest Month] = TRUE` |

## Assumptions to confirm with the business

1. **VOA** means volume (count) of activations, not value. If it is value-based, replace
   `Quantity` with the value column and rename the measures.
2. **QTY vs VOA gap** on Mobile (2,096 vs 2,115) is explained here by a points-eligibility flag.
   Confirm the official rule (e.g. free SIMs, replacements, or a different reporting window).
3. **Points** are decimal in the sample so totals reconcile to the reference; if points are whole
   numbers in the source, keep `Points` as whole number and expect ±1 rounding differences.
4. **Targets** exist per seller per month. If targets are only set at Director or TL level,
   load them at that grain and drop the `Dim_Target → Dim_KAM` relationship.
5. **Working days**: the run-rate and prorated target use calendar days. Switch `Days Elapsed`
   and `Days In Period` to count `Is Weekend = FALSE` if the business runs on working days.
6. **As-of date** is the last activation date in the extract, not today. This keeps the dummy data
   stable; switch to `TODAY()` for a daily-refreshed source.
