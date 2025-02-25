import { BrowserContext, chromium, Cookie, Page } from "playwright";
import Utils from "../utils/utils";
import { redisHelper } from "./redis-helper";
import { GeneralServer } from "../server/general-server";
import axios from "axios";
import * as xlsx from "xlsx";
import { logDebug, logError } from "../utils/logger";
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
      logDebug("Filling page details...");

      // Wait for ID input and fill it
      const idInput = page.locator("#txtId");
      await idInput.waitFor({ state: "visible" });
      await idInput.fill(data.id.toString());
      logDebug("User ID filled successfully.");

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
      logDebug("Date fields filled successfully.");

      // Approve terms
      const approveCheckbox = page.locator("#cbAproveTerm");
      await approveCheckbox.check();
      logDebug("Terms approved successfully.");

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
    logDebug(
      `Selecting item '${val}' from dropdown '${id}' at index ${index}...`
    );
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
    logDebug(`Item '${val}' selected successfully.`);
  },

  /**
   * Solves the CAPTCHA by taking a screenshot and sending it to an external service.
   * @param {Page} page - The Playwright page instance.
   * @returns {Promise<string | null>} The solved CAPTCHA text or null if failed.
   */
  solveCaptcha: async function (page: Page): Promise<string | null> {
    try {
      logDebug("Solving CAPTCHA...");
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
          logDebug("CAPTCHA solved successfully.");
          return captchaResponse.text;
        } else {
          logError("Failed to solve CAPTCHA - Incomplete status");
          return null;
        }
      } else {
        logError("CAPTCHA element not found.");
      }
    } catch (error: any) {
      logError("Error solving CAPTCHA", { error: error.message });
    }
    return null;
  },

  /**
   * Retrieves cookies from Redis.
   * @returns {Promise<string | null>} The cookies as a JSON string or null if not found.
   */
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

  /**
   * Creates a new browser context and sets cookies.
   * @param {any} browser - The Playwright browser instance.
   * @param {string} cookies - Cookies to set in the context.
   * @returns {Promise<BrowserContext>} The new browser context.
   */
  createBrowserContext: async function (browser: any, cookies: string) {
    logDebug("Creating browser context and setting cookies...");
    const context = await browser.newContext();
    await context.addCookies(JSON.parse(cookies));
    logDebug("Browser context created successfully.");
    return context;
  },

  /**
   * Navigates to the target page.
   * @param {Page} page - The Playwright page instance.
   */
  navigateToPage: async function (page: Page) {
    logDebug("Navigating to target page...");
    await page.goto(process.env.HARB_URL || "");
    logDebug("Navigation completed.");
  },

  /**
   * Runs fillPageDetails and solveCaptcha in parallel.
   * @param {Page} page - The Playwright page instance.
   * @param {any} reqBody - Request body containing user data.
   * @returns {Promise<[boolean, string | null]>} Results of the tasks.
   */
  runParallelTasks: async function (page: Page, reqBody: any) {
    logDebug("Running parallel tasks: filling details and solving CAPTCHA...");
    const results = await Promise.all([
      await BrowserHelper.fillPageDetails(page, {
        id: reqBody.id,
        bod: reqBody.bod,
        iis: reqBody.iis,
      }),
      await BrowserHelper.solveCaptcha(page),
    ]);
    logDebug("Parallel tasks completed.");
    return results;
  },

  /**
   * Submits the form after filling details and solving CAPTCHA.
   * @param {Page} page - The Playwright page instance.
   * @param {string} captchaCode - The solved CAPTCHA code.
   */
  submitForm: async function (page: Page, captchaCode: string) {
    logDebug("Submitting form...");
    await page.fill("#CaptchaCode", captchaCode);
    await Promise.all([page.click("#butIdent")]);
    logDebug("Form submitted successfully.");
  },

  /**
   * Downloads and parses Excel data from the page.
   * @param {Page} page - The Playwright page instance.
   * @param {Cookie[]} cookies - Cookies for the request.
   * @returns {Promise<any>} Parsed Excel data.
   */
  // downloadAndParseExcel: async function (page: Page, cookies: any) {
  //   logDebug("Downloading and parsing Excel file...");
  //   const href = await page.evaluate(() => {
  //     const element = document.querySelector('a[title="הדפסה"]');
  //     return element ? element.getAttribute("href") : null;
  //   });

  //   if (!href) {
  //     logError("No Excel download link found.");
  //     return null;
  //   }

  //   const downloadUrl = new URL(href, "https://harb.cma.gov.il");
  //   const cookieString = cookies
  //     .map((cookie: any) => `${cookie.name}=${cookie.value}`)
  //     .join("; ");

  //   const response = await GeneralServer.downloadExcel(
  //     downloadUrl.href,
  //     cookieString
  //   );
  //   if (!response) {
  //     logError("Failed to download Excel file.");
  //     return null;
  //   }

  //   logDebug("Excel file downloaded successfully. Parsing data...");
  //   const workbook = xlsx.read(response, { type: "buffer" });

  //   const data = await this.convertSheetsToJson(workbook);
  //   // sheets.forEach((sheetName) => {
  //   //   const worksheet = workbook.Sheets[sheetName];
  //   //   data[sheetName] = xlsx.utils.sheet_to_json(worksheet, {
  //   //     raw: false,
  //   //     defval: "",
  //   //   });
  //   // });

  //   logDebug("Excel data parsed successfully.");
  //   return data;
  // },

  /**
   * Converts Excel sheets to JSON format asynchronously.
   * @param {xlsx.WorkBook} workbook - The Excel workbook object.
   * @returns {Promise<{ [key: string]: any[] }>} A promise that resolves to an object containing sheet data.
   */
  convertSheetsToJson: async function (
    workbook: xlsx.WorkBook
  ): Promise<{ [key: string]: any[] }> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("dasa 1111111111111111", workbook.Sheets);
        // const sheetName = "Sheet2";
        // const worksheet = workbook.Sheets[sheetName];
        // const data: any = xlsx.utils.sheet_to_json(worksheet, {
        //   raw: false,
        //   defval: "",
        // });

        const data: { [key: string]: any[] } = {};
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          data[sheetName] = xlsx.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: "",
          });
        });

        resolve(data);
      } catch (error: any) {
        reject(new Error(`Failed to convert sheets to JSON: ${error.message}`));
      }
    });
  },

  /**
   * Initializes the browser with context and cookies.
   * @returns {Promise<{ context: BrowserContext | null, browser: any }>} Browser context and instance.
   */
  initializeBrowser: async function (): Promise<{
    context: BrowserContext | null;
    browser: any;
  }> {
    logDebug("Initializing browser...");
    const redisCookies = await BrowserHelper.getCookies();
    if (!redisCookies) {
      logError("No cookies found in Redis.");
      return { browser: null, context: null };
    }

    const browser = await chromium.launch({ headless: true });
    const context = await BrowserHelper.createBrowserContext(
      browser,
      redisCookies
    );
    logDebug("Browser initialized successfully.");
    return { context, browser };
  },

  /**
   * Processes user data by filling the form, solving CAPTCHA, and downloading Excel.
   * @param {Page} page - The Playwright page instance.
   * @param {BrowserContext} context - The Playwright browser context.
   * @param {any} reqBody - Request body with user data.
   * @returns {Promise<any>} Parsed Excel data.
   */
  processUserData: async function (
    page: Page,
    context: BrowserContext,
    reqBody: any
  ): Promise<any> {
    logDebug("Processing user data...");
    await BrowserHelper.navigateToPage(page);

    const [fillPageDetailsResult, captchaCode] =
      await BrowserHelper.runParallelTasks(page, reqBody);
    if (!fillPageDetailsResult || !captchaCode) {
      logError("Failed to fill page details or solve CAPTCHA.", {
        fillPageDetailsResult,
        captchaCode,
      });
      return null;
    }

    await BrowserHelper.submitForm(page, captchaCode);
    await page.waitForNavigation();
    await page.waitForSelector("#butInsuranceOf");
    await page.click("#butInsuranceOf");
    logDebug("butInsuranceOf.");
    await new Promise((resolve) => setTimeout(resolve, 7000));
    const excelData = await this.downloadAndParseExcel(page, context);
    logDebug("User data processed successfully.", excelData);
    return excelData;
  },

  downloadAndParseExcel: async (page: any, context: any) => {
    try {
      console.log("🔄 Starting downloadAndParseExcel...");

      // שלב 1: מציאת קישור להורדה
      const href = await page.evaluate(() => {
        const element = document.querySelector('a[title="הדפסה"]');
        return element ? element.getAttribute("href") : null;
      });

      console.log(`🔗 Found href: ${href}`);

      if (!href) {
        console.warn("⚠️ No download link found.");
        return null;
      }

      // שלב 2: יצירת URL מלא
      const downloadUrl = new URL(href, "https://harb.cma.gov.il");
      console.log(`🌍 Download URL: ${downloadUrl.href}`);

      // שלב 3: קבלת קובצי Cookie
      const cookies = await context.cookies();
      const cookieString = cookies
        .map((cookie: any) => `${cookie.name}=${cookie.value}`)
        .join("; ");
      console.log(`🍪 Cookies: ${cookieString}`);

      // שלב 4: הורדת הקובץ
      console.log("📥 Downloading the Excel file...");
      const response = await axios.get(downloadUrl.href, {
        responseType: "arraybuffer",
        headers: {
          Cookie: cookieString,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      console.log(
        `✅ File downloaded successfully. Size: ${response.data.length} bytes`
      );

      // שלב 5: המרת הנתונים לבאפר
      const buffer = Buffer.from(response.data, "binary");

      // שלב 6: קריאת קובץ ה-Excel
      console.log("📊 Reading Excel workbook...");
      const workbook = xlsx.read(buffer, { type: "buffer" });

      // שלב 7: המרת גיליונות ל-JSON
      const sheets = workbook.SheetNames;
      console.log(`📄 Sheets found: ${sheets.join(", ")}`);

      const data: { [key: string]: any[] } = {};
      sheets.forEach((sheetName) => {
        console.log(`🔍 Processing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        data[sheetName] = xlsx.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: "",
        });
        console.log(
          `📋 Rows extracted from ${sheetName}: ${data[sheetName].length}`
        );
      });

      console.log("✅ Excel parsing completed successfully.");
      return data;
    } catch (error) {
      console.error("❌ Error in downloadAndParseExcel:", error);
      throw error;
    }
  },

  /**
   * Fetches Excel data after user data processing.
   * @param {Page} page - The Playwright page instance.
   * @param {BrowserContext} context - The Playwright browser context.
   * @returns {Promise<any>} Parsed Excel data.
   */
  // fetchExcelData: async function (
  //   page: Page,
  //   context: BrowserContext
  // ): Promise<any> {
  //   logDebug("Fetching Excel data...");
  //   const cookies = await context.cookies();
  //   const excelData = await BrowserHelper.downloadAndParseExcel(page, cookies);

  //   if (!excelData) {
  //     logError("Failed to download or parse Excel data.");
  //     return null;
  //   }

  //   logDebug("Excel data fetched successfully.");
  //   return excelData;
  // },
};
