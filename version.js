import pjson from "./package.json" assert { type: "json" };
import dbg from "debug";
import config from 'config';

const debug = dbg("version");
const iconEmoji = config.get("slack.emoji");
import { DEBUG_RUN } from "./index.js";
const VERSION_REGEX = new RegExp("^[vV]ersion$");

export const handle_version_cmd = (bot, user, message) => {
  if (message.match(VERSION_REGEX)) {
    // version command
    if (DEBUG_RUN) {
      // don't send message
    } else {
      debug("posting version to user");
      bot.postMessageToUser(
        user.name,
        "I am *" + pjson.name + "* and running version " + pjson.version + ".",
        { icon_emoji: iconEmoji },
        (res)=>{
          if (res.error){
            debug(res.error);
            if (res.error == "ratelimited"){
              console.error("ERROR: rate limited request");
            }
          }
        }
      );
    }
  }
};
