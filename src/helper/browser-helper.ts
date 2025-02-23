import { BrowserContext, chromium, Cookie, Page } from "playwright";
import Utils from "../utils/utils";
import { redisHelper } from "./redis-helper";
import { logError, logInfo } from "../utils/logger";
import { GeneralServer } from "../server/general-server";
import * as xlsx from "xlsx";
require("dotenv").config();

export const BrowserHelper = {
  /**
   * Fills page details with user data.
   * @param {Page} page - The Playwright page instance.
   * @param {any} data - User data including ID and dates.
   * @returns {Promise<boolean>} True if successful, otherwise false.
   */
  fillPageDetails: async function (page: Page, data: any): Promise<boolean> {
    try {
      // Wait for ID input and fill it
      const idInput = page.locator("#txtId");
      await idInput.waitFor({ state: "visible" });
      await idInput.fill(data.id.toString());

      // Parse dates
      const parsedBod = Utils.parseDate(data.bod);
      const parsedIis = Utils.parseDate(data.iis);

      const selectFields = [
        { value: parsedBod.day, id: "uiDdlDay_listbox", index: 0 },
        { value: parsedBod.month, id: "uiDdlMonth_listbox", index: 0 },
        { value: parsedBod.year, id: "uiDdlYear_listbox", index: 0 },
        { value: parsedIis.day, id: "uiDdlDay_listbox", index: 1 },
        { value: parsedIis.month, id: "uiDdlMonth_listbox", index: 1 },
        { value: parsedIis.year, id: "uiDdlYear_listbox", index: 1 },
      ];

      // Fill all select fields concurrently
      await Promise.all(
        selectFields.map((field) =>
          this.selectItemFromListByIndex(
            page,
            field.value.toString(),
            field.id,
            field.index
          )
        )
      );

      // Approve terms
      const approveCheckbox = page.locator("#cbAproveTerm");
      await approveCheckbox.check();

      return true;
    } catch (error: any) {
      logError("Failed to fill page details", { error: error.message });
      return false;
    }
  },

  /**
   * Selects an item from a dropdown list by its index and value.
   * @param {Page} page - The Playwright page instance.
   * @param {string} val - The value to select.
   * @param {string} id - The ID of the dropdown list.
   * @param {number} index - The index of the list.
   */
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
              `Item with value '${value}' not found in list ${id} at index ${index}`
            );
          }
        } else {
          console.warn(`List with index ${index} not found for ID: ${id}`);
        }
      },
      { value: val, id, index }
    );
  },

  /**
   * Solves the CAPTCHA by taking a screenshot and sending it to an external service.
   * @param {Page} page - The Playwright page instance.
   * @returns {Promise<string | null>} The solved CAPTCHA text or null if failed.
   */
  solveCaptcha: async function (page: Page): Promise<string | null> {
    try {
      const captchaElement = page.locator(
        "#LocateBeneficiariesCaptcha_CaptchaImage"
      );
      if (await captchaElement.isVisible()) {
        const captchaBuffer = await captchaElement.screenshot();
        const captchaBase64 = captchaBuffer.toString("base64");

        // Send to external API for solving
        const captchaId = await GeneralServer.getCaptchaId(captchaBase64);
        const captchaResponse = await GeneralServer.getCodeByCaptchaId(
          captchaId
        );

        if (captchaResponse?.status === "completed") {
          return captchaResponse.text;
        } else {
          throw new Error("Failed to solve CAPTCHA - Incomplete status");
        }
      }
    } catch (error: any) {
      logError("Error solving CAPTCHA", { error: error.message });
    }
    return null;
  },
  /**
   * Retrieves cookies from Redis.
   */
  getCookies: async function (): Promise<string | null> {
    const cookies = await redisHelper.get("HARB_LOGIN_COOKIES_AFRICA");
    if (!cookies) {
      logError("⚠️ No cookies found.");
      return null;
    }
    return cookies;
  },

  /**
   * Creates a new browser context and sets cookies.
   */
  createBrowserContext: async function (browser: any, cookies: string) {
    const context = await browser.newContext();
    await context.addCookies(JSON.parse(cookies));
    return context;
  },

  /**
   * Navigates to the target page.
   */
  navigateToPage: async function (page: Page) {
    await page.goto(process.env.HARB_URL || "");
  },

  /**
   * Runs fillPageDetails and solveCaptcha in parallel.
   */
  runParallelTasks: async function (page: Page, reqBody: any) {
    return await Promise.all([
      BrowserHelper.fillPageDetails(page, {
        id: reqBody.id,
        bod: reqBody.bod,
        iis: reqBody.iis,
      }),
      BrowserHelper.solveCaptcha(page),
    ]);
  },

  /**
   * Submits the form after filling details and solving CAPTCHA.
   */
  submitForm: async function (page: Page, captchaCode: string) {
    await page.fill("#CaptchaCode", captchaCode);
    await Promise.all([
      page.click("#butIdent"),
      // page.waitForLoadState("networkidle", { timeout: 10000 }),
    ]);
  },
  downloadAndParseExcel: async (page: any, cookies: any) => {
    const href = await page.evaluate(() => {
      const element = document.querySelector('a[title="הדפסה"]');
      return element ? element.getAttribute("href") : null;
    });

    if (href) {
      const downloadUrl = new URL(href, "https://harb.cma.gov.il"); // Replace with your base URL
      // Create a custom agent to skip certificate validation

      const cookieString = cookies
        .map((cookie: any) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      const response = await GeneralServer.downloadExcel(
        downloadUrl.href,
        cookieString
      );

      console.log("dasa", response);

      // Read the file as a Workbook
      const workbook = xlsx.read(response, { type: "buffer" });

      // Convert each sheet to a JSON object
      const sheets = workbook.SheetNames;
      const data: { [key: string]: any[] } = {};
      sheets.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        data[sheetName] = xlsx.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: "",
        });
      });

      return data;
    }
  },
  downloadAndParseExcelaaa: async function (page: Page) {
    try {
      // שליפת ה-URL של הקובץ
      const href = await page.evaluate(() => {
        const element = document.querySelector('a[title="הדפסה"]');
        return element ? element.getAttribute("href") : null;
      });

      if (!href) {
        throw new Error("לא נמצא קישור להורדת קובץ Excel.");
      }

      // קידוד ה-URL כדי למנוע תווים לא חוקיים
      const encodedUrl = new URL(encodeURI(href), "https://harb.cma.gov.il");

      // שליפת ה-Cookies מהעמוד
      const cookies = await page.context().cookies();
      const cookieString = cookies
        .map((cookie: any) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      // הורדת הקובץ באמצעות fetch
      const response = await fetch(encodedUrl.href, {
        method: "GET",
        headers: {
          Cookie: cookieString,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, כמו Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`כשל בהורדת הקובץ. סטטוס: ${response.status}`);
      }

      // קריאת הקובץ כ-Buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // קריאת הקובץ כ-Workbook
      const workbook = xlsx.read(buffer, { type: "buffer" });

      // המרת כל גיליון ל-JSON
      const sheets = workbook.SheetNames;
      const data: { [key: string]: any[] } = {};

      sheets.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        data[sheetName] = xlsx.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: "",
        });
      });

      return data;
    } catch (error: any) {
      console.error("❌ שגיאה במהלך הורדת וקריאת קובץ ה-Excel:", error.message);
      return null;
    }
  },
};
