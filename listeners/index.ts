import { App } from '@slack/bolt';
import actions from './actions/index';
import commands from './commands/index';
import events from './events/index';
import messages from './messages/index';
import shortcuts from './shortcuts/index';
import views from './views/index';

const registerListeners = (app: App) => {
  actions.register(app);
  commands.register(app);
  events.register(app);
  messages.register(app);
  shortcuts.register(app);
  views.register(app);
};

export default registerListeners;
