/* Text DSL → graph.  Node line:  id | TYPE | label | CODE | cls   (CODE and cls optional; cls ok/fail for END nodes)
   Edge line:  from -> to : label : cls   (label/cls optional; cls ok|fail|wait|sys).  Lines starting with # are comments. */
function parse(id, text, opts = {}) {
  const nodes = [], edges = [];
  for (let raw of text.split("\n")) { const line = raw.trim(); if (!line || line.startsWith("#")) continue;
    if (line.includes("->")) { const [lhs, rest] = line.split("->"); const parts = rest.split(":").map((s) => s.trim()); let [to, label, cls] = parts; if (!cls && ["ok", "fail", "wait", "sys"].includes(label)) { cls = label; label = ""; } edges.push({ from: lhs.trim(), to, label: label || "", cls: cls || "" }); }
    else { const p = line.split("|").map((s) => s.trim()); const [nid, type, label, code, cls] = p; nodes.push({ id: nid, type, label, code: code || "", cls: cls || (type === "E" ? "neutral" : "") }); } }
  return Object.assign({ id, nodes, edges, dir: "TB" }, opts);
}
module.exports = { parse };
