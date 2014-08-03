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

function mockStoreResponse(value, call, isResolved) {
  var subscriptions = [];
  var pendingQueries = !isResolved && [];

  return {
    query: sinon.spy(function(callback) {
      if (isResolved) { call(callback, value); }
      else { pendingQueries.push(callback); }
    }),
    subscribe: sinon.spy(function(callback) {
      subscriptions.push(callback);
      if (isResolved) { call(callback, value); }
    }),
    unsubscribe: sinon.spy(function(callback) {
      var index = subscriptions.indexOf(callback);
      if (index !== -1) { subscriptions.splice(index, 1); }
    }),

    publishUpdate: function(data) {
      value = data;
      if (isResolved) {
        subscriptions.forEach(function(listener) { call(listener, data); });
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

function callSync(fn, value) {
  fn(value);
}

function callAsync(fn, value) {
  process.nextTick(function() { fn(value); });
}
