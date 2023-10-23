/**
 * OnCall #slack bot that integrates with PagerDuty
 */

// Run a dry run without sending any actual messages.
const DEBUG_RUN = process.env.DEBUG_RUN || false;
export { DEBUG_RUN };

import PagerDuty from "./pagerduty.js";
import config from "config";
import async from "async";
import { handle_version_cmd } from "./version.js";
import dbg from "debug";
import _ from "underscore";
import NodeCache from "node-cache";
import SlackData, { bot } from "./slack/data.js";

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

const slackdata = new SlackData();

const getOnCallSlackers = (callback) => {
  var oncallSlackers = [];
  var oncallSlackerNames = [];
  debug("pre pagerduty.getOnCalls");
  pagerDuty.getOnCalls(null, (err, pdUsers) => {
    debug("getOncalls callback");
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
  getOnCallSlackers((slackers) => {
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
  getOnCallSlackers((slackers) => {
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
  getOnCallSlackers((slackers) => {
    debug("got oncalls", slackers);
    _.each(slackers, (slacker) => {
      usersToMention += "<@" + (testUser || slacker) + "> ";
    });
    var message = " " + usersToMention.trim() + " " + postMessage;
    if (DEBUG_RUN) {
      // dry run
    } else if (direct) {
      bot.postMessageToUser(obj, message, { icon_emoji: iconEmoji });
    } else {
      bot.postMessage(obj, message, { icon_emoji: iconEmoji });
    }
  });
};

/**
 * Get the channels and cache 'em
 *
 * @param callback
 */
var cacheChannels = (callback) => {
  debug("Caching channels");
  bot.getChannels().then((data) => {
    async.each(
      data,
      (channel, cb) => {
        // debug("channel: " , channel);
        cb();
      },
      (err) => {
        if (err) {
          debug("err", err);
        } else {
          cache.set("channels", data, cacheInterval, callback);
        }
      }
    );
  });
};

/**
 * Get a channel by id
 *
 * @param channelId
 * @param callback
 */
var getChannel = (channelId, callback) => {
  debug("getting cached channels");
  cache.get("channels", (err, channelObj) => {
    if (err) {
      debug("err:", err);
    }
    if (channelObj == undefined) {
      debug("undefined channels object");
      const cb = (err, results) => {
        if (err) {
          debug("err:", err);
        }
        getChannel(channelId, callback);
      };

      cacheChannels(cb);
    } else {
      debug("finding channel");
      var channel = _.find(channelObj.channels, (channel) => {
        return channel.id == channelId;
      });
      callback(channel);
    }
  });
};

/**
 *  Start the bot
 */
bot.on("start", () => {
  async.series([
    (callback) => {
      cacheChannels(callback);
    },
    (callback) => {
      getOnCallSlackers(callback);
    },
  ]);
});

bot.on("message", (data) => {
  handle_message(data);
});

const handle_channel_message = (message_data) => {
  debug("public channel interaction");
  var message = message_data.text ? message_data.text.trim() : "";
  getChannel(message_data.channel, (channel) => {
    debug("got channel", channel);
    if (channel) {
      debug("channel", channel);
      if (message.match(new RegExp("^" + botTag + ":? who$"))) {
        debug("who command");
        // who command
        postMessage(message_data.channel, "", "are the humans OnCall.", false);
      } else if (message.match(new RegExp("^" + botTag + ":?$"))) {
        // need to support mobile which adds : after a mention
        mentionOnCalls(channel.name, "get in here! :point_up_2:");
      } else {
        // default
        let preText =
          (message_data.user ? " <@" + message_data.user + ">" : botTag) +
          ' said _"';
        if (botTagIndex == 0) {
          mentionOnCalls(
            channel.name,
            preText + message.substr(botTag.length + 1) + '_"'
          );
        } else if (message_data.user || enableBotBotComm) {
          message = message.replace(/^<@(.*?)> +/, ""); // clean up spacing
          mentionOnCalls(channel.name, preText + message + '_"');
        }
      }
    }
  });
};

const handle_dm = (message_data) => {
  debug("no channel, expecting this to be a DM");
  var message = message_data.text ? message_data.text.trim() : "";
  getChannel(message_data.channel, (channel) => {
    debug("channel", channel, "should be 'undefined' (DM)");
    if (!channel) {
      slackdata.getUser(FIND_BY_ID, message_data.user, (err, user) => {
        if (err) {
          debug("err", err);
        } else {
          handle_version_cmd(bot, user, message);
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
    }
  });
};

const handle_message = (message_data) => {
  // subscription for all incoming events https://api.slack.com/rtm
  if (message_data.type != "message") {
    // we don't care about everything else
    return;
  }
  var isBot = message_data.bot_id != undefined;
  if (isBot) {
    // don't handle bot-bot communication
    debug("bot message, skipping");
    return;
  }

  debug("message", message_data.type, message_data);

  var botTag = "<@" + bot.self.id + ">";
  var message = message_data.text ? message_data.text.trim() : "";
  var botTagIndex = message.indexOf(botTag);

  // the bot may have been mentioned by username (not id). check if that's the case
  var username = "";
  var enableBotBotComm = false;
  if (botTagIndex <= 0 && message.indexOf("<@") == 0) {
    var userNameData = message.match(/^<@(.*?)>/g);
    username = userNameData && userNameData[0].replace(/[<@>]/g, "");
    slackdata.getUser(FIND_BY_NAME, username, (err, user) => {
      if (user && user.is_bot) {
        botTag = "<@" + user.id + ">";
        enableBotBotComm = true;
      }
    });
  }

  // handle non-DM channel interaction
  if (botTagIndex >= 0 || enableBotBotComm) {
    handle_channel_message(message_data);
  }
  // handle direct bot interaction
  else {
    handle_dm(message_data);
  }
};
