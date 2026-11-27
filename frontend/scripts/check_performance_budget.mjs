#!/usr/bin/env node
/**
 * Static performance budgets for the production bundle.
 *
 * Lighthouse scores are recorded in docs/ACCEPTANCE-REPORT.md and must be
 * re-run after content changes. This check runs on every build so a regression
 * in entry JavaScript, CSS, prerendered HTML or hero imagery fails CI before a
 * deploy is considered. All sizes are uncompressed bytes on disk.
 */

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(process.cwd(), 'dist');
const KIB = 1024;

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function sumBytes(files) {
  return files.reduce((total, file) => total + statSync(file).size, 0);
}

function largestBytes(files) {
  return files.reduce((largest, file) => Math.max(largest, statSync(file).size), 0);
}

if (!statSync(DIST, { throwIfNoEntry: false })?.isDirectory()) {
  console.error('[fail] dist/ is missing; run npm run build first');
  process.exit(1);
}

const files = listFiles(DIST);
const entryJs = files.filter((file) => /assets[\\/]index-[^\\/]+\.js$/.test(file));
const allJs = files.filter((file) => file.endsWith('.js'));
const allCss = files.filter((file) => file.endsWith('.css'));
const html = files.filter((file) => file.endsWith('.html'));
const images = files.filter((file) => file.endsWith('.webp'));

if (entryJs.length === 0 || html.length === 0) {
  console.error('[fail] build output is missing the entry chunk or prerendered HTML');
  process.exit(1);
}

const budgets = [
  { label: 'entry JavaScript', actual: sumBytes(entryJs), max: 500 * KIB },
  { label: 'total JavaScript', actual: sumBytes(allJs), max: 800 * KIB },
  { label: 'total CSS', actual: sumBytes(allCss), max: 80 * KIB },
  { label: 'largest prerendered HTML', actual: largestBytes(html), max: 64 * KIB },
  { label: 'largest WebP image', actual: largestBytes(images), max: 256 * KIB },
];

const failures = budgets.filter((budget) => budget.actual > budget.max);
for (const budget of budgets) {
  const status = budget.actual > budget.max ? 'fail' : 'ok  ';
  console.log(
    `[${status}] ${budget.label}: ${(budget.actual / KIB).toFixed(1)} KiB / ${(budget.max / KIB).toFixed(0)} KiB`,
  );
}

if (failures.length > 0) {
  console.error(`\n${failures.length} performance budget(s) exceeded.`);
  process.exit(1);
}

console.log('\nPerformance budgets passed.');
