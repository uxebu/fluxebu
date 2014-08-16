'use strict';

var SubscriptionList = require('../subscription-list');
var STATE_UNINITIALIZED = 1, STATE_INITIALIZING = 2, STATE_INITIALIZED = 3;

function LazyStoreResponse(initCallback) {
  this.initCallback = initCallback;
  this.state = STATE_UNINITIALIZED;
  this.error = this.value = undefined;

  this.subscribers = new SubscriptionList();
}
LazyStoreResponse.prototype = {
  query: function(subscriber) {
    addSubscriber(this, this.subscribers.once, subscriber);
  },
  subscribe: function(subscriber) {
    addSubscriber(this, this.subscribers.add, subscriber);
  },
  unsubscribe: function(subscriber) {
    this.subscribers.remove(subscriber);
  }
};

function addSubscriber(response, addMethod, subscriber) {
  var state = response.state;
  if (state === STATE_INITIALIZED) {
    subscriber(response.error, response.value);
  } else {
    addMethod.call(response.subscribers, subscriber);
    if (state === STATE_UNINITIALIZED) {
      response.state = STATE_INITIALIZING;
      response.initCallback(function(error, value) {
        response.error = error;
        response.value = value;
        response.state = STATE_INITIALIZED;
        response.subscribers.dispatch(error, value);
      });
    }
  }
}

module.exports = LazyStoreResponse;
