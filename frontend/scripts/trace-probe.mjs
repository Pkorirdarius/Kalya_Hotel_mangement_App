import fs from 'node:fs';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75 });
const client = await page.context().newCDPSession(page);
const events = [];
client.on('Tracing.dataCollected', ({ value }) => events.push(...value));
await client.send('Tracing.start', {
  categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing',
  options: 'record-as-much-as-possible',
  transferMode: 'ReportEvents',
});
await page.goto('http://127.0.0.1:4176/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await client.send('Tracing.end');
await new Promise((resolve) => client.once('Tracing.tracingComplete', resolve));
const relevant = events.filter((e) =>
  ['UpdateLayoutTree', 'Layout', 'RecalculateStyles', 'FunctionCall', 'EvaluateScript', 'Paint', 'ParseHTML', 'ParseCSS'].includes(e.name)
);
const totals = {};
for (const e of relevant) {
  const key = e.name;
  totals[key] = (totals[key] ?? 0) + (e.dur ?? 0) / 1000;
}
const longest = relevant
  .filter((e) => (e.dur ?? 0) > 100000)
  .sort((a, b) => (b.dur ?? 0) - (a.dur ?? 0))
  .slice(0, 25)
  .map((e) => ({ name: e.name, dur: Math.round((e.dur ?? 0) / 1000), args: JSON.stringify(e.args).slice(0, 400) }));
fs.writeFileSync('C:/Users/ADMIN/AppData/Local/Temp/opencode/trace-events.json', JSON.stringify(events));
console.log(JSON.stringify({ totals, longest }, null, 2));
await browser.close();
