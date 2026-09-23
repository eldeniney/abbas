#!/usr/bin/env python3
"""Generates the PBIR report definition for the e& Attendance Management Dashboard.

Run:  python3 gen_report.py
Writes into ../PowerBI_Source/Attendance Dashboard.Report
"""
import os, json, shutil, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "PowerBI_Source", "Attendance Dashboard.Report"))
DEF = os.path.join(ROOT, "definition")
PAGES = os.path.join(DEF, "pages")

SCHEMA_BASE = "https://developer.microsoft.com/json-schemas/fabric/item/report"
VC_SCHEMA = f"{SCHEMA_BASE}/definition/visualContainer/2.0.0/schema.json"
PAGE_SCHEMA = f"{SCHEMA_BASE}/definition/page/1.4.0/schema.json"
REPORT_SCHEMA = f"{SCHEMA_BASE}/definition/report/1.3.0/schema.json"
PAGES_SCHEMA = f"{SCHEMA_BASE}/definition/pagesMetadata/1.0.0/schema.json"
VERSION_SCHEMA = f"{SCHEMA_BASE}/definition/versionMetadata/1.0.0/schema.json"

# ---------------------------------------------------------------------------
# Design tokens (e& style: white / light grey base, e& red accent, charcoal text)
# ---------------------------------------------------------------------------
RED = "#E60000"
CHARCOAL = "#2E2E2E"
TEXT = "#1F1F1F"
GREY = "#6B6B6B"
GREY_LIGHT = "#9A9A9A"
LINE = "#E6E6E6"
PAGE_BG = "#F4F4F4"
CARD_BG = "#FFFFFF"
GREEN = "#2E7D5B"
SLATE = "#7A8CA3"
GOLD = "#C9A227"
NEUTRAL = "#BDBDBD"
NEUTRAL_LIGHT = "#D9D9D9"
DARK_BAR = "#3A3A3A"
FONT = "Segoe UI"
FONT_BOLD = "Segoe UI Semibold"

STATUS_COLOURS = {
    "Present": GREEN, "Absent": RED, "Leave": SLATE, "Holiday": GOLD,
    "Weekend / Rest Day": NEUTRAL, "Other": "#8E8E8E", "Unknown": NEUTRAL_LIGHT,
}

W, H = 1280, 720
MARGIN = 24
GAP = 12

# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------
def nm(seed):
    return hashlib.sha1(("eand/" + seed).encode()).hexdigest()[:20]

def lit(v):
    return {"expr": {"Literal": {"Value": v}}}

def txt(s):
    return lit("'" + s.replace("'", "\\'") + "'")

def num(n):
    return lit(f"{n}D")

def boolean(b):
    return lit("true" if b else "false")

def colour(hexv):
    return {"solid": {"color": lit("'" + hexv + "'")}}

def colour_measure(prop):
    return {"solid": {"color": {"expr": {"Measure": {"Expression": {"SourceRef": {"Entity": "_Measures"}}, "Property": prop}}}}}

def col(entity, prop):
    return {"Column": {"Expression": {"SourceRef": {"Entity": entity}}, "Property": prop}}

def mea(prop, entity="_Measures"):
    return {"Measure": {"Expression": {"SourceRef": {"Entity": entity}}, "Property": prop}}

def proj(field, display=None, active=None, fmt=None):
    if "Column" in field:
        e = field["Column"]["Expression"]["SourceRef"]["Entity"]; p = field["Column"]["Property"]
        ref = f"{e}.{p}"
    else:
        e = field["Measure"]["Expression"]["SourceRef"]["Entity"]; p = field["Measure"]["Property"]
        ref = f"{e}.{p}"
    d = {"field": field, "queryRef": ref, "nativeQueryRef": p}
    if display:
        d["displayName"] = display
    if active is not None:
        d["active"] = active
    if fmt:
        d["format"] = fmt
    return d

def qref(field):
    if "Column" in field:
        return f'{field["Column"]["Expression"]["SourceRef"]["Entity"]}.{field["Column"]["Property"]}'
    return f'{field["Measure"]["Expression"]["SourceRef"]["Entity"]}.{field["Measure"]["Property"]}'

def sort_by(field, direction="Descending"):
    return {"sort": [{"field": field, "direction": direction}]}

def obj(props, selector=None):
    d = {"properties": props}
    if selector:
        d["selector"] = selector
    return d

def where_in(entity, prop, values, alias="t"):
    return {"Version": 2, "From": [{"Name": alias, "Entity": entity, "Type": 0}],
            "Where": [{"Condition": {"In": {"Expressions": [{"Column": {"Expression": {"SourceRef": {"Source": alias}}, "Property": prop}}],
                                             "Values": [[{"Literal": {"Value": "'" + v + "'"}}] for v in values]}}}]}

def where_cmp(entity, prop, kind, literal, alias="t"):
    return {"Version": 2, "From": [{"Name": alias, "Entity": entity, "Type": 0}],
            "Where": [{"Condition": {"Comparison": {"ComparisonKind": kind,
                                                     "Left": {"Column": {"Expression": {"SourceRef": {"Source": alias}}, "Property": prop}},
                                                     "Right": {"Literal": {"Value": literal}}}}}]}

def where_not_null(entity, prop, alias="t"):
    return {"Version": 2, "From": [{"Name": alias, "Entity": entity, "Type": 0}],
            "Where": [{"Condition": {"Not": {"Expression": {"Comparison": {"ComparisonKind": 0,
                        "Left": {"Column": {"Expression": {"SourceRef": {"Source": alias}}, "Property": prop}},
                        "Right": {"Literal": {"Value": "null"}}}}}}}]}

def cat_filter(name, field, values=None):
    entity = field["Column"]["Expression"]["SourceRef"]["Entity"]; prop = field["Column"]["Property"]
    f = {"name": name, "field": field, "type": "Categorical", "howCreated": "User"}
    if values:
        f["filter"] = where_in(entity, prop, values)
    return f

def adv_filter(name, field, kind, literal):
    entity = field["Column"]["Expression"]["SourceRef"]["Entity"]; prop = field["Column"]["Property"]
    return {"name": name, "field": field, "type": "Advanced", "howCreated": "User",
            "filter": where_cmp(entity, prop, kind, literal)}

def notnull_filter(name, field):
    entity = field["Column"]["Expression"]["SourceRef"]["Entity"]; prop = field["Column"]["Property"]
    return {"name": name, "field": field, "type": "Advanced", "howCreated": "User",
            "filter": where_not_null(entity, prop)}

