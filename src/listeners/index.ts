import { App } from '@slack/bolt';
import events from './events/index';
import messages from './messages/index';

const registerListeners = (app: App) => {
  events.register(app);
  messages.register(app);
  // commands.register(app);
  // actions.register(app);
  // shortcuts.register(app);
  // views.register(app);
};

export default registerListeners;
