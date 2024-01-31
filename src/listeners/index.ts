import { App } from '@slack/bolt';
import events from './events/index';
import messages from './messages/index';

const registerListeners = (app: App) => {
  // actions.register(app);
  // commands.register(app);
  events.register(app);
  messages.register(app);
  // shortcuts.register(app);
  // views.register(app);
};

export default registerListeners;
