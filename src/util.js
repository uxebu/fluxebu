'use strict';

exports.queryAll = function(storeResponses, callback) {
  var pending = [];
  var collectedData = {};
  var isQuerying = true;

  each(storeResponses, function(storeResponse, name) {
    if (storeResponse) {
      pending.push(name);
      storeResponse.query(function(data) {
        collectedData[name] = data;
        removeFromArray(pending, name);
        if (!isQuerying) {
          checkDone(pending, collectedData, callback);
        }
      });
    } else {
      collectedData[name] = undefined;
    }
  });

  isQuerying = false;
  checkDone(pending, collectedData, callback);
};

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

function checkDone(pending, collectedData, callback) {
  if (pending.length === 0) {
    callback(collectedData);
  }
}
