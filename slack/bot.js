import config from "config";
import SlackBot from "slackbots";

export const bot = new SlackBot({
  token: config.get("slack.slack_token"), // Add a bot https://my.slack.com/services/new/bot and put the token
  name: config.get("slack.bot_name"),
});

export let bot_tag = () => {
  return "<@" + bot.self.id + ">";
};
