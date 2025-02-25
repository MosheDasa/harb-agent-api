import { BrowserContext, chromium, Cookie, Page } from "playwright";
import Utils from "../utils/utils";
import { redisHelper } from "./redis-helper";
import { GeneralServer } from "../server/general-server";
import axios from "axios";
import * as xlsx from "xlsx";
import { logDebug, logError } from "../utils/logger";
import BrowserUtils from "../utils/browser-utils";
require("dotenv").config();

export const BrowserHelper = {
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
          BrowserUtils.selectItemFromListByIndex(
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

  solveCaptcha: async function (page: Page): Promise<string | null> {
    const start = performance.now();
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
          logDebug("CAPTCHA solved successfully.", captchaResponse.text);
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
    } finally {
      const end = performance.now();
      logDebug(`CAPTCHA solved took ${(end - start) / 1000}  ms`);
    }
    return null;
  },

  runParallelTasks: async function (page: Page, reqBody: any) {
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

  processUserData: async function (page: Page, reqBody: any): Promise<any> {
    logDebug("Processing user data...");
    await BrowserUtils.navigateToPage(page);

    const [fillPageDetailsResult, captchaCode] =
      await BrowserHelper.runParallelTasks(page, reqBody);
    if (!fillPageDetailsResult || !captchaCode) {
      logError("Failed to fill page details or solve CAPTCHA.", {
        fillPageDetailsResult,
        captchaCode,
      });
      return null;
    }

    await BrowserUtils.submitForm(page, captchaCode);
    await page.waitForNavigation();
    await page.waitForSelector("#butInsuranceOf");
    await page.click("#butInsuranceOf");
    logDebug("butInsuranceOf.");

    const excelData = await this.downloadAndParseExcel(page);
    logDebug("User data processed successfully.", excelData);
    return excelData;
  },

  downloadAndParseExcel: async (page: any) => {
    try {
      console.log("🔄 Starting downloadAndParseExcel...");

      const idInput = page.locator("#butAllInsurance");
      await idInput.waitFor({ state: "visible" });

      await page.addInitScript(() => {
        window.print = () => {
          console.log("🚫 window.print() was blocked.");
        };
      });

      const href = await page.evaluate(() => {
        const element = document.querySelector('a[title="הדפסה"]') as any;
        if (element) {
          return element.getAttribute("href");
        }
        return null;
      });
      const downloadUrl = new URL(href, "https://harb.cma.gov.il");

      // פתיחת הדף
      await page.goto("" + downloadUrl, {
        waitUntil: "domcontentloaded",
      });

      const htmlContent = await page.content();

      await page.setContent(htmlContent);

      // חילוץ נתוני הטבלה
      const tableData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("table tbody tr"));
        return rows.map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          return cells.map((cell) => cell.innerText.trim());
        });
      });

      return tableData;
    } catch (error) {
      logError("Error in downloadAndParseExcel:", { error });
      throw error;
    }
  },
};
