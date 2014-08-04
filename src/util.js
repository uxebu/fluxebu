'use strict';

exports.queryAll = function(storeResponses, callback) {
  queryStoreResponses(storeResponses, callback, null, function(storeResponse, name, onData) {
    if (storeResponse) {
      storeResponse.query(onData);
    }
  });
};

exports.subscribeToAll = function(storeResponses, onComplete, onUpdate) {
  var unsubscribe = {};
  queryStoreResponses(storeResponses, onComplete, onUpdate, function(storeResponse, name, onData) {
    if (storeResponse) {
      storeResponse.subscribe(onData);
      unsubscribe[name] = function() {
        storeResponse.unsubscribe(onData);
      };
    } else {
      unsubscribe[name] = noop;
    }
  });

  return unsubscribe;
};

function queryStoreResponses(storeResponses, onComplete, onUpdate, query) {
  var pending = [];
  var collectedData = {};
  var isQuerying = true;

  function checkDone() {
    if (pending.length === 0) {
      var data = collectedData;
      collectedData = null;
      onComplete(data);
    }
  }

  each(storeResponses, function(storeResponse, name) {
    var onData;
    if (storeResponse) {
      pending.push(name);
      onData = function(data) {
        if (collectedData) { // the `onComplete` callback has not been invoked yet
          collectedData[name] = data;
          removeFromArray(pending, name);
          if (!isQuerying) {
            checkDone();
          }
        } else {
          var updatedData = {};
          updatedData[name] = data;
          onUpdate(updatedData);
        }
      };
    } else {
      collectedData[name] = undefined;
    }
    query(storeResponse, name, onData);
  });

  isQuerying = false;
  checkDone();
}

function each(object, callback) {
  for (var key in object) {
    callback(object[key], key);
  }
}

function removeFromArray(array, value) {
  var index = array.indexOf(value);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

function noop() {}
