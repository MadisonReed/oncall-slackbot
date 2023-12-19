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
import { handleLsCmd } from "./ls.ts";
import { SlackChannel, MessageData } from "./slack/types.ts";
import SlackData, {
  SlackUser,
  FIND_BY_ID,
  FIND_BY_EMAIL,
} from "./slack/data.ts";
import { handleOncallMention } from "./slack/message.ts";

const FORBIDDEN_MESSAGES = ["has joined the channel"];

const debug = dbg("oncall_bot");
const config: BotConfig = jsonConfig as BotConfig;

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
var mentionOnCalls = (channel: string, message: string) => {
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
 * @param name the slack name of the recipient
 * @param preMessage
 * @param postMessage
 * @param direct
 */
const postMessage = (name: string, postMessage: string, direct: boolean) => {
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
      bot.postMessageToUser(name, message, { icon_emoji: iconEmoji });
    } else {
      bot.postMessage(name, message, { icon_emoji: iconEmoji });
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

bot.on("message", async (data: MessageData) => {
  await handleMessage(data);
});

const handleMessage = async (message_data: MessageData) => {
  // subscription for all incoming events https://api.slack.com/rtm
  //
  if (message_data.type != "message") {
    // we don't care about everything else
    return;
  }
  var isBot = message_data.bot_id != undefined;
  debug("message:", message_data);
  if (
    isBot &&
    !config.slack.allowed_response_bots.includes(message_data.bot_id)
  ) {
    // don't handle bot-bot communication or messages coming from this bot unless
    // it is from an explicitly allowed bot
    debug("bot message, skipping");
    return;
  }

  debug("message", message_data);

  var message = message_data.text ? message_data.text.trim() : "";
  var botTagIndex = message.indexOf(bot_tag());

  const channel = await slackdata.getChannel(message_data.channel);
  debug("got channel", channel);
  // handle non-DM channel interaction
  if (botTagIndex >= 0) {
    // first handle mentions of the bot itself
    // (bot commands)
    await handleBotCommands(channel, message_data);
  } else if (channel) {
    // handle non-mentions in channels with the bot
    // including mentions of other oncalls
    handleChannelMessage(channel, message_data);
  } else {
    // handle DMs with the bot
    handleDm(message_data);
  }
};

const handleChannelMessage = async (
  channel: SlackChannel,
  message_data: MessageData
) => {
  let message: string = message_data.text ? message_data.text.trim() : "";
  if (message_data.blocks) {
    message += " " + JSON.stringify(message_data.blocks);
  }
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

const handleBotCommands = async (
  channel: SlackChannel,
  message_data: MessageData
) => {
  debug("public channel interaction");
  var message = message_data.text ? message_data.text.trim() : "";
  if (channel) {
    debug("channel", channel);

    // If the message contains any forbidden text, skip it
    if (FORBIDDEN_MESSAGES.some((m) => message.includes(m))) {
      debug(
        `forbidden message in channel ${channel.name} and message ${message}, skipping`
      );
      return;
    }

    if (
      handleVersionCmd(
        bot,
        message_data.channel,
        null,
        message,
        message_data.thread_ts || message_data.ts
      )
    ) {
      debug("version cmd");
    } else if (
      await handleLsCmd(
        await getOncallSlackers(),
        bot,
        message_data.channel,
        null,
        message,
        message_data.thread_ts || message_data.ts
      )
    ) {
      debug("ls cmd");
    } else if (message.match(new RegExp("^" + bot_tag() + ":? who$"))) {
      debug("who command");
      // who command
      postMessage(message_data.channel, "are the humans OnCall.", false);
    } else if (
      // need to support mobile which adds : after a mention
      message.match(new RegExp("^" + bot_tag() + ":?$"))
    ) {
      debug("bot mention only");
      // This is an explicit mention of the bot only.
      mentionOnCalls(channel.name, "get in here! :point_up_2:");
    } else {
      debug("oncall tag mention");
      // default
      let preText =
        (message_data.user ? " <@" + message_data.user + ">" : bot_tag()) +
        ' said _"';
      mentionOnCalls(
        channel.name,
        preText + message.substring(bot_tag().length + 1) + '_"'
      );
    }
  }
};

const handleDm = (message_data: MessageData) => {
  debug("handleDm");
  var message = message_data.text ? message_data.text.trim() : "";
  slackdata.getUser(FIND_BY_ID, message_data.user as string).then((user) => {
    if (handleVersionCmd(bot, null, user, message)) {
      debug("version cmd");
    } else if (message.match(WHO_REGEX)) {
      // handle_who_cmd(bot, user, message);
      debug("who message");
      postMessage(user.name, "are the humans OnCall.", true);
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
