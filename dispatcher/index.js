'use strict';

var defaults = require('./defaults');
var slice = [].slice;

function isIterator(maybeIterator) {
  return maybeIterator && typeof maybeIterator.next == 'function';
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

  function dispatchActionOnHandler(action, data, handler, keypaths) {
    var newData;

    if (!keypaths) {
      newData = handler(action, data);
      return newData === undefined ? data : newData;
    } else {
      var firstKeyPath = keypaths[0];
      if (keypaths.length === 1) {
        newData = handler(action, get(data, firstKeyPath));
      } else {
        var subTrees = keypaths.map(resolveKeypathOnThis, data);
        newData = handler.apply(null, [action].concat(subTrees));
      }
      if (newData) set(data, firstKeyPath, newData);
      return data;
    }
  }

  function dispatch(actionQueue, promiseQueue, data, callback) {
    var action;
    function invokeHandler(spec) {
      var handler = spec[0];
      var keypaths = spec[1];
      data = dispatchActionOnHandler(action, data, handler, keypaths);
      if (isIterator(data)) {
        data = consumeIterator(data, actionQueue);
      }
    }

    while ((action = actionQueue.shift())) {
      handlers.forEach(invokeHandler);
    }
    if (callback) callback(data, true);
  }

  return {
    register: function(handler) {
      var keypaths = arguments.length < 2 ?
        null : argumentsToKeypaths(arguments, 1);
      handlers.push([handler, keypaths]);
      return function remove() { removeHandler(handler, keypaths); };
    },

    dispatch: function(action, data, callback) {
      dispatch([action], [], data, callback);
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

function consumeIterator(iterator, actionQueue) {
  var result = iterator.next();
  var data = result.value;

  while (!result.done) {
    result = iterator.next();
    if (result.value) {
      // ignore `undefined` values, e.g. from `{done: true}`
      actionQueue.push(result.value);
    }
  }

  return data;
}

exports = module.exports = Dispatcher;
