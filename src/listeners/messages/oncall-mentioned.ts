import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

const oncallMentionedCallback = async ({ context, say }: AllMiddlewareArgs & SlackEventMiddlewareArgs<'message'>) => {
  try {
    const greeting = context.matches[0];
    await say(`${greeting}, how are you?`);
  } catch (error) {
    console.error(error);
  }
};

export default oncallMentionedCallback;
