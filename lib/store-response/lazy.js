'use strict';

var SubscriptionList = require('../subscription-list');
var STATE_UNINITIALIZED = 1, STATE_INITIALIZING = 2, STATE_INITIALIZED = 3;

function LazyStoreResponse(initCallback) {
  this.initCallback = initCallback;
  this.state = STATE_UNINITIALIZED;
  this.destroyCallback = this.error = this.value = undefined;

  this.subscribers = new SubscriptionList();
}
LazyStoreResponse.prototype = {
  query: function(subscriber) {
    if (this.state !== STATE_INITIALIZED) {
      this.subscribers.once(subscriber);
    }
    init(this, subscriber);
  },
  subscribe: function(subscriber) {
    this.subscribers.add(subscriber);
    init(this, subscriber);
  },
  unsubscribe: function(subscriber) {
    this.subscribers.remove(subscriber);
    var destroyCallback = this.destroyCallback;
    if (destroyCallback) {
      setTimeout(destroyCallback, 1);
    }
  }
};

function init(response, subscriber) {
  var state = response.state;
  if (state === STATE_INITIALIZED) {
    subscriber(response.error, response.value);
  } else if (state === STATE_UNINITIALIZED) {
    response.state = STATE_INITIALIZING;
    response.destroyCallback = response.initCallback(function(error, value) {
      response.error = error;
      response.value = value;
      response.state = STATE_INITIALIZED;
      response.subscribers.dispatch(error, value);
    });
    response.initCallback = null;
  }
}

module.exports = LazyStoreResponse;
