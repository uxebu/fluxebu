'use strict';

var defaults = require('./defaults');
var iter = require('./iter');

var slice = [].slice;

function Dispatcher(get, set, equals) {
  this.get = get || defaults.get;
  this.set = set || defaults.set;
  this.equals = equals || defaults.equals;
  this.callbacks = [];
}

Dispatcher.prototype.dispatch = function(action, data, callback) {
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

Dispatcher.prototype.register = function(callback) {
  var n = arguments.length;
  var invoke =
    n > 2 ? invokeWithKeypaths :
    n === 2 ? invokeWithKeypath :
    invokeWithData;

  var keypaths = argumentsToKeypaths(arguments);
  this.callbacks = this.callbacks.concat([[callback, invoke, keypaths]]);
};

Dispatcher.prototype.unregister = function(callback) {
  var keypaths = argumentsToKeypaths(arguments);
  this.callbacks = this.callbacks.filter(function(spec) {
    return spec[0] !== callback || !arrayEquals(keypaths, spec[2]);
  });
};

function ensureArrayKeypath(value) {
  return typeof value === 'string' ? value.split('.') : value;
}

function argumentsToKeypaths(args) {
  var n = args.length;
  return n > 2 ? slice.call(args, 1).map(ensureArrayKeypath) :
    n === 2 ? ensureArrayKeypath(args[1]) :
    undefined;
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
