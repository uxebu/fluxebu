'use strict';

var FutureStoreResponse = require('./store-response/future');

function Dispatcher() {
  this.stores = {};
}

Dispatcher.prototype = {
  dispatch: function(actionType, payload) {
    function waitFor(storeName) {
      var storeResponse = storeResponses[storeName];
      if (!storeResponse) {
        storeResponse = storeResponses[storeName] = new FutureStoreResponse();
      }
      return storeResponse;
    }

    var storeResponses = {};
    var stores = this.stores;
    for (var key in stores) {
      var storeResponse = stores[key].notify(actionType, payload, waitFor);
      var proxyView = storeResponses[key];
      if (proxyView) {
        proxyView.resolve(storeResponse);
      }
      storeResponses[key] = storeResponse;
    }
    return storeResponses;
  },
  subscribeStore: function(name, store) {
    this.stores[name] = store;
  },
  unsubscribeStore: function(name) {
    delete this.stores[name];
  }
};

module.exports = Dispatcher;
