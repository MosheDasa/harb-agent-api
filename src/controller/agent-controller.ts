import { chromium, BrowserContext, Page } from "playwright";
import { logError, logInfo } from "../utils/logger";
import { Replay } from "../entity/general-bo";
import { BrowserHelper } from "../helper/browser-helper";
import Utils from "../utils/utils";
import { UserDataReq } from "../entity/user-data-entity";
require("dotenv").config();

export const AgentController = {
  /**
   * Retrieves user data by simulating browser actions.
   * @param {any} reqBody - The request body containing user details.
   * @returns {Promise<Replay>} - Response object indicating success or failure.
   */
  GET_USER_DATA: async function (reqBody: UserDataReq): Promise<Replay> {
    logInfo("Starting GET_USER_DATA process...");

    // אתחול הדפדפן והקונטקסט
    const { context, browser } = await BrowserHelper.initializeBrowser();

    try {
      if (!context) {
        logError("No cookies found in Redis.");
        return Utils.createResponse(false, "No cookies found.", 1);
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
        return Utils.createResponse(false, "Failed to process user data.", 2);
      }

      logInfo("Page accessed and Excel data retrieved successfully.");
      return Utils.createResponse(
        true,
        "Page accessed successfully.",
        0,
        excelData
      );
    } catch (error: any) {
      logError(`Error during user data retrieval: ${error.message}`);
      return Utils.createResponse(false, "Failed to access the page.", 99);
    } finally {
      // סגירת הדפדפן לאחר השימוש
      if (browser) {
        logInfo("Closing browser...");
        //  await browser.close();
        logInfo("Browser closed.");
      }
    }
  },
};
