'use strict';

var defer = require('../defer');
var SubscriptionList = require('../subscription-list');
var STATE_UNINITIALIZED = 1, STATE_INITIALIZING = 2, STATE_INITIALIZED = 3;

function LazyStoreResponse(initCallback) {
  this.initCallback = initCallback;
  this.state = STATE_UNINITIALIZED;
  this.destroyCallback = this.destroyTimeout =
    this.error = this.value = undefined;

  this.subscribers = new SubscriptionList();
}
LazyStoreResponse.prototype = {
  query: function(subscriber) {
    if (this.state !== STATE_INITIALIZED) {
      this.subscribers.once(subscriber);
      defer.remove(this.destroyTimeout);
      this.destroyTimeout = null;
    }
    init(this, subscriber);
  },
  subscribe: function(subscriber) {
    defer.remove(this.destroyTimeout);
    this.destroyTimeout = null;
    this.subscribers.add(subscriber);
    init(this, subscriber);
  },
  unsubscribe: function(subscriber) {
    this.subscribers.remove(subscriber);
    if (this.subscribers.getLength() !== 0) { return; }

    var self = this;
    if (this.destroyCallback) {
      this.destroyTimeout = defer(function() {
        self.destroyCallback();
        self.destroyCallback = null;
      }, 1);
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
      if (response.subscribers.getLength() !== 0) { return; }

      response.destroyTimeout = defer(function() {
        if (!response.destroyCallback) return;
        response.destroyCallback();
        response.destroyCallback = null;
      }, 1);
    });
    response.initCallback = null;
  }
}

module.exports = LazyStoreResponse;
