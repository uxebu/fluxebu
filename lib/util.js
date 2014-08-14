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
  var isCompleted = false;

  function checkDone(error) {
    if (error || pending.length === 0) {
      var data = collectedData;
      isCompleted = true;
      collectedData = pending = null;
      onComplete(error || null, data);
    }
  }

  each(storeResponses, function(storeResponse, name) {
    var onData;
    if (storeResponse) {
      pending.push(name);
      onData = function(error, data) {
        if (!isCompleted) {
          collectedData[name] = data;
          removeFromArray(pending, name);
          if (error || !isQuerying) {
            checkDone(error);
          }
        } else if (onUpdate) {
          onUpdate(name, error, data);
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
