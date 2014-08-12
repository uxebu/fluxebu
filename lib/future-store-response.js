'use strict';

function FutureStoreResponse() {
  this.queries = [];
  this.subscriptions = [];
  this.wrapped = null;
}

FutureStoreResponse.prototype = {
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

  resolve: function(storeResponse) {
    if (this.wrapped) {
      throw Error('FutureStoreResponse is already resolved.');
    }
    this.wrapped = storeResponse;

    // overwrite delayed proxying methods with versions that delegate directly
    this.query = queryOnceResolved;
    this.subscribe = subscribeOnceResolved;
    this.unsubscribe = unsubscribeOnceResolved;

    // replay queries and subscriptions on the wrapped store response
    this.queries.forEach(storeResponse.query, storeResponse);
    this.subscriptions.forEach(storeResponse.subscribe, storeResponse);

    // clean up
    this.queries = this.subscriptions = null;
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

module.exports = FutureStoreResponse;
