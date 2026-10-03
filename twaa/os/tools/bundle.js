/* Bundle Twaa Business OS into one self-contained HTML page (for hosting as a single file).
   Usage: node twaa/os/tools/bundle.js [out.html] [--fragment]
   --fragment omits <!doctype>/<html>/<head>/<body> (for hosts that wrap the page in their own skeleton). */
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2); const fragment = args.includes("--fragment");
const out = args.find((a) => !a.startsWith("--")) || path.join(root, "dist", "twaa-business-os.html");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = [...index.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)">/g)].map((m) => `/* ${m[1]} */\n` + fs.readFileSync(path.join(root, m[1]), "utf8")).join("\n");
const js = [...index.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => { const src = fs.readFileSync(path.join(root, m[1]), "utf8"); if (/<\/script/i.test(src)) throw new Error(`${m[1]} contains </script>`); return `<script>/* ${m[1]} */\n${src}\n</script>`; }).join("\n");
const fonts = (index.match(/<link rel="preconnect"[^\n]*\n<link rel="stylesheet" href="https:\/\/fonts[^"]+">/) || [""])[0];
const head = `<title>Twaa Business OS</title>\n<meta name="description" content="توّا Business OS — منصة تشغيل واحدة: تطبيق العميل والتاجر والمندوب وبرج التحكم">\n${fonts}\n<style>\n${css}\n</style>`;
const body = `<div id="os"><noscript>توّا Business OS يحتاج JavaScript.</noscript></div>\n${js}`;
const html = fragment ? `${head}\n${body}\n` : `<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log("wrote", out, Math.round(html.length / 1024), "KB");
