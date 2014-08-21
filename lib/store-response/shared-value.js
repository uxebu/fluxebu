var LazyStoreResponse = require('./lazy');

function SharedValueStoreResponse(sharedValue) {
  return new LazyStoreResponse(function(onValue) {
    function subscriber(value) {
      onValue(null, value);
    }

    sharedValue.subscribe(subscriber);

    return function() {
      sharedValue.unsubscribe(subscriber);
    };
  });
}

module.exports = SharedValueStoreResponse;
