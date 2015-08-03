'use strict';

var Dispatcher = require('../dispatcher');

function get(object, keypath) {
  return object.getIn(keypath);
}

function set(object, keypath, value) {
  return object.setIn(keypath, value);
}

function equals(a, b) {
  return a === b || a.equals(b);
}

exports = module.exports = function DispatcherForImmutable() {
  return Dispatcher(get, set, equals);
};

exports.get = get;
exports.set = set;
exports.equals = equals;