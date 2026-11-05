// Inlines src/ into one self-contained HTML file: dist/logic-lens.html
// Also bakes the test corpus (code + a drawn diagram per example) into the page as extra examples.
// Usage: node build.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => fs.readFileSync(path.join(here, "src", f), "utf8");
const corpusFile = (f) => fs.readFileSync(path.join(here, "test", "corpus", f), "utf8");
const ORDER = ["flow.js", "flow-text.js", "flow-run.js", "prompt.js", "diff.js", "layout.js", "layout-lanes.js", "svg.js", "highlight.js", "editor.js", "sample.js", "app-core.js", "app-diagram.js", "app-data.js", "app-run.js", "app.js"];

// id → [file, name]; the diagram lives in test/corpus/out/<id>.json
const CODE = [
  ["react-product-admin", "react-product-admin.tsx", "Front end · người dùng bấm nút (React)"],
  ["react-checkout", "react-checkout.tsx", "React · trang thanh toán (TSX)"],
  ["express-auth-middleware", "express-auth-middleware.js", "Express · middleware xác thực (JS)"],
  ["order-state-machine", "order-state-machine.ts", "State machine đơn hàng (TS)"],
  ["redux-cart-reducer", "redux-cart-reducer.ts", "Redux · reducer giỏ hàng (TS)"],
  ["go-worker-pool", "go-worker-pool.go", "Go · worker pool song song"],
  ["py-async-retry", "py-async-retry.py", "Python · async + retry"],
  ["cs-orders-controller", "cs-orders-controller.cs", "C# · API controller đơn hàng"],
  ["java-dependency-order", "java-dependency-order.java", "Java · sắp xếp phụ thuộc (đệ quy)"],
  ["kotlin-dashboard", "kotlin-dashboard.kt", "Kotlin · coroutine dashboard"],
  ["rust-config", "rust-config.rs", "Rust · đọc cấu hình"],
  ["php-invoice-job", "php-invoice-job.php", "PHP · job gửi hoá đơn"],
  ["sql-close-month", "sql-close-month.sql", "SQL · khoá sổ cuối tháng"],
  ["deploy", "deploy.sh", "Bash · script deploy"],
];
const CHANGE = [
  ["change-webhook", "webhook", "js", "Sửa bug · webhook thanh toán (JS)"],
  ["change-sync", "sync", "py", "Sửa bug · đồng bộ dữ liệu (Python)"],
  ["change-report", "report", "sql", "Sửa bug · báo cáo doanh thu (SQL)"],
];
const flowOf = (id) => JSON.parse(corpusFile(`out/${id}.json`));
const corpus = [
  ...CHANGE.map(([id, base, ext, name]) => ({ id, name, group: "change", before: corpusFile(`changes/${base}.before.${ext}`), after: corpusFile(`changes/${base}.after.${ext}`), flow: flowOf(id) })),
  ...CODE.map(([id, file, name]) => ({ id, name, group: "code", code: corpusFile(file), flow: flowOf(id) })),
];
const corpusJs = `(function (LL) {\n  "use strict";\n  LL.corpus = ${JSON.stringify(corpus)};\n})(globalThis.LL = globalThis.LL || {});\n`;

const parts = ORDER.map((f) => `// ── ${f}\n${f === "app-core.js" ? `// ── corpus (generated)\n${corpusJs}\n` : ""}${src(f)}`);
const scripts = parts.join("\n").replace(/<\/script/gi, "<\\/script");
let html = src("index.html");
html = html.replace("/*@STYLES@*/", () => src("styles.css"));
html = html.replace("/*@SCRIPTS@*/", () => scripts);

fs.mkdirSync(path.join(here, "dist"), { recursive: true });
const out = path.join(here, "dist", "logic-lens.html");
fs.writeFileSync(out, html);
// A standalone copy with a full document skeleton, for opening the file directly in a browser.
const standalone = `<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${html}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(here, "dist", "logic-lens.standalone.html"), standalone);
console.log(`wrote ${path.relative(process.cwd(), out)} (${(html.length / 1024).toFixed(0)} KB)`);
