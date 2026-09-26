import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "ipad", width: 1024, height: 1366 },
  { name: "iphone", width: 390, height: 844 }
];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(150);

    for (const screen of ["home", "garage", "orders", "cart", "account"]) {
      await page.evaluate((name) => window.go(name, false), screen);
      await page.waitForTimeout(80);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyWidth: document.body.scrollWidth
      }));
      if (metrics.scrollWidth > metrics.clientWidth + 1 || metrics.bodyWidth > metrics.clientWidth + 1) {
        throw new Error(
          `${viewport.name}/${screen} horizontal overflow: ${JSON.stringify(metrics)}`
        );
      }
    }

    await page.evaluate(() => window.openAuth("login"));
    await page.waitForTimeout(50);
    const dialogFits = await page.evaluate(() => {
      const d = document.querySelector("#authDialog").getBoundingClientRect();
      return d.left >= -1 && d.right <= innerWidth + 1 && d.top >= -1 && d.bottom <= innerHeight + 1;
    });
    if (!dialogFits) throw new Error(`${viewport.name} auth dialog does not fit viewport`);
    await page.close();
  }
  console.log("Responsive smoke passed:", viewports.map((v) => v.name).join(", "));
} finally {
  await browser.close();
}
