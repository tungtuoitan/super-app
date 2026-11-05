/* Agent Flight Deck — Load Sheet engine: pack a codebase into an LLM prompt under a token budget.
 * Pure functions: no DOM.
 */
(function (AFD) {
  "use strict";

  // Always skipped, whatever .gitignore says.
  const DEFAULT_IGNORES = [
    ".git/", "node_modules/", "bower_components/", "vendor/", ".venv/", "venv/", "__pycache__/", ".mypy_cache/", ".pytest_cache/",
    ".next/", ".nuxt/", ".svelte-kit/", ".turbo/", ".cache/", ".parcel-cache/", "dist/", "build/", "coverage/",
    ".idea/", ".vscode/", ".gradle/", "Pods/", "DerivedData/",
    // common output folder names that are also used for source deeper down: only ignored at the root
    "/out/", "/target/", "/bin/", "/obj/", "/vendor/",
    "*.min.js", "*.min.css", "*.map", "*.lock", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "Cargo.lock", "poetry.lock", "composer.lock", "Gemfile.lock",
    ".DS_Store", "*.log", ".env", ".env.*", "!.env.example", "!.env.sample", "!.env.template",
  ];

  // Files that usually hold credentials: never read, never sent to a model.
  const SECRET = /(^|\/)(id_(rsa|dsa|ecdsa|ed25519)(\.pub)?|\.npmrc|\.pypirc|\.netrc|\.htpasswd|credentials[^/]*\.json|[^/]*service[-_]?account[^/]*\.json|[^/]*\.(pem|key|p12|pfx|keystore|jks|tfvars|tfstate)|\.aws\/credentials|\.docker\/config\.json)$/i;
  // Content that looks like a credential: the file stays listed but is not loaded unless the user ticks it.
  const SECRET_CONTENT = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{36}\b|\bxox[abprs]-[A-Za-z0-9-]{10,}|\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{24,}|\bAIza[0-9A-Za-z_-]{35}\b/;

  const BINARY_EXT = new Set(("png jpg jpeg gif webp bmp ico icns tiff psd ai sketch fig pdf zip gz tgz bz2 xz 7z rar jar war " +
    "exe dll so dylib a o class pyc wasm bin dat db sqlite sqlite3 mp3 mp4 mov avi mkv webm wav flac ogg m4a " +
    "ttf otf woff woff2 eot glb gltf fbx blend").split(" "));

  const MAX_FILE_BYTES = 1024 * 1024; // larger files are listed but not read

  const LANG = {
    ts: "ts", tsx: "ts", mts: "ts", cts: "ts", js: "js", jsx: "js", mjs: "js", cjs: "js",
    py: "py", rb: "rb", go: "go", rs: "rs", java: "java", kt: "java", kts: "java", scala: "java", cs: "cs", fs: "cs",
    php: "php", swift: "swift", c: "c", h: "c", cc: "c", cpp: "c", hpp: "c", m: "c", mm: "c",
    css: "css", scss: "css", sass: "css", less: "css", html: "html", vue: "html", svelte: "html", astro: "html",
    json: "data", yaml: "data", yml: "data", toml: "data", xml: "data", csv: "data", ini: "data", env: "data",
    md: "doc", mdx: "doc", txt: "doc", rst: "doc", adoc: "doc",
    sh: "sh", bash: "sh", zsh: "sh", fish: "sh", ps1: "sh", sql: "sql", graphql: "sql", gql: "sql", prisma: "sql",
    dockerfile: "sh", makefile: "sh", tf: "data", proto: "data", lua: "c", dart: "java", ex: "rb", exs: "rb", erl: "rb", hs: "rb", clj: "rb",
  };

  function ext(path) {
    const base = path.split("/").pop().toLowerCase();
    if (base === "dockerfile") return "dockerfile";
    if (base === "makefile") return "makefile";
    const i = base.lastIndexOf(".");
    return i > 0 ? base.slice(i + 1) : "";
  }

  function langOf(path) {
    return LANG[ext(path)] || "other";
  }

  // ───────────────────────── .gitignore ─────────────────────────

  /** Compile gitignore lines into matchers. `base` is the directory holding the .gitignore ("" for root). */
  function compileIgnore(text, base) {
    const rules = [];
    for (let raw of String(text).split(/\r?\n/)) {
      let line = raw.replace(/\s+$/, "");
      if (!line || line.startsWith("#")) continue;
      let negate = false;
      if (line.startsWith("!")) {
        negate = true;
        line = line.slice(1);
      }
      if (line.startsWith("\\")) line = line.slice(1);
      const dirOnly = line.endsWith("/");
      if (dirOnly) line = line.slice(0, -1);
      const anchored = line.includes("/") && !line.startsWith("**/") ? true : line.startsWith("/");
      line = line.replace(/^\//, "");
      const re = globToRegex(line);
      rules.push({ negate, dirOnly, anchored, re, base: base || "" });
    }
    return rules;
  }

  function globToRegex(glob) {
    let re = "";
    for (let i = 0; i < glob.length; i++) {
      const c = glob[i];
      if (c === "*") {
        if (glob[i + 1] === "*") {
          const slash = glob[i + 2] === "/";
          re += slash ? "(?:.*/)?" : ".*";
          i += slash ? 2 : 1;
        } else re += "[^/]*";
      } else if (c === "?") re += "[^/]";
      else if (c === "[") {
        const j = glob.indexOf("]", i);
        if (j > i) {
          re += "[" + glob.slice(i + 1, j).replace(/^!/, "^").replace(/\\/g, "\\\\") + "]";
          i = j;
        } else re += "\\[";
      } else re += /[.+^${}()|\\]/.test(c) ? "\\" + c : c;
    }
    return new RegExp("^" + re + "$");
  }

  /** Is `path` (relative, "/"-separated) ignored by the rule list? Checks every parent directory too. */
  function isIgnored(path, rules) {
    const parts = path.split("/");
    // A path is ignored if any of its parent directories is ignored (git does not re-include inside an ignored dir).
    for (let depth = 1; depth <= parts.length; depth++) {
      const sub = parts.slice(0, depth).join("/");
      const isDir = depth < parts.length;
      if (matchRules(sub, isDir, rules)) return true;
    }
    return false;
  }

  function matchRules(path, isDir, rules) {
    let ignored = false;
    for (const r of rules) {
      if (r.dirOnly && !isDir) continue;
      let rel = path;
      if (r.base) {
        if (!path.startsWith(r.base + "/")) continue;
        rel = path.slice(r.base.length + 1);
      }
      const hit = r.anchored ? r.re.test(rel) : r.re.test(rel.split("/").pop()) || r.re.test(rel);
      if (hit) ignored = !r.negate;
    }
    return ignored;
  }

  const DEFAULT_RULES = compileIgnore(DEFAULT_IGNORES.join("\n"), "");

  // ───────────────────────── tokens ─────────────────────────

  /**
   * Token estimate. Claude's tokenizer is not public; this approximates it from character classes:
   * ~4 chars per token for prose, denser for code symbols and non-Latin text. Use the count_tokens API for exact numbers.
   */
  function estimateTokens(text) {
    if (!text) return 0;
    let words = 0;
    let symbols = 0;
    let nonAscii = 0;
    let wordLen = 0;
    let longWordExtra = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c > 127) {
        nonAscii++;
        if (wordLen) { words++; longWordExtra += Math.floor(wordLen / 7); wordLen = 0; }
      } else if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95) {
        wordLen++;
      } else {
        if (wordLen) { words++; longWordExtra += Math.floor(wordLen / 7); wordLen = 0; }
        if (c !== 32 && c !== 10 && c !== 9 && c !== 13) symbols++;
      }
    }
    if (wordLen) { words++; longWordExtra += Math.floor(wordLen / 7); }
    // indentation runs: roughly one token per 4 spaces of leading whitespace
    const indent = (text.match(/^[ \t]+/gm) || []).reduce((a, s) => a + Math.ceil(s.length / 4), 0);
    // +10%: newer Claude tokenizers count more tokens than older ones; for a budget, overestimating is the safe side
    // ×1.3: calibrated against context growth in real Claude Code logs (code reads ~2.8-3 chars per token).
    // For a budget, overestimating is the safe side.
    return Math.ceil((words + longWordExtra + symbols * 0.7 + nonAscii * 0.75 + indent * 0.5) * 1.3);
  }

  // ───────────────────────── loading ─────────────────────────

  /** Heuristic binary check on the first bytes of decoded text. */
  function looksBinary(text) {
    const n = Math.min(text.length, 4000);
    let bad = 0;
    for (let i = 0; i < n; i++) {
      const c = text.charCodeAt(i);
      if (c === 0) return true;
      if ((c < 9 || (c > 13 && c < 32)) || c === 0xfffd) bad++;
    }
    return n > 0 && bad / n > 0.05;
  }

  /**
   * Classify raw files. files: [{path, size, text?}] — text may be undefined for skipped/binary files.
   * Returns {files: [...included-or-excluded], skipped: [...]}.
   */
  function prepare(rawFiles, opts) {
    const o = opts || {};
    // strip a common root folder ("myrepo/src/a.ts" -> "src/a.ts") when every path shares it
    const paths = rawFiles.map((f) => f.path.replace(/^\.?\/+/, ""));
    let root = "";
    const first = paths[0] ? paths[0].split("/")[0] : "";
    if (first && paths.length && paths.every((p) => p.startsWith(first + "/"))) root = first;

    const gitignores = [];
    for (let i = 0; i < rawFiles.length; i++) {
      const rel = root ? paths[i].slice(root.length + 1) : paths[i];
      if (rel.split("/").pop() === ".gitignore" && typeof rawFiles[i].text === "string") {
        gitignores.push(...compileIgnore(rawFiles[i].text, rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : ""));
      }
    }
    // git applies a deeper .gitignore after a shallower one; sort so input order cannot change the result
    gitignores.sort((a, b) => (a.base ? a.base.split("/").length : 0) - (b.base ? b.base.split("/").length : 0));
    const rules = o.useGitignore === false ? DEFAULT_RULES : DEFAULT_RULES.concat(gitignores);

    const files = [];
    const skipped = [];
    for (let i = 0; i < rawFiles.length; i++) {
      const f = rawFiles[i];
      const rel = root ? paths[i].slice(root.length + 1) : paths[i];
      if (!rel) continue;
      const size = f.size != null ? f.size : f.text ? f.text.length : 0;
      if (isIgnored(rel, rules)) { skipped.push({ path: rel, reason: "ignored", size }); continue; }
      if (SECRET.test(rel)) { skipped.push({ path: rel, reason: "possible secret", size }); continue; }
      if (BINARY_EXT.has(ext(rel))) { skipped.push({ path: rel, reason: "binary", size }); continue; }
      if (size > MAX_FILE_BYTES) { skipped.push({ path: rel, reason: "too large", size }); continue; }
      if (typeof f.text !== "string") { skipped.push({ path: rel, reason: "unreadable", size }); continue; }
      if (looksBinary(f.text)) { skipped.push({ path: rel, reason: "binary", size }); continue; }
      const text = f.text.replace(/\r\n/g, "\n");
      const secretHint = SECRET_CONTENT.test(text);
      files.push({ path: rel, lang: langOf(rel), size, text, lines: text ? text.split("\n").length : 0, tokens: estimateTokens(text), score: 0, include: !secretHint, secretHint });
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { root, files, skipped };
  }

  // ───────────────────────── relevance ─────────────────────────

  const STOP = new Set(("a an the and or but if then else of to in on at by for with from into onto is are was were be been being do does did " +
    "how why what when where which who whom this that these those it its as can could should would will shall may might must " +
    "i me my we our you your he she they them their there here not no yes so than too very just also about over under " +
    "make made fix add use using get set new old file files code please want need like more most some any all each").split(" "));

  /** Split text into lowercase search terms, breaking camelCase and snake_case. */
  function terms(text) {
    const out = [];
    const words = String(text).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9À-￿]+/);
    for (const w of words) {
      if (w.length < 2 || STOP.has(w) || /^\d+$/.test(w)) continue;
      out.push(w);
    }
    return out;
  }

  function stem(w) {
    return w.length > 4 ? w.replace(/(ing|ers|ies|ed|es|s)$/, "") : w;
  }

  /** Score each file against the question: path hits weigh most, then content term frequency (TF-IDF-like). */
  /** Fill the per-file term cache ahead of the first question (called in idle time after loading). */
  function warmTerms(files, deadline) {
    for (const f of files) {
      if (deadline && deadline.timeRemaining && deadline.timeRemaining() < 2) return false;
      if (f._terms && f._termsOf === f.text) continue;
      const counts = new Map();
      for (const t of terms(f.text)) { const st = stem(t); counts.set(st, (counts.get(st) || 0) + 1); }
      f._terms = counts;
      f._termsOf = f.text;
      f._pathTerms = new Set(terms(f.path).map(stem));
    }
    return true;
  }

  function scoreFiles(files, question) {
    const q = [...new Set(terms(question).map(stem))];
    if (!q.length) {
      for (const f of files) f.score = 0;
      return q;
    }
    const docFreq = new Map();
    // term counts depend only on the file, so they are computed once and reused for every question
    const fileTerms = files.map((f) => {
      if (!f._terms || f._termsOf !== f.text) {
        const counts = new Map();
        for (const t of terms(f.text)) {
          const st = stem(t);
          counts.set(st, (counts.get(st) || 0) + 1);
        }
        f._terms = counts;
        f._termsOf = f.text;
        f._pathTerms = new Set(terms(f.path).map(stem));
      }
      for (const k of f._terms.keys()) docFreq.set(k, (docFreq.get(k) || 0) + 1);
      return f._terms;
    });
    const N = files.length || 1;
    files.forEach((f, i) => {
      const pathTerms = f._pathTerms;
      let s = 0;
      for (const t of q) {
        const idf = Math.log(1 + N / (1 + (docFreq.get(t) || 0)));
        if (pathTerms.has(t)) s += 3 * idf;
        const tf = fileTerms[i].get(t) || 0;
        if (tf) s += (1 + Math.log(tf)) * idf;
      }
      // manifest/readme files give orientation; a small nudge so they make the cut when space allows
      if (/(^|\/)(readme(\.\w+)?|package\.json|pyproject\.toml|cargo\.toml|go\.mod)$/i.test(f.path)) s += 0.5;
      // tests are useful but secondary
      if (/(^|\/)(tests?|__tests__|spec)\//i.test(f.path) || /\.(test|spec)\.\w+$/i.test(f.path)) s *= 0.8;
      // normalize by size a little so huge files don't win on raw counts
      f.score = s / Math.pow(Math.max(f.tokens, 200) / 200, 0.25);
    });
    return q;
  }

  /** Include files by score until the budget is used. Returns the number included. */
  function autoSelect(files, budget, transformOpts) {
    const ranked = files.slice().sort((a, b) => b.score - a.score || a.tokens - b.tokens);
    let used = 0;
    let n = 0;
    const hasScores = ranked.some((f) => f.score > 0);
    for (const f of ranked) {
      if (f.secretHint) { f.include = false; continue; } // never auto-load something that looks like a credential
      const cost = AFD.packer.docTokens(f, transformOpts);
      if ((hasScores && f.score <= 0) || used + cost > budget) {
        f.include = false;
        continue;
      }
      f.include = true;
      used += cost;
      n++;
    }
    return n;
  }

  AFD.packer = Object.assign(AFD.packer || {}, {
    DEFAULT_IGNORES, MAX_FILE_BYTES, compileIgnore, isIgnored, globToRegex, estimateTokens, looksBinary, prepare,
    terms, scoreFiles, warmTerms, autoSelect, langOf, ext, BINARY_EXT, SECRET_CONTENT,
  });
})(globalThis.AFD = globalThis.AFD || {});
