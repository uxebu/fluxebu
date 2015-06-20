'use strict';

var immediate = require('immediate');

var isArray = Array.isArray;
function isPromise(value) {
  return typeof value.then === 'function';
}
function isIterator(value) {
  return typeof value.next === 'function';
}

var TERMINATED = {};
function iterate(next, callback) {
  do {
    var value = next();
    if (isPromise(value)) {
      return continueAfter(value, next, callback);
    }
    callback(value, false);
  } while (value !== TERMINATED);
  callback(undefined, true);
}

function continueAfter(promise, next, callback) {
  function continueIteration() {
    immediate(iterate, next, callback);
  }

  promise.then(
    function resolved(value) {
      immediate(callback, value, false);
      continueIteration();
    },
    continueIteration
  );
}

function iterArray(array) {
  var i = 0;
  var n = array.length;
  return function next() { return i >= n ? TERMINATED : array[i++]; };
}

function iterIterator(iterator) {
  return function next() {
    var result = iterator.next();
    return result.done ? TERMINATED : result.value;
  };
}

module.exports = function iter(value, callback) {
  if (isPromise(value)) {
    value.then(
      function resolved(result) { immediate(iter, result, callback); },
      function rejected() { immediate(callback, undefined, true); }
    );
  } else if (isArray(value)) {
    iterate(iterArray(value), callback);
  } else if (isIterator(value)) {
    iterate(iterIterator(value), callback);
  } else {
    callback(value, false);
    callback(undefined, true);
  }
};
