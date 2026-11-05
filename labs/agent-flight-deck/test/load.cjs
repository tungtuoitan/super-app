// Loads the browser modules into globalThis.AFD for Node tests.
for (const m of ["pricing", "session", "session-build", "insights", "sample", "packer", "packer-output"]) require(`../src/${m}.js`);
module.exports = globalThis.AFD;
