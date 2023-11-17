import PagerDuty from "./pagerduty.ts";
import { BotConfig } from "./types.ts";

import jsonConfig from "config";

const config: BotConfig = jsonConfig as BotConfig;

test('pd constructor is functional', async ()=>{
  new PagerDuty(config.get("pagerduty"));
});

test('pd api works', async ()=>{
  const pagerDuty = new PagerDuty(config.get("pagerduty"));
  const oncalls = await pagerDuty.getOnCalls(null); 
  expect(oncalls).toBeDefined();
});

