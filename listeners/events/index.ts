import { App } from '@slack/bolt';
import appHomeOpenedCallback from './app-home-opened.js';
import appMentionedCallback from './app-mentioned.js';

const register = (app: App) => {
  app.event('app_home_opened', appHomeOpenedCallback);
  app.event('app_mention', appMentionedCallback);
};

export default { register };
