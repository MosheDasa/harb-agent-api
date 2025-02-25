import { BrowserContext, chromium, Page } from "playwright";
import { logDebug, logError } from "./logger";
import { redisHelper } from "../helper/redis-helper";

export const BrowserUtils = {
  submitForm: async function (page: Page, captchaCode: string) {
    logDebug("Submitting form...");
    await page.fill("#CaptchaCode", captchaCode);
    await Promise.all([page.click("#butIdent")]);
    logDebug("Form submitted successfully.");
  },
  navigateToPage: async function (page: Page) {
    logDebug("Navigating to target page...");
    await page.goto(process.env.HARB_URL || "");
    logDebug("Navigation completed.");
  },
  createBrowserContext: async function (browser: any, cookies: string) {
    logDebug("Creating browser context and setting cookies...");
    const context = await browser.newContext();
    await context.addCookies(JSON.parse(cookies));
    logDebug("Browser context created successfully.");
    return context;
  },
  selectItemFromListByIndex: async function (
    page: Page,
    val: string,
    id: string,
    index: number
  ) {
    await page.evaluate(
      ({ value, id, index }: { value: string; id: string; index: number }) => {
        const lists = document.querySelectorAll(`#${id}`);
        if (lists.length > index) {
          const targetList = lists[index] as HTMLElement;
          const items = targetList.querySelectorAll(".k-item");
          const targetItem = Array.from(items).find(
            (item) => (item as HTMLElement).textContent?.trim() === value
          );

          if (targetItem) {
            (targetItem as HTMLElement).click();
          } else {
            console.warn(
              `Item with value '${value}' not found in list '${id}' at index ${index}`
            );
          }
        } else {
          console.warn(`List with index ${index} not found for ID: ${id}`);
        }
      },
      { value: val, id, index }
    );
  },

  initializeBrowser: async function (): Promise<{
    context: BrowserContext | null;
    browser: any;
  }> {
    logDebug("Initializing browser...");
    const redisCookies = await this.getCookies();
    if (!redisCookies) {
      logError("No cookies found in Redis.");
      return { browser: null, context: null };
    }

    const browser = await chromium.launch({ headless: false });
    const context = await this.createBrowserContext(browser, redisCookies);
    logDebug("Browser initialized successfully.");
    return { context, browser };
  },
  getCookies: async function (): Promise<string | null> {
    logDebug("Retrieving cookies from Redis...");
    const cookies = await redisHelper.get("HARB_LOGIN_COOKIES_AFRICA");
    if (!cookies) {
      logError("No cookies found in Redis.");
      return null;
    }
    logDebug("Cookies retrieved successfully.");
    return cookies;
  },
};

export default BrowserUtils;
