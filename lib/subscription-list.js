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
    var error = reduce(invoke, this.subscribers, null, arguments);
    if (error) {
      throw error;
    }
  },
  once: function(subscriber) {
    this.add(wrapForSingleInvocation(this, subscriber));
  },
  remove: function(subscriber) {
    this.subscribers = reduce(removeFilter, this.subscribers, [], subscriber);
  }
};

function wrapForSingleInvocation(list, subscriber) {
  function wrapper() {
    /* jshint validthis: true */
    list.remove(subscriber);
    return subscriber.apply(this, arguments);
  }
  wrapper.wrapped = subscriber;
  return wrapper;
}

function invoke(error, subscriber) {
  /* jshint validthis: true */
  try { subscriber.apply(null, this); }
  catch (error) { return error; }
  return error;
}

function removeFilter(filtered, subscriber) {
  /*jshint validthis: true */
  if (this !== subscriber && this !== subscriber.wrapped) { filtered.push(subscriber); }
  return filtered;
}

function reduce(callback, iterable, value, context) {
  for (var i = 0, n = iterable.length; i < n; ++i) {
    value = callback.call(context, value, iterable[i]);
  }
  return value;
}

module.exports = SubscriptionList;
