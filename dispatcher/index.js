'use strict';

var immediate = require('immediate');
var defaults = require('./defaults');
var slice = [].slice;

function isIterator(maybeIterator) {
  return maybeIterator && typeof maybeIterator.next == 'function';
}

function isPromise(maybePromise) {
  return maybePromise && typeof maybePromise.then == 'function';
}

function Dispatcher(get, set, equals) {
  if (!get) get = defaults.get;
  if (!set) set = defaults.set;
  if (!equals) equals = defaults.equals;
  var handlers = [];

  function resolveKeypathOnThis(keypath) {
    return keypath === null ? this : get(this, keypath);
  }

  function removeHandler(handler, keypaths) {
    for (var i = 0, length = handlers.length; i < length; i++) {
      if (handlers[i][0] === handler && handlers[i][1] === keypaths) {
        handlers = handlers.slice(0, i).concat(handlers.slice(i + 1));
        return;
      }
    }
  }

  function dispatchActionOnHandler(action, data, handler, keypaths, actionQueue, handlePromise) {
    var newData;

    if (!keypaths) {
      newData = handler(action, data);
    } else {
      var firstKeyPath = keypaths[0];
      if (keypaths.length === 1) {
        newData = handler(action, get(data, firstKeyPath));
      } else {
        var subTrees = keypaths.map(resolveKeypathOnThis, data);
        newData = handler.apply(null, [action].concat(subTrees));
      }
    }

    if (isIterator(newData)) {
      var iterator = newData;
      var next = iterator.next();
      newData = next.value;
      consumeIterator(iterator, actionQueue, handlePromise);
    }

    return (
      newData === undefined ? data :
      firstKeyPath ? set(data, firstKeyPath, newData) :
      newData
    );
  }

  function dispatch(actionQueue, pendingPromises, dataPointer, callback) {
    function handlePromise(promise, maybeUnfinishedIterator) {
      pendingPromises.push(promise);
      function continueDispatch() {
        consumeIterator(maybeUnfinishedIterator, actionQueue, handlePromise);
        removeFromArray(pendingPromises, promise);
        runDispatch();
      }

      promise.then(function(action) {
        actionQueue.push(action);
        immediate(continueDispatch); // get out of promise error handling
      });
    }

    function invokeHandler(spec, action, currentData) {
      var handler = spec[0];
      var keypaths = spec[1];
      return dispatchActionOnHandler(action, currentData, handler, keypaths, actionQueue, handlePromise);
    }

    function invokeHandlers(action, currentData) {
      return handlers.reduce(function(mutatedData, spec) {
        return invokeHandler(spec, action, mutatedData);
      }, currentData);
    }

    function runDispatch() {
      var action;
      var currentData = dataPointer.get();
      while ((action = actionQueue.shift())) {
        currentData = invokeHandlers(action, currentData);
      }

      dataPointer.set(currentData);
      var isDone = pendingPromises.length === 0;
      if (callback && (isDone || !equals(dataPointer.get(), currentData))) {
        callback(currentData, isDone);
      }
    }

    runDispatch();
  }

  return {
    register: function(handler) {
      var keypaths = arguments.length < 2 ?
        null : argumentsToKeypaths(arguments, 1);
      handlers.push([handler, keypaths]);
      return function remove() { removeHandler(handler, keypaths); };
    },

    dispatch: function(action, dataPointer, callback) {
      dispatch([action], [], dataPointer, callback);
    }
  };
}

function ensureArrayKeypath(value) {
  return (
    typeof value === 'string' ? value.split('.') :
    value.length === 0 ? null : value
  );
}

function argumentsToKeypaths(args, start) {
  return slice.call(args, start || 0).map(ensureArrayKeypath);
}

function consumeIterator(iterator, actionQueue, handlePromise) {
  do {
    var result = iterator.next();
    var value = result.value;

    if (isPromise(value)) {
      handlePromise(value, iterator);
      break;
    } else if (value !== undefined) {
      actionQueue.push(value);
    }
  } while (!result.done);
}

function removeFromArray(array, value) {
  var i = array.indexOf(value);
  if (i !== -1) {
    for (var n = array.length - 1; i < n; i++) {
      array[i] = array[i + 1];
    }
    array.length = n;
  }
}

exports = module.exports = Dispatcher;
