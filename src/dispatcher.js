'use strict';

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
      return (proxies[storeName] = new ProxyStoreView());
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

function ProxyStoreView() {
  this.queries = [];
  this.proxied = null;
}
ProxyStoreView.prototype = {
  resolve: function(storeView) {
    this.queries.forEach(storeView.query, storeView);
    this.proxied = storeView;
  },
  query: function(callback) {
    var proxied = this.proxied;
    if (proxied) {
      proxied.query(callback);
    } else {
      this.queries.push(callback);
    }
  }
};

module.exports = Dispatcher;
