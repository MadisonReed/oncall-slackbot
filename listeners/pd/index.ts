import { App } from "@slack/bolt";
import { BotConfig } from "../../types";
import jsonConfig from "config";
import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import PagerDuty from "./pagerduty";

const config: BotConfig = jsonConfig as BotConfig;
const pagerDuty = new PagerDuty(config.get("pagerduty"));

export const pdCallback = async ({
  context,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"message">) => {
  try {
    await say(`${JSON.stringify(await pagerDuty.getOncalls())}`);
  } catch (error) {
    console.error(error);
  }
};

const register = (app: App) => {
  app.message(/^(yo).*/, pdCallback);
};

export default { register };
