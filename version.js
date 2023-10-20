import pjson from "./package.json" assert { type: "json" };
import config from 'config';

const iconEmoji = config.get("slack.emoji");
import { DEBUG_RUN } from "./oncall_bot.js";
const VERSION_REGEX = new RegExp("^[vV]ersion$");

export const handle_version_cmd = (bot, user, message) => {
  if (message.match(VERSION_REGEX)) {
    // version command
    if (DEBUG_RUN) {
      // don't send message
    } else {
      bot.postMessageToUser(
        user.name,
        "I am *" + pjson.name + "* and running version " + pjson.version + ".",
        { icon_emoji: iconEmoji }
      );
    }
  }
};
