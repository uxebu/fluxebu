var sinon = require('sinon');
var LazyStoreResponse = require('../../lib/store-response/lazy');

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
  var resolve, initialError = null;
  var storeResponse = new LazyStoreResponse(function(callback) {
    resolve = function(error, value) {
      call(callback, error, value);
    };
    if (isResolved) {
      resolve(null, value);
    }
  });
  sinon.spy(storeResponse, 'query');
  sinon.spy(storeResponse, 'subscribe');
  sinon.spy(storeResponse, 'unsubscribe');

  storeResponse.publishError = function(error) {
    initialError = null;
    if (resolve) { resolve(error); }
  };
  storeResponse.publishUpdate = function(data) {
    value = data;
    if (resolve) { resolve(null, data); }
  };
  storeResponse.resolve = function() {
    isResolved = true;
    if (resolve) { resolve(null, value); }
  };

  return storeResponse;
}

function callSync(fn, error, value) {
  fn(error, value);
}

function callAsync(fn, error, value) {
  process.nextTick(function() { fn(error, value); });
}

function respondAfter(time) {
  return function(fn, error, value) {
    setTimeout(function() { fn(error, value); }, time);
  };
}