def topn_filter(name, field, n, by_measure):
    entity = field["Column"]["Expression"]["SourceRef"]["Entity"]; prop = field["Column"]["Property"]
    from_clause = [{"Name": "t", "Entity": entity, "Type": 0}, {"Name": "m", "Entity": "_Measures", "Type": 0}]
    col_ref = {"Column": {"Expression": {"SourceRef": {"Source": "t"}}, "Property": prop}}
    subquery = {"Version": 2, "From": from_clause,
                "Select": [{"Column": {"Expression": {"SourceRef": {"Source": "t"}}, "Property": prop}, "Name": prop}],
                "OrderBy": [{"Direction": 2, "Expression": {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": by_measure}}}]}
    subquery["Top"] = n
    fdef = {"Version": 2, "From": from_clause,
            "Where": [{"Condition": {"In": {"Expressions": [col_ref], "Table": {"Subquery": {"Query": subquery}}}}}]}
    return {"name": name, "field": field, "type": "TopN", "howCreated": "User", "filter": fdef}

# ---------------------------------------------------------------------------
# Container styling
# ---------------------------------------------------------------------------
def container(title=None, subtitle=None, bg=True, border=True, header=True, radius=8, title_size=12, tooltip_page=None, title_color=CHARCOAL, padding=8):
    o = {}
    if title is not None:
        o["title"] = [obj({"show": boolean(True), "text": txt(title), "fontColor": colour(title_color), "fontSize": num(title_size),
                            "fontFamily": txt(FONT_BOLD), "alignment": txt("left")})]
    else:
        o["title"] = [obj({"show": boolean(False)})]
    if subtitle:
        o["subTitle"] = [obj({"show": boolean(True), "text": txt(subtitle), "fontColor": colour(GREY), "fontSize": num(9), "fontFamily": txt(FONT)})]
    o["background"] = [obj({"show": boolean(bg), "color": colour(CARD_BG), "transparency": num(0)})]
    o["border"] = [obj({"show": boolean(border), "color": colour(LINE), "radius": num(radius), "width": num(1)})]
    o["dropShadow"] = [obj({"show": boolean(False)})]
    o["visualHeader"] = [obj({"show": boolean(header), "showVisualInformationButton": boolean(False), "showVisualWarningButton": boolean(False),
                              "showDrillRoleSelector": boolean(False), "showPinButton": boolean(False), "showSmartNarrativeButton": boolean(False),
                              "showPersonalizeVisualButton": boolean(False), "showCommentButton": boolean(False), "showSetAlertButton": boolean(False)})]
    o["padding"] = [obj({"top": num(padding), "bottom": num(padding), "left": num(padding), "right": num(padding)})]
    if tooltip_page:
        o["visualTooltip"] = [obj({"show": boolean(True), "type": txt("ReportPage"), "section": txt(tooltip_page)})]
    return o

# ---------------------------------------------------------------------------
# Visual factory
# ---------------------------------------------------------------------------
class Page:
    def __init__(self, name, display, ordinal, page_type=None, width=W, height=H, visibility=None):
        self.name = name
        self.display = display
        self.ordinal = ordinal
        self.type = page_type
        self.width = width
        self.height = height
        self.visibility = visibility
        self.visuals = []
        self.interactions = []
        self.filters = []
        self.binding = None
        self.z = 0

    def add(self, visual):
        self.z += 1
        visual["position"]["z"] = self.z * 100
        visual["position"]["tabOrder"] = self.z * 100
        self.visuals.append(visual)
        return visual["name"]

    def no_filter(self, source, target):
        self.interactions.append({"source": source, "target": target, "type": "NoFilter"})

    def write(self):
        pdir = os.path.join(PAGES, self.name)
        os.makedirs(os.path.join(pdir, "visuals"), exist_ok=True)
        page = {"$schema": PAGE_SCHEMA, "name": self.name, "displayName": self.display, "displayOption": "FitToPage",
                "height": self.height, "width": self.width,
                "objects": {"background": [obj({"color": colour(PAGE_BG), "transparency": num(0)})],
                            "outspace": [obj({"color": colour("#EBEBEB"), "transparency": num(0)})]}}
        if self.type:
            page["type"] = self.type
        if self.visibility:
            page["visibility"] = self.visibility
        if self.filters:
            page["filterConfig"] = {"filters": self.filters}
        if self.binding:
            page["pageBinding"] = self.binding
        if self.interactions:
            page["visualInteractions"] = self.interactions
        with open(os.path.join(pdir, "page.json"), "w", encoding="utf-8") as f:
            json.dump(page, f, indent=2, ensure_ascii=False)
        for v in self.visuals:
            vdir = os.path.join(pdir, "visuals", v["name"])
            os.makedirs(vdir, exist_ok=True)
            with open(os.path.join(vdir, "visual.json"), "w", encoding="utf-8") as f:
                json.dump(v, f, indent=2, ensure_ascii=False)


def visual(page, seed, vtype, x, y, w, h, query=None, objects=None, cobjects=None, sort=None, filters=None, sync=None, hidden=False):
    name = nm(page.name + "/" + seed)
    v = {"$schema": VC_SCHEMA, "name": name,
         "position": {"x": x, "y": y, "z": 0, "height": h, "width": w, "tabOrder": 0},
         "visual": {"visualType": vtype, "drillFilterOtherVisuals": True}}
    if query is not None:
        q = {"queryState": query}
        if sort:
            q["sortDefinition"] = sort
        v["visual"]["query"] = q
    if objects:
        v["visual"]["objects"] = objects
    if cobjects:
        v["visual"]["visualContainerObjects"] = cobjects
    if sync:
        v["visual"]["syncGroup"] = {"groupName": sync, "fieldChanges": True, "filterChanges": True}
    if filters:
        v["filterConfig"] = {"filters": filters}
    if hidden:
        v["isHidden"] = True
    page.add(v)
    return name

# ---------------------------------------------------------------------------
# Composite visuals
# ---------------------------------------------------------------------------
def textbox(page, seed, x, y, w, h, runs, align="left", bg=False):
    """runs: list of (text, size, colour, bold)"""
    paragraphs = [{"textRuns": [{"value": t, "textStyle": {"fontFamily": FONT_BOLD if b else FONT, "fontSize": f"{s}pt", "color": c}} for (t, s, c, b) in runs],
                   "horizontalTextAlignment": align}]
    cob = container(None, bg=bg, border=False, header=False, padding=0)
    return visual(page, seed, "textbox", x, y, w, h,
                  objects={"general": [obj({"paragraphs": paragraphs})]}, cobjects=cob)

def text_card(page, seed, x, y, w, h, measure_name, size=10, colour_hex=GREY, align="left", bold=False, colour_by=None, bg=False, border=False, title=None):
    """Classic card used to display a text measure (no category label)."""
    labels = {"fontSize": num(size), "fontFamily": txt(FONT_BOLD if bold else FONT), "labelDisplayUnits": num(0), "labelPrecision": num(0)}
    labels["color"] = colour_measure(colour_by) if colour_by else colour(colour_hex)
    objects = {"labels": [obj(labels)], "categoryLabels": [obj({"show": boolean(False)})], "wordWrap": [obj({"show": boolean(True)})]}
    cob = container(title, bg=bg, border=border, header=False, padding=0 if not bg else 8)
    return visual(page, seed, "card", x, y, w, h, query={"Values": {"projections": [proj(mea(measure_name))]}}, objects=objects, cobjects=cob)

def kpi_tile(page, seed, x, y, w, h, label, measure_name, note_measure=None, colour_measure_name=None, value_size=22):
    """KPI tile = value card with title + a note card (MoM) at the bottom of the same rectangle."""
    objects = {"labels": [obj({"fontSize": num(value_size), "fontFamily": txt(FONT_BOLD), "color": colour(TEXT), "labelDisplayUnits": num(0), "labelPrecision": num(0)})],
               "categoryLabels": [obj({"show": boolean(False)})]}
    cob = container(label, bg=True, border=True, header=False, title_size=10, title_color=GREY, padding=10)
    v = visual(page, seed, "card", x, y, w, h, query={"Values": {"projections": [proj(mea(measure_name))]}}, objects=objects, cobjects=cob)
    if note_measure:
        text_card(page, seed + "/note", x + 10, y + h - 26, w - 20, 20, note_measure, size=8, colour_by=colour_measure_name or None, colour_hex=GREY)
    return v

def chart(page, seed, vtype, x, y, w, h, title, category, values, series=None, sort=None, filters=None, legend=None, labels=False,
          colour_hex=None, series_colours=None, tooltip_page=None, y_axis_title=False, subtitle=None, x_axis=True, y_axis=True, units=None, precision=None, y2=None):
    q = {}
    if category:
        q["Category"] = {"projections": [proj(f) for f in (category if isinstance(category, list) else [category])]}
    if series:
        q["Series"] = {"projections": [proj(series)]}
    q["Y"] = {"projections": [proj(f) for f in values]}
    if y2:
        q["Y2"] = {"projections": [proj(f) for f in y2]}
    objects = {
        "categoryAxis": [obj({"show": boolean(x_axis), "labelColor": colour(GREY), "fontSize": num(9), "fontFamily": txt(FONT), "showAxisTitle": boolean(False)})],
        "valueAxis": [obj({"show": boolean(y_axis), "labelColor": colour(GREY), "fontSize": num(9), "fontFamily": txt(FONT), "showAxisTitle": boolean(False),
                           "gridlineShow": boolean(True), "gridlineColor": colour("#EFEFEF")})],
        "legend": [obj({"show": boolean(legend is not None), "position": txt(legend or "Top"), "showTitle": boolean(False), "fontSize": num(9), "labelColor": colour(GREY), "fontFamily": txt(FONT)})],
        "labels": [obj({"show": boolean(labels), "color": colour(GREY), "fontSize": num(9), "fontFamily": txt(FONT),
                        "labelDisplayUnits": num(units if units is not None else 0), "labelPrecision": num(precision if precision is not None else 0)})],
    }
    dp = []
    if colour_hex:
        dp.append(obj({"defaultColor": colour(colour_hex)}))
    if series_colours and series:
        ent = series["Column"]["Expression"]["SourceRef"]["Entity"]; prop = series["Column"]["Property"]
        for val, c in series_colours.items():
            dp.append(obj({"fill": colour(c)}, selector={"data": [{"scopeId": {"Comparison": {"ComparisonKind": 0, "Left": col(ent, prop), "Right": {"Literal": {"Value": "'" + val + "'"}}}}}]}))
    if dp:
        objects["dataPoint"] = dp
    cob = container(title, subtitle=subtitle, tooltip_page=tooltip_page)
    return visual(page, seed, vtype, x, y, w, h, query=q, objects=objects, cobjects=cob, sort=sort, filters=filters)

def table_visual(page, seed, x, y, w, h, title, fields, widths=None, sort=None, filters=None, font_colours=None, totals=False, subtitle=None, tooltip_page=None, font_size=9, wrap_values=False, wrap_headers=True, bg_alt=True):
    """fields: list of (field, displayName)"""
    projections = [proj(f, d) for f, d in fields]
    objects = {
        "columnHeaders": [obj({"fontColor": colour(GREY), "backColor": colour("#FAFAFA"), "fontSize": num(font_size), "fontFamily": txt(FONT_BOLD), "wordWrap": boolean(wrap_headers), "bold": boolean(False)})],
        "values": [obj({"fontSize": num(font_size), "fontFamily": txt(FONT), "fontColorPrimary": colour(TEXT), "fontColorSecondary": colour(TEXT),
                        "backColorPrimary": colour(CARD_BG), "backColorSecondary": colour("#FAFAFA" if bg_alt else CARD_BG), "wordWrap": boolean(wrap_values)})],
        "grid": [obj({"gridVertical": boolean(False), "gridHorizontal": boolean(True), "gridHorizontalColor": colour("#F0F0F0"), "gridHorizontalWeight": num(1),
                      "rowPadding": num(4), "outlineColor": colour(LINE), "textSize": num(font_size)})],
        "total": [obj({"totals": boolean(totals), "fontSize": num(font_size), "fontFamily": txt(FONT_BOLD), "fontColor": colour(TEXT), "backColor": colour("#FAFAFA")})],
    }
    if widths:
        objects["columnWidth"] = [obj({"value": num(wd)}, selector={"metadata": qref(f)}) for (f, _), wd in zip(fields, widths) if wd]
    if font_colours:
        objects["columnFormatting"] = [obj({"fontColor": colour_measure(m)}, selector={"metadata": qref(f)}) for f, m in font_colours]
    cob = container(title, subtitle=subtitle, tooltip_page=tooltip_page)
    return visual(page, seed, "tableEx", x, y, w, h, query={"Values": {"projections": projections}}, objects=objects, cobjects=cob, sort=sort, filters=filters)

def matrix_visual(page, seed, x, y, w, h, title, rows, values, widths=None, sort=None, filters=None, font_colours=None, subtitle=None, font_size=9, columns=None):
    q = {"Rows": {"projections": [proj(f, active=(i == 0)) for i, f in enumerate(rows)]},
         "Values": {"projections": [proj(f, d) for f, d in values]}}
    if columns:
        q["Columns"] = {"projections": [proj(f) for f in columns]}
    objects = {
        "columnHeaders": [obj({"fontColor": colour(GREY), "backColor": colour("#FAFAFA"), "fontSize": num(font_size), "fontFamily": txt(FONT_BOLD), "wordWrap": boolean(True), "bold": boolean(False)})],
        "rowHeaders": [obj({"fontColor": colour(TEXT), "backColor": colour(CARD_BG), "fontSize": num(font_size), "fontFamily": txt(FONT), "wordWrap": boolean(False), "showExpandCollapseButtons": boolean(True), "stepped": boolean(True), "steppedLayoutIndentation": num(12)})],
        "values": [obj({"fontSize": num(font_size), "fontFamily": txt(FONT), "fontColorPrimary": colour(TEXT), "fontColorSecondary": colour(TEXT), "backColorPrimary": colour(CARD_BG), "backColorSecondary": colour("#FAFAFA")})],
        "grid": [obj({"gridVertical": boolean(False), "gridHorizontal": boolean(True), "gridHorizontalColor": colour("#F0F0F0"), "rowPadding": num(3), "outlineColor": colour(LINE), "textSize": num(font_size)})],
        "subTotals": [obj({"rowSubtotals": boolean(True), "columnSubtotals": boolean(True), "fontSize": num(font_size), "fontFamily": txt(FONT_BOLD), "fontColor": colour(TEXT), "backColor": colour("#FAFAFA")})],
    }
    if widths:
        objects["columnWidth"] = [obj({"value": num(wd)}, selector={"metadata": qref(f)}) for (f, _), wd in zip(values, widths) if wd]
    if font_colours:
        objects["columnFormatting"] = [obj({"fontColor": colour_measure(m)}, selector={"metadata": qref(f)}) for f, m in font_colours]
    cob = container(title, subtitle=subtitle)
    return visual(page, seed, "pivotTable", x, y, w, h, query=q, objects=objects, cobjects=cob, sort=sort, filters=filters)

def slicer(page, seed, x, y, w, h, field, label, sync_name, single=False, default_values=None, sort_field=None, search=False):
    entity = field["Column"]["Expression"]["SourceRef"]["Entity"]; prop = field["Column"]["Property"]
    objects = {
        "data": [obj({"mode": txt("Dropdown")})],
        "general": [obj({"orientation": txt("vertical")})],
        "header": [obj({"show": boolean(True), "text": txt(label), "fontColor": colour(GREY), "textSize": num(9), "fontFamily": txt(FONT_BOLD), "outline": txt("None")})],
        "items": [obj({"fontColor": colour(TEXT), "background": colour(CARD_BG), "textSize": num(9), "fontFamily": txt(FONT), "outline": txt("None")})],
        "selection": [obj({"singleSelect": boolean(single), "selectAllCheckboxEnabled": boolean(not single), "strictSingleSelect": boolean(False)})],
    }
    if default_values:
        objects["general"][0]["properties"]["filter"] = {"filter": where_in(entity, prop, default_values, alias="s")}
    cob = container(None, bg=True, border=True, header=False, radius=6, padding=0)
    sort = sort_by(sort_field or field, "Ascending")
    return visual(page, seed, "slicer", x, y, w, h, query={"Values": {"projections": [proj(field, active=True)]}}, objects=objects, cobjects=cob, sort=sort, sync=sync_name)

def button(page, seed, x, y, w, h, label, nav_page=None, back=False, selected=False, bookmark=None):
    text_props = {"show": boolean(True), "text": txt(label), "fontColor": colour(RED if selected else GREY), "fontSize": num(10),
                  "fontFamily": txt(FONT_BOLD if selected else FONT), "horizontalAlignment": txt("center"), "verticalAlignment": txt("middle"), "topMargin": num(0), "bottomMargin": num(0)}
    objects = {"text": [obj(text_props)],
               "fill": [obj({"show": boolean(True), "fillColor": colour(CARD_BG if selected else PAGE_BG), "transparency": num(0)})],
               "outline": [obj({"show": boolean(selected), "lineColor": colour(RED), "weight": num(1), "transparency": num(0)})],
               "icon": [obj({"shapeType": txt("blank")})],
               "shape": [obj({"roundEdge": num(4)})]}
    link = {"show": boolean(True)}
    if back:
        link["type"] = txt("Back")
    elif bookmark:
        link["type"] = txt("Bookmark"); link["bookmark"] = txt(bookmark)
    else:
        link["type"] = txt("PageNavigation"); link["navigationSection"] = txt(nav_page)
    cob = container(None, bg=False, border=False, header=False, padding=0)
    cob["visualLink"] = [obj(link)]
    return visual(page, seed, "actionButton", x, y, w, h, objects=objects, cobjects=cob)

# ---------------------------------------------------------------------------
# Field shortcuts
# ---------------------------------------------------------------------------
F = "FactAttendance"
DATE_YM = col("DimDate", "Year Month")
DATE_RM = col("DimDate", "Reporting Month")
DATE_YEAR = col("DimDate", "Year")
DATE_DAY = col("DimDate", "Day Name Short")
DATE_DATE = col("DimDate", "Date")
DATE_OFFSET = col("DimDate", "Month Offset")
BU = col("DimBusinessUnit", "Business Unit")
CLIENT = col("DimClient", "Client Name")
CC = col("DimCostCenter", "Cost Center")
SHIFT = col("DimShift", "Shift Name")
SOURCE = col("DimSource", "Source Name")
PAYCAL = col("DimPayCalendar", "Pay Calendar")
STATUS_CAT = col("DimStatus", "Status Category")
STATUS = col("DimStatus", "Attendance Status")
EMP_CODE = col("DimEmployee", "Employee Code")
EMP_NAME = col("DimEmployee", "Employee Name")
EMP_AGENCY = col("DimEmployee", "Agency Emp ID")
EXC_TYPE = col("DimExceptionType", "Exception Type")
DQ_TYPE = col("DimDQIssueType", "Issue Type")
HOUR_LABEL = col("DimHour", "Hour Label")
INSIGHT_AREA = col("DimInsight", "Area")
BAND = col(F, "Worked Hours Band")
STATUS2 = col(F, "Status2 Category")
JUST = col(F, "Justification Category")

PAGE_IDS = {
    "overview": nm("page/overview"), "attendance": nm("page/attendance"), "hours": nm("page/hours"), "workforce": nm("page/workforce"),
    "exceptions": nm("page/exceptions"), "employee": nm("page/employee"), "records": nm("page/records"), "tooltip": nm("page/tooltip"),
}
NAV = [("Overview", "overview"), ("Attendance", "attendance"), ("Hours", "hours"), ("Workforce", "workforce"), ("Exceptions", "exceptions"), ("Records", "records")]
TT = PAGE_IDS["tooltip"]

# ---------------------------------------------------------------------------
# Shared header / navigation / filter bar
# ---------------------------------------------------------------------------
HEADER_H = 52
NAV_Y = 58
FILTER_Y = 96
CONTENT_Y = 144

def header(page, title, current_key, show_filters=True, back=False):
    # brand mark + title
    textbox(page, "brand", MARGIN, 10, 52, 34, [("e&", 22, RED, True)])
    textbox(page, "title", MARGIN + 56, 8, 600, 24, [(title, 16, TEXT, True)])
    text_card(page, "period", MARGIN + 56, 31, 620, 16, "Selected Period", size=9, colour_hex=GREY)
    text_card(page, "status", W - MARGIN - 560, 12, 560, 16, "Data Status Line", size=8, colour_hex=GREY_LIGHT, align="right")
    # navigation
    bx = MARGIN
    for label, key in NAV:
        button(page, "nav/" + key, bx, NAV_Y, 96, 26, label, nav_page=PAGE_IDS[key], selected=(key == current_key))
        bx += 100
    if back:
        button(page, "nav/back", W - MARGIN - 96, NAV_Y, 96, 26, "< Back", back=True)
    # thin divider line
    if show_filters:
        filter_bar(page)

def filter_bar(page, include_status=True, include_year=True):
    x = MARGIN
    items = []
    if include_year:
        items.append(("year", DATE_YEAR, "Year", "sync_year", None, None))
    items.append(("month", DATE_RM, "Reporting Month", "sync_month", ["Latest Month"], col("DimDate", "Year Month Sort")))
    items += [("bu", BU, "Business Unit", "sync_bu", None, None), ("client", CLIENT, "Client", "sync_client", None, None),
              ("cc", CC, "Cost Center", "sync_cc", None, None), ("shift", SHIFT, "Shift", "sync_shift", None, None),
              ("source", SOURCE, "Source", "sync_source", None, None), ("paycal", PAYCAL, "Pay Calendar", "sync_paycal", None, None)]
    if include_status:
        items.append(("status", STATUS_CAT, "Status Category", "sync_status", None, None))
    n = len(items)
    wdt = (W - 2 * MARGIN - (n - 1) * 8) / n
    names = {}
    for key, field, label, sync, default, sortf in items:
        names[key] = slicer(page, "slicer/" + key, x, FILTER_Y, wdt, 40, field, label, sync, default_values=default, sort_field=sortf)
        x += wdt + 8
    page.slicers = names
    return names

def kpi_row(page, tiles, y=CONTENT_Y, h=88):
    n = len(tiles)
    wdt = (W - 2 * MARGIN - (n - 1) * GAP) / n
    x = MARGIN
    for t in tiles:
        kpi_tile(page, "kpi/" + t["m"], x, y, wdt, h, t["label"], t["m"], t.get("note"), t.get("colour"))
        x += wdt + GAP

# ---------------------------------------------------------------------------
# PAGE 1 - Executive overview
# ---------------------------------------------------------------------------
def page_overview():
    p = Page(PAGE_IDS["overview"], "Overview", 0)
    header(p, "Workforce Attendance Overview", "overview")
    kpi_row(p, [
        {"label": "Active Employees", "m": "Active Employees", "note": "KPI Note - Active Employees", "colour": "KPI Colour - Active Employees"},
        {"label": "Employee Days", "m": "Employee Days", "note": "KPI Note - Employee Days", "colour": "KPI Colour - Employee Days"},
        {"label": "Present % of Recorded Days", "m": "Present % of Recorded Days", "note": "KPI Note - Present % of Recorded Days", "colour": "KPI Colour - Present % of Recorded Days"},
        {"label": "Total Worked Hours", "m": "Total Worked Hours", "note": "KPI Note - Total Worked Hours", "colour": "KPI Colour - Total Worked Hours"},
        {"label": "Avg Hours / Worked Day", "m": "Avg Hours / Worked Day", "note": "KPI Note - Avg Hours / Worked Day", "colour": "KPI Colour - Avg Hours / Worked Day"},
        {"label": "Exception Days", "m": "Exception Days", "note": "KPI Note - Exception Days", "colour": "KPI Colour - Exception Days"},
        {"label": "Missing Punch %", "m": "Missing Punch %", "note": "KPI Note - Missing Punch %", "colour": "KPI Colour - Missing Punch %"},
    ])
    y1 = CONTENT_Y + 88 + GAP        # 244
    h1 = 206
    cw = (W - 2 * MARGIN - 2 * GAP) / 3
    trend_filter = [adv_filter("f_offset", DATE_OFFSET, 2, "-12L")]
    t1 = chart(p, "trend_days", "columnChart", MARGIN, y1, cw, h1, "Employee Days by Month", DATE_YM, [mea("Employee Days")],
               sort=sort_by(DATE_YM, "Ascending"), filters=trend_filter, colour_hex=DARK_BAR, labels=True, subtitle="Last 13 months, all months regardless of month slicer")
    t2 = chart(p, "trend_rates", "lineChart", MARGIN + cw + GAP, y1, cw, h1, "Present % and Exception % by Month", DATE_YM,
               [mea("Present % of Recorded Days"), mea("Exception % of Recorded Days")], sort=sort_by(DATE_YM, "Ascending"), filters=trend_filter, legend="Top",
               subtitle="Share of recorded employee-days")
    chart(p, "bu_days", "barChart", MARGIN + 2 * (cw + GAP), y1, cw, h1, "Employee Days by Business Unit", BU, [mea("Employee Days")],
          sort=sort_by(mea("Employee Days")), colour_hex=DARK_BAR, labels=True, tooltip_page=TT)
    # rates line: colour second series red
    for v in p.visuals:
        if v["name"] == t2:
            v["visual"]["objects"]["dataPoint"] = [
                obj({"fill": colour(DARK_BAR)}, selector={"metadata": "_Measures.Present % of Recorded Days"}),
                obj({"fill": colour(RED)}, selector={"metadata": "_Measures.Exception % of Recorded Days"})]
            v["visual"]["objects"]["valueAxis"][0]["properties"]["labelDisplayUnits"] = num(0)
    # trend charts ignore the month slicers
    for s in ("month", "year"):
        p.no_filter(p.slicers[s], t1)
        p.no_filter(p.slicers[s], t2)
    y2 = y1 + h1 + GAP             # 462
    h2 = H - y2 - MARGIN           # 234
    iw = 396
    table_visual(p, "insights", MARGIN, y2, iw, h2, "What the Data Shows", [(INSIGHT_AREA, "Area"), (mea("Insight Text"), "Observation (current selection)")],
                 widths=[86, 290], sort=sort_by(INSIGHT_AREA, "Ascending"), wrap_values=True, bg_alt=False, font_size=9,
                 subtitle="Factual statements computed from the selected period")
    table_visual(p, "attention", MARGIN + iw + GAP, y2, W - 2 * MARGIN - iw - GAP, h2, "Management Attention by Business Unit",
                 [(BU, "Business Unit"), (mea("Active Employees"), "Employees"), (mea("Employee Days"), "Employee Days"),
                  (mea("Present % of Recorded Days"), "Present %"), (mea("Exception Days"), "Exception Days"), (mea("Exception % of Recorded Days"), "Exception %"),
                  (mea("Missing Punch %"), "Missing Punch %"), (mea("Avg Hours / Worked Day"), "Avg Hours")],
                 widths=[190, 80, 90, 80, 95, 85, 100, 80], sort=sort_by(mea("Exception Days")),
                 font_colours=[(mea("Exception % of Recorded Days"), "Exception % Colour"), (mea("Missing Punch %"), "Missing Punch % Colour")],
                 totals=True, subtitle="Red = rate above 1.5x the overall rate for the same period", tooltip_page=TT)
    return p

# ---------------------------------------------------------------------------
# PAGE 2 - Attendance & Status
# ---------------------------------------------------------------------------
def page_attendance():
    p = Page(PAGE_IDS["attendance"], "Attendance", 1)
    header(p, "Attendance & Status Analysis", "attendance")
    kpi_row(p, [
        {"label": "Employee Days", "m": "Employee Days", "note": "KPI Note - Employee Days", "colour": "KPI Colour - Employee Days"},
        {"label": "Present Days", "m": "Present Days", "note": "KPI Note - Present Days", "colour": "KPI Colour - Present Days"},
        {"label": "Absent Days", "m": "Absent Days", "note": "KPI Note - Absent Days", "colour": "KPI Colour - Absent Days"},
        {"label": "Leave Days", "m": "Leave Days"},
        {"label": "Present % of Recorded Days", "m": "Present % of Recorded Days", "note": "KPI Note - Present % of Recorded Days", "colour": "KPI Colour - Present % of Recorded Days"},
        {"label": "Present % (Excl. Leave & Rest)", "m": "Present % (Excl. Leave & Rest Days)"},
    ])
    y1 = CONTENT_Y + 88 + GAP
    h1 = 210
    cw = (W - 2 * MARGIN - 2 * GAP) / 3
    trend_filter = [adv_filter("f_offset", DATE_OFFSET, 2, "-12L")]
    t1 = chart(p, "status_trend", "hundredPercentStackedColumnChart", MARGIN, y1, cw, h1, "Status Mix by Month", DATE_YM, [mea("Employee Days")], series=STATUS_CAT,
               sort=sort_by(DATE_YM, "Ascending"), filters=trend_filter, legend="Top", series_colours=STATUS_COLOURS, subtitle="All months regardless of month slicer")
    for s in ("month", "year"):
        p.no_filter(p.slicers[s], t1)
    chart(p, "status_bu", "hundredPercentStackedBarChart", MARGIN + cw + GAP, y1, cw, h1, "Status Mix by Business Unit", BU, [mea("Employee Days")], series=STATUS_CAT,
          sort=sort_by(mea("Employee Days")), legend="Top", series_colours=STATUS_COLOURS, tooltip_page=TT)
    chart(p, "status_shift", "hundredPercentStackedBarChart", MARGIN + 2 * (cw + GAP), y1, cw, h1, "Status Mix by Shift", SHIFT, [mea("Employee Days")], series=STATUS_CAT,
          sort=sort_by(mea("Employee Days")), legend="Top", series_colours=STATUS_COLOURS, filters=[topn_filter("f_top", SHIFT, 12, "Employee Days")], subtitle="Top 12 shifts by employee days")
    y2 = y1 + h1 + GAP
    h2 = H - y2 - MARGIN
    mw = 760
    matrix_visual(p, "matrix", MARGIN, y2, mw, h2, "Attendance by Business Unit > Client > Cost Center", [BU, CLIENT, CC],
                  [(mea("Active Employees"), "Employees"), (mea("Employee Days"), "Employee Days"), (mea("Present Days"), "Present"), (mea("Absent Days"), "Absent"),
                   (mea("Leave Days"), "Leave"), (mea("Present % of Recorded Days"), "Present %"), (mea("Exception Days"), "Exceptions")],
                  widths=[75, 90, 70, 65, 60, 75, 80], sort=sort_by(mea("Employee Days")), font_colours=[(mea("Exception Days"), "Exception % Colour")],
                  subtitle="Expand rows with the + icons; right-click a row to drill through")
    chart(p, "status_weekday", "hundredPercentStackedColumnChart", MARGIN + mw + GAP, y2, W - 2 * MARGIN - mw - GAP, h2, "Status Mix by Weekday", DATE_DAY, [mea("Employee Days")], series=STATUS_CAT,
          sort=sort_by(DATE_DAY, "Ascending"), legend="Top", series_colours=STATUS_COLOURS)
    return p

# ---------------------------------------------------------------------------
# PAGE 3 - Working Hours & Punch Patterns
# ---------------------------------------------------------------------------
def page_hours():
    p = Page(PAGE_IDS["hours"], "Hours", 2)
    header(p, "Working Hours & Punch Patterns", "hours")
    kpi_row(p, [
        {"label": "Total Worked Hours", "m": "Total Worked Hours", "note": "KPI Note - Total Worked Hours", "colour": "KPI Colour - Total Worked Hours"},
        {"label": "Avg Hours / Worked Day", "m": "Avg Hours / Worked Day", "note": "KPI Note - Avg Hours / Worked Day", "colour": "KPI Colour - Avg Hours / Worked Day"},
        {"label": "Median Hours / Worked Day", "m": "Median Hours / Worked Day"},
        {"label": "Worked Days", "m": "Worked Days"},
        {"label": "Avg Punch In", "m": "Avg Punch In Time"},
        {"label": "Avg Punch Out", "m": "Avg Punch Out Time"},
        {"label": "Missing Punch %", "m": "Missing Punch %", "note": "KPI Note - Missing Punch %", "colour": "KPI Colour - Missing Punch %"},
    ])
    y1 = CONTENT_Y + 88 + GAP
    h1 = 200
    cw = (W - 2 * MARGIN - 3 * GAP) / 4
    trend_filter = [adv_filter("f_offset", DATE_OFFSET, 2, "-12L")]
    t1 = chart(p, "hours_trend", "columnChart", MARGIN, y1, cw, h1, "Total Worked Hours by Month", DATE_YM, [mea("Total Worked Hours")],
               sort=sort_by(DATE_YM, "Ascending"), filters=trend_filter, colour_hex=DARK_BAR, labels=True, units=1000, precision=1, subtitle="All months")
    t2 = chart(p, "avg_trend", "lineChart", MARGIN + cw + GAP, y1, cw, h1, "Avg Hours / Worked Day by Month", DATE_YM, [mea("Avg Hours / Worked Day")],
               sort=sort_by(DATE_YM, "Ascending"), filters=trend_filter, colour_hex=RED, labels=True, precision=1, subtitle="All months")
    for s in ("month", "year"):
        p.no_filter(p.slicers[s], t1); p.no_filter(p.slicers[s], t2)
    chart(p, "bands", "columnChart", MARGIN + 2 * (cw + GAP), y1, cw, h1, "Employee Days by Hours Band", BAND, [mea("Employee Days")],
          sort=sort_by(BAND, "Ascending"), colour_hex=DARK_BAR, labels=True, subtitle="Descriptive bands, not policy")
    chart(p, "avg_bu", "barChart", MARGIN + 3 * (cw + GAP), y1, cw, h1, "Avg Hours / Worked Day by Business Unit", BU, [mea("Avg Hours / Worked Day")],
          sort=sort_by(mea("Avg Hours / Worked Day")), colour_hex=DARK_BAR, labels=True, precision=1, tooltip_page=TT)
    y2 = y1 + h1 + GAP
    h2 = H - y2 - MARGIN
    tw = 380
    table_visual(p, "weekday", MARGIN, y2, tw, h2, "Punch Pattern by Weekday",
                 [(DATE_DAY, "Day"), (mea("Employee Days"), "Emp. Days"), (mea("Avg Punch In Time"), "Avg Punch In"), (mea("Avg Punch Out Time"), "Avg Punch Out"),
                  (mea("Avg Hours / Worked Day"), "Avg Hours"), (mea("Missing Punch %"), "Missing Punch %")],
                 widths=[46, 62, 70, 74, 60, 68], sort=sort_by(DATE_DAY, "Ascending"), totals=True)
    pw = 500
    chart(p, "punch_hours", "clusteredColumnChart", MARGIN + tw + GAP, y2, pw, h2, "Punch In and Punch Out by Hour of Day", HOUR_LABEL,
          [mea("Punch In Records by Hour"), mea("Punch Out Records by Hour")], sort=sort_by(HOUR_LABEL, "Ascending"), legend="Top", subtitle="Number of punch records per clock hour")
    for v in p.visuals:
        if v["name"] == nm(p.name + "/punch_hours"):
            v["visual"]["objects"]["dataPoint"] = [
                obj({"fill": colour(DARK_BAR)}, selector={"metadata": "_Measures.Punch In Records by Hour"}),
                obj({"fill": colour(NEUTRAL)}, selector={"metadata": "_Measures.Punch Out Records by Hour"})]
    chart(p, "avg_shift", "barChart", MARGIN + tw + GAP + pw + GAP, y2, W - 2 * MARGIN - tw - pw - 2 * GAP, h2, "Avg Hours / Worked Day by Shift", SHIFT, [mea("Avg Hours / Worked Day")],
          sort=sort_by(mea("Avg Hours / Worked Day")), colour_hex=DARK_BAR, labels=True, precision=1, filters=[topn_filter("f_top", SHIFT, 12, "Employee Days")], subtitle="Top 12 shifts by employee days")
    return p

# ---------------------------------------------------------------------------
# PAGE 4 - Workforce Distribution
# ---------------------------------------------------------------------------
def page_workforce():
    p = Page(PAGE_IDS["workforce"], "Workforce", 3)
    header(p, "Workforce Distribution", "workforce")
    kpi_row(p, [
        {"label": "Active Employees", "m": "Active Employees", "note": "KPI Note - Active Employees", "colour": "KPI Colour - Active Employees"},
        {"label": "Avg Daily Employees", "m": "Avg Daily Employees", "note": "KPI Note - Avg Daily Employees", "colour": "KPI Colour - Avg Daily Employees"},
        {"label": "Employee Days", "m": "Employee Days", "note": "KPI Note - Employee Days", "colour": "KPI Colour - Employee Days"},
        {"label": "Total Worked Hours", "m": "Total Worked Hours", "note": "KPI Note - Total Worked Hours", "colour": "KPI Colour - Total Worked Hours"},
        {"label": "Avg Hours / Employee", "m": "Avg Hours / Employee"},
        {"label": "Days With Data", "m": "Days With Data"},
    ])
    y1 = CONTENT_Y + 88 + GAP
    h1 = 200
    cw = (W - 2 * MARGIN - 2 * GAP) / 3
    chart(p, "emp_bu", "barChart", MARGIN, y1, cw, h1, "Active Employees by Business Unit", BU, [mea("Active Employees")],
          sort=sort_by(mea("Active Employees")), colour_hex=DARK_BAR, labels=True, tooltip_page=TT)
    chart(p, "emp_client", "barChart", MARGIN + cw + GAP, y1, cw, h1, "Active Employees by Client", CLIENT, [mea("Active Employees")],
          sort=sort_by(mea("Active Employees")), colour_hex=DARK_BAR, labels=True, filters=[topn_filter("f_top", CLIENT, 15, "Active Employees")], subtitle="Top 15 clients", tooltip_page=TT)
    chart(p, "emp_shift", "barChart", MARGIN + 2 * (cw + GAP), y1, cw, h1, "Active Employees by Shift", SHIFT, [mea("Active Employees")],
          sort=sort_by(mea("Active Employees")), colour_hex=DARK_BAR, labels=True, filters=[topn_filter("f_top", SHIFT, 15, "Active Employees")], subtitle="Top 15 shifts")
    y2 = y1 + h1 + GAP
    h2 = H - y2 - MARGIN
    mw = 820
    matrix_visual(p, "matrix", MARGIN, y2, mw, h2, "Workforce by Business Unit > Client > Cost Center > Shift", [BU, CLIENT, CC, SHIFT],
                  [(mea("Active Employees"), "Employees"), (mea("Employee Days"), "Employee Days"), (mea("Total Worked Hours"), "Total Hours"),
                   (mea("Avg Hours / Worked Day"), "Avg Hours"), (mea("Present % of Recorded Days"), "Present %"), (mea("Exception % of Recorded Days"), "Exception %"),
                   (mea("Missing Punch %"), "Missing Punch %")],
                  widths=[75, 90, 85, 70, 70, 80, 90], sort=sort_by(mea("Active Employees")),
                  font_colours=[(mea("Exception % of Recorded Days"), "Exception % Colour"), (mea("Missing Punch %"), "Missing Punch % Colour")],
                  subtitle="Expand rows with the + icons; right-click a row to drill through to Employee 360")
    rx = MARGIN + mw + GAP
    rw = W - 2 * MARGIN - mw - GAP
    rh = (h2 - GAP) / 2
    chart(p, "emp_source", "barChart", rx, y2, rw, rh, "Active Employees by Source", SOURCE, [mea("Active Employees")], sort=sort_by(mea("Active Employees")), colour_hex=DARK_BAR, labels=True)
    chart(p, "emp_paycal", "barChart", rx, y2 + rh + GAP, rw, rh, "Active Employees by Pay Calendar", PAYCAL, [mea("Active Employees")], sort=sort_by(mea("Active Employees")), colour_hex=DARK_BAR, labels=True)
    return p

# ---------------------------------------------------------------------------
# PAGE 5 - Exceptions & Data Quality
# ---------------------------------------------------------------------------
def page_exceptions():
    p = Page(PAGE_IDS["exceptions"], "Exceptions", 4)
    header(p, "Exceptions & Data Quality", "exceptions")
    kpi_row(p, [
        {"label": "Employees With Exceptions", "m": "Employees With Exceptions"},
        {"label": "Exception Days", "m": "Exception Days", "note": "KPI Note - Exception Days", "colour": "KPI Colour - Exception Days"},
        {"label": "Missing Punch Days", "m": "Missing Punch Days", "note": "KPI Note - Missing Punch Days", "colour": "KPI Colour - Missing Punch Days"},
        {"label": "Missing Punch %", "m": "Missing Punch %", "note": "KPI Note - Missing Punch %", "colour": "KPI Colour - Missing Punch %"},
        {"label": "Justification Not Recorded", "m": "Justification Not Recorded Days"},
        {"label": "Multiple-Record Days", "m": "Multiple-Record Employee Days"},
        {"label": "Data Quality Issue Records", "m": "DQ Issue Records"},
    ])
    y1 = CONTENT_Y + 88 + GAP
    h1 = 180
    cw = (W - 2 * MARGIN - 3 * GAP) / 4
    trend_filter = [adv_filter("f_offset", DATE_OFFSET, 2, "-12L")]
    t1 = chart(p, "exc_trend", "stackedColumnChart", MARGIN, y1, cw + 60, h1, "Exception Days by Month and Type", DATE_YM, [mea("Exception Days by Type")], series=EXC_TYPE,
               sort=sort_by(DATE_YM, "Ascending"), filters=trend_filter, legend="Top", subtitle="All months")
    for s in ("month", "year"):
        p.no_filter(p.slicers[s], t1)
    x2 = MARGIN + cw + 60 + GAP
    cw2 = (W - MARGIN - x2 - 2 * GAP) / 3
    chart(p, "exc_type", "barChart", x2, y1, cw2, h1, "Exception Days by Type", EXC_TYPE, [mea("Exception Days by Type")], sort=sort_by(mea("Exception Days by Type")), colour_hex=RED, labels=True)
    chart(p, "exc_bu", "barChart", x2 + cw2 + GAP, y1, cw2, h1, "Exception Days by Business Unit", BU, [mea("Exception Days")], sort=sort_by(mea("Exception Days")), colour_hex=RED, labels=True, tooltip_page=TT)
    chart(p, "dq_type", "barChart", x2 + 2 * (cw2 + GAP), y1, cw2, h1, "Data Quality Issues by Type", DQ_TYPE, [mea("DQ Issue Records by Type")], sort=sort_by(mea("DQ Issue Records by Type")), colour_hex=GREY, labels=True, subtitle="Records with each issue")
    y2 = y1 + h1 + GAP
    h2 = H - y2 - MARGIN
    lw = 610
    table_visual(p, "review", MARGIN, y2, lw, h2, "Employees Requiring Attendance Review",
                 [(EMP_CODE, "Code"), (EMP_NAME, "Employee"), (mea("Employee Days"), "Days"), (mea("Present Days"), "Present"), (mea("Exception Days"), "Exc. Days"),
                  (mea("Missing Punch Days"), "Missing Punch"), (mea("Avg Hours / Worked Day"), "Avg Hrs"), (mea("Latest Exception Date"), "Latest Exception"), (mea("Review Reasons"), "Reasons")],
                 widths=[62, 150, 44, 52, 56, 62, 52, 78, 170], sort=sort_by(mea("Exception Days")),
                 filters=[adv_filter("f_exc", col(F, "Exception Flag"), 0, "1L")],
                 subtitle="Ranked by exception days. Right-click a row > Drill through > Employee 360. Not a performance score.", font_size=8)
    # The filter above must be on a column of the fact - use the measure-free approach: filter Exception Flag = 1 keeps only employees with exceptions
    rx = MARGIN + lw + GAP
    table_visual(p, "detail", rx, y2, W - MARGIN - rx, h2, "Exception Records (exportable)",
                 [(col(F, "Process Date"), "Date"), (EMP_CODE, "Code"), (EMP_NAME, "Employee"), (col(F, "Business Unit"), "Business Unit"), (col(F, "Client Name"), "Client"),
                  (col(F, "Shift Name"), "Shift"), (col(F, "Status"), "Status"), (col(F, "Status2"), "Status2"), (col(F, "Justification Category"), "Justification"),
                  (col(F, "Worked Hours Decimal"), "Hours"), (col(F, "Punch In Time"), "Punch In"), (col(F, "Punch Out Time"), "Punch Out"), (col(F, "Exception Types"), "Exception Types"),
                  (col(F, "DQ Issue Types"), "Data Quality Issues")],
                 widths=[70, 60, 120, 80, 90, 100, 60, 60, 80, 45, 100, 100, 140, 140], sort=sort_by(col(F, "Process Date")),
                 filters=[adv_filter("f_exc", col(F, "Exception Flag"), 0, "1L")], subtitle="One row per record with an attendance exception. Use the ... menu to export.", font_size=8, bg_alt=False)
    # Unrecognised status helper
    return p

# ---------------------------------------------------------------------------
# PAGE 6 - Employee 360 (drill-through)
# ---------------------------------------------------------------------------
def page_employee():
    p = Page(PAGE_IDS["employee"], "Employee 360", 5, page_type="Drillthrough", visibility="HiddenInViewMode")
    # header without slicers, with back button
    textbox(p, "brand", MARGIN, 10, 52, 34, [("e&", 22, RED, True)])
    textbox(p, "title", MARGIN + 56, 8, 600, 24, [("Employee Attendance 360", 16, TEXT, True)])
    text_card(p, "period", MARGIN + 56, 31, 620, 16, "Selected Period", size=9, colour_hex=GREY)
    text_card(p, "status", W - MARGIN - 560, 12, 560, 16, "Data Status Line", size=8, colour_hex=GREY_LIGHT, align="right")
    bx = MARGIN
    for label, key in NAV:
        button(p, "nav/" + key, bx, NAV_Y, 96, 26, label, nav_page=PAGE_IDS[key])
        bx += 100
    button(p, "nav/back", W - MARGIN - 96, NAV_Y, 96, 26, "< Back", back=True)
    # employee banner
    text_card(p, "emp_name", MARGIN, FILTER_Y, 700, 26, "Employee Header", size=16, colour_hex=TEXT, bold=True)
    text_card(p, "emp_sub", MARGIN, FILTER_Y + 26, 700, 16, "Employee Sub Header", size=9, colour_hex=GREY)
    text_card(p, "emp_assign", MARGIN + 712, FILTER_Y, W - 2 * MARGIN - 712, 42, "Employee Assignment", size=8, colour_hex=GREY, align="right")
    # drill-through binding on Employee Code
    fname = "FilterEmployeeCode"
    p.filters = [{"name": fname, "ordinal": 0, "field": EMP_CODE, "type": "Categorical", "howCreated": "User",
                  "objects": {"general": [obj({"requireSingleSelect": boolean(True)})]}}]
    p.binding = {"name": nm("binding/employee"), "type": "Drillthrough",
                 "parameters": [{"name": "Param_" + fname, "boundFilter": fname, "qnaSingleSelectRequired": True, "fieldExpr": EMP_CODE}]}
    kpi_row(p, [
        {"label": "Employee Days", "m": "Employee Days"},
        {"label": "Present Days", "m": "Present Days"},
        {"label": "Absent Days", "m": "Absent Days"},
        {"label": "Total Worked Hours", "m": "Total Worked Hours"},
        {"label": "Avg Hours / Worked Day", "m": "Avg Hours / Worked Day"},
        {"label": "Exception Days", "m": "Exception Days"},
        {"label": "Missing Punch Days", "m": "Missing Punch Days"},
    ], y=CONTENT_Y, h=76)
    y1 = CONTENT_Y + 76 + GAP
    h1 = 176
    cw = (W - 2 * MARGIN - 3 * GAP) / 4
    chart(p, "emp_status_trend", "stackedColumnChart", MARGIN, y1, cw, h1, "Employee Days by Month and Status", DATE_YM, [mea("Employee Days")], series=STATUS_CAT,
          sort=sort_by(DATE_YM, "Ascending"), legend="Top", series_colours=STATUS_COLOURS)
    chart(p, "emp_hours_trend", "columnChart", MARGIN + cw + GAP, y1, cw, h1, "Worked Hours by Month", DATE_YM, [mea("Total Worked Hours")],
          sort=sort_by(DATE_YM, "Ascending"), colour_hex=DARK_BAR, labels=True)
    chart(p, "emp_status_mix", "barChart", MARGIN + 2 * (cw + GAP), y1, cw, h1, "Days by Status", STATUS, [mea("Employee Days")], sort=sort_by(mea("Employee Days")), colour_hex=DARK_BAR, labels=True)
    chart(p, "emp_weekday", "columnChart", MARGIN + 3 * (cw + GAP), y1, cw, h1, "Avg Hours / Worked Day by Weekday", DATE_DAY, [mea("Avg Hours / Worked Day")],
          sort=sort_by(DATE_DAY, "Ascending"), colour_hex=DARK_BAR, labels=True, precision=1)
    y2 = y1 + h1 + GAP
    h2 = H - y2 - MARGIN
    table_visual(p, "emp_detail", MARGIN, y2, W - 2 * MARGIN, h2, "Attendance Records",
                 [(col(F, "Process Date"), "Date"), (col(F, "Day"), "Day"), (col(F, "Status"), "Status"), (col(F, "Status2"), "Status2"),
                  (col(F, "Punch In Time"), "Punch In"), (col(F, "Punch Out Time"), "Punch Out"), (col(F, "Total Hours (Source)"), "Total Hours"),
                  (col(F, "Worked Hours Decimal"), "Hours (dec.)"), (col(F, "Is Justified"), "Justified"), (col(F, "Punch In Terminal"), "Punch In Terminal"),
                  (col(F, "Punch Out Terminal"), "Punch Out Terminal"), (col(F, "Exception Types"), "Exception Types"), (col(F, "Business Unit"), "Business Unit"),
                  (col(F, "Client Name"), "Client"), (col(F, "Shift Name"), "Shift"), (col(F, "Source File"), "Source File")],
                 widths=[72, 60, 60, 60, 110, 110, 60, 60, 55, 150, 150, 140, 80, 90, 110, 120], sort=sort_by(col(F, "Process Date")), font_size=8, bg_alt=False)
    return p

# ---------------------------------------------------------------------------
# PAGE 7 - Attendance Records (lookup)
# ---------------------------------------------------------------------------
def page_records():
    p = Page(PAGE_IDS["records"], "Records", 6)
    header(p, "Attendance Records", "records")
    # employee slicer (page-local, not synced) + summary line
    names = p.slicers
    y1 = CONTENT_Y
    slicer(p, "slicer/employee", MARGIN, y1, 300, 40, EMP_NAME, "Employee (search)", "records_employee_local")
    text_card(p, "records_count", MARGIN + 312, y1 + 12, 500, 20, "Records Summary Line", size=9, colour_hex=GREY)
    table_visual(p, "records", MARGIN, y1 + 52, W - 2 * MARGIN, H - y1 - 52 - MARGIN, "All Attendance Records (exportable)",
                 [(col(F, "Process Date"), "Date"), (col(F, "Day"), "Day"), (EMP_CODE, "Code"), (EMP_NAME, "Employee"), (col(F, "Agency Emp ID"), "Agency ID"),
                  (col(F, "Source Name"), "Source"), (col(F, "Business Unit"), "Business Unit"), (col(F, "Client Name"), "Client"), (col(F, "Cost Center"), "Cost Center"),
                  (col(F, "Pay Calendar"), "Pay Calendar"), (col(F, "Shift Name"), "Shift"), (col(F, "Status"), "Status"), (col(F, "Status2"), "Status2"),
                  (col(F, "Punch In Time"), "Punch In"), (col(F, "Punch Out Time"), "Punch Out"), (col(F, "Total Hours (Source)"), "Total Hours"),
                  (col(F, "Worked Hours Decimal"), "Hours (dec.)"), (col(F, "Is Justified"), "Justified"), (col(F, "Punch In Terminal"), "Punch In Terminal"),
                  (col(F, "Punch Out Terminal"), "Punch Out Terminal"), (col(F, "Exception Types"), "Exception Types"), (col(F, "DQ Issue Types"), "Data Quality Issues"),
                  (col(F, "Source File"), "Source File"), (col(F, "Source Sheet"), "Sheet"), (col(F, "Source Row Number"), "Row")],
                 widths=[72, 60, 62, 140, 70, 70, 80, 90, 110, 90, 110, 60, 60, 110, 110, 60, 60, 55, 150, 150, 140, 140, 120, 60, 40],
                 sort=sort_by(col(F, "Process Date")), font_size=8, bg_alt=False, subtitle="Operational lookup only. Use the ... menu to export to Excel/CSV.")
    return p

# ---------------------------------------------------------------------------
# Tooltip page
# ---------------------------------------------------------------------------
def page_tooltip():
    p = Page(PAGE_IDS["tooltip"], "Tooltip - Summary", 7, page_type="Tooltip", width=320, height=230, visibility="HiddenInViewMode")
    fname = "TooltipBU"
    p.filters = [{"name": fname, "ordinal": 0, "field": BU, "type": "Categorical", "howCreated": "User"}]
    p.binding = {"name": nm("binding/tooltip"), "type": "Tooltip", "parameters": [{"name": "Param_" + fname, "boundFilter": fname, "fieldExpr": BU}]}
    text_card(p, "tt_title", 10, 8, 300, 20, "Selected Period", size=9, colour_hex=GREY, bold=True)
    fields = [(mea("Active Employees"), "Employees"), (mea("Employee Days"), "Employee Days"), (mea("Present % of Recorded Days"), "Present %"),
              (mea("Total Worked Hours"), "Total Hours"), (mea("Avg Hours / Worked Day"), "Avg Hours / Worked Day"), (mea("Exception Days"), "Exception Days"),
              (mea("Missing Punch %"), "Missing Punch %")]
    objects = {"dataLabels": [obj({"fontSize": num(11), "color": colour(TEXT), "fontFamily": txt(FONT_BOLD)})],
               "categoryLabels": [obj({"show": boolean(True), "fontSize": num(8), "color": colour(GREY), "fontFamily": txt(FONT)})],
               "cardTitle": [obj({"show": boolean(False)})],
               "card": [obj({"outline": txt("None"), "barShow": boolean(False), "outlineColor": colour(LINE)})]}
    cob = container(None, bg=False, border=False, header=False, padding=0)
    visual(p, "tt_cards", "multiRowCard", 10, 30, 300, 190, query={"Values": {"projections": [proj(f, d) for f, d in fields]}}, objects=objects, cobjects=cob)
    return p

# ---------------------------------------------------------------------------
# Report-level files
# ---------------------------------------------------------------------------
def write_report_files(pages):
    if os.path.exists(PAGES):
        shutil.rmtree(PAGES)
    os.makedirs(PAGES, exist_ok=True)
    for p in pages:
        p.write()
    ordered = [p.name for p in sorted(pages, key=lambda p: p.ordinal)]
    with open(os.path.join(PAGES, "pages.json"), "w", encoding="utf-8") as f:
        json.dump({"$schema": PAGES_SCHEMA, "pageOrder": ordered, "activePageName": PAGE_IDS["overview"]}, f, indent=2)
    with open(os.path.join(DEF, "version.json"), "w", encoding="utf-8") as f:
        json.dump({"$schema": VERSION_SCHEMA, "version": "2.0.0"}, f, indent=2)
    report = {
        "$schema": REPORT_SCHEMA,
        "themeCollection": {
            "baseTheme": {"name": "CY24SU10", "reportVersionAtImport": "5.61", "type": "SharedResources"},
            "customTheme": {"name": "eand_attendance_theme.json", "reportVersionAtImport": "5.64", "type": "RegisteredResources"},
        },
        "layoutOptimization": "None",
        "objects": {"outspacePane": [obj({"expanded": boolean(False), "visible": boolean(True)})]},
        "resourcePackages": [
            {"name": "SharedResources", "type": "SharedResources", "items": [{"name": "CY24SU10", "path": "BaseThemes/CY24SU10.json", "type": "BaseTheme"}]},
            {"name": "RegisteredResources", "type": "RegisteredResources", "items": [{"name": "eand_attendance_theme.json", "path": "eand_attendance_theme.json", "type": "CustomTheme"}]},
        ],
        "settings": {"useStylableVisualContainerHeader": True, "exportDataMode": "AllowSummarizedAndUnderlying", "defaultFilterActionIsDataFilter": True,
                     "defaultDrillFilterOtherVisuals": True, "allowChangeFilterTypes": True, "allowInlineExploration": False, "useEnhancedTooltips": True,
                     "hideVisualContainerHeader": False},
        "slowDataSourceSettings": {"isCrossHighlightingDisabled": False, "isSlicerSelectionsButtonEnabled": False, "isFilterSelectionsButtonEnabled": False,
                                   "isFieldWellButtonEnabled": False, "isApplyAllButtonEnabled": False},
    }
    with open(os.path.join(DEF, "report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    with open(os.path.join(ROOT, "definition.pbir"), "w", encoding="utf-8") as f:
        json.dump({"$schema": f"{SCHEMA_BASE}/definitionProperties/2.0.0/schema.json", "version": "4.0",
                   "datasetReference": {"byPath": {"path": "../Attendance Dashboard.SemanticModel"}}}, f, indent=2)
    with open(os.path.join(ROOT, ".platform"), "w", encoding="utf-8") as f:
        json.dump({"$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
                   "metadata": {"type": "Report", "displayName": "Attendance Dashboard"},
                   "config": {"version": "2.0", "logicalId": "7b1c1d2e-3f40-5a6b-8c9d-0e1f2a3b4c5d"}}, f, indent=2)
    theme = {
        "name": "e& Attendance",
        "dataColors": [DARK_BAR, RED, "#8E8E8E", NEUTRAL, SLATE, GREEN, GOLD, "#5C5C5C"],
        "foreground": TEXT, "foregroundNeutralSecondary": GREY, "foregroundNeutralTertiary": GREY_LIGHT,
        "background": CARD_BG, "backgroundLight": PAGE_BG, "backgroundNeutral": LINE,
        "tableAccent": RED, "good": GREEN, "neutral": GOLD, "bad": RED, "maximum": RED, "center": NEUTRAL, "minimum": NEUTRAL_LIGHT, "null": NEUTRAL_LIGHT,
        "textClasses": {
            "callout": {"fontSize": 22, "fontFace": FONT_BOLD, "color": TEXT},
            "title": {"fontSize": 12, "fontFace": FONT_BOLD, "color": CHARCOAL},
            "header": {"fontSize": 11, "fontFace": FONT_BOLD, "color": CHARCOAL},
            "label": {"fontSize": 9, "fontFace": FONT, "color": GREY},
        },
        "visualStyles": {
            "*": {"*": {
                "background": [{"show": True, "color": {"solid": {"color": CARD_BG}}, "transparency": 0}],
                "border": [{"show": True, "color": {"solid": {"color": LINE}}, "radius": 8}],
                "dropShadow": [{"show": False}],
                "title": [{"show": True, "fontSize": 12, "fontFamily": FONT_BOLD, "fontColor": {"solid": {"color": CHARCOAL}}, "alignment": "left"}],
                "visualHeader": [{"show": True, "transparency": 100, "foreground": {"solid": {"color": GREY}}, "background": {"solid": {"color": CARD_BG}}}],
                "outspacePane": [{"backgroundColor": {"solid": {"color": PAGE_BG}}, "foregroundColor": {"solid": {"color": TEXT}}, "transparency": 0, "border": True, "borderColor": {"solid": {"color": LINE}}, "titleSize": 12, "headerSize": 10, "fontFamily": FONT}],
                "filterCard": [{"$id": "Applied", "backgroundColor": {"solid": {"color": CARD_BG}}, "foregroundColor": {"solid": {"color": TEXT}}, "border": True, "borderColor": {"solid": {"color": LINE}}, "textSize": 9, "fontFamily": FONT},
                               {"$id": "Available", "backgroundColor": {"solid": {"color": CARD_BG}}, "foregroundColor": {"solid": {"color": TEXT}}, "border": True, "borderColor": {"solid": {"color": LINE}}, "textSize": 9, "fontFamily": FONT}],
            }},
            "page": {"*": {"background": [{"color": {"solid": {"color": PAGE_BG}}, "transparency": 0}], "outspace": [{"color": {"solid": {"color": "#EBEBEB"}}, "transparency": 0}]}},
        },
    }
    with open(os.path.join(ROOT, "StaticResources", "RegisteredResources", "eand_attendance_theme.json"), "w", encoding="utf-8") as f:
        json.dump(theme, f, indent=2)


if __name__ == "__main__":
    pages = [page_overview(), page_attendance(), page_hours(), page_workforce(), page_exceptions(), page_employee(), page_records(), page_tooltip()]
    write_report_files(pages)
    print("Report written:", ROOT, "| pages:", len(pages), "| visuals:", sum(len(p.visuals) for p in pages))
