import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75 });
await page.addInitScript(() => {
  window.__longTasks = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__longTasks.push({
        name: entry.name,
        startTime: Math.round(entry.startTime),
        duration: Math.round(entry.duration),
        attribution: entry.attribution?.map((a) => ({
          name: a.name,
          containerType: a.containerType,
          containerSrc: a.containerSrc,
          containerId: a.containerId,
        })),
      });
    }
  }).observe({ type: 'longtask', buffered: true });
});
await page.goto('http://127.0.0.1:4176/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const data = await page.evaluate(() => ({
  longTasks: window.__longTasks,
  dom: document.querySelectorAll('*').length,
  fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
  lcp: performance.getEntriesByType('largest-contentful-paint').slice(-1)[0]?.startTime,
}));
console.log(JSON.stringify(data, null, 2));
await browser.close();
