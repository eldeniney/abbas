/* Smoke test for Twaa Business OS.
   Usage: NODE_PATH=/opt/node22/lib/node_modules node twaa/os/tools/smoke.js [--out DIR] [--w 1440] [--h 900] [--dark] [--shots] hash1 hash2 ...
   Each hash is a bare token like "customer.cart" or "admin.control-tower". With no hashes it walks every admin nav page + main app screens.
   Reports page errors, console errors and horizontal overflow per route; --shots saves a PNG per route into --out. Exit code 1 on any error. */
const { chromium } = require("playwright");
const path = require("path");
const args = process.argv.slice(2);
const opt = { out: "/tmp/twaa-smoke", w: 1440, h: 900, dark: false, shots: false, full: false, wait: 900 };
const hashes = [];
for (let i = 0; i < args.length; i++) { const a = args[i]; if (a === "--out") opt.out = args[++i]; else if (a === "--w") opt.w = +args[++i]; else if (a === "--h") opt.h = +args[++i]; else if (a === "--dark") opt.dark = true; else if (a === "--shots") opt.shots = true; else if (a === "--full") opt.full = true; else if (a === "--wait") opt.wait = +args[++i]; else hashes.push(a); }
(async () => {
  const fs = require("fs"); if (opt.shots) fs.mkdirSync(opt.out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: opt.w, height: opt.h }, colorScheme: opt.dark ? "dark" : "light" });
  let errs = [];
  p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|net::|ERR_/.test(m.text())) errs.push("CONSOLE " + m.text()); if (m.type() === "warning" && /no handler/.test(m.text())) errs.push("WARN " + m.text()); });
  const file = "file://" + path.resolve(__dirname, "../index.html");
  await p.goto(file + "#home"); await p.waitForTimeout(600);
  const bootErrs = errs.slice(); if (bootErrs.length) console.log("FAIL boot\n     " + bootErrs.join("\n     "));
  let list = hashes;
  if (!list.length) {
    const nav = await p.evaluate(() => window.TW.A.NAV.flatMap(([g, ga, items]) => items.map((x) => "admin" + (x[0] ? "." + x[0] : ""))));
    list = ["home", "live", "customer", "customer.cart", "customer.orders", "customer.account", "merchant", "merchant.orders", "merchant.catalog", "merchant.finance", "rider", "rider.jobs", "rider.cash", "rider.earnings", ...nav];
  }
  let bad = 0;
  for (const h of list) {
    errs = [];
    await p.evaluate((hh) => { location.hash = hh; }, h); await p.waitForTimeout(opt.wait);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const txt = await p.evaluate(() => (document.querySelector("#view") || document.body).innerText.length);
    const crashed = await p.evaluate(() => /حصل خطأ في عرض|خطأ في عرض الصفحة|الصفحة دي لسه بتتبني/.test(document.body.innerText));
    if (opt.shots) await p.screenshot({ path: path.join(opt.out, h.replace(/[^\w.-]/g, "_") + ".png"), fullPage: opt.full });
    const ok = !errs.length && ov <= 1 && !crashed;
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${h.padEnd(34)} overflowX=${ov} text=${txt}${crashed ? " RENDER-ERROR" : ""}${errs.length ? "\n     " + errs.join("\n     ") : ""}`);
  }
  await b.close();
  process.exit(bad || bootErrs.length ? 1 : 0);
})();
