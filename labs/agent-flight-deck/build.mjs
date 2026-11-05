// Inlines src/ into one self-contained HTML file: dist/agent-flight-deck.html
// Usage: node build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => fs.readFileSync(path.join(here, "src", f), "utf8");
const ORDER = ["pricing.js", "session.js", "session-build.js", "insights.js", "sample.js", "packer.js", "packer-output.js", "ui.js", "recorder.js", "recorder-timeline.js", "recorder-session.js", "recorder-panels.js", "loadsheet.js", "loadsheet-render.js", "app.js"];

const scripts = ORDER.map((f) => `// ── ${f}\n${src(f)}`).join("\n").replace(/<\/script/gi, "<\\/script");
let html = src("index.html");
html = html.replace("/*@STYLES@*/", () => src("styles.css"));
html = html.replace("/*@SCRIPTS@*/", () => scripts);

fs.mkdirSync(path.join(here, "dist"), { recursive: true });
const out = path.join(here, "dist", "agent-flight-deck.html");
fs.writeFileSync(out, html);
// A standalone copy with a full document skeleton, for opening the file directly in a browser.
const standalone = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${html}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(here, "dist", "agent-flight-deck.standalone.html"), standalone);
console.log(`wrote ${path.relative(process.cwd(), out)} (${(html.length / 1024).toFixed(0)} KB)`);
