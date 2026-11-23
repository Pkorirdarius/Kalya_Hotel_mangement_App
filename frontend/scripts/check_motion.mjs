/**
 * Automated motion regression guard.
 *
 * Interaction motion must be 150-350ms and must not animate layout properties.
 * Indeterminate status indicators (spinner/pulse) may run longer, but the
 * global prefers-reduced-motion override must reduce every animation to one
 * near-instant iteration.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const MAX_DURATION_MS = 350;
const problems = [];

function fail(message) {
  problems.push(message);
}

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|css)$/.test(entry) ? [full] : [];
  });
}

function durationToMs(value, unit) {
  const number = Number.parseFloat(value);
  return unit === 's' ? number * 1000 : number;
}

const css = readFileSync(path.join(SRC, 'styles', 'main.css'), 'utf8');
for (const required of [
  '@media (prefers-reduced-motion: reduce)',
  'animation-duration: 0.01ms !important',
  'animation-iteration-count: 1 !important',
  'transition-duration: 0.01ms !important',
  'scroll-behavior: auto',
]) {
  if (!css.includes(required)) {
    fail(`main.css is missing the reduced-motion override: ${required}`);
  }
}
if (css.includes('scroll-behavior: smooth')) {
  fail('main.css must not use uncontrolled smooth scrolling');
}

const tailwind = readFileSync(path.join(ROOT, 'tailwind.config.ts'), 'utf8');
for (const match of tailwind.matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)) {
  const ms = durationToMs(match[1], match[2]);
  if (ms > MAX_DURATION_MS) {
    fail(`tailwind.config.ts has a ${ms}ms animation; the limit is ${MAX_DURATION_MS}ms`);
  }
}
if (tailwind.includes('infinite')) {
  fail('tailwind.config.ts must not define infinite decorative animations');
}

for (const file of sourceFiles(SRC)) {
  const source = readFileSync(file, 'utf8');
  const label = path.relative(ROOT, file).replace(/\\/g, '/');

  for (const match of source.matchAll(/\bduration-(\d+)\b/g)) {
    if (Number.parseInt(match[1], 10) > MAX_DURATION_MS) {
      fail(`${label}: duration-${match[1]} exceeds ${MAX_DURATION_MS}ms`);
    }
  }
  for (const match of source.matchAll(/\bduration-\[(\d+(?:\.\d+)?)(ms|s)\]/g)) {
    const ms = durationToMs(match[1], match[2]);
    if (ms > MAX_DURATION_MS) {
      fail(`${label}: duration-[${match[1]}${match[2]}] exceeds ${MAX_DURATION_MS}ms`);
    }
  }

  for (const forbidden of [
    'transition-all',
    'transition-width',
    'transition-height',
    'transition-margin',
    'transition-padding',
    'transition-inset',
    'transition-top',
    'transition-right',
    'transition-bottom',
    'transition-left',
    'animate-gentle-pulse',
    'scroll-behavior: smooth',
  ]) {
    if (source.includes(forbidden)) {
      fail(`${label}: forbidden layout-affecting or long-running motion: ${forbidden}`);
    }
  }
}

if (problems.length) {
  console.error('Motion check failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `Motion check passed: <=${MAX_DURATION_MS}ms interaction motion, no layout transitions, reduced-motion override present`,
);
