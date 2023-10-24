/**
 * OnCall #slack bot that integrates with PagerDuty
 */

// Run a dry run without sending any actual messages.
const DEBUG_RUN = process.env.DEBUG_RUN || false;
export { DEBUG_RUN };

import PagerDuty from "./pagerduty.js";
import config from "config";
import { bot, bot_tag } from "./slack/bot.js";
import async from "async";
import { handleVersionCmd } from "./version.js";
import dbg from "debug";
import _ from "underscore";
import NodeCache from "node-cache";
import SlackData from "./slack/data.js";
import { handleOncallMention } from "./slack/message.js";

const debug = dbg("oncall_bot");

const cache = new NodeCache();
const cacheInterval = config.get("slack.cache_interval_seconds");
const nextInQueueInterval = config.get("slack.next_in_queue_interval");

// get pagerduty integration
const pagerDuty = new PagerDuty(config.get("pagerduty"));

// create a bot
console.log("token:", config.get("slack.slack_token"));
const iconEmoji = config.get("slack.emoji");
const testUser = config.get("slack.test_user");

// getUser constants
const FIND_BY_ID = 0;
const FIND_BY_EMAIL = 1;
const FIND_BY_NAME = 2;

// commands
const HELP_REGEX = new RegExp("^[hH]elp$");
const WHO_REGEX = new RegExp("^[wW]ho$");

const slackdata = new SlackData(bot);

const getOncallSlackers = (callback) => {
  var oncallSlackers = [];
  var oncallSlackerNames = [];
  debug("pre pagerduty.getOnCalls");
  pagerDuty.getOnCalls(null, (err, pdUsers) => {
    debug("getOncalls callback");
    if (err){
      debug("err", err);
    }
    async.each(
      pdUsers,
      (pdUser, cb) => {
        if (pdUser.user.name == undefined) {
          debug("...", pdUser);
          cb();
        } else {
          slackdata.getUser(
            FIND_BY_EMAIL,
            pdUser.user.email,
            (err, slacker) => {
              if (err) {
                debug("err", err);
              } else if (!slacker) {
                debug("user doesn't have a slack id");
              } else {
                oncallSlackers.push(slacker.id);
                oncallSlackerNames.push(slacker.name);
              }
              cb();
            }
          );
        }
      },
      (err) => {
        if (err) {
          debug("err", err);
        } else {
          debug("got all oncalls:", oncallSlackerNames);
          callback(oncallSlackers);
        }
      }
    );
  });
};

/**
 * Send a message to the oncall people.
 *
 * @param message
 */
var messageOnCalls = (message) => {
  getOncallSlackers((slackers) => {
    _.each(slackers, (slacker) => {
      debug("POST MESSAGE TO: " + slacker, message);
      if (DEBUG_RUN) {
        // don't send message
      } else {
        bot.postMessageToUser(testUser || slacker, message, {
          icon_emoji: iconEmoji,
        });
      }
    });
  });
};

/**
 * Mention oncall people in a channel.
 *
 * @param channel
 * @param message
 */
var mentionOnCalls = (channel, message) => {
  var usersToMention = "";
  getOncallSlackers((slackers) => {
    _.each(slackers, (slacker) => {
      usersToMention += "<@" + (testUser || slacker) + "> ";
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
  getOncallSlackers((slackers) => {
    debug("got oncalls", slackers);
    _.each(slackers, (slacker) => {
      usersToMention += "<@" + (testUser || slacker) + "> ";
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
  async.series([
    (callback) => {
      getOncallSlackers(callback);
    },
  ]);
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

  debug("message", message_data.type, message_data);

  var message = message_data.text ? message_data.text.trim() : "";
  var botTagIndex = message.indexOf(bot_tag());

  slackdata.getChannel(message_data.channel, (channel) => {
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

const handleChannelMessage = (channel, message_data) =>{
  var message = message_data.text ? message_data.text.trim() : "";
  debug(message);
  handleOncallMention(['pesui'], message);
}

const handleBotCommands = (channel, message_data) => {
  debug("public channel interaction");
  var message = message_data.text ? message_data.text.trim() : "";
  debug("got channel", channel);
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
  var message = message_data.text ? message_data.text.trim() : "";
  slackdata.getUser(FIND_BY_ID, message_data.user, (err, user) => {
    if (err) {
      debug("err", err);
    } else {
      handleVersionCmd(bot, null, user, message);
      // handle_who_cmd(bot, user, message);
      if (message.match(WHO_REGEX)) {
        // who command
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
    }
  });
};
