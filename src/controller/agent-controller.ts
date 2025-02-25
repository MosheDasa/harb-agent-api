import { chromium, BrowserContext, Page } from "playwright";
import { logError, logDebug } from "../utils/logger";
import { Replay } from "../entity/general-bo";
import { BrowserHelper } from "../helper/browser-helper";
import Utils from "../utils/utils";
import { UserDataReq } from "../entity/user-data-entity";
import BrowserUtils from "../utils/browser-utils";
require("dotenv").config();

export const AgentController = {
  GET_USER_DATA: async function (reqBody: UserDataReq): Promise<Replay> {
    logDebug("Starting GET_USER_DATA process...");

    // אתחול הדפדפן והקונטקסט
    const { context, browser } = await BrowserUtils.initializeBrowser();

    try {
      if (!context) {
        logError("No cookies found in Redis.");
        return Utils.createResponse(false, "No cookies found.", 1);
      }

      // יצירת עמוד חדש בדפדפן
      const page = await context.newPage();

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

      logDebug("Page accessed and Excel data retrieved successfully.");
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
        logDebug("Closing browser...");
        await browser.close();
        logDebug("Browser closed.");
      }
    }
  },
};
