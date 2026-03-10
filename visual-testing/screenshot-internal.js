const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// Desktop viewport for all captures
const VIEWPORT = { width: 1440, height: 900 };

// Internal GetStyled pages to capture
const PAGES = [
  {
    name: "booking",
    url: "https://getstyled.in/book/juhi-sachdeva",
    description: "Stylist Booking Page",
  },
  {
    name: "service",
    url: "https://getstyled.in/styling/style-makeover",
    description: "Service Detail Page",
  },
  {
    name: "for_stylists",
    url: "https://getstyled.in/for-stylists",
    description: "Professional Tools Page",
  },
];

const SCREENSHOT_DIR = path.join(
  __dirname,
  "screenshots",
  "getstyled-internal"
);

/**
 * Pre-scroll the entire page to trigger lazy-loaded content
 * and any scroll-triggered animations (e.g. whileInView, AOS, GSAP ScrollTrigger).
 */
async function preScrollPage(page, viewportHeight) {
  const totalHeight = await page.evaluate(
    () => document.documentElement.scrollHeight
  );

  // Scroll down in viewport-sized steps
  for (let y = 0; y < totalHeight; y += viewportHeight) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await new Promise((r) => setTimeout(r, 350));
  }

  // Scroll to the very bottom to catch any final lazy triggers
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );
  await new Promise((r) => setTimeout(r, 500));

  // Scroll back to top and let everything settle
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 600));
}

/**
 * Capture a full-page screenshot and section-by-section viewport screenshots
 * for a single page.
 */
async function capturePageScreenshots(page, pageDef) {
  const { name, url, description } = pageDef;

  console.log(`\n  --- ${description} ---`);
  console.log(`  URL: ${url}`);

  // Navigate
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
  } catch (err) {
    console.error(`  [ERROR] Navigation failed for ${url}: ${err.message}`);
    return;
  }

  // Wait for network to mostly settle
  try {
    await page.waitForNetworkIdle({ timeout: 12000 });
  } catch {
    // Some pages have persistent connections (analytics, websockets, etc.)
  }

  // Extra settle time for client-side rendering
  await new Promise((r) => setTimeout(r, 2000));

  // Pre-scroll to trigger all animations and lazy content
  console.log(`  Pre-scrolling to trigger animations...`);
  await preScrollPage(page, VIEWPORT.height);

  // --- Full page screenshot ---
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}_full.png`),
    fullPage: true,
  });
  console.log(`  [OK] ${name}_full.png`);

  // --- Section-by-section screenshots ---
  const totalHeight = await page.evaluate(
    () => document.documentElement.scrollHeight
  );
  const sectionCount = Math.ceil(totalHeight / VIEWPORT.height);
  const maxSections = Math.min(sectionCount, 15); // cap at 15 sections

  console.log(
    `  Page height: ${totalHeight}px -> ${sectionCount} sections (capturing up to ${maxSections})`
  );

  for (let i = 0; i < maxSections; i++) {
    const scrollY = i * VIEWPORT.height;
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${name}_section_${i + 1}.png`),
      fullPage: false,
    });
    console.log(`  [OK] ${name}_section_${i + 1}.png`);
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function main() {
  console.log(`\nGetStyled Internal Pages — Screenshot Capture`);
  console.log(`==============================================`);
  console.log(`Viewport: ${VIEWPORT.width}x${VIEWPORT.height} (desktop)`);
  console.log(`Output:   ${SCREENSHOT_DIR}\n`);

  // Ensure output directory exists
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Set desktop viewport
  await page.setViewport({
    width: VIEWPORT.width,
    height: VIEWPORT.height,
  });

  // Capture each internal page
  for (const pageDef of PAGES) {
    try {
      await capturePageScreenshots(page, pageDef);
    } catch (err) {
      console.error(
        `  [ERROR] Failed to capture ${pageDef.name}: ${err.message}`
      );
    }
  }

  await browser.close();

  // Print summary
  console.log(`\n==============================================`);
  console.log(`Done! Screenshots saved to:`);
  console.log(`  ${SCREENSHOT_DIR}`);

  const files = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.endsWith(".png"));
  console.log(`  Total files: ${files.length}`);
  files.forEach((f) => {
    const stats = fs.statSync(path.join(SCREENSHOT_DIR, f));
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`    ${f} (${sizeKB} KB)`);
  });
}

main().catch(console.error);
