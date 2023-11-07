/**
 * OnCall #slack bot that integrates with PagerDuty
 */

// Run a dry run without sending any actual messages.
const DEBUG_RUN = process.env.DEBUG_RUN || false;
export { DEBUG_RUN };

import jsonConfig from "config";
import dbg from "debug";
import PagerDuty, { PdOncallResult } from "./pagerduty.ts";
import { BotConfig, OncallSlackUser } from "./types.ts";
import { bot, bot_tag } from "./slack/bot.ts";
import { handleVersionCmd } from "./version.ts";
import { SlackChannel } from "./slack/types.ts";
import SlackData, {
  SlackUser,
  FIND_BY_ID,
  FIND_BY_EMAIL,
} from "./slack/data.ts";
import { handleOncallMention } from "./slack/message.ts";

const debug = dbg("oncall_bot");
const config: BotConfig = jsonConfig;

type standardCallback = (
  err?: Error | null | undefined,
  result?: unknown
) => void;

// get pagerduty integration
const pagerDuty = new PagerDuty(config.get("pagerduty"));

// create a bot
const iconEmoji = config.slack.emoji;
const testUser = config.get("slack.test_user");

// commands
const HELP_REGEX = new RegExp("^[hH]elp$");
const WHO_REGEX = new RegExp("^[wW]ho$");

const slackdata = new SlackData(bot);

const getOncallSlackers = async () => {
  debug("getting oncall slack users");
  var oncallSlackers: OncallSlackUser[] = [];
  var oncallSlackerNames: string[] = [];
  debug("pre pagerduty.getOnCalls");
  const pdUsers: PdOncallResult[] = await pagerDuty.getOnCalls(null);
  debug("getOncalls callback");
  for (const pdUser of pdUsers) {
    if (pdUser.user.name == undefined) {
      debug("...", pdUser);
    } else {
      const slackUser: SlackUser = await slackdata.getUser(
        FIND_BY_EMAIL,
        pdUser.user.email
      );
      if (!slackUser) {
        debug("user doesn't have a slack id");
      } else {
        oncallSlackers.push(
          new OncallSlackUser(
            pdUser.user.name,
            pdUser.user.email,
            pdUser.user.id,
            pdUser.schedule.id,
            slackUser.id
          )
        );
        oncallSlackerNames.push(slackUser.name);
      }
    }
  }
  return oncallSlackers;
};

/**
 * Send a message to the oncall people.
 *
 * @param message
 */
var messageOnCalls = async (message: string) => {
  const oncallUsers = await getOncallSlackers();
  oncallUsers.forEach((slacker: OncallSlackUser) => {
    debug("POST MESSAGE TO: " + slacker, message);
    if (DEBUG_RUN) {
      // don't send message
      debug("would send message to oncalls");
    } else {
      bot.postMessageToUser(testUser || slacker.slackId, message, {
        icon_emoji: iconEmoji,
      });
    }
  });
};

/**
 * Mention oncall people in a channel.
 *
 * @param channel
 * @param message
 */
var mentionOnCalls = (channel, message: string) => {
  debug("mentionOnCalls");
  var usersToMention = "";
  getOncallSlackers().then((oncallUsers) => {
    debug("got oncalls", oncallUsers);
    oncallUsers.forEach((slacker: OncallSlackUser) => {
      usersToMention += "<@" + (testUser || slacker.slackId) + "> ";
    });
    if (DEBUG_RUN) {
      // don't send message
    } else {
      bot.postMessageToChannel(
        channel,
        usersToMention.trim() + ", " + message,
        {
          icon_emoji: iconEmoji,
        }
      );
    }
  });
};

/**
 * Post message with reference to oncall peeps
 *
 * @param obj
 * @param preMessage
 * @param postMessage
 * @param direct
 */
