import dbg from "debug";
import config from "config";

import { OncallSlackUser } from "../types.ts";
import { SlackChannel } from "./types.ts";
import { bot } from "./bot.ts";
import { DEBUG_RUN } from "../index.ts";

const debug = dbg("slackMessage");
const oncallMap = config.get("pagerduty.oncall_map");

const scheduleIdFromMessage = (message) => {
  const allowedOncalls = Object.keys(oncallMap);
  debug("getting schedule ID from message");
  // extract mentioned shortname
  let oncallMentioned = allowedOncalls.find((oncall) => {
    const oncallRe = new RegExp(`@${oncall}\\b`);
    const res = oncallRe.exec(message);
    debug(res);
    return res
  });
  // get the full name from that
  const fullname = oncallMap[oncallMentioned];
  debug("oncall mentioned was", fullname);
  return fullname;
};

export const handleOncallMention = (
  oncalls: OncallSlackUser[],
  channel: SlackChannel,
  messageReceived: string,
  threadTs: string
) => {
  const scheduleId = scheduleIdFromMessage(messageReceived);
  debug("sid", scheduleId);
  if (!scheduleId){
    debug("no schedule ID found");
    return; //none
  }
  // get the current oncall for this shift
  const oncallUser = oncalls.find((oncall) => {
    return oncall.pdScheduleId == scheduleId;
  });
  if (!oncallUser) {
    // No oncall mentioned in the message
    return;
  }
  // send message to channel mentioning user
  const message = `<@${oncallUser.slackId}> ^^`;
  if (DEBUG_RUN) {
    debug("would send message to", channel.name, message);
  } else {
    debug("thread ts", threadTs);
    bot.postMessageToChannel(channel.name, message, { thread_ts: threadTs }, (val)=>debug(val));
  }
};
