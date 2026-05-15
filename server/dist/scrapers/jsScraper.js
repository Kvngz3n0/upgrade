import puppeteer from 'puppeteer';
import { getRandomUserAgent } from './userAgents.js';
let browser = null;
async function getBrowser() {
    if (browser)
        return browser;
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    return browser;
}
export async function scrapeWithJS(url, takeScreenshot = false) {
    const maxRetries = 3;
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        let page = null;
        try {
            const browserInstance = await getBrowser();
            page = await browserInstance.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent(getRandomUserAgent());
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
            const html = await page.content();
            const title = await page.title();
            const content = await page.evaluate(() => document.body.innerText || '');
            let screenshot;
            if (takeScreenshot) {
                const buffer = await page.screenshot({ encoding: 'base64', fullPage: true });
                screenshot = `data:image/png;base64,${buffer}`;
            }
            return { url, title, content: content.slice(0, 10000), html: html.slice(0, 20000), screenshot, timestamp: new Date() };
        }
        catch (err) {
            lastError = err;
            console.log(`[Attempt ${attempt + 1}] Error: ${lastError.message}`);
            if (attempt < maxRetries - 1)
                await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        }
        finally {
            if (page)
                await page.close();
        }
    }
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
}
export async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}
//# sourceMappingURL=jsScraper.js.map