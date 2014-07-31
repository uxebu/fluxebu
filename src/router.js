'use strict';

var parseUrl = require('url').parse;

var routes = require('routes');

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
  canHandleURL: function(url) {
    url = parseUrl(url);
    return !!routes.match(this._routes, url.pathname);
  },
  handleURL: function(url, data, callback) {
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
    var storeViews = this.dispatcher.dispatch('route', payload);
    var collectedData = {};
    var callArgs = [collectedData].concat(userData);

    // el cheapo test whether all data has been collected.
    // This should probably get replaced with something serious.
    var checkDone = function() {
      if (Object.keys(collectedData).sort().join() === storeNames.join()) {
        callback.apply(null, callArgs);
      }
    };

    if (storeNames.length) {
      storeNames.forEach(function(storeName) {
        var storeView = storeViews[storeName];
        if (storeView) {
          storeView.query(function(data) {
            collectedData[storeName] = data;
            checkDone();
          });
        } else if (storeName in storeViews) {
          collectedData[storeName] = storeView;
          checkDone();
        } else {
          throw TypeError('No store registered with name ' + storeName);
        }
      });
    } else {
      callback.apply(null, callArgs);
    }

    return true;
  }
};

module.exports = Router;
