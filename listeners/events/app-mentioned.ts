import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { version, name as packageName } from "../../package.json";

const USER_MENTION_REGEX = "^<@U[A-Z0-9]{8,10}>";
const VERSION_REGEX = new RegExp(`${USER_MENTION_REGEX} version`);
const LS_REGEX = new RegExp(`${USER_MENTION_REGEX} ls`);

const appMentionedCallback = async ({
  event,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  console.log("bot mentioned", event, event.bot_id);
  if (event.text.match(VERSION_REGEX)) {
    say(`I am * ${packageName} * and running version ${version}.`);
  } else if (event.text.match(LS_REGEX)) {
    say("ls");
  } else {
    say("hey");
  }
};

export default appMentionedCallback;
