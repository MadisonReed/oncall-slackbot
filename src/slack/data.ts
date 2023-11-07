import _ from "underscore";
import async from "async";
import config from "config";
import dbg from "debug";
import NodeCache from "node-cache";
import Bot from "slack-bot-api";

const debug = dbg("slackdata");

export interface SlackUser {
  id: string;
  name: string;
}

// getUser constants
export const FIND_BY_ID = 0;
export const FIND_BY_EMAIL = 1;
export const FIND_BY_NAME = 2;

export default class SlackData {
  bot: Bot;
  cache: NodeCache;
  cacheInterval: number;

  constructor(slackbot: Bot) {
    debug("oncall service constructor");
    this.bot = slackbot;
    this.cache = new NodeCache();
    this.cacheInterval = config.get("slack.cache_interval_seconds");
  }

  warmCaches() {
    debug("warming caches");
    this.cacheUsers();
    this.cacheChannels(() => { });
  }

  /**
   * Just get the users.
   *
   * @param findBy  constant to use for searching
   * @param value value to search by
   * @param callback
   */
  getUser = async (findBy: number, value: string = ""): Promise<SlackUser> => {
    const self = this;
    debug("getting user by", findBy, value);
    if (findBy == FIND_BY_EMAIL && value.trim().indexOf("@") > 0) {
      debug("getting by email");
      const users = self.cache.get("users");
      debug("got users from cache");
      if (users == undefined) {
        debug("no cache yet, warming");
        await self.cacheUsers();
        return await self.getUser(findBy, value);
      } else {
        let member = undefined;

        if (findBy == FIND_BY_EMAIL) {
          member = _.find(users.members, (member) => {
            return member.profile.email == value.trim();
          });
        }
        return member;
      }
    } else if (findBy == FIND_BY_ID && value.trim().indexOf("U") == 0) {
      const user = self.cache.get("ID:" + value.trim());
      if (user == undefined) {
        await self.cacheUsers();
        return await self.getUser(findBy, value);
      } else {
        return user;
      }
    } else if (findBy == FIND_BY_NAME && !(value.trim().indexOf("U") == 0)) {
      const user = self.cache.get(value.trim());
      if (user == undefined) {
        await self.cacheUsers();
        return await self.getUser(findBy, value);
      } else {
        return user;
      }
    } else {
      throw new Error(`findby ${findBy} and value ${value} not matching any known combination`);
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
          debug("comparing", channel.id, "to", channelId);
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
  cacheUsers = async () => {
    const self = this;
    debug("caching users");
    const users = await self.bot.getUsers();
    debug("got", users.members.length, "users");
    for (const user of users.members) {
      const individualResults = await Promise.all([
        self.cache.set(user.name, user, self.cacheInterval),
        self.cache.set("ID:" + user.id, user, self.cacheInterval),
      ]);
      if (!individualResults.every(Boolean)) {
        debug("failed to set user cache");
      }
    }
    return self.cache.set("users", users, self.cacheInterval);
  };

  /**
   * Get the channels and cache 'em
   *
   * @param callback
   */
  cacheChannels = (callback) => {
    const self = this;
    debug("Caching channels");
    this.bot.getChannels().then((data) => {
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
