'use strict';

var parseUrl = require('url').parse;

var routes = require('routes');

var util = require('./util');
var queryAll = util.queryAll;
var slice = Array.prototype.slice;

function Router(dispatcher) {
  this._routes = [];
  this._routeData = [];
  this.dispatcher = dispatcher;
}

Router.prototype = {
  addRoute: function(id, pattern, storeNames) {
    this._routes.push(routes.Route(pattern));
    this._routeData.push({
      id: id,
      storeNames: storeNames,
      userData: slice.call(arguments, 3)
    });
    return this;
  },
  canHandleUrl: function(url) {
    url = parseUrl(url);
    return !!routes.match(this._routes, url.pathname);
  },

  resolveStoreResponses: function(storeResponses, userData, callback) {
    queryAll(storeResponses, function(collectedData) {
      callback.apply(null, [collectedData].concat(userData));
    });
  },

  handleUrl: function(url, data, callback) {
    url = parseUrl(url, true);
    var match = routes.match(this._routes, url.pathname);
    if (!match) { return false; }

    var index = (match.next - 1);
    var routeData = this._routeData[index];
    var payload = {
      params: match.params,
      splats: match.splats,
      hash: url.hash,
      id: routeData.id,
      path: url.path,
      pathname: url.pathname,
      query: url.query,
      userData: data
    };

    var storeResponses = this.dispatcher.dispatch('route', payload);
    var neededResponses = {};
    routeData.storeNames.forEach(function(storeName) {
      if (storeName in storeResponses) {
        neededResponses[storeName] = storeResponses[storeName];
      } else {
        throw TypeError('No store registered with name ' + storeName);
      }
    });
    this.resolveStoreResponses(neededResponses, routeData.userData, callback);
    return true;
  }
};

module.exports = Router;
