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
  var subscriptions = [];
  var pendingQueries = !isResolved && [];
  var initialError = null;

  return {
    query: sinon.spy(function(callback) {
      if (isResolved) { call(callback, initialError, value); }
      else { pendingQueries.push(callback); }
    }),
    subscribe: sinon.spy(function(callback) {
      subscriptions.push(callback);
      if (isResolved) { call(callback, initialError, value); }
    }),
    unsubscribe: sinon.spy(function(callback) {
      var index = subscriptions.indexOf(callback);
      if (index !== -1) { subscriptions.splice(index, 1); }
    }),

    error: function(error) {
      if (!isResolved) {
        isResolved = true;
        initialError = error;
        pendingQueries.forEach(function(callback) { call(callback, error); });
      }
      subscriptions.forEach(function(listener) { call(listener, error); });
    },
    publishUpdate: function(data) {
      value = data;
      if (isResolved) {
        subscriptions.forEach(function(listener) { call(listener, null, data); });
      } else {
        this.resolve();
      }
    },
    resolve: function() {
      if (isResolved) { return; }
      isResolved = true;
      pendingQueries.forEach(this.query, this);
      this.publishUpdate(value);
    }
  };
}

function callSync(fn, error, value) {
  fn(error, value);
}

function callAsync(fn, error, value) {
  process.nextTick(function() { fn(error, value); });
}

function respondAfter(time) {
  return function(fn, error, value) {
    setTimeout(function() {
      fn(error, value);
    }, time);
  };
}
