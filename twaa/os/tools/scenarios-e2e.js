/* Drive the 14 demo scenarios through the scenario director in a real browser (clicks the director's own buttons).
   Usage: NODE_PATH=/opt/node22/lib/node_modules node twaa/os/tools/scenarios-e2e.js [s1,s2,...] [--shots DIR]
   Each scenario starts from freshly reset demo data unless NORESET=1. Exit code 1 when any step fails. */
const { chromium } = require("playwright");
const path = require("path");
const args = process.argv.slice(2);
const only = args.find((a) => /^s\d/.test(a));
const shotsAt = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : null;
(async () => {
  if (shotsAt) require("fs").mkdirSync(shotsAt, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  let errs = []; p.on("pageerror", (e) => errs.push("PAGEERR " + e.message)); p.on("console", (m) => { if (m.type() === "error" && !/fonts|net::|ERR_/.test(m.text())) errs.push("CONSOLE " + m.text()); });
  await p.goto("file://" + path.resolve(__dirname, "../index.html") + "#home"); await p.waitForTimeout(800);
  const ids = await p.evaluate(() => TW.scenarios.map((s) => s.id));
  let total = 0, bad = 0;
  for (const id of ids) {
    if (only && !only.split(",").includes(id)) continue;
    if (!process.env.NORESET) await p.evaluate(() => TW.reset());
    await p.evaluate((i) => TW.director.start(i), id); await p.waitForTimeout(900);
    const n = await p.evaluate((i) => TW.scenarios.find((s) => s.id === i).steps.length, id);
    let line = id + ":";
    for (let k = 0; k < n; k++) {
      errs = [];
      const btn = (await p.$('.director [data-d="auto"]')) || (await p.$('.director [data-d="next"]'));
      const kind = btn ? await btn.getAttribute("data-d") : "none";
      if (btn) await btn.click();
      await p.waitForTimeout(1300);
      const toastBad = await p.evaluate(() => [...document.querySelectorAll(".toast.bad")].map((t) => t.textContent).join(" | "));
      const crash = await p.evaluate(() => /حصل خطأ في عرض|خطأ في عرض الصفحة|بتتبني/.test(document.body.innerText));
      if (shotsAt) await p.screenshot({ path: path.join(shotsAt, `${id}-${k + 1}.png`) });
      total++; const ok = !errs.length && !toastBad && !crash; if (!ok) bad++;
      line += `\n  ${k + 1} ${ok ? "ok  " : "FAIL"} ${await p.evaluate(() => location.hash)} (${kind})${toastBad ? " TOAST: " + toastBad : ""}${crash ? " RENDER-ERROR" : ""}${errs.length ? " " + errs.join(" ; ") : ""}`;
    }
    const done = await p.evaluate(() => !!document.querySelector(".director") && /السيناريو خلص/.test(document.querySelector(".director").innerText));
    if (!done) bad++;
    console.log(line + `\n  finished=${done}`);
  }
  console.log(`steps ${total} · failures ${bad}`); await b.close(); process.exit(bad ? 1 : 0);
})();
