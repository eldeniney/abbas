#!/usr/bin/env python3
"""
Build the PrimeSalesPerformance Power BI project (PBIP) from a compact spec.

Generates:
  PrimeSalesPerformance.pbip
  PrimeSalesPerformance.SemanticModel/   (TMDL: tables, measures, relationships, M queries)
  PrimeSalesPerformance.Report/          (PBIR: pages, visuals, theme)
  dax/measures.dax                       (all measures as plain DAX for copy/paste)
  theme/PrimeSalesTheme.json             (copy of the report theme)

Run:  python3 tools/build_pbip.py        (from the powerbi/ folder or anywhere)
Then open PrimeSalesPerformance.pbip in Power BI Desktop (PBIP/TMDL/PBIR preview
features enabled), set the DataFile parameter, and Refresh.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "PrimeSalesPerformance"
MODEL_DIR = ROOT / f"{PROJECT}.SemanticModel"
REPORT_DIR = ROOT / f"{PROJECT}.Report"

# ---------------------------------------------------------------------------
# Palette (approximated from the reference screenshot; swap for approved brand codes)
# ---------------------------------------------------------------------------
GREEN_DARK = "#1E5E3E"      # title bars, matrix headers
GREEN = "#2F6B45"           # bars
GREEN_LIGHT = "#8DBF9A"
RED_DARK = "#A3122E"        # highlight bars, lines
RED = "#C8102E"             # "Prime" word in the header
RED_LIGHT = "#D98B98"
AMBER = "#E0A800"
GREY_BG = "#F2F2F2"
GREY_LINE = "#DDDDDD"
TEXT = "#252423"
WHITE = "#FFFFFF"

MEASURE_TABLE = "_Measures"


def tag(name: str) -> str:
    """Deterministic lineage tag / GUID for an object name."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"prime-sales/{name}"))


def vid(name: str) -> str:
    """Deterministic 20-char visual/page id."""
    return hashlib.sha1(name.encode()).hexdigest()[:20]


# ===========================================================================
# 1. SEMANTIC MODEL
# ===========================================================================

# (name, dax, formatString, displayFolder, description)
MEASURES: list[tuple[str, str, str | None, str, str]] = [
    # ---- 01 Core -----------------------------------------------------------
    ("Total Points", "SUM ( Fact_Activations[Points] )", "#,0", "01 Core",
     "Incentive points credited on activations in the current filter context."),
    ("Total VOA", "SUM ( Fact_Activations[Quantity] )", "#,0", "01 Core",
     "Volume of activations (activated lines/services)."),
    ("Points QTY", "CALCULATE ( [Total VOA], Fact_Activations[PointsEligible] = TRUE () )", "#,0", "01 Core",
     "Activations that are eligible for points (the QTY shown in the director/product matrix)."),
    ("Activation Rows", "COUNTROWS ( Fact_Activations )", "#,0", "01 Core", "Row count of the fact table."),
    ("Points per Activation", "DIVIDE ( [Total Points], [Total VOA] )", "0.00", "01 Core", "Average points per activated unit."),
    ("Active Sellers", "COUNTROWS ( FILTER ( VALUES ( Dim_KAM[KAM_ID] ), [Total VOA] > 0 ) )", "#,0", "01 Core",
     "Sellers with at least one activation in context."),
    ("Points per Active Seller", "DIVIDE ( [Total Points], [Active Sellers] )", "#,0", "01 Core",
     "Productivity: points per seller with activations."),
    ("Contribution %", "DIVIDE ( [Total Points], CALCULATE ( [Total Points], ALLSELECTED ( Dim_KAM ) ) )", "0.0%", "01 Core",
     "Share of total points across all sellers currently selected."),
    # ---- 02 Product --------------------------------------------------------
    ("Mobile VOA", 'CALCULATE ( [Total VOA], Dim_Product[Product Group] = "Mobile" )', "#,0", "02 Product", ""),
    ("Fixed VOA", 'CALCULATE ( [Total VOA], Dim_Product[Product Group] = "Fixed" )', "#,0", "02 Product", ""),
    ("Digital VOA", 'CALCULATE ( [Total VOA], Dim_Product[Product Group] = "Digital" )', "#,0", "02 Product", ""),
    ("Devices VOA", 'CALCULATE ( [Total VOA], Dim_Product[Product Group] = "Devices" )', "#,0", "02 Product", ""),
    ("Mobile Points", 'CALCULATE ( [Total Points], Dim_Product[Product Group] = "Mobile" )', "#,0", "02 Product", ""),
    ("Fixed Points", 'CALCULATE ( [Total Points], Dim_Product[Product Group] = "Fixed" )', "#,0", "02 Product", ""),
    ("Digital Points", 'CALCULATE ( [Total Points], Dim_Product[Product Group] = "Digital" )', "#,0", "02 Product", ""),
    ("Devices Points", 'CALCULATE ( [Total Points], Dim_Product[Product Group] = "Devices" )', "#,0", "02 Product", ""),
    ("GSM VOA", 'CALCULATE ( [Total VOA], Dim_Product[Reporting Line] = "GSM" )', "#,0", "02 Product", "Total GSM activations."),
    ("Fiber VOA", 'CALCULATE ( [Total VOA], Dim_Product[Reporting Line] = "Fiber" )', "#,0", "02 Product", ""),
    ("WFA VOA", 'CALCULATE ( [Total VOA], Dim_Product[Reporting Line] = "WFA" )', "#,0", "02 Product", ""),
    ("BIB VOA", 'CALCULATE ( [Total VOA], Dim_Product[Reporting Line] = "BIB" )', "#,0", "02 Product", ""),
    ("MNP VOA", 'CALCULATE ( [Total VOA], Fact_Activations[PortIn] = "MNP" )', "#,0", "02 Product", "Mobile number portability activations."),
    ("FNP VOA", 'CALCULATE ( [Total VOA], Fact_Activations[PortIn] = "FNP" )', "#,0", "02 Product", "Fixed number portability activations."),
    ("MNP Share of GSM %", "DIVIDE ( [MNP VOA], [GSM VOA] )", "0.0%", "02 Product", ""),
    ("FNP Share of Fixed %", "DIVIDE ( [FNP VOA], [Fixed VOA] )", "0.0%", "02 Product", ""),
    ("Fiber Share of Fixed %", "DIVIDE ( [Fiber VOA], [Fixed VOA] )", "0.0%", "02 Product", ""),
    ("Mobile Share of Points %", "DIVIDE ( [Mobile Points], [Total Points] )", "0.0%", "02 Product", ""),
    # ---- 03 Time -----------------------------------------------------------
    ("As-Of Date", "CALCULATE ( MAX ( Fact_Activations[ActivationDate] ), REMOVEFILTERS () )", "dd-mmm-yyyy", "03 Time",
     "Latest activation date in the whole fact table. Replace with TODAY() if the extract is refreshed daily."),
    ("Last Activation Date", "MAX ( Fact_Activations[ActivationDate] )", "dd-mmm-yyyy", "03 Time", ""),
    ("Days Since Last Activation",
     "IF ( NOT ISBLANK ( [Last Activation Date] ), DATEDIFF ( [Last Activation Date], [As-Of Date], DAY ) )",
     "0", "03 Time", ""),
    ("Days Elapsed",
     "VAR AsOf = [As-Of Date]\nRETURN\n    COUNTROWS ( FILTER ( VALUES ( Dim_Date[Date] ), Dim_Date[Date] <= AsOf ) )",
     "0", "03 Time", "Calendar days in the selected period up to the as-of date."),
    ("Days In Period", "COUNTROWS ( VALUES ( Dim_Date[Date] ) )", "0", "03 Time", ""),
    ("Days Remaining", "[Days In Period] - [Days Elapsed]", "0", "03 Time", ""),
    ("Points MTD", "TOTALMTD ( [Total Points], Dim_Date[Date] )", "#,0", "03 Time", ""),
    ("VOA MTD", "TOTALMTD ( [Total VOA], Dim_Date[Date] )", "#,0", "03 Time", ""),
    ("Points Cumulative", "IF ( MAX ( Dim_Date[Date] ) <= [As-Of Date], [Points MTD] )", "#,0", "03 Time",
     "Month-to-date cumulative points, blank after the as-of date so the line stops."),
    ("Points Prev Month", "CALCULATE ( [Total Points], PREVIOUSMONTH ( Dim_Date[Date] ) )", "#,0", "03 Time", ""),
    ("Points Prev Month Same Period",
     "VAR AsOf = MIN ( [As-Of Date], MAX ( Dim_Date[Date] ) )\n"
     "VAR PeriodStart = DATE ( YEAR ( MIN ( Dim_Date[Date] ) ), MONTH ( MIN ( Dim_Date[Date] ) ), 1 )\n"
     "RETURN\n"
     "    CALCULATE (\n"
     "        [Total Points],\n"
     "        DATEADD ( DATESBETWEEN ( Dim_Date[Date], PeriodStart, AsOf ), -1, MONTH )\n"
     "    )",
     "#,0", "03 Time", "Same day-range of the previous month (like-for-like comparison)."),
    ("Points MoM %", "DIVIDE ( [Total Points] - [Points Prev Month Same Period], [Points Prev Month Same Period] )",
     "+0.0%;-0.0%;0.0%", "03 Time", ""),
    ("VOA Prev Month Same Period",
     "VAR AsOf = MIN ( [As-Of Date], MAX ( Dim_Date[Date] ) )\n"
     "VAR PeriodStart = DATE ( YEAR ( MIN ( Dim_Date[Date] ) ), MONTH ( MIN ( Dim_Date[Date] ) ), 1 )\n"
     "RETURN\n"
     "    CALCULATE (\n"
     "        [Total VOA],\n"
     "        DATEADD ( DATESBETWEEN ( Dim_Date[Date], PeriodStart, AsOf ), -1, MONTH )\n"
     "    )",
     "#,0", "03 Time", ""),
    ("VOA MoM %", "DIVIDE ( [Total VOA] - [VOA Prev Month Same Period], [VOA Prev Month Same Period] )",
     "+0.0%;-0.0%;0.0%", "03 Time", ""),
    ("Daily Run-Rate (Points)", "DIVIDE ( [Total Points], [Days Elapsed] )", "#,0.0", "03 Time", "Average points per calendar day so far."),
    ("Daily Run-Rate (VOA)", "DIVIDE ( [Total VOA], [Days Elapsed] )", "#,0.0", "03 Time", ""),
    ("Points Forecast (Run-Rate)", "[Total Points] + [Daily Run-Rate (Points)] * [Days Remaining]", "#,0", "03 Time",
     "Linear run-rate projection to period end. Method: MTD + daily run-rate x days remaining."),
    ("VOA Forecast (Run-Rate)", "[Total VOA] + [Daily Run-Rate (VOA)] * [Days Remaining]", "#,0", "03 Time", ""),
    ("VOA Last 7 Days",
     "VAR AsOf = [As-Of Date]\nRETURN\n    CALCULATE ( [Total VOA], DATESBETWEEN ( Dim_Date[Date], AsOf - 6, AsOf ) )",
     "#,0", "03 Time", ""),
    ("Avg Daily VOA Last 7 Days", "DIVIDE ( [VOA Last 7 Days], 7 )", "#,0.0", "03 Time", ""),
    # ---- 04 Target ---------------------------------------------------------
    ("Points Target",
     "VAR StartD = DATE ( YEAR ( MIN ( Dim_Date[Date] ) ), MONTH ( MIN ( Dim_Date[Date] ) ), 1 )\n"
     "VAR EndD = EOMONTH ( MAX ( Dim_Date[Date] ), 0 )\n"
     "RETURN\n"
     "    CALCULATE ( SUM ( Dim_Target[Points Target] ), DATESBETWEEN ( Dim_Date[Date], StartD, EndD ) )",
     "#,0", "04 Target", "Full-month target for the month(s) in context (targets are stored per month per seller)."),
    ("VOA Target",
     "VAR StartD = DATE ( YEAR ( MIN ( Dim_Date[Date] ) ), MONTH ( MIN ( Dim_Date[Date] ) ), 1 )\n"
     "VAR EndD = EOMONTH ( MAX ( Dim_Date[Date] ), 0 )\n"
     "RETURN\n"
     "    CALCULATE ( SUM ( Dim_Target[VOA Target] ), DATESBETWEEN ( Dim_Date[Date], StartD, EndD ) )",
     "#,0", "04 Target", ""),
    ("Points Target To Date", "[Points Target] * DIVIDE ( [Days Elapsed], [Days In Period] )", "#,0", "04 Target",
     "Full-month target prorated linearly to the as-of date."),
    ("Achievement % (To Date)", "DIVIDE ( [Total Points], [Points Target To Date] )", "0.0%", "04 Target", ""),
    ("Achievement % (Full Month)", "DIVIDE ( [Total Points], [Points Target] )", "0.0%", "04 Target", ""),
    ("VOA Achievement %", "DIVIDE ( [Total VOA], [VOA Target] )", "0.0%", "04 Target", ""),
    ("Gap to Target", "[Points Target] - [Total Points]", "#,0", "04 Target", "Points still needed to reach the full-month target."),
    ("Required Daily Run-Rate", "MAX ( 0, DIVIDE ( [Gap to Target], [Days Remaining] ) )", "#,0.0", "04 Target",
     "Points per remaining day needed to close the gap."),
    ("Forecast Achievement %", "DIVIDE ( [Points Forecast (Run-Rate)], [Points Target] )", "0.0%", "04 Target", ""),
    ("Cumulative Target",
     "[Points Target] * DIVIDE ( DAY ( MAX ( Dim_Date[Date] ) ), DAY ( EOMONTH ( MAX ( Dim_Date[Date] ), 0 ) ) )",
     "#,0", "04 Target", "Linear target line by day of month."),
    ("Target Status",
     "SWITCH (\n    TRUE (),\n    ISBLANK ( [Points Target] ), \"No target\",\n"
     "    [Achievement % (To Date)] >= 1, \"On track\",\n    [Achievement % (To Date)] >= 0.9, \"At risk\",\n    \"Behind\"\n)",
     None, "04 Target", "RAG status against the prorated target."),
    ("Target Status Colour",
     f"SWITCH ( [Target Status], \"On track\", \"{GREEN_DARK}\", \"At risk\", \"{AMBER}\", \"Behind\", \"{RED_DARK}\", \"#7F7F7F\" )",
     None, "04 Target", "Hex colour used for conditional formatting."),
    # ---- 05 Ranking --------------------------------------------------------
    ("Seller Rank (Points)",
     "IF ( NOT ISBLANK ( [Total Points] ), RANKX ( ALLSELECTED ( Dim_KAM[KAM] ), [Total Points], , DESC, DENSE ) )",
     "0", "05 Ranking", ""),
    ("Seller Rank (VOA)",
     "IF ( NOT ISBLANK ( [Total VOA] ), RANKX ( ALLSELECTED ( Dim_KAM[KAM] ), [Total VOA], , DESC, DENSE ) )",
     "0", "05 Ranking", ""),
    ("Top N Value", "SELECTEDVALUE ( 'Top N'[Top N], 10 )", "0", "05 Ranking", "Driven by the Top N slicer (default 10)."),
    ("Top N Flag", "IF ( [Seller Rank (Points)] <= [Top N Value], 1, 0 )", "0", "05 Ranking", "1 for sellers inside the Top N."),
    ("Director Rank", "RANKX ( ALLSELECTED ( Dim_KAM[Director] ), [Total Points], , DESC, DENSE )", "0", "05 Ranking", ""),
    ("Director Bar Colour", f"IF ( [Director Rank] = 1, \"{RED_DARK}\", \"{GREEN}\" )", None, "05 Ranking",
     "Top director highlighted in red, as in the reference."),
    ("Seller Activity Status",
     "SWITCH (\n    TRUE (),\n    ISBLANK ( [Last Activation Date] ), \"No activations\",\n"
     "    [Days Since Last Activation] > 7, \"Inactive 7d+\",\n    [Days Since Last Activation] > 3, \"Quiet 3d+\",\n    \"Active\"\n)",
     None, "05 Ranking", ""),
    ("Inactive Sellers (7d+)",
     "COUNTROWS (\n    FILTER (\n        VALUES ( Dim_KAM[KAM_ID] ),\n"
     "        ISBLANK ( [Last Activation Date] ) || [Days Since Last Activation] > 7\n    )\n)",
     "#,0", "05 Ranking", ""),
    # ---- 06 Data Quality ---------------------------------------------------
    ("DQ Rows Missing Seller", "COUNTROWS ( FILTER ( Fact_Activations, ISBLANK ( RELATED ( Dim_KAM[KAM] ) ) ) )", "#,0",
     "06 Data Quality", "Fact rows whose KAM_ID is not in Dim_KAM."),
    ("DQ Rows Missing Product", "COUNTROWS ( FILTER ( Fact_Activations, ISBLANK ( RELATED ( Dim_Product[Product] ) ) ) )", "#,0",
     "06 Data Quality", ""),
    ("DQ Zero-Point Eligible Rows",
     "CALCULATE ( COUNTROWS ( Fact_Activations ), Fact_Activations[PointsEligible] = TRUE (), Fact_Activations[Points] <= 0 )",
     "#,0", "06 Data Quality", ""),
    ("DQ Future-Dated Rows", "COUNTROWS ( FILTER ( Fact_Activations, Fact_Activations[ActivationDate] > TODAY () ) )", "#,0",
     "06 Data Quality", ""),
    ("DQ Duplicate IDs", "COUNTROWS ( Fact_Activations ) - DISTINCTCOUNT ( Fact_Activations[ActivationID] )", "#,0",
     "06 Data Quality", ""),
    ("DQ Exceptions Total",
     "[DQ Rows Missing Seller] + [DQ Rows Missing Product] + [DQ Zero-Point Eligible Rows] + [DQ Future-Dated Rows] + [DQ Duplicate IDs]",
     "#,0", "06 Data Quality", ""),
    ("DQ Exception Rate %", "DIVIDE ( [DQ Exceptions Total], [Activation Rows] )", "0.00%", "06 Data Quality", ""),
    # ---- 07 Labels ---------------------------------------------------------
    ("Refresh Label", '"T: " & FORMAT ( MAX ( Last_Refresh[Refreshed] ), "dd MMM yyyy - hh:mm AM/PM" )', None, "07 Labels",
     "Timestamp captured by Power Query at refresh time."),
    ("Period Label", '"Data to " & FORMAT ( [As-Of Date], "dd MMM yyyy" )', None, "07 Labels", ""),
]

