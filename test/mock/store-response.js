function MockStoreResponse(value, _call) {
  var subscriptions = [];
  if (!_call) {
    _call = function(f, arg) { f(arg); };
  }

  var response = this instanceof MockStoreResponse ? this : {};

  response.query = sinon.spy(function(callback) {
    _call(callback, value);
  });
  response.subscribe = sinon.spy(function(callback) {
    subscriptions.push(callback);
    _call(callback, value);
  });
  response.unsubscribe = sinon.spy(function(callback) {
    var index = subscriptions.indexOf(callback);
    if (index !== -1) {
      subscriptions.splice(index, 1);
    }
  });
  response.publishUpdate = function(data) {
    value = data;
    subscriptions.forEach(function(listener) { _call(listener, data); });
  };

  return response;
}

MockStoreResponse.async = function(value) {
  return new this(value, function(f, value) {
    process.nextTick(function() { f(value); });
  });
};

module.exports = MockStoreResponse;
