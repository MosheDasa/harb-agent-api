import { chromium, BrowserContext, Page } from "playwright";
import { logError, logInfo } from "../utils/logger";
import { Replay } from "../entity/general-bo";
import { BrowserHelper } from "../helper/browser-helper";
require("dotenv").config();

export const AgentController = {
  /**
   * Retrieves user data by simulating browser actions.
   * @param {any} reqBody - The request body containing user details.
   * @returns {Promise<Replay>} - Response object indicating success or failure.
   */
  GET_USER_DATA: async function (reqBody: any): Promise<Replay> {
    logInfo("Starting GET_USER_DATA process...");

    // אתחול הדפדפן והקונטקסט
    const { context, browser } = await BrowserHelper.initializeBrowser();

    try {
      if (!context) {
        logError("No cookies found in Redis.");
        return {
          isSuccess: false,
          message: "No cookies found.",
          statusCode: 1,
        };
      }

      logInfo("Browser context initialized successfully.");

      // יצירת עמוד חדש בדפדפן
      const page = await context.newPage();
      logInfo("New page created.");

      // עיבוד נתוני המשתמש והורדת אקסל
      const excelData = await BrowserHelper.processUserData(
        page,
        context,
        reqBody
      );

      if (!excelData) {
        logError("Failed to process user data.");
        return {
          isSuccess: false,
          message: "Failed to process user data.",
          statusCode: 2,
        };
      }

      logInfo("Page accessed and Excel data retrieved successfully.");
      return {
        isSuccess: true,
        message: "Page accessed successfully.",
        statusCode: 3,
        data: excelData,
      };
    } catch (error: any) {
      logError(`Error during user data retrieval: ${error.message}`);
      return {
        isSuccess: false,
        message: "Failed to access the page.",
        statusCode: 99,
      };
    } finally {
      // סגירת הדפדפן לאחר השימוש
      if (browser) {
        logInfo("Closing browser...");
        await new Promise((resolve) => setTimeout(resolve, 4000));
        await browser.close();
        logInfo("Browser closed.");
      }
    }
  },
};
