/*jslint node: true */
/*globals module: true */

var oncallsParams = {
  time_zone: "UTC",
  "include[]": "users",
};

import querystring from "querystring";
import dbg from "debug";
import NodeCache from "node-cache";

const debug = dbg("pagerduty");

export interface PdUser {
  name: string;
  email: string;
  id: string;
}

interface PdSchedule {
  id: string;
}

export interface PdOncallResult {
  user: PdUser;
  schedule: PdSchedule;
}

/**
 * params object:
 *   domain: String (required)
 *   token: String (required)
 *
 **/
class PagerDuty {
  constructor(options) {
    this.headers = {
      Accept: "application/vnd.pagerduty+json;version=2",
      "Content-Type": "application/json",
      Authorization: "Token token=" + options.pagerduty_token,
    };
    this.endpoint = "https://api.pagerduty.com";
    this.cache = new NodeCache();
    this.token = options.pagerduty_token;
    this.cacheInterval = options.cache_interval_seconds;
  }

  async getAllPaginatedData(options): void {
    debug("getAllPaginatedData");
    options.params = options.params || {};
    options.params.limit = 100; // 100 is the max limit allowed by pagerduty
    options.params.offset = 0;

    var total = null,
      items: PdOncallResult[] = [],
      self = this,
      requestOptions = {
        headers: self.headers,
      };

    var pagedCallback = async (error, content) => {
      if (error) {
        debug("Issues with pagedCallback: " + error);
        return error;
      }

      if (!content || !content[options.contentIndex]) {
        error = "Page does not have valid data: " + JSON.stringify(content);
        debug(error);
        return error;
      }

      if (content[options.contentIndex].length > 0) {
        items = items.concat(content[options.contentIndex]);
      }

      options.params.offset = content.offset + content.limit; // Update the offset for the next paging request
      total = content.total;

      // Index the results as a map from id: item
      if (options.sortBy) {
        items.sort(function (a, b) {
          return a[options.sortBy] - b[options.sortBy];
        });
      }

      items = items.filter((item, _i) => {
        let index = item.id || item[options.secondaryIndex].id;
        // only add oncalls with a schedule
        return item.schedule || false;
      });

      if (options.params.offset >= total) {
        return items;
      } else {
        await requestAnotherPage();
      }
    };

    var requestAnotherPage = async () => {
      debug("requesting another page");
      // must use node's built in querystring since qs doesn't build arrays like PagerDuty expects.
      requestOptions.url =
        self.endpoint +
        options.uri +
        "?" +
        querystring.stringify(options.params);

      const response = await fetch(requestOptions.url, requestOptions);
      if (!response.ok) {
        return await pagedCallback(response);
      } else {
        return await pagedCallback(null, await response.json());
      }
    };

    return await requestAnotherPage();
  }

  async getOnCalls(params): Promise<PdOncallResult[]> {
    debug("pagerduty.getOnCalls");
    var options = {
      contentIndex: "oncalls",
      secondaryIndex: "user",
      uri: "/oncalls",
      params: params || oncallsParams,
    };
    let oncalls = this.cache.get(options.contentIndex);
    if (oncalls == undefined) {
      oncalls = this.getAllPaginatedData(options);
    }
    this.cache.set(options.contentIndex, oncalls, this.cacheInterval);
    Bun.write("/tmp/bun_out", JSON.stringify(oncalls));
    return oncalls;
  }
}

export default PagerDuty;
