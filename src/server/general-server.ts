import { chromium, Page } from "playwright";

require("dotenv").config();

export const GeneralServer = {
  convertAudioToBase64: async function (url: string): Promise<string> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  },
  recognizeAudio: async function (base64Audio: string): Promise<string> {
    const response = await fetch(
      `${process.env.SPEECH_API_URL}?key=${process.env.SPEECH_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            encoding: "MP3",
            sampleRateHertz: 16000,
            languageCode: "en-US",
          },
          audio: {
            content: base64Audio,
          },
        }),
      }
    );

    const data = await response.json();
    return data.results?.[0]?.alternatives?.[0]?.transcript || "";
  },
  // Get the captcha ID from the image
  async getCaptchaId(imageBase64: string) {
    const url = process.env.BCSAPI_URL_API + "captcha/image";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        b64image: imageBase64,
        access_token: process.env.BCSAPI_ACCESS_TOKEN,
        alphanumeric: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.id;
  },
  async getCodeByCaptchaId(CAPTCHA_ID: string) {
    const url = `${process.env.BCSAPI_URL_API}captcha/${CAPTCHA_ID}?access_token=${process.env.BCSAPI_ACCESS_TOKEN}`;
    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  },
  async SDSDSDSd(url: string, cookieString: string) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: cookieString,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    // המרת התגובה ל-ArrayBuffer
    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    return arrayBuffer;
  },
  async downloadExcel(href: string, cookieString: string) {
    const downloadUrl = new URL(href, "https://harb.cma.gov.il");
    try {
      const response = await fetch(downloadUrl.href, {
        method: "GET",
        headers: {
          Cookie: cookieString,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download file. Status: ${response.status}`);
      }

      // Read response as array buffer
      const arrayBuffer = await response.arrayBuffer();
      console.log("Downloaded file size:", arrayBuffer.byteLength);
      return arrayBuffer;
    } catch (error) {
      console.error("Error downloading file:", error);
      return null;
    }
  },
};