MEASURE_FORMATS = {m[0]: m[2] for m in MEASURES}


def tmdl_expr(expr: str, indent: int = 3) -> str:
    """Render a (possibly multi-line) expression for TMDL."""
    lines = expr.split("\n")
    if len(lines) == 1:
        return " " + lines[0]
    pad = "\t" * indent
    return "\n" + "\n".join(pad + line for line in lines)


def q(name: str) -> str:
    """Quote a TMDL object name if it needs it."""
    return f"'{name}'" if any(c in name for c in " -%()/,.+") else name


def column_block(name: str, data_type: str, *, source=None, dax=None, fmt=None, hidden=False, summarize="none",
                 sort_by=None, is_key=False, data_category=None, extra: list[str] | None = None) -> str:
    head = f"\tcolumn {q(name)}"
    if dax is not None:
        head += " =" + tmdl_expr(dax)
    lines = [head, f"\t\tdataType: {data_type}"]
    if is_key:
        lines.append("\t\tisKey")
    if hidden:
        lines.append("\t\tisHidden")
    if fmt:
        lines.append(f"\t\tformatString: {fmt}")
    if data_category:
        lines.append(f"\t\tdataCategory: {data_category}")
    lines.append(f"\t\tlineageTag: {tag('col/' + name)}")
    lines.append(f"\t\tsummarizeBy: {summarize}")
    if source is not None:
        lines.append(f"\t\tsourceColumn: {source}")
    if sort_by:
        lines.append(f"\t\tsortByColumn: {q(sort_by)}")
    if extra:
        lines.append("")
        lines.extend(extra)
    lines.append("")
    lines.append("\t\tannotation SummarizationSetBy = Automatic")
    if data_type == "dateTime":
        lines.append("")
        lines.append("\t\tannotation UnderlyingDateTimeDataType = Date")
    return "\n".join(lines) + "\n\n"


def m_partition(table: str, m_code: str) -> str:
    return (f"\tpartition {q(table)} = m\n\t\tmode: import\n\t\tsource =" + tmdl_expr(m_code, 4) + "\n")


def calc_partition(table: str, dax: str) -> str:
    return (f"\tpartition {q(table)} = calculated\n\t\tmode: import\n\t\tsource =" + tmdl_expr(dax, 4) + "\n")


