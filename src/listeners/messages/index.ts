import { App } from '@slack/bolt';
import oncallMentionedCallback from './oncall-mentioned';
import { oncallMap } from '@api/pd';

const register = (app: App) => {
  const allShortnamesRegex = new RegExp(`.*@(${Object.keys(oncallMap).join('|')}).*`);
  console.log("allShortnamesRegex", allShortnamesRegex);
  app.message(allShortnamesRegex, oncallMentionedCallback);
};

export default { register };
