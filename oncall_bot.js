/**
 * OnCall #slack bot that integrates with PagerDuty
 *
 * TODO notify all the channels that have invited the bot that there might have been a change in command
 *
 */

var config = require('config');
var async = require('async');
var debug = require('debug')('oncall_bot');
var _ = require('underscore');

var SlackBot = require('slackbots');

const NodeCache = require("node-cache");
var cache = new NodeCache();
var cacheInterval = config.get("slack.cache_interval_seconds");
var nextInQueueInterval = config.get("slack.next_in_queue_interval");

var PagerDuty = require('./pagerduty.js');
var pagerDuty = new PagerDuty(config.get('pagerduty'));

// create a bot
var bot = new SlackBot({
  token: config.get('slack.slack_token'), // Add a bot https://my.slack.com/services/new/bot and put the token
  name: config.get('slack.bot_name')
});
var iconEmoji = config.get('slack.emoji');
var testUser = config.get('slack.test_user');

/**
 * Send a message to the oncall people.
 *
 * @param message
 */
var messageOnCalls = function (message) {
  getOnCallSlackers(function (slackers) {
    _.each(slackers, function (slacker) {
      debug('POST MESSAGE TO: ' + slacker);
      bot.postMessageToUser(testUser || slacker, message, {icon_emoji: iconEmoji});
    })
  });
};

/**
 * Mention oncall people in a channel.
 *
 * @param channel
 * @param message
 */
var mentionOnCalls = function (channel, message) {
  var usersToMention = '';
  getOnCallSlackers(function (slackers) {
    _.each(slackers, function (slacker) {
      debug('MENTION USER: ' + slacker);
      usersToMention += '<@' + (testUser || slacker) + '> ';
    });
    bot.postMessageToChannel(channel, usersToMention.trim() + ', ' + message, {icon_emoji: iconEmoji});
  });
};

var postMessage = function (obj, preMessage, postMessage) {
  var usersToMention = '';
  getOnCallSlackers(function (slackers) {
    _.each(slackers, function (slacker) {
      debug('MENTION USER: ' + slacker);
      usersToMention += '<@' + (testUser || slacker) + '> ';
    });
    bot.postMessage(obj, preMessage + ' ' + usersToMention.trim() + ' ' + postMessage, {icon_emoji: iconEmoji});
  });

}

/**
 * Get the channels and cache 'em
 *
 * @param callback
 */
var cacheChannels = function (callback) {
  bot.getChannels().then(function (data) {
    debug("Caching channels");
    cache.set('channels', data, cacheInterval, callback);
  });
};

/**
 * Get a channel by id
 *
 * @param channelId
 * @param callback
 */
var getChannel = function (channelId, callback) {
  cache.get('channels', function (err, channelObj) {
    if (channelObj == undefined) {
      cb = function (err, results) {
        getChannel(channelId, callback);
      };

      cacheChannels(cb);
    } else {
      var channel = _.find(channelObj.channels, function (channel) {
        return channel.id == channelId;
      });
      callback(channel);
    }
  });
};

/**
 * Get the users and cache 'em.
 *
 * @param callback
 */
var cacheUsers = function (callback) {
  bot.getUsers().then(function (data) {
    debug("Caching users");
    cache.set('users', data, cacheInterval, callback);
  });
};

/**
 * Just get the users.
 *
 * @param callback
 */
var getUser = function (email, callback) {
  cache.get('users', function (err, userObj) {
    if (userObj == undefined) {
      cb = function (err, results) {
        getUser(email, callback);
      };

      cacheUsers(cb);
    } else {
      var member = _.find(userObj.members, function (member) {
        return member.profile.email == email
      });
      callback(member);
    }
  });
};

/**
 * Return who's on call.
 *
 * @param callback
 */
var getOnCallSlackers = function (callback) {
  var oncallSlackers = [];
  pagerDuty.getOnCalls(null, function (err, pdUsers) {

    async.each(pdUsers, function (pdUser, cb) {
      getUser(pdUser.user.email, function (slacker) {
        oncallSlackers.push(slacker.name);
        cb();
      });
    }, function (err) {
      if (err) {
        debug(err);
      } else {
        callback(oncallSlackers);
      }
    });
  })
};

/**
 * TBD
 * @param channel
 * @param user
 * @param callback
 */
var storeMention = function (channel, user, callback) {

};

/**
 * TBD
 * @param channel
 * @param user
 * @param callback
 */
var clearStoredMention = function (channel, user, callback) {

};

/**
 *  Start the bot
 */
bot.on('start', function () {

  async.series([
    function (callback) {
      cacheUsers(callback);
    },
    function (callback) {
      cacheChannels(callback);
    },
    function (callback) {
      getOnCallSlackers(callback);
    }
  ], function () {
    var msg = config.get('slack.welcome_message').trim();
    if (msg.length > 0) {
      messageOnCalls(config.get('slack.welcome_message'));
    }
  });
});

bot.on('message', function (data) {
    // all ingoing events https://api.slack.com/rtm
    var botUser = '<@' + bot.self.id + '>';
    if (data.type == 'message') {
      var message = data.text.trim();
      var botIndex = data.text.indexOf(botUser);

      if (data.bot_id == undefined && botIndex >= 0) {
        getChannel(data.channel, function (channel) {

          if (message.match(new RegExp('^' + botUser + ':? who$'))) { // who command
            postMessage(data.channel, 'These humans', 'are OnCall');
          }
          else if (message.match(new RegExp('^' + botUser + ':?'))) { // need to support mobile which adds : after a mention
            mentionOnCalls(channel.name, "get in here :point_up_2:");
          }
          else {
            preText = ' _<@' + data.user + '> said "';
            if (botIndex == 0) {
              mentionOnCalls(channel.name, preText + message.substr(botUser.length + 1) + '_"');
            } else {
              mentionOnCalls(channel.name, preText + message + '_"');
            }
          }
        });
      } else if (data.bot_id == undefined && data.team == bot.team.id) {
        if (message.match(new RegExp('^who$'))) { // who command
          postMessage(data.user, 'These humans', 'are OnCall');
        }
      }
    }
    debug(data);
  }
);
