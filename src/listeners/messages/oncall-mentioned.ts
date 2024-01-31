import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import { getOncallSlackMembers } from "@api/oncall";
import { oncallMap } from "@api/pd";
import { OncallSlackUser } from "@srcapi/slack";

const oncallMentionedCallback = async ({
  context,
  event,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"message">) => {
  console.log("**** oncall mentioned");
  const oncall_tagged = context.matches[1];
  const oncalls = await getOncallSlackMembers();
  const scheduleId = oncallMap[oncall_tagged];
  const oncallUser = oncalls.find(
    (oncall: OncallSlackUser) => oncall.pdScheduleId === scheduleId,
  );
  if (!oncallUser) {
    await say({ text: "no oncall user found", thread_ts: event.ts });
    console.error("no oncall user found");
  } else {
    try {
      await say({
        text: `<@${oncallUser.slackId}> ^^`,
        thread_ts: event.ts,
      });
    } catch (error) {
      console.error(error);
    }
  }
};

export default oncallMentionedCallback;
