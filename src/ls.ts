import dbg from "debug";
import { BotConfig, OncallSlackUser } from "./types.ts";
import jsonConfig from "config";
import { bot_tag } from "./slack/bot.ts";
import Bot from "slack-bot-api";

const debug = dbg("ls");
import { DEBUG_RUN } from "./index.ts";

const config: BotConfig = jsonConfig as BotConfig;
const iconEmoji = config.slack.emoji;
const oncallMap = config.pagerduty.oncall_map;

const transformMapping = (mapping) => {
  // Given the regular oncall mapping, transform it into a
  // mapping of schedule id to a list of shortnames.
  const transformed = {};

  for (const name in mapping) {
    const id = mapping[name];
    if (transformed[id]) {
      transformed[id].push(name);
    } else {
      transformed[id] = [name];
    }
  }

  return transformed;
};

const constructMappedMessage = (oncallSlackers: OncallSlackUser[]) => {
  const shortnamesMap = transformMapping(oncallMap);
  return (
    Object.entries(shortnamesMap)
      .map(([pdScheduleId, shortnames]) => [
        shortnames,
        oncallSlackers.find((s) => s.pdScheduleId == pdScheduleId),
      ])
      // remove null and undefined
      .filter(([_, id]: (string[] | OncallSlackUser | undefined)[]) => !!id)
      .map(
        ([shortnames, s]: (string[] | OncallSlackUser | undefined)[]) =>
          `(${shortnames.join(" | ")}): @${(s as OncallSlackUser).name}`
      )
      .join("\n")
  );
};

export const handleLsCmd = async (
  oncallSlackUsers: OncallSlackUser[],
  bot: Bot,
  channel,
  user,
  message,
  threadTs: string
) => {
  const LS_REGEX = new RegExp(`^(${bot_tag()}:? )?ls`);
  // TODO: construct message here
  const usersMessage = constructMappedMessage(oncallSlackUsers);
  if (message.match(LS_REGEX)) {
    debug("ls matched");
    if (DEBUG_RUN) {
      // don't send message
    } else if (channel) {
      debug("posting ls to channel");
      bot.postMessage(channel, `Current oncall listing:\n${usersMessage}`, {
        thread_ts: threadTs,
      });
    } else {
      debug("posting ls to user");
      bot.postMessageToUser(
        user.name,
        `Current oncall listing: ${usersMessage}`,
        { icon_emoji: iconEmoji },
        (res) => {
          if (res.error) {
            debug(res.error);
            if (res.error == "ratelimited") {
              console.error("ERROR: rate limited request");
            }
          }
        }
      );
    }
    return true;
  }
  return false;
};
