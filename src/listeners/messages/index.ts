import { App } from '@slack/bolt';
import oncallMentionedCallback from './oncall-mentioned';
import { oncallMap } from '@api/pd';

const register = (app: App) => {
  // This regex matches any string that contains a mention of any of the oncall shortnames.
  // Updating the config requires a restart of the service.
  const allShortnamesRegex = new RegExp(`.*@(${Object.keys(oncallMap).join('|')})\\b.*`);
  console.log("**** allShortnamesRegex", allShortnamesRegex);
  app.message(allShortnamesRegex, oncallMentionedCallback);
};

export default { register };
