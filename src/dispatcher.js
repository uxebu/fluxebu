'use strict';

var StoreViewProxy = require('./store-view-proxy');

function Dispatcher() {
  this.stores = {};
}

Dispatcher.prototype = {
  dispatch: function(actionType, payload) {
    function createProxy(storeName) {
      var proxy = proxies[storeName];
      if (proxy) {
        return proxy;
      }
      return (proxies[storeName] = new StoreViewProxy());
    }

    function waitFor(storeName) {
      return storeViews[storeName] || createProxy(storeName);
    }

    var storeViews = {};
    var proxies = {};
    var stores = this.stores;
    for (var key in stores) {
      storeViews[key] = stores[key].notify(actionType, payload, waitFor);
      if (proxies[key]) {
        proxies[key].resolve(storeViews[key]);
      }
    }
    return storeViews;
  },
  subscribeStore: function(name, store) {
    this.stores[name] = store;
  },
  unsubscribeStore: function(name) {
    delete this.stores[name];
  }
};

module.exports = Dispatcher;