def excel_table_m(table: str, types: list[tuple[str, str]]) -> str:
    type_list = ", ".join(f'{{"{c}", {t}}}' for c, t in types)
    return (
        "let\n"
        "    Source = Excel.Workbook(File.Contents(DataFile), null, true),\n"
        f"    Tbl = Source{{[Item=\"{table}\",Kind=\"Table\"]}}[Data],\n"
        f"    Typed = Table.TransformColumnTypes(Tbl, {{{type_list}}})\n"
        "in\n"
        "    Typed"
    )


def build_model():
    if MODEL_DIR.exists():
        shutil.rmtree(MODEL_DIR)
    d = MODEL_DIR / "definition"
    (d / "tables").mkdir(parents=True)
    (d / "cultures").mkdir(parents=True)

    (MODEL_DIR / ".platform").write_text(json.dumps({
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
        "metadata": {"type": "SemanticModel", "displayName": PROJECT},
        "config": {"version": "2.0", "logicalId": tag("model/logicalId")},
    }, indent=2) + "\n")

    (MODEL_DIR / "definition.pbism").write_text(json.dumps({
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
        "version": "4.0",
        "settings": {},
    }, indent=2) + "\n")

    (d / "database.tmdl").write_text("database\n\tcompatibilityLevel: 1601\n\n")

    tables = ["Fact_Activations", "Dim_KAM", "Dim_Product", "Dim_Target", "Dim_Date", "Last_Refresh",
              MEASURE_TABLE, "Metric Selector", "Top N"]
    model = [
        "model Model",
        "\tculture: en-US",
        "\tdefaultPowerBIDataSourceVersion: powerBI_V3",
        "\tsourceQueryCulture: en-US",
        "\tdataAccessOptions",
        "\t\tlegacyRedirects",
        "\t\treturnErrorValuesAsNull",
        "",
        "annotation PBI_QueryOrder = " + json.dumps(["DataFile", "Fact_Activations", "Dim_KAM", "Dim_Product", "Dim_Target", "Last_Refresh", MEASURE_TABLE]),
        "",
        "annotation __PBI_TimeIntelligenceEnabled = 0",
        "",
        "annotation PBI_ProTooling = [\"DevMode\"]",
        "",
    ]
    model += [f"ref table {q(t)}" for t in tables]
    model += ["", "ref cultureInfo en-US", ""]
    (d / "model.tmdl").write_text("\n".join(model))

    (d / "cultures" / "en-US.tmdl").write_text(
        "cultureInfo en-US\n\n\tlinguisticMetadata =\n\t\t\t{\n\t\t\t  \"Version\": \"1.0.0\",\n\t\t\t  \"Language\": \"en-US\"\n\t\t\t}\n\t\tcontentType: json\n\n"
    )

    (d / "expressions.tmdl").write_text(
        'expression DataFile = "C:\\PrimeSales\\PrimeSales_SampleData.xlsx" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]\n'
        f"\tlineageTag: {tag('expr/DataFile')}\n\n"
        "\tannotation PBI_ResultType = Text\n\n"
    )

    rels = [
        ("Fact_Activations", "KAM_ID", "Dim_KAM", "KAM_ID"),
        ("Fact_Activations", "Product_ID", "Dim_Product", "Product_ID"),
        ("Fact_Activations", "ActivationDate", "Dim_Date", "Date"),
        ("Dim_Target", "KAM_ID", "Dim_KAM", "KAM_ID"),
        ("Dim_Target", "MonthStart", "Dim_Date", "Date"),
    ]
    out = []
    for ft, fc, tt, tc in rels:
        out.append(f"relationship {tag('rel/' + ft + fc + tt + tc)}\n\tfromColumn: {ft}.{fc}\n\ttoColumn: {tt}.{tc}\n")
    (d / "relationships.tmdl").write_text("\n".join(out) + "\n")

    # ---- Fact_Activations ------------------------------------------------
    t = f"table Fact_Activations\n\tlineageTag: {tag('tbl/Fact_Activations')}\n\n"
    t += column_block("ActivationID", "string", source="ActivationID")
    t += column_block("ActivationDate", "dateTime", source="ActivationDate", fmt="dd-mmm-yyyy")
    t += column_block("KAM_ID", "string", source="KAM_ID")
    t += column_block("Product_ID", "string", source="Product_ID")
    t += column_block("Customer_PID", "string", source="Customer_PID")
    t += column_block("PortIn", "string", source="PortIn")
    t += column_block("Quantity", "int64", source="Quantity", fmt="0", summarize="sum")
    t += column_block("Points", "double", source="Points", fmt="#,0.00", summarize="sum")
    t += column_block("PointsEligible", "boolean", source="PointsEligible", fmt='"""TRUE"";""TRUE"";""FALSE"""')
    t += column_block("Exception Type", "string", dax=(
        "SWITCH (\n    TRUE (),\n"
        "    ISBLANK ( RELATED ( Dim_KAM[KAM] ) ), \"Unmapped seller\",\n"
        "    ISBLANK ( RELATED ( Dim_Product[Product] ) ), \"Unmapped product\",\n"
        "    Fact_Activations[ActivationDate] > TODAY (), \"Future-dated\",\n"
        "    Fact_Activations[PointsEligible] && Fact_Activations[Points] <= 0, \"Zero points (eligible)\",\n"
        "    CALCULATE ( COUNTROWS ( Fact_Activations ), ALLEXCEPT ( Fact_Activations, Fact_Activations[ActivationID] ) ) > 1, \"Duplicate ID\",\n"
        "    \"OK\"\n)"))
    t += m_partition("Fact_Activations", excel_table_m("Fact_Activations", [
        ("ActivationID", "type text"), ("ActivationDate", "type date"), ("KAM_ID", "type text"), ("Product_ID", "type text"),
        ("Customer_PID", "type text"), ("PortIn", "type text"), ("Quantity", "Int64.Type"), ("Points", "type number"),
        ("PointsEligible", "type logical")]))
    t += "\n\tannotation PBI_ResultType = Table\n"
    (d / "tables" / "Fact_Activations.tmdl").write_text(t)

    # ---- Dim_KAM ---------------------------------------------------------
    t = f"table Dim_KAM\n\tlineageTag: {tag('tbl/Dim_KAM')}\n\n"
    t += column_block("KAM_ID", "string", source="KAM_ID")
    t += column_block("KAM", "string", source="KAM")
    t += column_block("Team Leader", "string", source="Team Leader")
    t += column_block("Director", "string", source="Director")
    t += column_block("Status", "string", source="Status")
    t += ("\thierarchy 'Sales Hierarchy'\n"
          f"\t\tlineageTag: {tag('hier/Sales Hierarchy')}\n\n"
          "\t\tlevel Director\n"
          f"\t\t\tlineageTag: {tag('lvl/Director')}\n"
          "\t\t\tcolumn: Director\n\n"
          "\t\tlevel 'Team Leader'\n"
          f"\t\t\tlineageTag: {tag('lvl/Team Leader')}\n"
          "\t\t\tcolumn: 'Team Leader'\n\n"
          "\t\tlevel KAM\n"
          f"\t\t\tlineageTag: {tag('lvl/KAM')}\n"
          "\t\t\tcolumn: KAM\n\n")
    t += m_partition("Dim_KAM", excel_table_m("Dim_KAM", [
        ("KAM_ID", "type text"), ("KAM", "type text"), ("Team Leader", "type text"), ("Director", "type text"), ("Status", "type text")]))
    t += "\n\tannotation PBI_ResultType = Table\n"
    (d / "tables" / "Dim_KAM.tmdl").write_text(t)

    # ---- Dim_Product -----------------------------------------------------
    t = f"table Dim_Product\n\tlineageTag: {tag('tbl/Dim_Product')}\n\n"
    t += column_block("Product_ID", "string", source="Product_ID")
    t += column_block("Product Group", "string", source="Product Group")
    t += column_block("Product", "string", source="Product")
    t += column_block("Reporting Line", "string", source="Reporting Line")
    t += column_block("Base Points", "double", source="Base Points", fmt="0.0", hidden=True)
    t += m_partition("Dim_Product", excel_table_m("Dim_Product", [
        ("Product_ID", "type text"), ("Product Group", "type text"), ("Product", "type text"), ("Reporting Line", "type text"),
        ("Base Points", "type number")]))
    t += "\n\tannotation PBI_ResultType = Table\n"
    (d / "tables" / "Dim_Product.tmdl").write_text(t)

    # ---- Dim_Target ------------------------------------------------------
    t = f"table Dim_Target\n\tlineageTag: {tag('tbl/Dim_Target')}\n\n"
    t += column_block("MonthStart", "dateTime", source="MonthStart", fmt="mmm yyyy")
    t += column_block("KAM_ID", "string", source="KAM_ID")
    t += column_block("Points Target", "int64", source="Points Target", fmt="#,0", summarize="sum")
    t += column_block("VOA Target", "int64", source="VOA Target", fmt="#,0", summarize="sum")
    t += m_partition("Dim_Target", excel_table_m("Dim_Target", [
        ("MonthStart", "type date"), ("KAM_ID", "type text"), ("Points Target", "Int64.Type"), ("VOA Target", "Int64.Type")]))
    t += "\n\tannotation PBI_ResultType = Table\n"
    (d / "tables" / "Dim_Target.tmdl").write_text(t)

    # ---- Dim_Date (calculated) ------------------------------------------
    t = f"table Dim_Date\n\tlineageTag: {tag('tbl/Dim_Date')}\n\tdataCategory: Time\n\n"
    t += column_block("Date", "dateTime", source="[Date]", fmt="dd-mmm-yyyy", is_key=True)
    t += column_block("Year", "int64", source="[Year]", fmt="0")
    t += column_block("Month Number", "int64", source="[Month Number]", fmt="0")
    t += column_block("Month", "string", source="[Month]", sort_by="Year Month")
    t += column_block("Month Start", "dateTime", source="[Month Start]", fmt="mmm yyyy")
    t += column_block("Day", "int64", source="[Day]", fmt="0")
    t += column_block("Weekday", "string", source="[Weekday]", sort_by="Weekday Number")
    t += column_block("Weekday Number", "int64", source="[Weekday Number]", fmt="0", hidden=True)
    t += column_block("Is Weekend", "boolean", source="[Is Weekend]")
    t += column_block("Year Month", "int64", source="[Year Month]", fmt="0", hidden=True)
    t += column_block("Month Offset", "int64", fmt="0", dax=(
        "VAR AsOf = CALCULATE ( MAX ( Fact_Activations[ActivationDate] ), REMOVEFILTERS () )\n"
        "RETURN\n    DATEDIFF ( DATE ( YEAR ( AsOf ), MONTH ( AsOf ), 1 ), Dim_Date[Month Start], MONTH )"))
    t += column_block("Is Latest Month", "boolean", dax="Dim_Date[Month Offset] = 0")
    t += column_block("Relative Month", "string", sort_by="Month Offset", dax=(
        "SWITCH ( TRUE (), Dim_Date[Month Offset] = 0, \"Latest month\", Dim_Date[Month Offset] = -1, \"Previous month\",\n"
        "    Dim_Date[Month Offset] < -1, \"Earlier\", \"Future\" )"))
    t += calc_partition("Dim_Date", (
        "VAR MinD = DATE ( YEAR ( MIN ( Fact_Activations[ActivationDate] ) ), 1, 1 )\n"
        "VAR MaxD = DATE ( YEAR ( MAX ( Fact_Activations[ActivationDate] ) ), 12, 31 )\n"
        "RETURN\n"
        "    ADDCOLUMNS (\n"
        "        CALENDAR ( MinD, MaxD ),\n"
        "        \"Year\", YEAR ( [Date] ),\n"
        "        \"Month Number\", MONTH ( [Date] ),\n"
        "        \"Month\", FORMAT ( [Date], \"MMM yyyy\" ),\n"
        "        \"Month Start\", DATE ( YEAR ( [Date] ), MONTH ( [Date] ), 1 ),\n"
        "        \"Day\", DAY ( [Date] ),\n"
        "        \"Weekday\", FORMAT ( [Date], \"ddd\" ),\n"
        "        \"Weekday Number\", WEEKDAY ( [Date], 2 ),\n"
        "        \"Is Weekend\", WEEKDAY ( [Date], 2 ) >= 6,\n"
        "        \"Year Month\", YEAR ( [Date] ) * 100 + MONTH ( [Date] )\n"
        "    )"))
    t += "\n\tannotation PBI_Id = " + tag("id/Dim_Date").replace("-", "")[:20] + "\n"
    (d / "tables" / "Dim_Date.tmdl").write_text(t)

    # ---- Last_Refresh ----------------------------------------------------
    t = f"table Last_Refresh\n\tisHidden\n\tlineageTag: {tag('tbl/Last_Refresh')}\n\n"
    t += column_block("Refreshed", "dateTime", source="Refreshed", fmt="dd-mmm-yyyy hh:mm")
    t += m_partition("Last_Refresh",
                     "let\n    Source = #table(type table [Refreshed = datetime], {{DateTime.LocalNow()}})\nin\n    Source")
    t += "\n\tannotation PBI_ResultType = Table\n"
    (d / "tables" / "Last_Refresh.tmdl").write_text(t)

    # ---- _Measures -------------------------------------------------------
    t = f"table {MEASURE_TABLE}\n\tlineageTag: {tag('tbl/_Measures')}\n\n"
    for name, dax, fmt, folder, desc in MEASURES:
        if desc:
            t += f"\t/// {desc}\n"
        t += f"\tmeasure {q(name)} =" + tmdl_expr(dax) + "\n"
        if fmt:
            t += f"\t\tformatString: {fmt}\n"
        t += f"\t\tlineageTag: {tag('measure/' + name)}\n"
        t += f"\t\tdisplayFolder: {folder}\n"
        t += "\n"
    t += column_block("Measures", "string", source="Measures", hidden=True)
    t += m_partition(MEASURE_TABLE, "let\n    Source = #table({\"Measures\"}, {})\nin\n    Source")
    t += "\n\tannotation PBI_ResultType = Table\n"
    (d / "tables" / "_Measures.tmdl").write_text(t)

    # ---- Metric Selector (field parameter) ------------------------------
    t = f"table 'Metric Selector'\n\tlineageTag: {tag('tbl/Metric Selector')}\n\n"
    t += column_block("Metric Selector", "string", source="[Value1]", sort_by="Metric Order",
                      extra=["\t\trelatedColumnDetails", "\t\t\tgroupByColumn: 'Metric Fields'"])
    t += column_block("Metric Fields", "string", source="[Value2]", sort_by="Metric Order", hidden=True,
                      extra=["\t\textendedProperty ParameterMetadata =", "\t\t\t\t{", "\t\t\t\t  \"version\": 3,",
                             "\t\t\t\t  \"kind\": 2", "\t\t\t\t}"])
    t += column_block("Metric Order", "int64", source="[Value3]", fmt="0", hidden=True)
    t += calc_partition("Metric Selector",
                        "{\n    ( \"Points\", NAMEOF ( '_Measures'[Total Points] ), 0 ),\n"
                        "    ( \"VOA\", NAMEOF ( '_Measures'[Total VOA] ), 1 ),\n"
                        "    ( \"MNP VOA\", NAMEOF ( '_Measures'[MNP VOA] ), 2 ),\n"
                        "    ( \"Achievement %\", NAMEOF ( '_Measures'[Achievement % (To Date)] ), 3 )\n}")
    t += "\n\tannotation PBI_Id = " + tag("id/Metric Selector").replace("-", "")[:20] + "\n"
    (d / "tables" / "Metric Selector.tmdl").write_text(t)

    # ---- Top N (parameter values) ----------------------------------------
    t = f"table 'Top N'\n\tlineageTag: {tag('tbl/Top N')}\n\n"
    t += column_block("Top N", "int64", source="[Top N]", fmt="0")
    t += calc_partition("Top N", "SELECTCOLUMNS ( { 5, 10, 15, 20, 25, 30, 50 }, \"Top N\", [Value] )")
    t += "\n\tannotation PBI_Id = " + tag("id/Top N").replace("-", "")[:20] + "\n"
    (d / "tables" / "Top N.tmdl").write_text(t)

    # ---- plain DAX export ------------------------------------------------
    (ROOT / "dax").mkdir(exist_ok=True)
    lines = ["// Prime Sales Performance - measure definitions (table: _Measures)",
             "// Generated by tools/build_pbip.py. Paste into Power BI Desktop / Tabular Editor as needed.", ""]
    folder = None
    for name, dax, fmt, fold, desc in MEASURES:
        if fold != folder:
            folder = fold
            lines += [f"// ===== {folder} =====", ""]
        if desc:
            lines.append(f"// {desc}")
        if fmt:
            lines.append(f"// format: {fmt}")
        lines.append(f"{name} =")
        lines += ["    " + ln for ln in dax.split("\n")]
        lines.append("")
    (ROOT / "dax" / "measures.dax").write_text("\n".join(lines))


