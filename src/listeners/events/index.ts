import { App } from '@slack/bolt';
import appMentionedCallback from './app-mentioned';

const register = (app: App) => {
  app.event('app_mention', appMentionedCallback);
};

export default { register };
