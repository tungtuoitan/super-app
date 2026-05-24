const fs = require("fs");

function load(path) {
    let raw = fs.readFileSync(path, "utf8");
    // Strip UTF-8 BOM if present
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    return JSON.parse(raw);
}

const a = load(process.argv[2]);
const b = load(process.argv[3]);

const ao = a.object || a;
const bo = b.object || b;

console.log("=== Top-level summary ===");
console.log("old:  items=" + (ao.flatData?.length ?? "n/a") + " fc=" + ao.folderCount + " nc=" + ao.noteCount + " filec=" + ao.fileCount);
console.log("fast: items=" + (bo.flatData?.length ?? "n/a") + " fc=" + bo.folderCount + " nc=" + bo.noteCount + " filec=" + bo.fileCount);

console.log("\n=== Top-level fields diff ===");
const skipKeys = new Set(["flatData"]);
let topDiff = 0;
for (const k of Object.keys(ao)) {
    if (skipKeys.has(k)) continue;
    if (JSON.stringify(ao[k]) !== JSON.stringify(bo[k])) {
        topDiff++;
        console.log(`  diff [${k}]: old=${JSON.stringify(ao[k])}  fast=${JSON.stringify(bo[k])}`);
    }
}
console.log("Top-level diffs:", topDiff);

console.log("\n=== flatData diff (sorted by id) ===");
const sortById = arr => [...arr].sort((x, y) => x.id - y.id);
const ax = sortById(ao.flatData || []);
const bx = sortById(bo.flatData || []);
console.log("Counts: old=" + ax.length + " fast=" + bx.length);

let mismatch = 0;
const max = Math.min(ax.length, bx.length);
for (let i = 0; i < max; i++) {
    if (JSON.stringify(ax[i]) !== JSON.stringify(bx[i])) {
        if (mismatch < 3) {
            console.log("MISMATCH idx=" + i + " id=" + ax[i].id);
            // Show key-by-key diff for this item
            const keysA = Object.keys(ax[i]);
            const keysB = Object.keys(bx[i]);
            const allKeys = new Set([...keysA, ...keysB]);
            for (const k of allKeys) {
                const va = JSON.stringify(ax[i][k]);
                const vb = JSON.stringify(bx[i][k]);
                if (va !== vb) {
                    const truncate = s => s == null ? "null" : (s.length > 120 ? s.slice(0, 120) + "..." : s);
                    console.log(`  [${k}]:  old=${truncate(va)}`);
                    console.log(`  [${k}]: fast=${truncate(vb)}`);
                }
            }
        }
        mismatch++;
    }
}
console.log("\nTotal mismatches: " + mismatch + " / " + max);
