import SlackBot from "slackbots";
import _ from "underscore";
import async from "async";
import config from "config";
import dbg from "debug";
import NodeCache from "node-cache";

const debug = dbg("slackdata");

// getUser constants
const FIND_BY_ID = 0;
const FIND_BY_EMAIL = 1;
const FIND_BY_NAME = 2;


export const bot = new SlackBot({
  token: config.get("slack.slack_token"), // Add a bot https://my.slack.com/services/new/bot and put the token
  name: config.get("slack.bot_name"),
});

export default class SlackData {
  constructor() {
    debug("oncall service constructor");
    this.cache = new NodeCache();
    this.cacheInterval = config.get("slack.cache_interval_seconds");
  }

  async warmCaches(){
    debug("warming caches");
    this.cacheUsers(() => {});
    this.cacheChannels(() => {});
  }


  /**
   * Just get the users.
   *
   * @param findBy  constant to use for searching
   * @param value value to search by
   * @param callback
   */
  getUser = (findBy, value = "", callback) => {
    const self = this;
    debug("getting user by", findBy, value);
    if (findBy == FIND_BY_EMAIL && value.indexOf("@") > 0) {
      self.cache.get("users", (err, userObj) => {
        if (userObj == undefined) {
          const cb = (err, results) => {
            if (err){
              debug("err", err);
            }
            self.getUser(findBy, value, callback);
          };

          self.cacheUsers(cb);
        } else {
          var member = undefined;

          if (findBy == FIND_BY_EMAIL) {
            member = _.find(userObj.members, (member) => {
              return member.profile.email == value;
            });
          }
          callback(!member ? value + " not mapped to user" : null, member);
        }
      });
    } else if (findBy == FIND_BY_ID && value.indexOf("U") == 0) {
      self.cache.get("ID:" + value, (err, userObj) => {
        if (err){
          debug("err", err);
        }
        if (userObj == undefined) {
          const cb = (err, results) => {
            if (err){
              debug("err", err);
            }
            self.getUser(findBy, value, callback);
          };

          self.cacheUsers(cb);
        } else {
          callback(!userObj ? value + " not mapped to user" : null, userObj);
        }
      });
    } else if (findBy == FIND_BY_NAME && !(value.indexOf("U") == 0)) {
      self.cache.get(value, (err, userObj) => {
        if (err){
          debug("err", err);
        }
        if (userObj == undefined) {
          cb = (err, results) => {
            if (err){
              debug("err", err);
            }
            self.getUser(findBy, value, callback);
          };

          self.cacheUsers(cb);
        } else {
          callback(!userObj ? value + " not mapped to user" : null, userObj);
        }
      });
    }
  };

  /**
   * Get a channel by id
   *
   * @param channelId
   * @param callback
   */
  getChannel = (channelId, callback) => {
    const self = this;
    debug("getting cached channels");
    self.cache.get("channels", (err, channelObj) => {
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

        self.cacheChannels(cb);
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
   * Get the users and cache 'em.
   *
   * @param callback
   */
  cacheUsers = (callback) => {
    const self = this;
    debug("caching users");
    bot
      .getUsers()
      .then((data) => {
        debug("got", data.members.length, "users");
        async.each(
          data.members,
          (user, each_cb) => {
            // debug("Caching user name/id: " + user.name);

            async.parallel(
              [
                (cb) => {
                  self.cache.set(user.name, user, self.cacheInterval, cb);
                },
                (cb) => {
                  self.cache.set("ID:" + user.id, user, self.cacheInterval, cb);
                },
              ],
              each_cb
            );
          },
          (err) => {
            if (err) {
              debug("err", err);
              callback(err);
            } else {
              callback(self.cache.set("users", data, self.cacheInterval));
            }
          }
        );
      })
      .catch((err) => {
        debug("err from cacheUsers", err);
      });
  };

  /**
   * Get the channels and cache 'em
   *
   * @param callback
   */
  cacheChannels = (callback) => {
    const self = this;
    debug("Caching channels");
    bot.getChannels().then((data) => {
      async.each(
        data,
        (_channel, cb) => {
          cb();
        },
        (err) => {
          if (err) {
            debug("err", err);
          } else {
            self.cache.set("channels", data, self.cacheInterval, callback);
          }
        }
      );
    });
  };
}