const postMessage = (obj, preMessage, postMessage, direct) => {
  var usersToMention = "";
  debug("getting oncalls");
  getOncallSlackers().then((oncallUsers) => {
    debug(
      "got oncalls",
      oncallUsers.map((s: OncallSlackUser) => (s.name, s.slackId))
    );
    oncallUsers.forEach((slacker: OncallSlackUser) => {
      usersToMention += "<@" + (testUser || slacker.slackId) + "> ";
    });
    var message = " " + usersToMention.trim() + " " + postMessage;
    if (DEBUG_RUN) {
      // dry run
      debug("would post to user", message);
    } else if (direct) {
      bot.postMessageToUser(obj, message, { icon_emoji: iconEmoji });
    } else {
      bot.postMessage(obj, message, { icon_emoji: iconEmoji });
    }
  });
};

/**
 *  Start the bot
 */
bot.on("start", () => {
  slackdata.warmCaches();
  getOncallSlackers();
});

bot.on("message", (data) => {
  handleMessage(data);
});

const handleMessage = (message_data) => {
  // subscription for all incoming events https://api.slack.com/rtm
  //
  if (message_data.type != "message") {
    // we don't care about everything else
    return;
  }
  var isBot = message_data.bot_id != undefined;
  if (isBot) {
    // don't handle bot-bot communication or messages coming from this bot
    debug("bot message, skipping");
    return;
  }

  debug("message", message_data);

  var message = message_data.text ? message_data.text.trim() : "";
  var botTagIndex = message.indexOf(bot_tag());

  slackdata.getChannel(message_data.channel, (channel) => {
    debug("got channel", channel);
    // handle non-DM channel interaction
    if (botTagIndex >= 0) {
      // first handle mentions of the bot itself
      // (bot commands)
      handleBotCommands(channel, message_data);
    } else if (channel) {
      // handle non-mentions in channels with the bot
      // including mentions of other oncalls
      handleChannelMessage(channel, message_data);
    } else {
      // handle DMs with the bot
      handleDm(message_data);
    }
  });
};

const handleChannelMessage = async (channel: SlackChannel, message_data) => {
  let message: string = message_data.text ? message_data.text.trim() : "";
  debug(channel);
  debug("message", message_data);

  const oncallUsers = await getOncallSlackers();
  handleOncallMention(
    oncallUsers,
    channel,
    message,
    message_data.thread_ts || message_data.ts
  );
};

const handleBotCommands = (channel, message_data) => {
  debug("public channel interaction");
  var message = message_data.text ? message_data.text.trim() : "";
  if (channel) {
    debug("channel", channel);
    if (handleVersionCmd(bot, message_data.channel, null, message)) {
      debug("version cmd");
    } else if (message.match(new RegExp("^" + bot_tag() + ":? who$"))) {
      debug("who command");
      // who command
      postMessage(message_data.channel, "", "are the humans OnCall.", false);
    } else if (message.match(new RegExp("^" + bot_tag() + ":?$"))) {
      // need to support mobile which adds : after a mention
      mentionOnCalls(channel.name, "get in here! :point_up_2:");
    } else {
      // default
      let preText =
        (message_data.user ? " <@" + message_data.user + ">" : bot_tag()) +
        ' said _"';
      mentionOnCalls(
        channel.name,
        preText + message.substr(bot_tag().length + 1) + '_"'
      );
    }
  }
};

const handleDm = (message_data) => {
  debug("handleDm");
  var message = message_data.text ? message_data.text.trim() : "";
  slackdata.getUser(FIND_BY_ID, message_data.user).then((user) => {
    if (handleVersionCmd(bot, null, user, message)) {
      debug("version cmd");
    } else if (message.match(WHO_REGEX)) {
      // handle_who_cmd(bot, user, message);
      debug("who message");
      postMessage(user.name, "", "are the humans OnCall.", true);
    } else if (message.match(HELP_REGEX)) {
      // help command
      if (DEBUG_RUN) {
        // don't send message
      } else {
        bot.postMessageToUser(
          user.name,
          "I understand the following direct commands: *help*, *who* & *version*.",
          { icon_emoji: iconEmoji }
        );
      }
    }
  });
};
