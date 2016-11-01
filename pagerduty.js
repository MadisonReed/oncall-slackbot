/*jslint node: true */
/*globals module: true */

var oncallsParams = {
  time_zone: 'UTC',
  "include[]": 'users',
  "schedule_ids[]" : {}
};

//
var request = require('request');
var async = require('async');
var _ = require('underscore');
var querystring = require('querystring');
var debug = require('debug')('pagerduty');
const NodeCache = require( "node-cache" );

var cacheInterval = 300; // 5 minutes

/**
 * params object:
 *   domain: String (required)
 *   token: String (required)
 *
 **/
var PagerDuty = function (options) {
  this.headers = {'Content-Type': 'application/json', 'Authorization': 'Token token=' + options.pagerduty_token};
  this.endpoint = "https://api.pagerduty.com";
  this.cache = new NodeCache();
  oncallsParams["schedule_ids[]"] = options.schedule_ids;
  this.token = options.pagerduty_token;
};

PagerDuty.prototype.getAllPaginatedData = function (options) {
  options.params = options.params || {};
  options.params.limit = 100; // 100 is the max limit allowed by pagerduty
  options.params.offset = 0;

  var total = null,
    items = [],
    items_map = {},
    self = this,
    requestOptions = {
      headers: self.headers,
      json: true
    };

  var pagedCallback = function (error, content) {
    if (error) {
      debug("Issues with pagedCallback: " + error);
      return options.callback(error);
    }

    if (!content || !content[options.contentIndex]) {
      error = "Page does not have valid data: " + JSON.stringify(content);
      debug(error);
      return options.callback(new Error(error));
    }

    if (content[options.contentIndex].length > 0) {
      items = items.concat(content[options.contentIndex]);
    }

    options.params.offset = content.offset + content.limit; // Update the offset for the next paging request
    total = content.total;

    // Index the results as a map from id: item
    _.each(items, function(item, i) {
      items_map[item.id || item[options.secondaryIndex].id] = item;
    });

    if (options.params.offset >= total) {
      options.callback(error, items_map);
    } else {
      requestAnotherPage();
    }
  };

  var requestAnotherPage = function () {
    // must use node's built in querystring since qs doesn't build arrays like PagerDuty expects.
    requestOptions.url = self.endpoint + options.uri + "?" + querystring.stringify(options.params);

    request(requestOptions, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        pagedCallback(null, body);
      } else {
        pagedCallback(error);
      }
    });
  };

  requestAnotherPage();
};

PagerDuty.prototype.getOnCalls = function (params, callback) {
  var options = {contentIndex: "oncalls", secondaryIndex: 'user', uri: "/oncalls", callback: callback, params: params || oncallsParams };
  var self = this;
  async.auto({
    getCacheData: function(cb) {
      debug("getCacheData");
      self.cache.get(options.contentIndex, cb);
    },
    checkCacheData: ['getCacheData', function (results, cb) {
      debug("checkCacheData");
      if (results.getCacheData == undefined) {
        options.callback = cb;
        self.getAllPaginatedData(options);
      } else {
        callback(null, results.getCacheData);
      }
    }],
    setCacheData: ['checkCacheData', function (results, cb) {
      debug("setCacheData");
      var cacheableResult = results.checkCacheData;
      self.cache.set(options.contentIndex, cacheableResult, cacheInterval, cb(null,cacheableResult));
    }]
  }, function(err, result) {
    callback(null, result.setCacheData);
  });
};

module.exports = PagerDuty;