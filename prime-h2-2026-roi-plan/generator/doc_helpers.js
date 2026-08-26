const dx = require("docx");
const {
  Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, convertInchesToTwip,
} = dx;
const D = require("./data.js");
const C = D.C;

const FONT = "Segoe UI";
const CONTENT_W = 9746;   // DXA, A4 portrait with 1080 margins

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const HAIR = (color) => ({ style: BorderStyle.SINGLE, size: 4, color });

function P(text, o = {}) {
  const runs = Array.isArray(text) ? text : [{ text }];
  return new Paragraph({
    alignment: o.align || AlignmentType.LEFT,
    spacing: { before: o.before ?? 60, after: o.after ?? 120, line: o.line ?? 264 },
    indent: o.indent,
    keepNext: o.keepNext,
    border: o.border,
    shading: o.shading,
    children: runs.map(r => new TextRun({
      text: r.text,
      bold: r.bold ?? o.bold,
      italics: r.italics ?? o.italics,
      color: r.color || o.color || "20242A",
      size: (r.size || o.size || 20),           // half-points
      font: FONT,
      break: r.break,
    })),
  });
}

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.red, space: 6 } },
    children: [new TextRun({ text, bold: true, size: 30, color: C.ink, font: FONT })],
  });
}
function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 110 },
    keepNext: true,
    children: [new TextRun({ text, bold: true, size: 24, color: C.red, font: FONT })],
  });
}
function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 90 },
    keepNext: true,
    children: [new TextRun({ text, bold: true, size: 21, color: C.ink, font: FONT })],
  });
}

function BULLETS(items, level = 0) {
  return items.map(t => new Paragraph({
    numbering: { reference: "bulletList", level },
    spacing: { before: 40, after: 80, line: 260 },
    children: (Array.isArray(t) ? t : [{ text: t }]).map(r => new TextRun({
      text: r.text, bold: r.bold, italics: r.italics,
      color: r.color || "20242A", size: r.size || 20, font: FONT,
    })),
  }));
}

function NUMS(items) {
  return items.map(t => new Paragraph({
    numbering: { reference: "numList", level: 0 },
    spacing: { before: 40, after: 80, line: 260 },
    children: (Array.isArray(t) ? t : [{ text: t }]).map(r => new TextRun({
      text: r.text, bold: r.bold, italics: r.italics,
      color: r.color || "20242A", size: r.size || 20, font: FONT,
    })),
  }));
}

function cellPara(v, o = {}) {
  const runs = Array.isArray(v) ? v : [{ text: String(v) }];
  return new Paragraph({
    alignment: o.align || AlignmentType.LEFT,
    spacing: { before: 40, after: 40, line: 240 },
    children: runs.map(r => new TextRun({
      text: r.text, bold: r.bold ?? o.bold, italics: r.italics ?? o.italics,
      color: r.color || o.color || "20242A", size: r.size || o.size || 17, font: FONT,
    })),
  });
}

/** rows: array of arrays. First row is the header unless opts.noHeader. */
function TABLE(rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cols = widths.map(w => Math.round(w / total * CONTENT_W));
  const aligns = opts.align || [];
  const body = rows.map((cells, ri) => {
    const isHead = ri === 0 && !opts.noHeader;
    return new TableRow({
      tableHeader: isHead,
      cantSplit: true,
      children: cells.map((c, ci) => new TableCell({
        width: { size: cols[ci], type: WidthType.DXA },
        shading: {
          type: ShadingType.CLEAR, fill: isHead ? C.ink : (ri % 2 === 0 ? "F4F5F7" : "FFFFFF"), color: "auto",
        },
        margins: { top: 70, bottom: 70, left: 100, right: 100 },
        borders: { top: HAIR("D8DCE0"), bottom: HAIR("D8DCE0"), left: NONE, right: NONE },
        children: [cellPara(c, {
          bold: isHead || (opts.boldCol0 && ci === 0),
          color: isHead ? "FFFFFF" : undefined,
          size: isHead ? 17 : (opts.size || 17),
          align: aligns[ci] === "r" ? AlignmentType.RIGHT : aligns[ci] === "c" ? AlignmentType.CENTER : AlignmentType.LEFT,
        })],
      })),
    });
  });
  return new Table({
    columnWidths: cols,
    width: { size: CONTENT_W, type: WidthType.DXA },
    borders: {
      top: HAIR("D8DCE0"), bottom: HAIR("D8DCE0"), left: NONE, right: NONE,
      insideHorizontal: HAIR("E6E9EC"), insideVertical: NONE,
    },
    rows: body,
  });
}

/** Callout box used for warnings, rules and executive asks. */
function CALLOUT(title, lines, accent = C.red, fill = "FBF2F4") {
  const kids = [
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text: title, bold: true, size: 19, color: accent, font: FONT })],
    }),
    ...lines.map(t => new Paragraph({
      spacing: { before: 30, after: 40, line: 250 },
      children: [new TextRun({ text: t, size: 18, color: "2A2F35", font: FONT })],
    })),
  ];
  return new Table({
    columnWidths: [CONTENT_W],
    width: { size: CONTENT_W, type: WidthType.DXA },
    borders: {
      top: NONE, bottom: NONE, right: NONE,
      left: { style: BorderStyle.SINGLE, size: 18, color: accent },
      insideHorizontal: NONE, insideVertical: NONE,
    },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill, color: "auto" },
        margins: { top: 130, bottom: 130, left: 190, right: 160 },
        children: kids,
      })],
    })],
  });
}

const SPACER = (h = 120) => new Paragraph({ spacing: { before: 0, after: h }, children: [new TextRun({ text: "", font: FONT })] });

module.exports = { dx, P, H1, H2, H3, BULLETS, NUMS, TABLE, CALLOUT, SPACER, FONT, CONTENT_W, C, D };
