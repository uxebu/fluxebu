'use strict';

var StoreViewProxy = require('./store-view-proxy');

function Dispatcher() {
  this.stores = {};
}

Dispatcher.prototype = {
  dispatch: function(actionType, payload) {
    function waitFor(storeName) {
      var storeView = storeViews[storeName];
      if (!storeView) {
        storeView = storeViews[storeName] = new StoreViewProxy();
      }
      return storeView;
    }

    var storeViews = {};
    var stores = this.stores;
    for (var key in stores) {
      var storeView = stores[key].notify(actionType, payload, waitFor);
      var proxyView = storeViews[key];
      if (proxyView) {
        proxyView.resolve(storeView);
      }
      storeViews[key] = storeView;
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
