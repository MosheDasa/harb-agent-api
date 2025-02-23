import { chromium, BrowserContext, Page } from "playwright";
import { logError, logInfo } from "../utils/logger";
import { Replay } from "../entity/general-bo";
import { BrowserHelper } from "../helper/browser-helper";
require("dotenv").config();

export const AgentController = {
  GET_USER_DATA: async function (reqBody: any): Promise<Replay> {
    let browser;
    try {
      const redisCookies = await BrowserHelper.getCookies();
      if (!redisCookies) {
        return {
          isSuccess: false,
          message: "No cookies found.",
          statusCode: 1,
        };
      }

      browser = await chromium.launch({ headless: true });
      const context = await BrowserHelper.createBrowserContext(
        browser,
        redisCookies
      );
      const page = await context.newPage();

      await BrowserHelper.navigateToPage(page);

      const [fillPageDetailsResult, captchaCode] =
        await BrowserHelper.runParallelTasks(page, reqBody);

      if (!fillPageDetailsResult || !captchaCode) {
        return {
          isSuccess: false,
          message: "Failed to process user data.",
          statusCode: 2,
        };
      }

      await BrowserHelper.submitForm(page, captchaCode);
      await page.waitForNavigation();
      await page.waitForSelector("#butInsuranceOf");
      await page.click("#butInsuranceOf");
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const cookies = await context.cookies();
      const excelData = await BrowserHelper.downloadAndParseExcel(
        page,
        cookies
      );

      logInfo("✅ Page accessed successfully.");
      return {
        isSuccess: true,
        message: "Page accessed successfully.",
        statusCode: 3,
        data: excelData,
      };
    } catch (error: any) {
      logError("❌ Error during user data 1 retrieval", {
        error: error.message,
      });
      return {
        isSuccess: false,
        message: "Failed to access the page.",
        statusCode: 99,
      };
    } finally {
      if (browser) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        await browser.close();
      }
    }
  },
  /**
   * Retrieves user data by simulating browser actions.
   * @param {any} reqBody - The request body containing user details.
   * @returns {Promise<Replay>} - Response object indicating success or failure.
   */
  SET_USER_DATA: async function (
    page: any,
    context: any,
    reqBody: any
  ): Promise<Replay> {
    try {
      await BrowserHelper.navigateToPage(page);

      const [fillPageDetailsResult, captchaCode] =
        await BrowserHelper.runParallelTasks(page, reqBody);

      if (!fillPageDetailsResult || !captchaCode) {
        return {
          isSuccess: false,
          message: "Failed to process user data.",
          statusCode: 2,
        };
      }

      await BrowserHelper.submitForm(page, captchaCode);
      await page.waitForNavigation();
      await page.waitForSelector("#butInsuranceOf");
      await page.click("#butInsuranceOf");
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const cookies = await context.cookies();
      const excelData = await BrowserHelper.downloadAndParseExcel(
        page,
        cookies
      );
      console.log("dasa", excelData);

      logInfo("✅ Page accessed successfully.");
      return {
        isSuccess: true,
        message: "Page accessed successfully.",
        statusCode: 3,
        data: excelData,
      };
    } catch (error: any) {
      logError("❌ Error during user data 2 retrieval" + error.message, {
        error: error.message,
      });
      return {
        isSuccess: false,
        message: "Failed to access the page.",
        statusCode: 99,
      };
    } finally {
    }
  },
};
