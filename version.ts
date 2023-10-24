import pjson from "./package.json" assert { type: "json" };
import dbg from "debug";
import config from "config";
import { bot_tag } from "./slack/bot.ts";

const debug = dbg("version");
const iconEmoji = config.get("slack.emoji");
import { DEBUG_RUN } from "./index.ts";

export const handleVersionCmd = (bot, channel, user, message) => {
  const VERSION_REGEX = new RegExp(`^(${bot_tag()}:? )?version$`);
  if (message.match(VERSION_REGEX)) {
    debug("version matched");
    // version command
    if (DEBUG_RUN) {
      // don't send message
    } else if (channel) {
      debug("posting version to channel");
      bot.postMessage(
        channel,
        "I am *" + pjson.name + "* and running version " + pjson.version + ".",
        false
      );
    } else {
      debug("posting version to user");
      bot.postMessageToUser(
        user.name,
        "I am *" + pjson.name + "* and running version " + pjson.version + ".",
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
