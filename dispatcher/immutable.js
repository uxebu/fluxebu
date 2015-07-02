'use strict';

exports.get = function get(object, keypath) {
  return object.getIn(keypath);
};

exports.set = function set(object, keypath, value) {
  return object.setIn(object, keypath, value);
};

exports.equals = function equals(a, b) {
  return a === b || a.equals(b);
};
