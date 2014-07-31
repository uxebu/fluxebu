'use strict';

function StoreViewProxy() {
  this.queries = [];
  this.subscriptions = [];
  this.wrapped = null;
}

StoreViewProxy.prototype = {
  query: function(callback) {
    this.queries.push(callback);
  },

  subscribe: function(callback) {
    this.subscriptions.push(callback);
  },

  unsubscribe: function(callback) {
    var subscriptions = this.subscriptions;
    var index = subscriptions.indexOf(callback);
    if (index > -1) {
      subscriptions.splice(index, 1);
    }
  },

  resolve: function(storeView) {
    if (this.wrapped) {
      throw Error('StoreViewProxy is already resolved.');
    }
    this.wrapped = storeView;

    // overwrite proxying methods with versions that delegate directly
    this.query = queryOnceResolved;
    this.subscribe = subscribeOnceResolved;
    this.unsubscribe = unsubscribeOnceResolved;

    // replay queries and subscriptions on the wrapped store view
    this.queries.forEach(storeView.query, storeView);
    this.subscriptions.forEach(storeView.subscribe, storeView);
  }
};

function queryOnceResolved(callback) {
  /*jshint validthis: true */
  this.wrapped.query(callback);
}

function subscribeOnceResolved(callback) {
  /*jshint validthis: true */
  this.wrapped.subscribe(callback);
}

function unsubscribeOnceResolved(callback) {
  /*jshint validthis: true */
  this.wrapped.unsubscribe(callback);
}

module.exports = StoreViewProxy;
