import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";

const oncallMentionedCallback = async ({
  context,
  event,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"message">) => {
  try {
    const greeting = context.matches[0];
    await say({ text: `matched ${greeting}`, thread_ts: event.ts });
  } catch (error) {
    console.error(error);
  }
};

export default oncallMentionedCallback;