# ===========================================================================
# 2. REPORT (PBIR)
# ===========================================================================
SCHEMA_BASE = "https://developer.microsoft.com/json-schemas/fabric/item/report"
PAGE_W, PAGE_H = 1280, 720
SX, SY = PAGE_W / 1532, PAGE_H / 836   # reference screenshot -> canvas


def col(entity: str, prop: str) -> dict:
    return {"Column": {"Expression": {"SourceRef": {"Entity": entity}}, "Property": prop}}


def meas(prop: str, entity: str = MEASURE_TABLE) -> dict:
    return {"Measure": {"Expression": {"SourceRef": {"Entity": entity}}, "Property": prop}}


def field_ref(field: dict) -> str:
    kind = "Column" if "Column" in field else "Measure"
    ent = field[kind]["Expression"]["SourceRef"]["Entity"]
    return f"{ent}.{field[kind]['Property']}"


def proj(field: dict, display: str | None = None, fmt: str | None = None) -> dict:
    p = {"field": field, "queryRef": field_ref(field), "nativeQueryRef": field_ref(field).split(".", 1)[1]}
    if display:
        p["displayName"] = display
    if fmt:
        p["format"] = fmt
    return p


def lit(v) -> dict:
    if isinstance(v, bool):
        s = "true" if v else "false"
    elif isinstance(v, int):
        s = f"{v}L"
    elif isinstance(v, float):
        s = f"{v}D"
    else:
        s = f"'{v}'"
    return {"expr": {"Literal": {"Value": s}}}


def num(v) -> dict:  # numbers for formatting properties (fontSize, transparency, ...)
    return {"expr": {"Literal": {"Value": f"{v}D"}}}


def color(hex_: str) -> dict:
    return {"solid": {"color": {"expr": {"Literal": {"Value": f"'{hex_}'"}}}}}


def measure_color(measure_name: str) -> dict:
    return {"solid": {"color": {"expr": meas(measure_name)}}}


def props(**kw) -> dict:
    return {"properties": kw}


def sort_by(field: dict, direction="Descending") -> dict:
    return {"sort": [{"field": field, "direction": direction}], "isDefaultSort": True}


def visual(name: str, vtype: str, x, y, w, h, *, roles: dict | None = None, sort=None, objects=None,
           container=None, title=None, filters=None, z=None, extra_query=None, hidden_title=False) -> dict:
    v: dict = {
        "$schema": f"{SCHEMA_BASE}/definition/visualContainer/2.0.0/schema.json",
        "name": vid(name),
        "position": {"x": round(x), "y": round(y), "z": z if z is not None else 0, "height": round(h), "width": round(w), "tabOrder": 0},
        "visual": {"visualType": vtype},
    }
    if roles is not None:
        qs = {role: {"projections": ps if isinstance(ps, list) else ps["projections"],
                     **({"fieldParameters": ps["fieldParameters"]} if isinstance(ps, dict) and "fieldParameters" in ps else {})}
              for role, ps in roles.items()}
        v["visual"]["query"] = {"queryState": qs}
        if sort:
            v["visual"]["query"]["sortDefinition"] = sort
        if extra_query:
            v["visual"]["query"].update(extra_query)
    if objects:
        v["visual"]["objects"] = objects
    cont = dict(container or {})
    if title:
        cont["title"] = [props(show=lit(True), text=lit(title))]
    elif hidden_title:
        cont["title"] = [props(show=lit(False))]
    if cont:
        v["visual"]["visualContainerObjects"] = cont
    v["visual"]["drillFilterOtherVisuals"] = True
    if filters:
        v["filterConfig"] = {"filters": filters}
    return v


