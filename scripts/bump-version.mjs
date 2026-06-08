#!/usr/bin/env node
// Single source of truth for the app version is package.json "version".
// This script bumps it and syncs every place the version is shown so they
// can never drift or silently regress:
//   1. package.json        → "version": "X.Y.Z"   (source of truth)
//   2. index.html          → the on-screen version label  'vX.Y.Z'
//   3. sw.js               → CACHE_NAME = 'feel-understood-vX.Y.Z'
//                            (changing this busts the PWA cache each release)
//
// Usage:
//   node scripts/bump-version.mjs            # patch:  1.2.3 -> 1.2.4
//   node scripts/bump-version.mjs patch
//   node scripts/bump-version.mjs minor      #         1.2.3 -> 1.3.0
//   node scripts/bump-version.mjs major      #         1.2.3 -> 2.0.0
//   node scripts/bump-version.mjs 2.1.0      # set an explicit version
//
// A version is only ever allowed to increase. Trying to set the same or a
// lower version aborts — this is the guardrail against the "v2.0.3 went
// back to v1.9" regression.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const htmlPath = join(root, 'index.html');
const swPath = join(root, 'sw.js');

const parse = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) throw new Error(`Not a valid X.Y.Z version: "${v}"`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};
// Returns >0 if a>b, <0 if a<b, 0 if equal.
const cmp = (a, b) => {
  const [a1, a2, a3] = parse(a);
  const [b1, b2, b3] = parse(b);
  return a1 - b1 || a2 - b2 || a3 - b3;
};

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const current = pkg.version;
const [maj, min, pat] = parse(current);

const arg = (process.argv[2] || 'patch').trim();
let next;
if (arg === 'patch') next = `${maj}.${min}.${pat + 1}`;
else if (arg === 'minor') next = `${maj}.${min + 1}.0`;
else if (arg === 'major') next = `${maj + 1}.0.0`;
else next = arg; // explicit version, validated below

parse(next); // throws on malformed explicit version

if (cmp(next, current) <= 0) {
  console.error(
    `✗ Refusing to set version to ${next}: it is not greater than the ` +
    `current ${current}. Versions must only ever increase.`
  );
  process.exit(1);
}

// 1. package.json (preserve trailing newline)
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 2. index.html on-screen label — must match exactly one occurrence.
const html = readFileSync(htmlPath, 'utf8');
const labelRe = /'v\d+\.\d+\.\d+'/g;
const matches = html.match(labelRe) || [];
if (matches.length !== 1) {
  console.error(
    `✗ Expected exactly one 'vX.Y.Z' label in index.html, found ${matches.length}. ` +
    `Aborting so nothing is mangled. (package.json was updated; revert it if needed.)`
  );
  process.exit(1);
}
writeFileSync(htmlPath, html.replace(labelRe, `'v${next}'`));

// 3. sw.js cache name — bump so each release invalidates the old PWA cache.
const sw = readFileSync(swPath, 'utf8');
const cacheRe = /const CACHE_NAME = '[^']*';/;
if (!cacheRe.test(sw)) {
  console.error('✗ Could not find CACHE_NAME in sw.js. Aborting.');
  process.exit(1);
}
writeFileSync(swPath, sw.replace(cacheRe, `const CACHE_NAME = 'feel-understood-v${next}';`));

console.log(`✓ Version bumped ${current} → ${next}`);
console.log('  • package.json   version');
console.log('  • index.html     on-screen label');
console.log('  • sw.js          CACHE_NAME');
console.log('\nNext: review the diff, then commit.');
