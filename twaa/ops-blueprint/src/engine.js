/* Twaa flowchart engine: data → dagre layout → SVG (RTL Arabic, BPMN-style shapes, colour-coded paths) */
const dagre = require("dagre");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const COL = { plum: "#3A1F3D", plum2: "#5A3A5E", cream: "#F9F2E7", orange: "#F9732F", orange2: "#B85A1E", green: "#2E7D4F", green2: "#DFF3E6", red: "#C63A3A", red2: "#FBE1E1", gray: "#7E6F80", gray2: "#EEE9E1", purple: "#6D3FA8", purple2: "#EFE7F9", ink: "#241626", white: "#FFFFFF", line: "#B9AEA2" };
/* node types: S start, E end, P process (plum outline), D decision, X system/data (purple, document shape), W wait/manual (orange), K customer action (white), M merchant/rider (cream) */
const FS = 14, LH = 18.5;
function wrap(text, max) { const words = String(text).split(/\s+/); const lines = []; let cur = ""; for (const w of words) { if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); } if (cur) lines.push(cur); return lines; }
function measure(n) {
  const maxc = n.type === "D" ? 20 : 24; const lines = wrap(n.label, maxc); const longest = Math.max(...lines.map((l) => l.length), n.code ? n.code.length * 0.75 : 0);
  let w = Math.min(Math.max(longest * 8 + 30, 104), 250); let h = lines.length * LH + 18 + (n.code ? 14 : 0);
  if (n.type === "D") { w = w * 1.35 + 30; h = h * 1.5 + 30; }
  if (n.type === "S" || n.type === "E") { w += 16; h = Math.max(h, 40); }
  return { lines, w, h };
}
function shape(n, m) {
  const { w, h } = m; const x = -w / 2, y = -h / 2; const cls = n.cls || "";
  const F = { S: [COL.plum, COL.plum, COL.white], E: cls === "ok" ? [COL.green, COL.green, COL.white] : cls === "fail" ? [COL.red, COL.red, COL.white] : [COL.gray, COL.gray, COL.white], P: [COL.white, COL.plum, COL.ink], K: [COL.white, COL.gray, COL.ink], M: [COL.cream, COL.plum2, COL.ink], D: [COL.white, COL.orange, COL.ink], X: [COL.purple2, COL.purple, COL.ink], W: ["#FFF3EC", COL.orange, COL.ink], N: [COL.gray2, COL.gray, COL.ink] }[n.type] || [COL.white, COL.plum, COL.ink];
  const [fill, stroke, text] = F; const sw = n.type === "P" || n.type === "M" ? 1.6 : 1.4;
  let body;
  if (n.type === "S" || n.type === "E") body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  else if (n.type === "D") body = `<polygon points="0,${y} ${w / 2},0 0,${h / 2} ${-w / 2},0" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
  else if (n.type === "X") body = `<path d="M${x} ${y} H${x + w} V${y + h - 7} Q${x + w * 0.75} ${y + h - 14} ${x + w / 2} ${y + h - 7} T${x} ${y + h - 7} Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  else if (n.type === "W") body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="6 3"/>`;
  else if (n.type === "N") body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
  else body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const ty = -((m.lines.length - 1) * LH) / 2 - (n.code ? 6 : 0);
  const txt = m.lines.map((l, i) => `<text x="0" y="${ty + i * LH}" font-size="${FS}" fill="${text}" text-anchor="middle" dominant-baseline="middle" direction="rtl" font-weight="${n.type === "D" || n.type === "S" || n.type === "E" ? 700 : 600}">${esc(l)}</text>`).join("");
  const code = n.code ? `<text x="0" y="${ty + m.lines.length * LH - 2}" font-size="9.5" fill="${text === COL.white ? "#F3E8F3" : COL.gray}" text-anchor="middle" dominant-baseline="middle" direction="ltr" font-family="Consolas, 'DejaVu Sans Mono', monospace" letter-spacing=".3">${esc(n.code)}</text>` : "";
  const badge = n.ref ? `<text x="${x + w - 4}" y="${y - 5}" font-size="9" fill="${COL.purple}" text-anchor="end" direction="ltr" font-weight="700">${esc(n.ref)}</text>` : "";
  return body + txt + code + badge;
}
const EDGE = { ok: COL.green, fail: COL.red, wait: COL.orange, sys: COL.purple, "": COL.plum2 };
function render(g, opts = {}) {
  const dir = g.dir || "TB"; const G = new dagre.graphlib.Graph({ multigraph: true }); G.setGraph({ rankdir: dir, nodesep: opts.nodesep || 26, ranksep: opts.ranksep || 44, edgesep: 14, marginx: 10, marginy: 10 }); G.setDefaultEdgeLabel(() => ({}));
  const nodes = {}; for (const n of g.nodes) { const m = measure(n); nodes[n.id] = { n, m }; G.setNode(n.id, { width: m.w, height: m.h }); }
  g.edges.forEach((e, i) => { if (!nodes[e.from] || !nodes[e.to]) throw new Error(`${g.id}: edge ${e.from}->${e.to} references unknown node`); G.setEdge(e.from, e.to, { label: e.label || "", width: e.label && !g.tight ? e.label.length * 7 + 12 : 0, height: e.label && !g.tight ? 16 : 0, labelpos: "c", cls: e.cls || "" }, "e" + i); });
  dagre.layout(G); const gw = G.graph().width, gh = G.graph().height;
  let out = "";
  for (const ek of G.edges()) { const e = G.edge(ek); const c = EDGE[e.cls] ?? EDGE[""]; const pts = e.points; const d = pts.map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
    out += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${e.cls === "fail" || e.cls === "ok" ? 1.9 : 1.5}" ${e.cls === "wait" ? 'stroke-dasharray="7 4"' : ""} marker-end="url(#ah-${e.cls || "d"})"/>`;
    if (e.label) { if (g.tight) { const mid = pts[Math.floor(pts.length / 2)]; e.x = mid.x; e.y = mid.y; } const lw = e.label.length * 7 + 12; out += `<rect x="${e.x - lw / 2}" y="${e.y - 9}" width="${lw}" height="18" rx="9" fill="${COL.white}" stroke="${c}" stroke-width="1"/><text x="${e.x}" y="${e.y + 1}" font-size="11" font-weight="700" fill="${c}" text-anchor="middle" dominant-baseline="middle" direction="rtl">${esc(e.label)}</text>`; } }
  for (const id of G.nodes()) { const p = G.node(id); const { n, m } = nodes[id]; out += `<g transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})">${shape(n, m)}</g>`; }
  const defs = `<defs>${Object.entries(EDGE).map(([k, c]) => `<marker id="ah-${k || "d"}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join("")}</defs>`;
  /* out-degree audit: every non-end node must have an outgoing edge; every decision ≥2 */
  const audit = []; if (!g.noAudit) for (const n of g.nodes) { if (n.type === 'N') continue; const od = G.outEdges(n.id).length, idg = G.inEdges(n.id).length; if (n.type !== "E" && od === 0) audit.push(`dead end: ${n.id} (${n.label})`); if (n.type === "D" && od < 2) audit.push(`decision with <2 branches: ${n.id}`); if (n.type !== "S" && idg === 0) audit.push(`unreachable: ${n.id}`); }
  const bands = G.nodes().map((id) => { const p = G.node(id); const { m } = nodes[id]; return [p.y - m.h / 2 + 10 - 12, p.y + m.h / 2 + 10 + 4]; });
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(gw + 20)} ${Math.ceil(gh + 20)}" class="flow" data-w="${Math.ceil(gw)}" data-h="${Math.ceil(gh)}" font-family="Cairo, 'Noto Sans Arabic', sans-serif">${defs}<g transform="translate(10,10)">${out}</g></svg>`, w: gw, h: gh, audit, bands };
}

