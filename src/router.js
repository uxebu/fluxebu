'use strict';

var parseUrl = require('url').parse;

var routes = require('routes');

var util = require('./util');
var queryAll = util.queryAll;
var slice = Array.prototype.slice;

function Router(dispatcher) {
  this._routes = [];
  this._routeStores = [];
  this._userData = [];
  this.dispatcher = dispatcher;
}

Router.prototype = {
  addRoute: function(pattern, storeNames) {
    this._routes.push(routes.Route(pattern));
    this._routeStores.push(storeNames);
    this._userData.push(slice.call(arguments, 2));
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

    var payload = {
      params: match.params,
      splats: match.splats,
      hash: url.hash,
      pathname: url.pathname,
      path: url.path,
      query: url.query,
      userData: data
    };

    var index = (match.next - 1);
    var storeNames = this._routeStores[index].slice().sort();
    var userData = this._userData[index];
    var storeResponses = this.dispatcher.dispatch('route', payload);
    var neededStoreResponses = {};
    storeNames.forEach(function(storeName) {
      if (storeName in storeResponses) {
        neededStoreResponses[storeName] = storeResponses[storeName];
      } else {
        throw TypeError('No store registered with name ' + storeName);
      }
    });
    this.resolveStoreResponses(neededStoreResponses, userData, callback);
    return true;
  }
};

module.exports = Router;