# -- filters ---------------------------------------------------------------
def filter_measure_equals(name: str, measure_name: str, value: int) -> dict:
    return {"name": name, "field": meas(measure_name), "type": "Advanced",
            "filter": {"Version": 2, "From": [{"Name": "m", "Entity": MEASURE_TABLE, "Type": 0}],
                       "Where": [{"Condition": {"Comparison": {"ComparisonKind": 0,
                                                               "Left": {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": measure_name}},
                                                               "Right": {"Literal": {"Value": f"{value}L"}}}}}]}}


def filter_column_in(name: str, entity: str, column: str, values: list, alias="t") -> dict:
    def litv(v):
        if isinstance(v, bool):
            return {"Literal": {"Value": "true" if v else "false"}}
        return {"Literal": {"Value": f"'{v}'"}}
    return {"name": name, "field": col(entity, column), "type": "Categorical",
            "filter": {"Version": 2, "From": [{"Name": alias, "Entity": entity, "Type": 0}],
                       "Where": [{"Condition": {"In": {"Expressions": [{"Column": {"Expression": {"SourceRef": {"Source": alias}}, "Property": column}}],
                                                      "Values": [[litv(v)] for v in values]}}}]}}


def filter_column_not_equal(name: str, entity: str, column: str, value: str, alias="t") -> dict:
    return {"name": name, "field": col(entity, column), "type": "Advanced",
            "filter": {"Version": 2, "From": [{"Name": alias, "Entity": entity, "Type": 0}],
                       "Where": [{"Condition": {"Not": {"Expression": {"Comparison": {"ComparisonKind": 0,
                                                                                      "Left": {"Column": {"Expression": {"SourceRef": {"Source": alias}}, "Property": column}},
                                                                                      "Right": {"Literal": {"Value": f"'{value}'"}}}}}}}]}}


# -- reusable visual recipes -------------------------------------------------
def textbox(name, x, y, w, h, runs: list[tuple[str, dict]], align="center", z=1) -> dict:
    v = visual(name, "textbox", x, y, w, h, z=z, hidden_title=True,
               container={"background": [props(show=lit(False))], "border": [props(show=lit(False))],
                          "dropShadow": [props(show=lit(False))]})
    v["visual"]["objects"] = {"general": [props(paragraphs=[{
        "textRuns": [{"value": text, "textStyle": style} for text, style in runs],
        "horizontalTextAlignment": align}])]}
    return v


def rectangle(name, x, y, w, h, fill: str, z=0) -> dict:
    v = visual(name, "shape", x, y, w, h, z=z, hidden_title=True,
               container={"background": [props(show=lit(False))], "border": [props(show=lit(False))],
                          "dropShadow": [props(show=lit(False))]})
    v["visual"]["objects"] = {
        "shape": [props(tileShape=lit("rectangle"))],
        "fill": [props(show=lit(True), fillColor=color(fill), transparency=num(0))],
        "outline": [props(show=lit(False))],
    }
    return v


def slicer(name, x, y, w, h, field: dict, *, mode="Dropdown", single=False, z=2, orientation=None) -> dict:
    objects = {
        "data": [props(mode=lit(mode))],
        "header": [props(show=lit(False))],
        "selection": [props(singleSelect=lit(single), selectAllCheckboxEnabled=lit(not single))],
        "items": [props(fontSize=num(9), background=color(WHITE), fontColor=color(TEXT))],
    }
    if orientation is not None:
        objects["general"] = [props(orientation=num(orientation))]
    return visual(name, "slicer", x, y, w, h, roles={"Values": [proj(field)]}, objects=objects, z=z, hidden_title=True,
                  container={"border": [props(show=lit(True), color=color(GREY_LINE), radius=num(2))],
                             "dropShadow": [props(show=lit(False))]})


def card(name, x, y, w, h, measure_name: str, title: str | None = None, *, font=20, colour=GREEN_DARK, z=1,
         plain=False) -> dict:
    objects = {"labels": [props(fontSize=num(font), color=color(colour), fontFamily=lit("Segoe UI Semibold"))],
               "categoryLabels": [props(show=lit(False))]}
    container = None
    if plain:
        container = {"background": [props(show=lit(False))], "border": [props(show=lit(False))],
                     "dropShadow": [props(show=lit(False))]}
    return visual(name, "card", x, y, w, h, roles={"Values": [proj(meas(measure_name))]}, objects=objects,
                  container=container, title=title, hidden_title=title is None, z=z)


def bar(name, x, y, w, h, title, category: dict, measure_name: str, *, fill=GREEN, fill_measure=None,
        series: dict | None = None, series_colors: dict | None = None, vtype="clusteredBarChart", legend=False,
        filters=None, labels=True, stacked=False, display=None, field_param: dict | None = None,
        show_value_axis=True) -> dict:
    roles = {"Category": [proj(category)]}
    if series is not None:
        roles["Series"] = [proj(series)]
    y_proj = [proj(meas(measure_name), display)]
    roles["Y"] = {"projections": y_proj, "fieldParameters": [{"parameterExpr": field_param, "index": 0, "length": 1}]} if field_param else y_proj
    dp = []
    if fill_measure:
        dp.append({"properties": {"fill": measure_color(fill_measure)},
                   "selector": {"data": [{"dataViewWildcard": {"matchingOption": 1}}]}})
    elif series_colors:
        for val, hex_ in series_colors.items():
            dp.append({"properties": {"fill": color(hex_)},
                       "selector": {"data": [{"scopeId": {"Comparison": {"ComparisonKind": 0, "Left": series, "Right": {"Literal": {"Value": f"'{val}'"}}}}}]}})
    else:
        dp.append(props(fill=color(fill)))
    objects = {
        "dataPoint": dp,
        "labels": [props(show=lit(labels), fontSize=num(8), color=color(TEXT))],
        "legend": [props(show=lit(legend), position=lit("Top"), fontSize=num(8), showTitle=lit(False))],
        "categoryAxis": [props(show=lit(True), fontSize=num(8), showAxisTitle=lit(False), preferredCategoryWidth=num(14))],
        "valueAxis": [props(show=lit(show_value_axis), fontSize=num(8), showAxisTitle=lit(False), gridlineShow=lit(False))],
    }
    if stacked:
        vtype = "barChart"
    return visual(name, vtype, x, y, w, h, roles=roles, sort=sort_by(meas(measure_name)), objects=objects, title=title,
                  filters=filters)


def donut(name, x, y, w, h, title, category: dict, measure_name: str, colors: list[str] | None = None,
          category_colors: dict | None = None) -> dict:
    dp = []
    if category_colors:
        for val, hex_ in category_colors.items():
            dp.append({"properties": {"fill": color(hex_)},
                       "selector": {"data": [{"scopeId": {"Comparison": {"ComparisonKind": 0, "Left": category, "Right": {"Literal": {"Value": f"'{val}'"}}}}}]}})
    objects = {
        "labels": [props(show=lit(True), labelStyle=lit("Category, data value"), fontSize=num(8), color=color(TEXT))],
        "legend": [props(show=lit(False))],
        "slices": [props(innerRadiusRatio=num(60))],
    }
    if dp:
        objects["dataPoint"] = dp
    return visual(name, "donutChart", x, y, w, h, roles={"Category": [proj(category)], "Y": [proj(meas(measure_name))]},
                  sort=sort_by(meas(measure_name)), objects=objects, title=title)


def line(name, x, y, w, h, title, category: dict, measures: list[str], *, colors: list[str] | None = None,
         series: dict | None = None, labels=True, axis_title: str | None = None, sort_asc=True, legend=None) -> dict:
    roles = {"Category": [proj(category)], "Y": [proj(meas(m)) for m in measures]}
    if series is not None:
        roles["Series"] = [proj(series)]
    dp = []
    for m, c in zip(measures, colors or []):
        dp.append({"properties": {"fill": color(c)}, "selector": {"metadata": field_ref(meas(m))}})
    objects = {
        "lineStyles": [props(strokeWidth=num(2), showMarker=lit(True), markerSize=num(4), lineStyle=lit("solid"))],
        "labels": [props(show=lit(labels), fontSize=num(8), color=color(TEXT), labelPosition=lit("Above"))],
        "categoryAxis": [props(show=lit(True), fontSize=num(8), showAxisTitle=lit(axis_title is not None),
                               **({"titleText": lit(axis_title)} if axis_title else {}), gridlineShow=lit(False))],
        "valueAxis": [props(show=lit(False), gridlineShow=lit(False))],
        "legend": [props(show=lit(legend if legend is not None else series is not None or len(measures) > 1),
                         position=lit("Top"), fontSize=num(8), showTitle=lit(False))],
    }
    if dp:
        objects["dataPoint"] = dp
    return visual(name, "lineChart", x, y, w, h, roles=roles,
                  sort=sort_by(category, "Ascending" if sort_asc else "Descending"), objects=objects, title=title)


def matrix(name, x, y, w, h, title, rows: list[dict], columns: list[dict], values: list[tuple[str, str | None]],
           *, value_objects=None, row_subtotals=True, col_subtotals=True, filters=None, expand_all=False) -> dict:
    roles = {"Rows": [proj(r) for r in rows], "Values": [proj(meas(m), disp) for m, disp in values]}
    if columns:
        roles["Columns"] = [proj(c) for c in columns]
    objects = {
        "grid": [props(gridVertical=lit(True), gridVerticalColor=color(GREY_LINE), gridHorizontal=lit(True),
                       gridHorizontalColor=color(GREY_LINE), rowPadding=num(2), outlineColor=color(GREEN_DARK),
                       textSize=num(9))],
        "columnHeaders": [props(backColor=color(GREEN_DARK), fontColor=color(WHITE), bold=lit(True), fontSize=num(9),
                                alignment=lit("Center"), outline=lit("None"))],
        "rowHeaders": [props(fontSize=num(9), fontColor=color(TEXT), stepped=lit(False), showExpandCollapseButtons=lit(True))],
        "values": [props(fontSize=num(9), fontColor=color(TEXT))] + (value_objects or []),
        "subTotals": [props(rowSubtotals=lit(row_subtotals), columnSubtotals=lit(col_subtotals), backColor=color(GREY_BG),
                            fontColor=color(TEXT), bold=lit(True), rowSubtotalsPosition=lit("Bottom"))],
    }
    v = visual(name, "pivotTable", x, y, w, h, roles=roles, objects=objects, title=title, filters=filters)
    if expand_all and len(rows) > 1:
        v["visual"]["expansionStates"] = [{"roles": ["Rows"], "levels": [{"queryRefs": [field_ref(r)], "isPinned": True} for r in rows],
                                           "root": {"identityValues": [], "children": [], "isToggled": True}}]
    return v


def table(name, x, y, w, h, title, fields: list[tuple[dict, str | None]], *, sort_field: dict | None = None,
          sort_dir="Descending", value_objects=None, filters=None) -> dict:
    roles = {"Values": [proj(f, disp) for f, disp in fields]}
    objects = {
        "grid": [props(gridVertical=lit(True), gridVerticalColor=color(GREY_LINE), gridHorizontal=lit(True),
                       gridHorizontalColor=color(GREY_LINE), rowPadding=num(2), outlineColor=color(GREEN_DARK), textSize=num(9))],
        "columnHeaders": [props(backColor=color(GREEN_DARK), fontColor=color(WHITE), bold=lit(True), fontSize=num(9),
                                alignment=lit("Center"), outline=lit("None"))],
        "values": [props(fontSize=num(9), fontColor=color(TEXT))] + (value_objects or []),
        "total": [props(totals=lit(True), backColor=color(GREY_BG), bold=lit(True))],
    }
    return visual(name, "tableEx", x, y, w, h, roles=roles, objects=objects, title=title, filters=filters,
                  sort=sort_by(sort_field, sort_dir) if sort_field else None)


def status_backcolor(measure_name: str, colour_measure: str) -> dict:
    return {"properties": {"backColor": measure_color(colour_measure), "fontColor": color(WHITE)},
            "selector": {"metadata": field_ref(meas(measure_name))}}


def heat_backcolor(measure_name: str, low=WHITE, high=GREEN_DARK) -> dict:
    return {"properties": {"backColor": {"solid": {"color": {"expr": {"FillRule": {
        "Input": meas(measure_name),
        "FillRule": {"linearGradient2": {"min": {"color": {"Literal": {"Value": f"'{low}'"}}},
                                         "max": {"color": {"Literal": {"Value": f"'{high}'"}}},
                                         "nullColoringStrategy": {"strategy": {"Literal": {"Value": "'asZero'"}}}}}}}}}}},
            "selector": {"metadata": field_ref(meas(measure_name))}}


def databar(measure_name: str, colour=GREEN) -> dict:
    return {"properties": {"dataBars": {"expr": {"Literal": {"Value": "true"}}}}, "selector": {"metadata": field_ref(meas(measure_name))}}


# -- page header (shared) ----------------------------------------------------
def header(page_key: str, subtitle: str | None = None) -> list[dict]:
    h = 56
    vs = [rectangle(f"{page_key}/hdr-bg", 0, 0, PAGE_W, h, GREEN_DARK, z=0)]
    vs.append(rectangle(f"{page_key}/hdr-accent", 0, h, PAGE_W, 3, RED_DARK, z=0))
    vs.append(textbox(f"{page_key}/hdr-title", 380, 4, 520, 36, [
        ("Prime ", {"fontWeight": "bold", "fontSize": "24pt", "color": RED, "fontFamily": "Segoe UI"}),
        ("Sales ", {"fontWeight": "bold", "fontSize": "24pt", "color": WHITE, "fontFamily": "Segoe UI"}),
        ("Performance", {"fontSize": "24pt", "color": WHITE, "fontFamily": "Segoe UI"}),
    ]))
    if subtitle:
        vs.append(textbox(f"{page_key}/hdr-sub", 380, 40, 520, 16, [
            (subtitle, {"fontSize": "9pt", "color": "#DCE9E0", "fontFamily": "Segoe UI"})]))
    vs.append(slicer(f"{page_key}/slicer-director", 22, 8, 175, 22, col("Dim_KAM", "Director")))
    vs.append(slicer(f"{page_key}/slicer-tl", 205, 8, 175, 22, col("Dim_KAM", "Team Leader")))
    vs.append(slicer(f"{page_key}/slicer-month", 1030, 8, 140, 22, col("Dim_Date", "Month"), single=True))
    vs.append(card(f"{page_key}/refresh", 1030, 32, 240, 22, "Refresh Label", font=9, colour=WHITE, plain=True))
    vs.append(textbox(f"{page_key}/dummy", 1178, 8, 100, 22, [
        ("DUMMY DATA", {"fontWeight": "bold", "fontSize": "8pt", "color": "#FFD166", "fontFamily": "Segoe UI"})], align="right"))
    return vs


def sx(v):
    return v * SX


def sy(v):
    return v * SY


# ---------------------------------------------------------------------------
# Page 1: Overview (replica)
# ---------------------------------------------------------------------------
def page_overview() -> tuple[dict, list[dict]]:
    key = "p1"
    vs = header(key)
    # Row 1
    vs.append(bar(f"{key}/directors-points", sx(22), sy(83), sx(238), sy(161), "Directors - Points",
                  col("Dim_KAM", "Director"), "Total Points", fill_measure="Director Bar Colour", show_value_axis=False))
    vs.append(donut(f"{key}/products-points", sx(275), sy(83), sx(265), sy(161), "Products Points",
                    col("Dim_Product", "Product Group"), "Total Points",
                    category_colors={"Mobile": GREEN_DARK, "Fixed": GREEN, "Digital": GREEN_LIGHT, "Devices": "#BFDCC6"}))
    vs.append(line(f"{key}/daily-voa", sx(556), sy(83), sx(697), sy(161), "Daily Activation - VOA",
                   col("Dim_Date", "Day"), ["Total VOA"], colors=[RED_DARK], axis_title="Day"))
    vs.append(donut(f"{key}/products-voa", sx(1268), sy(83), sx(247), sy(161), "Products VOA",
                    col("Dim_Product", "Product Group"), "Total VOA",
                    category_colors={"Mobile": GREEN_DARK, "Fixed": GREEN, "Digital": GREEN_LIGHT, "Devices": "#BFDCC6"}))
    # Matrix
    vs.append(matrix(f"{key}/matrix", sx(22), sy(258), sx(1488), sy(164), None,
                     rows=[col("Dim_KAM", "Director")], columns=[col("Dim_Product", "Product Group")],
                     values=[("Points QTY", "QTY"), ("Total Points", "Points")]))
    vs[-1]["visual"]["visualContainerObjects"] = {"title": [props(show=lit(False))]}
    vs[-1]["visual"]["query"]["queryState"]["Rows"]["projections"][0]["displayName"] = "Final Product Group / Director"
    # Row 3
    vs.append(bar(f"{key}/gsm-voa", sx(22), sy(434), sx(240), sy(392), "Total GSM - VOA", col("Dim_KAM", "KAM"), "GSM VOA"))
    vs.append(bar(f"{key}/mnp-voa", sx(280), sy(434), sx(252), sy(392), "MNP - VOA", col("Dim_KAM", "KAM"), "MNP VOA"))
    vs.append(bar(f"{key}/fixed-voa", sx(550), sy(434), sx(267), sy(392), "Total Fixed - VOA", col("Dim_KAM", "KAM"), "Fixed VOA",
                  series=col("Dim_Product", "Product"), stacked=True, legend=True,
                  series_colors={"BIB_CloudPro_AI_Main": RED_DARK, "Fiber": GREEN, "WFA": RED}))
    vs.append(bar(f"{key}/fnp-voa", sx(834), sy(434), sx(224), sy(392), "FNP - VOA", col("Dim_KAM", "KAM"), "FNP VOA"))
    vs.append(bar(f"{key}/devices-points", sx(1077), sy(434), sx(201), sy(392), "Devices - Points", col("Dim_KAM", "KAM"), "Devices Points"))
    vs.append(bar(f"{key}/digital-points", sx(1296), sy(434), sx(219), sy(392), "Digital - Points", col("Dim_KAM", "KAM"), "Digital Points"))
    page = page_json(key, "Overview", filters=[filter_column_in("p1-latest-month", "Dim_Date", "Is Latest Month", [True], alias="d")])
    return page, vs


# ---------------------------------------------------------------------------
# Page 2: Target & Forecast
# ---------------------------------------------------------------------------
def page_target() -> tuple[dict, list[dict]]:
    key = "p2"
    vs = header(key, "Target vs actual, run-rate forecast and gap to close")
    kpis = [("Points MTD", "Points (to date)"), ("Points Target To Date", "Target (prorated to date)"),
            ("Achievement % (To Date)", "Achievement % to date"), ("Gap to Target", "Gap to full-month target"),
            ("Points Forecast (Run-Rate)", "Forecast month-end (run-rate)"), ("Forecast Achievement %", "Forecast vs target"),
            ("Required Daily Run-Rate", "Required daily run-rate"), ("Points MoM %", "vs prev month (same period)")]
    n = len(kpis)
    gap, x0, w = 8, 22, (PAGE_W - 44 - 8 * (n - 1)) / n
    for i, (m, t) in enumerate(kpis):
        vs.append(card(f"{key}/kpi-{i}", x0 + i * (w + gap), 70, w, 78, m, t, font=18))
    vs.append(line(f"{key}/cumulative", 22, 160, 700, 250, "Cumulative points vs linear target (by day)",
                   col("Dim_Date", "Date"), ["Points Cumulative", "Cumulative Target"], colors=[GREEN_DARK, RED_DARK], labels=False))
    vs.append(visual(f"{key}/gauge", "gauge", 730, 160, 250, 250,
                     roles={"Y": [proj(meas("Total Points"))], "TargetValue": [proj(meas("Points Target To Date"))],
                            "MaxValue": [proj(meas("Points Target"))]},
                     objects={"dataPoint": [props(fill=color(GREEN))], "target": [props(color=color(RED_DARK))],
                              "labels": [props(show=lit(True), fontSize=num(8))], "calloutValue": [props(fontSize=num(14), color=color(GREEN_DARK))]},
                     title="Points vs prorated target (max = full-month target)"))
    vs.append(bar(f"{key}/director-target", 988, 160, 270, 250, "Director: actual vs target", col("Dim_KAM", "Director"), "Total Points",
                  fill=GREEN, show_value_axis=False))
    v = vs[-1]
    v["visual"]["query"]["queryState"]["Y"]["projections"].append(proj(meas("Points Target")))
    v["visual"]["objects"]["dataPoint"] = [
        {"properties": {"fill": color(GREEN)}, "selector": {"metadata": field_ref(meas("Total Points"))}},
        {"properties": {"fill": color(RED_LIGHT)}, "selector": {"metadata": field_ref(meas("Points Target"))}}]
    v["visual"]["objects"]["legend"] = [props(show=lit(True), position=lit("Top"), fontSize=num(8), showTitle=lit(False))]
    vs.append(matrix(f"{key}/seller-target", 22, 420, PAGE_W - 44, 292, "Seller scorecard: target, gap, required run-rate and status",
                     rows=[col("Dim_KAM", "Director"), col("Dim_KAM", "Team Leader"), col("Dim_KAM", "KAM")], columns=[],
                     values=[("Points Target", "Target"), ("Total Points", "Points"), ("Achievement % (To Date)", "Ach % (to date)"),
                             ("Gap to Target", "Gap"), ("Required Daily Run-Rate", "Req. daily run-rate"),
                             ("Points Forecast (Run-Rate)", "Forecast"), ("Forecast Achievement %", "Forecast %"),
                             ("Target Status", "Status")],
                     value_objects=[status_backcolor("Target Status", "Target Status Colour"), databar("Achievement % (To Date)")],
                     expand_all=True))
    page = page_json(key, "Target & Forecast", filters=[filter_column_in("p2-latest-month", "Dim_Date", "Is Latest Month", [True], alias="d")])
    return page, vs


# ---------------------------------------------------------------------------
# Page 3: KAM Analysis
# ---------------------------------------------------------------------------
def page_kam() -> tuple[dict, list[dict]]:
    key = "p3"
    vs = header(key, "Seller ranking, Top N, productivity and product mix")
    vs.append(textbox(f"{key}/lbl-topn", 22, 66, 56, 22, [("Top N", {"fontWeight": "bold", "fontSize": "9pt", "color": TEXT})], align="left"))
    vs.append(slicer(f"{key}/slicer-topn", 80, 66, 90, 22, col("Top N", "Top N"), single=True))
    vs.append(textbox(f"{key}/lbl-metric", 190, 66, 56, 22, [("Metric", {"fontWeight": "bold", "fontSize": "9pt", "color": TEXT})], align="left"))
    vs.append(slicer(f"{key}/slicer-metric", 248, 66, 420, 22, col("Metric Selector", "Metric Selector"), mode="Basic", single=True, orientation=1))
    kpis = [("Active Sellers", "Active sellers"), ("Points per Active Seller", "Points per active seller"),
            ("Points per Activation", "Points per activation"), ("Inactive Sellers (7d+)", "Sellers inactive 7d+")]
    w = 140
    for i, (m, t) in enumerate(kpis):
        vs.append(card(f"{key}/kpi-{i}", 690 + i * (w + 6), 62, w, 46, m, t, font=14))
    vs.append(bar(f"{key}/topn-bar", 22, 116, 400, 300, "Top N sellers by selected metric", col("Dim_KAM", "KAM"), "Total Points",
                  field_param=col("Metric Selector", "Metric Fields"), filters=[filter_measure_equals("p3-topn", "Top N Flag", 1)]))
    vs.append(visual(f"{key}/scatter", "scatterChart", 434, 116, 420, 300,
                     roles={"Category": [proj(col("Dim_KAM", "KAM"))], "Series": [proj(col("Dim_KAM", "Director"))],
                            "X": [proj(meas("Total VOA"))], "Y": [proj(meas("Total Points"))], "Size": [proj(meas("MNP VOA"))]},
                     objects={"categoryLabels": [props(show=lit(True), fontSize=num(8))],
                              "legend": [props(show=lit(True), position=lit("Top"), fontSize=num(8), showTitle=lit(False))],
                              "categoryAxis": [props(showAxisTitle=lit(True), fontSize=num(8), gridlineShow=lit(False))],
                              "valueAxis": [props(showAxisTitle=lit(True), fontSize=num(8), gridlineShow=lit(False))],
                              "dataPoint": [props(fill=color(GREEN))]},
                     title="Volume vs points per seller (bubble = MNP activations)"))
    vs.append(bar(f"{key}/mix", 866, 116, 392, 300, "Points mix by product group (100%)", col("Dim_KAM", "KAM"), "Total Points",
                  series=col("Dim_Product", "Product Group"), vtype="hundredPercentStackedBarChart", legend=True, labels=False,
                  series_colors={"Mobile": GREEN_DARK, "Fixed": GREEN, "Digital": GREEN_LIGHT, "Devices": "#BFDCC6"}))
    vs[-1]["visual"]["query"]["sortDefinition"] = sort_by(meas("Total Points"))
    vs.append(table(f"{key}/ranking", 22, 426, PAGE_W - 44, 286, "Seller ranking and activity (sorted by points)",
                    [(meas("Seller Rank (Points)"), "Rank"), (col("Dim_KAM", "KAM"), None), (col("Dim_KAM", "Team Leader"), None),
                     (col("Dim_KAM", "Director"), None), (meas("Total Points"), "Points"), (meas("Points Target"), "Target"),
                     (meas("Achievement % (To Date)"), "Ach % to date"), (meas("Total VOA"), "VOA"), (meas("GSM VOA"), "GSM"),
                     (meas("MNP VOA"), "MNP"), (meas("MNP Share of GSM %"), "MNP %"), (meas("Fixed VOA"), "Fixed"),
                     (meas("Points per Activation"), "Pts/act."), (meas("Contribution %"), "Contrib. %"),
                     (meas("Last Activation Date"), "Last activation"), (meas("Days Since Last Activation"), "Days idle"),
                     (meas("Seller Activity Status"), "Activity")],
                    sort_field=meas("Total Points"),
                    value_objects=[databar("Total Points"), heat_backcolor("Achievement % (To Date)", WHITE, GREEN_LIGHT)]))
    page = page_json(key, "KAM Analysis", filters=[filter_column_in("p3-latest-month", "Dim_Date", "Is Latest Month", [True], alias="d")])
    return page, vs


# ---------------------------------------------------------------------------
# Page 4: Product & Portability
# ---------------------------------------------------------------------------
def page_product() -> tuple[dict, list[dict]]:
    key = "p4"
    vs = header(key, "Product mix, portability, daily trend and month-over-month")
    kpis = [("Total VOA", "Total VOA"), ("GSM VOA", "GSM VOA"), ("MNP VOA", "MNP VOA"), ("MNP Share of GSM %", "MNP share of GSM"),
            ("Fixed VOA", "Fixed VOA"), ("FNP VOA", "FNP VOA"), ("Fiber Share of Fixed %", "Fiber share of fixed"), ("VOA MoM %", "VOA vs prev month")]
    n = len(kpis)
    gap, x0, w = 8, 22, (PAGE_W - 44 - 8 * (n - 1)) / n
    for i, (m, t) in enumerate(kpis):
        vs.append(card(f"{key}/kpi-{i}", x0 + i * (w + gap), 70, w, 70, m, t, font=16))
    vs.append(line(f"{key}/daily-by-group", 22, 150, 620, 240, "Daily VOA by product group", col("Dim_Date", "Day"), ["Total VOA"],
                   series=col("Dim_Product", "Product Group"), labels=False, axis_title="Day"))
    vs.append(matrix(f"{key}/product-mom", 652, 150, 606, 240, "Product performance and month-over-month (same period)",
                     rows=[col("Dim_Product", "Product Group"), col("Dim_Product", "Product")], columns=[],
                     values=[("Total VOA", "VOA"), ("VOA Prev Month Same Period", "VOA prev month"), ("VOA MoM %", "VOA MoM %"),
                             ("Total Points", "Points"), ("Points Prev Month Same Period", "Points prev month"), ("Points MoM %", "Points MoM %"),
                             ("Points per Activation", "Pts/unit")],
                     value_objects=[databar("Total VOA")], expand_all=True))
    vs.append(visual(f"{key}/decomp", "decompositionTreeVisual", 22, 400, 620, 312,
                     roles={"Analyze": [proj(meas("Total Points"))],
                            "Explain": [proj(col("Dim_KAM", "Director")), proj(col("Dim_KAM", "Team Leader")), proj(col("Dim_KAM", "KAM")),
                                        proj(col("Dim_Product", "Product Group")), proj(col("Dim_Product", "Product"))]},
                     objects={"tree": [props(fontSize=num(8))], "bars": [props(color=color(GREEN))]},
                     title="Decompose points: Director > Team Leader > KAM > Product group > Product"))
    vs.append(matrix(f"{key}/heatmap", 652, 400, 606, 312, "Activation heatmap: seller x day (VOA)",
                     rows=[col("Dim_KAM", "KAM")], columns=[col("Dim_Date", "Day")], values=[("Total VOA", "VOA")],
                     value_objects=[heat_backcolor("Total VOA")], row_subtotals=True, col_subtotals=True))
    page = page_json(key, "Product & Portability", filters=[filter_column_in("p4-latest-month", "Dim_Date", "Is Latest Month", [True], alias="d")])
    return page, vs


# ---------------------------------------------------------------------------
# Page 5: Data Quality
# ---------------------------------------------------------------------------
def page_dq() -> tuple[dict, list[dict]]:
    key = "p5"
    vs = header(key, "Data-quality exceptions across all loaded months")
    kpis = [("Activation Rows", "Rows loaded"), ("DQ Duplicate IDs", "Duplicate activation IDs"), ("DQ Rows Missing Seller", "Unmapped seller"),
            ("DQ Rows Missing Product", "Unmapped product"), ("DQ Zero-Point Eligible Rows", "Zero-point eligible rows"),
            ("DQ Future-Dated Rows", "Future-dated rows"), ("DQ Exception Rate %", "Exception rate")]
    n = len(kpis)
    gap, x0, w = 8, 22, (PAGE_W - 44 - 8 * (n - 1)) / n
    for i, (m, t) in enumerate(kpis):
        vs.append(card(f"{key}/kpi-{i}", x0 + i * (w + gap), 70, w, 70, m, t, font=16, colour=RED_DARK if i else GREEN_DARK))
    vs.append(table(f"{key}/exceptions", 22, 150, 760, 562, "Exception rows (everything except OK)",
                    [(col("Fact_Activations", "Exception Type"), "Exception"), (col("Fact_Activations", "ActivationID"), None),
                     (col("Fact_Activations", "ActivationDate"), "Date"), (col("Fact_Activations", "KAM_ID"), None),
                     (col("Fact_Activations", "Product_ID"), None), (col("Fact_Activations", "Customer_PID"), "Customer PID"),
                     (col("Fact_Activations", "PortIn"), "Port-in"), (meas("Total VOA"), "Qty"), (meas("Total Points"), "Points")],
                    sort_field=col("Fact_Activations", "ActivationDate"),
                    filters=[filter_column_not_equal("p5-exceptions", "Fact_Activations", "Exception Type", "OK", alias="f")]))
    vs.append(table(f"{key}/inactive", 792, 150, 466, 280, "Seller activity check (latest activation, days idle)",
                    [(col("Dim_KAM", "KAM"), None), (col("Dim_KAM", "Director"), None), (meas("Last Activation Date"), "Last activation"),
                     (meas("Days Since Last Activation"), "Days idle"), (meas("VOA Last 7 Days"), "VOA last 7d"),
                     (meas("Seller Activity Status"), "Status")],
                    sort_field=meas("Days Since Last Activation")))
    vs.append(matrix(f"{key}/monthly", 792, 440, 466, 272, "Monthly reconciliation totals",
                     rows=[col("Dim_Date", "Month")], columns=[],
                     values=[("Activation Rows", "Rows"), ("Total VOA", "VOA"), ("Points QTY", "QTY"), ("Total Points", "Points"),
                             ("Points Target", "Target"), ("Achievement % (Full Month)", "Ach %")]))
    page = page_json(key, "Data Quality")
    return page, vs


def page_json(key: str, display: str, filters: list | None = None) -> dict:
    p = {
        "$schema": f"{SCHEMA_BASE}/definition/page/2.0.0/schema.json",
        "name": vid(f"page/{key}"),
        "displayName": display,
        "displayOption": "FitToPage",
        "height": PAGE_H,
        "width": PAGE_W,
        "objects": {"background": [props(color=color(GREY_BG), transparency=num(0))]},
    }
    if filters:
        p["filterConfig"] = {"filters": filters}
    return p


THEME = {
    "name": "PrimeSalesTheme",
    "dataColors": [GREEN, RED_DARK, GREEN_LIGHT, RED_LIGHT, GREEN_DARK, "#6B1A2B", "#BFDCC6", AMBER, "#7F7F7F", "#3E3E3E"],
    "background": WHITE, "foreground": TEXT, "tableAccent": GREEN_DARK,
    "good": GREEN_DARK, "neutral": AMBER, "bad": RED_DARK,
    "maximum": GREEN_DARK, "center": GREEN_LIGHT, "minimum": WHITE, "null": "#EDEDED",
    "textClasses": {
        "title": {"fontSize": 12, "fontFace": "Segoe UI Semibold", "color": WHITE},
        "label": {"fontSize": 9, "fontFace": "Segoe UI", "color": TEXT},
        "callout": {"fontSize": 20, "fontFace": "Segoe UI Semibold", "color": GREEN_DARK},
        "header": {"fontSize": 10, "fontFace": "Segoe UI Semibold", "color": WHITE},
    },
    "visualStyles": {
        "*": {"*": {
            "title": [{"show": True, "background": GREEN_DARK, "fontColor": WHITE, "alignment": "center", "fontSize": 12,
                       "bold": True, "fontFamily": "Segoe UI Semibold", "titleWrap": True}],
            "background": [{"show": True, "color": WHITE, "transparency": 0}],
            "border": [{"show": True, "color": GREY_LINE, "radius": 4, "width": 1}],
            "dropShadow": [{"show": True, "preset": "BottomRight", "color": "#000000", "transparency": 88}],
            "visualHeader": [{"show": True, "showVisualInformationButton": False, "showVisualWarningButton": True}],
            "labels": [{"show": True, "fontSize": 9, "color": TEXT}],
            "categoryAxis": [{"showAxisTitle": False, "gridlineShow": False, "fontSize": 9}],
            "valueAxis": [{"showAxisTitle": False, "gridlineShow": False, "fontSize": 9}],
            "legend": [{"show": False, "position": "Top", "fontSize": 9, "showTitle": False}],
        }},
        "page": {"*": {"background": [{"color": GREY_BG, "transparency": 0}], "outspace": [{"color": "#E6E6E6"}]}},
        "slicer": {"*": {"title": [{"show": False}], "border": [{"show": False}], "dropShadow": [{"show": False}],
                         "header": [{"show": False}], "items": [{"fontSize": 9}]}},
        "textbox": {"*": {"title": [{"show": False}], "background": [{"show": False}], "border": [{"show": False}], "dropShadow": [{"show": False}]}},
        "shape": {"*": {"title": [{"show": False}], "background": [{"show": False}], "border": [{"show": False}], "dropShadow": [{"show": False}]}},
        "pivotTable": {"*": {
            "columnHeaders": [{"backColor": GREEN_DARK, "fontColor": WHITE, "bold": True, "fontSize": 9, "alignment": "Center"}],
            "rowHeaders": [{"fontSize": 9, "fontColor": TEXT}],
            "values": [{"fontSize": 9, "fontColor": TEXT}],
            "grid": [{"gridVertical": True, "gridVerticalColor": GREY_LINE, "gridHorizontal": True, "gridHorizontalColor": GREY_LINE,
                      "rowPadding": 2, "outlineColor": GREEN_DARK, "textSize": 9}],
            "subTotals": [{"backColor": GREY_BG, "fontColor": TEXT, "bold": True}],
        }},
        "tableEx": {"*": {
            "columnHeaders": [{"backColor": GREEN_DARK, "fontColor": WHITE, "bold": True, "fontSize": 9, "alignment": "Center"}],
            "values": [{"fontSize": 9, "fontColor": TEXT}],
            "grid": [{"gridVertical": True, "gridVerticalColor": GREY_LINE, "gridHorizontal": True, "gridHorizontalColor": GREY_LINE,
                      "rowPadding": 2, "outlineColor": GREEN_DARK, "textSize": 9}],
            "total": [{"backColor": GREY_BG, "fontColor": TEXT, "bold": True}],
        }},
        "card": {"*": {"labels": [{"fontSize": 20, "color": GREEN_DARK, "fontFamily": "Segoe UI Semibold"}],
                       "categoryLabels": [{"show": False}]}},
        "donutChart": {"*": {"labels": [{"show": True, "labelStyle": "Category, data value", "fontSize": 8}], "legend": [{"show": False}]}},
        "lineChart": {"*": {"lineStyles": [{"strokeWidth": 2, "showMarker": True, "markerSize": 4}]}},
    },
}


def check_layout(page_name: str, visuals: list[dict]) -> None:
    boxes = []
    for v in visuals:
        p = v["position"]
        assert p["x"] >= 0 and p["y"] >= 0 and p["x"] + p["width"] <= PAGE_W and p["y"] + p["height"] <= PAGE_H, \
            f"{page_name}: visual {v['name']} outside canvas {p}"
        if v["visual"]["visualType"] in ("shape",):
            continue
        boxes.append((v["name"], p))
    for i, (n1, a) in enumerate(boxes):
        for n2, b in boxes[i + 1:]:
            if a["x"] < b["x"] + b["width"] and b["x"] < a["x"] + a["width"] and a["y"] < b["y"] + b["height"] and b["y"] < a["y"] + a["height"]:
                raise AssertionError(f"{page_name}: visuals overlap {n1} {a} / {n2} {b}")


def build_report():
    if REPORT_DIR.exists():
        shutil.rmtree(REPORT_DIR)
    d = REPORT_DIR / "definition"
    (d / "pages").mkdir(parents=True)
    (REPORT_DIR / "StaticResources" / "RegisteredResources").mkdir(parents=True)

    (REPORT_DIR / ".platform").write_text(json.dumps({
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
        "metadata": {"type": "Report", "displayName": PROJECT},
        "config": {"version": "2.0", "logicalId": tag("report/logicalId")},
    }, indent=2) + "\n")

    (REPORT_DIR / "definition.pbir").write_text(json.dumps({
        "$schema": f"{SCHEMA_BASE}/definitionProperties/2.0.0/schema.json",
        "version": "4.0",
        "datasetReference": {"byPath": {"path": f"../{PROJECT}.SemanticModel"}},
    }, indent=2) + "\n")

    theme_name = "PrimeSalesTheme.json"
    (REPORT_DIR / "StaticResources" / "RegisteredResources" / theme_name).write_text(json.dumps(THEME, indent=2) + "\n")
    (ROOT / "theme").mkdir(exist_ok=True)
    (ROOT / "theme" / theme_name).write_text(json.dumps(THEME, indent=2) + "\n")

    (d / "report.json").write_text(json.dumps({
        "$schema": f"{SCHEMA_BASE}/definition/report/2.0.0/schema.json",
        "themeCollection": {
            "baseTheme": {"name": "CY24SU06", "reportVersionAtImport": "5.55", "type": "SharedResources"},
            "customTheme": {"name": theme_name, "reportVersionAtImport": "5.55", "type": "RegisteredResources"},
        },
        "resourcePackages": [
            {"name": "SharedResources", "type": "SharedResources",
             "items": [{"name": "CY24SU06", "path": "BaseThemes/CY24SU06.json", "type": "BaseTheme"}]},
            {"name": "RegisteredResources", "type": "RegisteredResources",
             "items": [{"name": theme_name, "path": theme_name, "type": "CustomTheme"}]},
        ],
        "settings": {"useStylableVisualContainerHeader": True, "defaultDrillFilterOtherVisuals": True,
                     "useEnhancedTooltips": True, "exportDataMode": "AllowSummarizedAndUnderlying"},
    }, indent=2) + "\n")

    pages = [page_overview(), page_target(), page_kam(), page_product(), page_dq()]
    order = []
    for page, visuals in pages:
        order.append(page["name"])
        pd = d / "pages" / page["name"]
        (pd / "visuals").mkdir(parents=True)
        (pd / "page.json").write_text(json.dumps(page, indent=2) + "\n")
        seen = set()
        check_layout(page["displayName"], visuals)
        for v in visuals:
            assert v["name"] not in seen, f"duplicate visual id on page {page['displayName']}: {v['name']}"
            seen.add(v["name"])
            (pd / "visuals" / v["name"]).mkdir()
            (pd / "visuals" / v["name"] / "visual.json").write_text(json.dumps(v, indent=2) + "\n")
    (d / "pages" / "pages.json").write_text(json.dumps({
        "$schema": f"{SCHEMA_BASE}/definition/pagesMetadata/1.0.0/schema.json",
        "pageOrder": order, "activePageName": order[0]}, indent=2) + "\n")

    (ROOT / f"{PROJECT}.pbip").write_text(json.dumps({
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
        "version": "1.0",
        "artifacts": [{"report": {"path": f"{PROJECT}.Report"}}],
        "settings": {"enableAutoRecovery": True},
    }, indent=2) + "\n")


if __name__ == "__main__":
    build_model()
    build_report()
    n_vis = sum(1 for _ in REPORT_DIR.rglob("visual.json"))
    print(f"built {PROJECT}: {len(MEASURES)} measures, {n_vis} visuals in {len(list((REPORT_DIR / 'definition' / 'pages').iterdir())) - 1} pages")
