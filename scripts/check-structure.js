#!/usr/bin/env node
/**
 * Kiểm tra rule cấu trúc (STRUCTURE.md, CLAUDE.md) — không cần thư viện ngoài.
 *
 *   npm run check:structure                 kiểm; thoát 1 nếu có vi phạm MỚI
 *   npm run check:structure -- --all        in cả vi phạm cũ (đã nằm trong baseline)
 *   npm run check:structure -- --update-baseline   ghi lại baseline (chỉ khi đã sửa bớt vi phạm)
 *
 * Baseline = danh sách vi phạm sẵn có (scripts/structure-baseline.json). Vi phạm cũ không chặn,
 * nhưng không được tăng thêm: file cũ phình thêm hoặc file mới vi phạm thì lỗi.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(__dirname, 'structure-baseline.json');
const MAX_LINES = 400;

const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) out.push(p);
    }
    return out;
}

// loại file theo hậu tố -> thư mục (tên thư mục, không phân biệt hoa thường) mà nó phải nằm trong
const KIND_DIR = {
    helper: ['hooks', 'helpers'],
    headless: ['hooks'],
    selector: ['selectors'],
    store: ['store'],
    service: ['service', 'services'],
    utils: ['utils'],
};

const rules = {
    'file-size': {
        title: `File > ${MAX_LINES} dòng`,
        check(file, text) {
            const n = text.split('\n').length;
            return n > MAX_LINES ? [{ value: n, msg: `${n} dòng` }] : [];
        },
    },
    'kind-in-wrong-dir': {
        title: 'File helper/headless/selector/store/service/utils trong features/ nằm sai thư mục (shared/ để phẳng thì bỏ qua)',
        check(file) {
            if (!rel(file).startsWith('src/features/')) return [];
            const m = path.basename(file).match(/\.(helper|headless|selector|store|service|utils)\.tsx?$/);
            if (!m) return [];
            const dirs = rel(path.dirname(file)).toLowerCase().split('/');
            return KIND_DIR[m[1]].some((d) => dirs.includes(d)) ? [] : [{ value: 1, msg: `.${m[1]} nên nằm trong ${KIND_DIR[m[1]].join('/')}` }];
        },
    },
    'reexport-in-helper': {
        title: 'helper/selector re-export hộ file khác',
        check(file, text) {
            if (!/\.(helper|selector)\.tsx?$/.test(file)) return [];
            const n = (text.match(/^\s*export\s+(\*|\{[^}]*\})\s+from\s/gm) || []).length;
            return n ? [{ value: n, msg: `${n} dòng export ... from` }] : [];
        },
    },
    'destructure-alias': {
        title: 'Destructure có đặt alias (const { a: b } = useX...)',
        check(file, text) {
            const re = /const\s*\{([^}]*)\}\s*=\s*use\w+(?:Helper|Store|Selector)\w*\s*\(/g;
            let n = 0, m;
            while ((m = re.exec(text))) {
                if (/(^|,)\s*\w+\s*:\s*\w+/.test(m[1].replace(/\{[^}]*\}/g, ''))) n++;
            }
            return n ? [{ value: n, msg: `${n} chỗ có alias` }] : [];
        },
    },
    'empty-catch': {
        title: 'catch rỗng (nuốt lỗi)',
        check(file, text) {
            const n = (text.match(/catch\s*(\([^)]*\))?\s*\{\s*\}/g) || []).length;
            return n ? [{ value: n, msg: `${n} catch rỗng` }] : [];
        },
    },
};

function scan() {
    const found = {}; // rule -> { file: {value,msg} }
    for (const file of walk(SRC)) {
        const text = fs.readFileSync(file, 'utf8');
        for (const [id, rule] of Object.entries(rules)) {
            for (const v of rule.check(file, text)) {
                (found[id] ||= {})[rel(file)] = v;
            }
        }
    }
    return found;
}

const args = process.argv.slice(2);
const found = scan();

if (args.includes('--update-baseline')) {
    const out = {};
    for (const [id, files] of Object.entries(found)) {
        out[id] = Object.fromEntries(Object.entries(files).map(([f, v]) => [f, v.value]));
    }
    fs.writeFileSync(BASELINE, JSON.stringify(out, null, 2) + '\n');
    console.log('Đã ghi baseline:', Object.entries(out).map(([k, v]) => `${k}=${Object.keys(v).length}`).join(', ') || '(trống)');
    process.exit(0);
}

let base = {};
try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { /* chưa có baseline */ }

let bad = 0, old = 0;
for (const [id, rule] of Object.entries(rules)) {
    const files = found[id] || {};
    const fresh = [], known = [];
    for (const [f, v] of Object.entries(files)) {
        const was = (base[id] || {})[f];
        if (was === undefined) fresh.push(`${f}: ${v.msg}`);
        else if (v.value > was) fresh.push(`${f}: ${v.msg} (baseline ${was}, đang tăng)`);
        else known.push(`${f}: ${v.msg}`);
    }
    old += known.length;
    if (fresh.length) {
        bad += fresh.length;
        console.log(`\n✖ ${rule.title} — ${fresh.length} vi phạm mới`);
        fresh.forEach((l) => console.log('  ' + l));
    }
    if (args.includes('--all') && known.length) {
        console.log(`\n· ${rule.title} — ${known.length} đã có trong baseline`);
        known.forEach((l) => console.log('  ' + l));
    }
}

console.log(`\n${bad ? '✖' : '✔'} ${bad} vi phạm mới, ${old} vi phạm cũ trong baseline${args.includes('--all') ? '' : ' (thêm --all để xem)'}`);
process.exit(bad ? 1 : 0);
