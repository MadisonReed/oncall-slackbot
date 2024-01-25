import { App } from '@slack/bolt';
import sampleMessageCallback from './sample-message';
import oncallMentionedCallback from './oncall-mentioned';

const register = (app: App) => {
  app.message(/^(hi|hello|hey).*/, sampleMessageCallback);
  app.message(/^(hi|hello|hey).*/, oncallMentionedCallback);
};

export default { register };
