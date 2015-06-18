'use strict';

var get = exports.get = function get(object, keypath) {
  for (var i = 0, n = keypath.length; i < n; i++) {
    object = object[keypath[i]];
  }
  return object;
};

exports.set = function set(object, keypath, value) {
  if (!keypath.length) return value;
  get(object, keypath.slice(0, -1))[keypath[keypath.length - 1]] = value;
  return object;
};

exports.equals = function equals(a, b) {
  return a === null || typeof a !== 'object' ? a === b : false;
};
