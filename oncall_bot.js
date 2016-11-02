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
var cacheInterval = 3600; // 1 hour

var PagerDuty = require('./pagerduty.js');
var pagerDuty = new PagerDuty(config.get('pagerduty'));

// create a bot
var bot = new SlackBot({
  token: config.get('slack.slack_token'), // Add a bot https://my.slack.com/services/new/bot and put the token
  name: config.get('slack.bot_name')
});
var iconEmoji = config.get('slack.emoji');
/**
 * Send a message to the oncall people.
 *
 * @param message
 */
var messageOnCalls = function (message) {
  getOnCallSlackers(function (slackers) {
    _.each(slackers, function (slacker) {
      debug('POST MESSAGE TO: ' + slacker);
      bot.postMessageToUser(slacker, message, {icon_emoji: iconEmoji});
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
      usersToMention += '<@' + slacker + '> ';
    });
    bot.postMessageToChannel(channel, usersToMention.trim() + ', ' + message, {icon_emoji: iconEmoji});
  });

};
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
      cacheChannels(getChannel(channelId, callback));
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
      cacheUsers(getUser(email, callback));
    } else {

      var member = _.find(userObj.members, function (member) {
        return member.profile.email == email
      });
      callback(member);
    }
  });
};

var getOnCallSlackers = function (callback) {
  var oncallSlackers = [];
  pagerDuty.getOnCalls(null, function (err, pdUsers) {
    _.each(pdUsers, function (pdUser, i) {
      getUser(pdUser.user.email, function (slacker) {
        oncallSlackers.push(slacker.name);
      });
    });
    callback(oncallSlackers);
  })
};

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
  ], function (err, results) {
    messageOnCalls(config.get('slack.welcome_message'));
  });
});

bot.on('message', function (data) {
    // all ingoing events https://api.slack.com/rtm
    botUser = '<@' + bot.self.id + '>';
    if (data.type == 'message') {
      botIndex = data.text.indexOf(botUser);
      if (data.bot_id == undefined && botIndex >= -1) {
        getChannel(data.channel, function (channel) {
          if (data.text == botUser) {
            mentionOnCalls(channel.name, "get in here :point_up_2:");
          } else {
            preText = ' _<@' + data.user + '> said "';
            if(botIndex == 0) {
              mentionOnCalls(channel.name, preText + data.text.substr(botIndex, botUser.length) + '_ "');
            } else {
              mentionOnCalls(channel.name, preText + data.text + '_ "');
            }
          }
        });
      }
    }
    debug(data);
  }
);