/* Paginate a rendered graph into page-sized SVG windows, cutting only in gaps between node bands. */
function paginate(g, r, opts = {}) {
  const pageW = opts.pageW || 1000, pageH = opts.pageH || 1400, minScale = opts.minScale || 0.62;
  const W = r.w + 20, H = r.h + 20;
  let scale = Math.min(1, pageW / W);              /* never wider than the page */
  const one = pageH / H;                            /* scale that fits everything on one page */
  if (H * scale > pageH && one >= Math.max(minScale, scale * 0.8)) scale = Math.min(scale, one); /* shrink a little instead of a tiny second page */
  const ph = pageH / scale;
  const body = r.svg.replace(/<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const mk = (y0, y1, cont) => ({ svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${y0.toFixed(0)} ${Math.ceil(W)} ${Math.ceil(y1 - y0)}" class="flow" font-family="Cairo, 'Noto Sans Arabic', sans-serif">${body}</svg>`, scale, w: W, h: y1 - y0, y0, cont });
  if (H <= ph + 1) return [Object.assign(mk(0, H, false), { part: 1, parts: 1 })];
  const bands = r.bands.slice().sort((a, b) => a[0] - b[0]);
  const n = Math.ceil(H / ph); const target = H / n; const pages = []; let y0 = 0;
  for (let i = 0; i < n && y0 < H; i++) {
    if (i === n - 1) { pages.push(mk(y0, H, false)); break; }
    /* candidate cuts: gaps between bands; choose the one closest to y0+target that is within ph */
    let best = null; for (const [ys] of bands) { const prevEnd = Math.max(y0, ...bands.filter(([s]) => s < ys).map(([, e]) => e)); if (prevEnd <= ys && ys - y0 <= ph && ys > y0 + ph * 0.3) { const cut = (prevEnd + ys) / 2; if (best === null || Math.abs(cut - (y0 + target)) < Math.abs(best - (y0 + target))) best = cut; } }
    const cut = best === null ? Math.min(H, y0 + ph) : best; pages.push(mk(y0, cut, true)); y0 = cut; }
  pages.forEach((p, i) => { p.part = i + 1; p.parts = pages.length; }); return pages;
}
module.exports = { render, paginate, COL, esc, wrap };
