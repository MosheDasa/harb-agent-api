import { chromium, BrowserContext, Page } from "playwright";
import { logError, logInfo } from "../utils/logger";
import { Replay } from "../entity/general-bo";
import { BrowserHelper } from "../helper/browser-helper";
require("dotenv").config();

export const AgentController = {
  GET_USER_DATA: async function (reqBody: any): Promise<Replay> {
    let browser;
    try {
      const cookies = await BrowserHelper.getCookies();
      if (!cookies) {
        return {
          isSuccess: false,
          message: "No cookies found.",
          statusCode: 1,
        };
      }

      browser = await chromium.launch({ headless: false });
      const context = await BrowserHelper.createBrowserContext(
        browser,
        cookies
      );
      const page = await context.newPage();

      const aa = await this.GET_USER_DATA_A(page, reqBody);
      // await new Promise((resolve) => setTimeout(resolve, 1000));
      // const bb = await this.GET_USER_DATA_B(page);

      return {
        isSuccess: false,
        message: "Failed to access the page.",
        statusCode: 99,
      };
    } catch (error: any) {
      logError("❌ Error during user data retrieval", { error: error.message });
      return {
        isSuccess: false,
        message: "Failed to access the page.",
        statusCode: 99,
      };
    } finally {
      if (browser) {
        // await browser.close();
      }
    }
  },
  /**
   * Retrieves user data by simulating browser actions.
   * @param {any} reqBody - The request body containing user details.
   * @returns {Promise<Replay>} - Response object indicating success or failure.
   */
  GET_USER_DATA_A: async function (page: any, reqBody: any): Promise<Replay> {
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

      logInfo("✅ Page accessed successfully.");
      return {
        isSuccess: true,
        message: "Page accessed successfully.",
        statusCode: 3,
      };
    } catch (error: any) {
      logError("❌ Error during user data retrieval", { error: error.message });
      return {
        isSuccess: false,
        message: "Failed to access the page.",
        statusCode: 99,
      };
    } finally {
    }
  },
  GET_USER_DATA_B: async function (page: any): Promise<Replay> {
    const excelData = await BrowserHelper.downloadAndParseExcel(page);
    console.log("dasa", excelData);
    return {
      isSuccess: true,
      message: "page.",
      statusCode: 0,
    };
  },
};
