'use strict';

var defaults = require('./defaults');
var iter = require('./iter');

var slice = [].slice;

function Dispatcher(get, set, equals) {
  if (!get) get = defaults.get;
  if (!set) set = defaults.set;
  if (!equals) equals = defaults.equals;
  var handlers = [];

  function resolveKeypathOnThis(keypath) {
    return keypath === null ? this : get(this, keypath);
  }

  return {
    register: function(handler) {
      var n = arguments.length;
      var keypaths = n < 2 ? null : argumentsToKeypaths(arguments, 1);
      handlers.push([handler, keypaths]);
      return function() {
        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i][0] === handler && handlers[i][1] === keypaths) {
            handlers = handlers.slice(0, i).concat(handlers.slice(i + 1));
            return;
          }
        }
      };
    },

    dispatch: function(action, data) {
      handlers.forEach(function(spec) {
        var handler = spec[0];
        var keypaths = spec[1];
        var newData;

        if (!keypaths) {
          newData = handler(action, data);
        } else if (keypaths.length === 1) {
          newData = handler(action, get(data, keypaths[0]));
        } else {
          var subTrees = keypaths.map(resolveKeypathOnThis, data);
          newData = handler.apply(null, [action].concat(subTrees));
        }

        if (newData) data = newData;
      });
    }
  };
}

var Deespatcher = function() {};
Deespatcher.prototype.dispatch = function(action, data, callback) {
  var callbacks = this.callbacks;
  var get = this.get;

  function runTransformations(factory, invoke, keypaths) {
    var transformations = factory(action);
    if (!transformations) return;
    iter(transformations, function(transformation, isDone) {
      if (isDone) return;
      invoke(transformation, action, data, get, keypaths);
    });
  }

  for (var i = 0, n = callbacks.length; i < n; i++) {
    runTransformations.apply(null, callbacks[i]);
  }

};


Deespatcher.prototype.register = function(callback) {
  var n = arguments.length;
  var invoke =
    n > 2 ? invokeWithKeypaths :
    n === 2 ? invokeWithKeypath :
    invokeWithData;

  var keypaths = argumentsToKeypaths(arguments);
  this.callbacks = this.callbacks.concat([[callback, invoke, keypaths]]);
};

Deespatcher.prototype.unregister = function(callback) {
  var keypaths = argumentsToKeypaths(arguments);
  this.callbacks = this.callbacks.filter(function(spec) {
    return spec[0] !== callback || !arrayEquals(keypaths, spec[2]);
  });
};

function ensureArrayKeypath(value) {
  return (
    typeof value === 'string' ? value.split('.') :
    value.length === 0 ? null : value
  );
}

function argumentsToKeypaths(args, start) {
  return slice.call(args, start || 0).map(ensureArrayKeypath);
}

function invokeWithData(fn, action, data) {
  return fn(action, data);
}

function invokeWithKeypath(fn, action, data, get, keypath) {
  return fn(action, get(data, keypath));
}

function invokeWithKeypaths(fn, action, data, get, keypaths) {
  return fn.apply(null, [action].concat(keypaths.map(function(keypath) {
    return get(data, keypath);
  })));
}

function arrayEquals(valueA, valueB) {
  return valueB && Array.isArray(valueA) ?
    valueA.every(function(value, i) { return arrayEquals(value, valueB[i]); }) :
    valueA === valueB;
}

exports = module.exports = Dispatcher;
