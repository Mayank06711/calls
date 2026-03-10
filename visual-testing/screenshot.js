const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

const TARGETS = {
  getstyled: {
    url: "https://getstyled.in",
    folder: "getstyled",
  },
  kyf: {
    url: "http://localhost:5173",
    folder: "kyf",
  },
};

/**
 * Aggressively dismiss the KYF login modal.
 * Strategy: remove ALL fixed-position overlays with high z-index from the DOM,
 * then press Escape as a fallback.
 */
async function dismissLoginModal(page) {
  // Strategy 1: Press Escape key (works if modal listens for Escape)
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 400));

  // Strategy 2: Nuke any fixed-position overlay from the DOM
  await page.evaluate(() => {
    // Find all fixed-position elements with backdrop/overlay characteristics
    const allEls = document.querySelectorAll("*");
    for (const el of allEls) {
      const style = window.getComputedStyle(el);
      if (
        style.position === "fixed" &&
        style.zIndex &&
        parseInt(style.zIndex) > 1000
      ) {
        el.remove();
      }
    }
  });
  await new Promise((r) => setTimeout(r, 300));

  // Strategy 3: Click close button if still present (look for small round button inside fixed overlay)
  try {
    await page.evaluate(() => {
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        const parent = btn.parentElement;
        if (parent) {
          const parentStyle = window.getComputedStyle(parent);
          if (
            parentStyle.position === "fixed" ||
            (btn.getAttribute("aria-label") || "").toLowerCase().includes("close")
          ) {
            btn.click();
            return;
          }
        }
      }
    });
  } catch {
    // No modal present
  }
  await new Promise((r) => setTimeout(r, 300));
}

async function captureScreenshots(page, targetName, folder, viewport, isKyf) {
  const screenshotDir = path.join(__dirname, "screenshots", folder);
  fs.mkdirSync(screenshotDir, { recursive: true });

  const prefix = `${targetName}_${viewport.name}`;

  // Set viewport
  await page.setViewport({ width: viewport.width, height: viewport.height });

  // Wait for page to load and settle
  try {
    await page.waitForNetworkIdle({ timeout: 10000 });
  } catch {
    // Some pages may have persistent connections
  }

  if (isKyf) {
    // Wait for the 5s auto-login timer to fire, then dismiss
    await new Promise((r) => setTimeout(r, 6000));
    await dismissLoginModal(page);
    // Double check — sometimes AnimatePresence re-renders
    await new Promise((r) => setTimeout(r, 500));
    await dismissLoginModal(page);
  } else {
    // For non-KYF sites, just wait for things to settle
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Viewport-only screenshot (above the fold) — before scrolling
  await page.screenshot({
    path: path.join(screenshotDir, `${prefix}_hero.png`),
    fullPage: false,
  });
  console.log(`  [OK] ${prefix}_hero.png`);

  // Pre-scroll entire page to trigger all whileInView animations
  const preScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = viewport.height;
  for (let y = 0; y < preScrollHeight; y += step) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await new Promise((r) => setTimeout(r, 300));
  }
  // Scroll back to top and wait for animations to settle
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 500));

  // Full page screenshot (now all whileInView animations have triggered)
  await page.screenshot({
    path: path.join(screenshotDir, `${prefix}_full.png`),
    fullPage: true,
  });
  console.log(`  [OK] ${prefix}_full.png`);

  // Scroll-based section screenshots
  const totalHeight = await page.evaluate(
    () => document.documentElement.scrollHeight
  );
  const viewportHeight = viewport.height;
  const sections = Math.ceil(totalHeight / viewportHeight);

  for (let i = 0; i < Math.min(sections, 10); i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * viewportHeight);
    await new Promise((r) => setTimeout(r, 600));

    // For KYF: ensure modal hasn't reappeared
    if (isKyf) {
      await page.evaluate(() => {
        const allEls = document.querySelectorAll("*");
        for (const el of allEls) {
          const style = window.getComputedStyle(el);
          if (
            style.position === "fixed" &&
            style.zIndex &&
            parseInt(style.zIndex) > 1000
          ) {
            el.remove();
          }
        }
      });
    }

    await page.screenshot({
      path: path.join(screenshotDir, `${prefix}_section_${i + 1}.png`),
      fullPage: false,
    });
    console.log(`  [OK] ${prefix}_section_${i + 1}.png`);
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function main() {
  const args = process.argv.slice(2);
  const targetArg = args.find((a) => a.startsWith("--target="));
  const target = targetArg ? targetArg.split("=")[1] : "both";
  const viewportArg = args.find((a) => a.startsWith("--viewport="));
  const viewportFilter = viewportArg ? viewportArg.split("=")[1] : null;

  const viewports = viewportFilter
    ? VIEWPORTS.filter((v) => v.name === viewportFilter)
    : VIEWPORTS;

  console.log(`\nKYF Visual Testing - Screenshot Capture`);
  console.log(`=======================================\n`);

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Capture GetStyled.in
  if (target === "getstyled" || target === "both") {
    console.log(`Capturing GetStyled.in screenshots...`);
    try {
      await page.goto(TARGETS.getstyled.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      for (const viewport of viewports) {
        console.log(`  Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
        await captureScreenshots(page, "getstyled", "getstyled", viewport, false);
      }
      console.log(`\nGetStyled.in screenshots saved!\n`);
    } catch (err) {
      console.error(`  [ERROR] Could not capture GetStyled.in: ${err.message}\n`);
    }
  }

  // Capture KYF
  if (target === "kyf" || target === "both") {
    console.log(`Capturing KYF screenshots...`);
    try {
      // For KYF: intercept the setTimeout that triggers the login modal
      // by overriding it before page loads
      await page.evaluateOnNewDocument(() => {
        const origSetTimeout = window.setTimeout;
        window.setTimeout = function (fn, delay, ...args) {
          // Block any 5000ms timer (the login modal auto-show)
          if (delay === 5000) {
            console.log("[Puppeteer] Blocked 5000ms setTimeout (login modal)");
            return -1;
          }
          return origSetTimeout.call(this, fn, delay, ...args);
        };
      });

      await page.goto(TARGETS.kyf.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      for (const viewport of viewports) {
        console.log(`  Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
        await captureScreenshots(page, "kyf", "kyf", viewport, true);
      }
      console.log(`\nKYF screenshots saved!\n`);
    } catch (err) {
      console.error(`  [ERROR] Could not capture KYF (is dev server running on localhost:5173?): ${err.message}\n`);
    }
  }

  await browser.close();
  console.log("Done! Screenshots are in visual-testing/screenshots/");
}

main().catch(console.error);
