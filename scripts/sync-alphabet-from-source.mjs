#!/usr/bin/env node
/**
 * Copies `const ALPHABET = { ... };` from source.html into sketch.js.
 * Run from repo root: npm run sync:alphabet
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DEFAULT_SOURCE = path.join(ROOT, 'source.html');
const DEFAULT_TARGET = path.join(ROOT, 'sketch.js');

const BLOCK_RE =
  /\/\/ ── Alphabet ──\r?\nconst ALPHABET\s*=\s*\{[\s\S]*?\r?\n\};/;
const BLOCK_FALLBACK_RE = /const ALPHABET\s*=\s*\{[\s\S]*?\r?\n\};/;

function extractBlock(html, label) {
  const m = html.match(BLOCK_RE) || html.match(BLOCK_FALLBACK_RE);
  if (!m) {
    throw new Error(
      `${label}: no ALPHABET block found (expected // ── Alphabet ── then const ALPHABET = { … };)`
    );
  }
  return m[0].replace(/\r\n/g, '\n');
}

function validateBlock(snippet) {
  const m = snippet.match(/const ALPHABET\s*=\s*(\{[\s\S]*\});/s);
  if (!m) throw new Error('Internal: could not isolate ALPHABET object literal');
  let obj;
  try {
    obj = new Function(`return ${m[1]}`)();
  } catch (e) {
    throw new Error(`ALPHABET is not valid JS: ${e.message}`);
  }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const L of letters) {
    const g = obj[L];
    if (!Array.isArray(g) || g.length !== 5) {
      throw new Error(`Letter ${L}: expected 5 rows, got ${JSON.stringify(g)}`);
    }
    for (let r = 0; r < 5; r++) {
      const row = g[r];
      if (!Array.isArray(row) || row.length !== 4) {
        throw new Error(`Letter ${L} row ${r}: expected 4 cols`);
      }
      for (const v of row) {
        if (v !== 0 && v !== 1) {
          throw new Error(`Letter ${L} row ${r}: values must be 0 or 1`);
        }
      }
    }
  }
}

function parseArgs(argv) {
  let source = DEFAULT_SOURCE;
  let target = DEFAULT_TARGET;
  let watch = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source' && argv[i + 1]) {
      source = path.resolve(ROOT, argv[++i]);
    } else if (a === '--target' && argv[i + 1]) {
      target = path.resolve(ROOT, argv[++i]);
    } else if (a === '--watch' || a === '-w') {
      watch = true;
    } else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node scripts/sync-alphabet-from-source.mjs [--source path] [--target path] [--watch]'
      );
      process.exit(0);
    }
  }
  return { source, target, watch };
}

function syncOnce(source, target, opts) {
  const logTs = opts && opts.logTimestamp;
  const html = fs.readFileSync(source, 'utf8');
  const block = extractBlock(html, source);
  validateBlock(block);

  const sketch = fs.readFileSync(target, 'utf8');
  const usePrimary = BLOCK_RE.test(sketch);
  const useFallback = !usePrimary && BLOCK_FALLBACK_RE.test(sketch);
  if (!usePrimary && !useFallback) {
    throw new Error(
      `${target}: no ALPHABET region to replace. Keep the // ── Alphabet ── header and const ALPHABET = { … }; block in sketch.js.`
    );
  }
  const next = sketch.replace(usePrimary ? BLOCK_RE : BLOCK_FALLBACK_RE, block);
  fs.writeFileSync(target, next, 'utf8');
  const msg = `Synced ALPHABET from ${path.relative(ROOT, source)} → ${path.relative(ROOT, target)}`;
  console.log(logTs ? `[${new Date().toISOString()}] ${msg}` : msg);
}

function main() {
  const { source, target, watch } = parseArgs(process.argv);
  syncOnce(source, target, { logTimestamp: false });
  if (!watch) return;
  console.log(`Watching ${path.relative(ROOT, source)} (Ctrl+C to stop)`);
  fs.watch(source, { persistent: true }, () => {
    try {
      syncOnce(source, target, { logTimestamp: true });
    } catch (e) {
      console.error(e.message || e);
    }
  });
}

try {
  main();
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
