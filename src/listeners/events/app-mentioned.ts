import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { getOncallSlackMembers } from "@api/oncall";
import { version, name as packageName } from "package.json";
import { makeOncallMappingMessage } from "@api/pd";

const USER_MENTION_REGEX = "^<@U[A-Z0-9]{8,10}>";
const VERSION_REGEX = new RegExp(`${USER_MENTION_REGEX} version`);
const LS_REGEX = new RegExp(`${USER_MENTION_REGEX} ls`);

const appMentionedCallback = async ({
  event,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  let threadTs = event.ts;
  if (event.text.match(VERSION_REGEX)) {
    await say({
      text: `I am *${packageName}* and running version ${version}.`,
      thread_ts: threadTs,
    });
  } else if (event.text.match(LS_REGEX)) {
    const slackMembers = await getOncallSlackMembers();
    const usersMessage = makeOncallMappingMessage(slackMembers);
    await say({
      text: `Current oncall listing:\n ${usersMessage}`,
      thread_ts: threadTs,
    });
  } else {
    // list available commands
    say({
      text: "You can @ me with the following commands:\n- version\n- ls",
      thread_ts: threadTs,
    });
  }
};

export default appMentionedCallback;
