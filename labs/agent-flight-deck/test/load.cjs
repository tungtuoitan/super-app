// Loads the browser modules into globalThis.AFD for Node tests.
for (const m of ["pricing", "session", "sample", "packer"]) require(`../src/${m}.js`);
module.exports = globalThis.AFD;
