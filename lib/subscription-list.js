'use strict';

function SubscriptionList() {
  this.subscribers = [];
}

SubscriptionList.prototype = {
  add: function(subscriber) {
    this.subscribers.push(subscriber);
  },
  clear: function() {
    this.subscribers = [];
  },
  dispatch: function() {
    var subscribers = this.subscribers, error;
    for (var i = 0, n = subscribers.length; i < n; ++i) {
      try { subscribers[i].apply(null, arguments); }
      catch (e) { error = e; }
    }
    if (error) {
      throw error;
    }
  },
  remove: function(subscriber) {
    this.subscribers = this.subscribers.filter(removeFilter, subscriber);
  }
};

function removeFilter(subscriber) {
  /*jshint validthis: true */
  return subscriber !== this;
}

module.exports = SubscriptionList;
