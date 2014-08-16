var sinon = require('sinon');
var SubscriptionList = require('../../lib/subscription-list');

exports.sync = function(value) {
  return mockStoreResponse(value, callSync, true);
};

exports.sync.unresolved = function(value) {
  return mockStoreResponse(value, callSync, false);
};

exports.async = function(value) {
  return mockStoreResponse(value, callAsync, true);
};

exports.async.unresolved = function(value) {
  return mockStoreResponse(value, callAsync, false);
};

exports.respondsAfter = function(value, timeout) {
  return mockStoreResponse(value, respondAfter(timeout), true);
};

exports.respondsAfter.unresolved = function(value, timeout) {
  return mockStoreResponse(value, respondAfter(timeout), false);
};

function mockStoreResponse(value, call, isResolved) {
  var subscriptions = new SubscriptionList();
  var pendingQueries = !isResolved && new SubscriptionList();
  var initialError = null;

  return {
    query: sinon.spy(function(callback) {
      if (isResolved) { callback(initialError, value); }
      else { pendingQueries.add(callback); }
    }),
    subscribe: sinon.spy(function(callback) {
      subscriptions.add(callback);
      if (isResolved) { callback(initialError, value); }
    }),
    unsubscribe: sinon.spy(function(callback) {
      subscriptions.remove(callback);
    }),

    error: function(error) {
      if (!isResolved) {
        isResolved = true;
        initialError = error;
        call(function() { pendingQueries.dispatch(error); });
      }
      call(function() { subscriptions.dispatch(error); });
    },
    publishUpdate: function(data) {
      value = data;
      if (isResolved) {
        call(function() { subscriptions.dispatch(null, data); });
      } else {
        this.resolve();
      }
    },
    resolve: function() {
      if (isResolved) { return; }
      isResolved = true;
      pendingQueries.dispatch(null, value);
      this.publishUpdate(value);
    }
  };
}

function callSync(fn) {
  fn();
}

function callAsync(fn) {
  process.nextTick(fn);
}

function respondAfter(time) {
  return function(fn) {
    setTimeout(fn, time);
  };
}
