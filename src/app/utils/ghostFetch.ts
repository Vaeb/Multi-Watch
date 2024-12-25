import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { log } from "./log";
import UserAgentOverride from "puppeteer-extra-plugin-stealth/evasions/user-agent-override";

export const ghostFetch = async <T>(
  urls: string[],
  verbose = true,
  mapper?: (result: any) => any,
) => {
  if (verbose) log("\n\nGhost fetching", urls);
  try {
    const puppeteerExtra = puppeteer.use(StealthPlugin());

    const uaWin = UserAgentOverride({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36",
      locale: "en-US,en",
      platform: "Win32",
    });
    log(uaWin);
    puppeteerExtra.use(uaWin);

    const browser = await puppeteerExtra.launch({
      headless: true,
      args: ["--no-sandbox"],
      executablePath: "/usr/bin/chromium-browser",
    });

    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const page = await browser.newPage();
          await page.goto(url);
          await page.waitForSelector("body");

          const kickResponse = await page.evaluate(() => {
            const bodyElement = document.querySelector("body");
            if (!bodyElement?.textContent) {
              throw new Error(
                "[ghostFetch] Channel body has no textContent (fetch failed)",
              );
            }
            // log(bodyElement.textContent);
            return JSON.parse(bodyElement.textContent) as T;
          });
          // log(kickResponse);
          return mapper ? mapper(kickResponse) : kickResponse;
        } catch (err) {
          if (verbose) log("[ghostFetch] Error browsing channel page:", err);
          return "error";
        }
      }),
    );

    browser
      .close()
      .then(() => (verbose ? log("[ghostFetch] Closed browser") : undefined))
      .catch((err) =>
        verbose ? log("[ghostFetch] Error closing browser:", err) : undefined,
      );

    if (verbose) log("[ghostFetch] Finished using puppeteer!");

    return results;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    if (verbose) log("[ghostFetch] Error using puppeteer", _err);
    return "error";
  }
};

/*
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { type RemoteKickLivestreamData } from "../../types";

export const ghostFetch = async (urls: string[]) => {
  console.log("\n\nGhost fetching", urls);
  const puppeteerExtra = puppeteer.use(StealthPlugin());
  const browser = await puppeteerExtra.launch({ headless: true });
  const page = await browser.newPage();

  const results: RemoteKickLivestreamData[] = [];

  for (const url of urls) {
    await page.goto(url);
    await page.waitForSelector("body");

    try {
      const kickResponse = await page.evaluate(() => {
        const bodyElement = document.querySelector("body");
        console.log("bodyElement", bodyElement);
        if (!bodyElement?.textContent) {
          throw new Error("Unable to fetch channel data");
        }
        console.log(bodyElement.textContent);
        return JSON.parse(bodyElement.textContent) as {
          data: RemoteKickLivestreamData;
        };
      });
      console.log(kickResponse);
      results.push(kickResponse.data);
    } catch (error) {
      console.error("Error getting channel data:", error);
      return null;
    }
  }

  await browser.close();

  return results;
};
*/
