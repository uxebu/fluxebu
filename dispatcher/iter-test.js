'use strict';

/*eslint-env mocha */
/*eslint max-nested-callbacks: 0 */

var sinon = require('sinon');
var assert = sinon.assert;
var same = sinon.match.same;
var spy = sinon.spy;

var Promise = global.Promise || require('es6-promise').Promise;

var iter = require('./iter');

describe('iteration:', function() {
  var value;
  beforeEach(function() {
    value = {};
  });

  it('calls the callback with the value if passed a value', function() {
    var callback = spy();

    iter(value, callback);

    assert.calledWith(callback, same(value), false);
  });

  it('calls the callback a second time, indicating the end of the iteration', function() {
    var callback = spy();

    iter(value, callback);

    assert.calledTwice(callback);
    assert.calledWith(callback.secondCall, undefined, true);
  });

  it('calls the callback with the eventual value if passed a promise', function(done) {
    var callback = spy(function(result, iterationDone) {
      if (!iterationDone) return;
      process.nextTick(function() { // get out of promise error handling
        assert.calledWith(callback, same(value));
        assert.calledWith(callback.lastCall, undefined, true);
        done();
      });
    });

    iter(Promise.resolve(value), callback);
  });

  it('only calls the callback to signal the end of iteration for a rejected promise', function(done) {
    var callback = spy(function(_, iterationDone) {
      if (!iterationDone) return;
      process.nextTick(function() {
        assert.calledOnce(callback);
        done();
      });
    });

    iter(Promise.reject(), callback);
  });

  it('calls the callback for each value in an array', function() {
    var callback = spy();

    iter(['a', 'b', 'c'], callback);

    assert.calledWith(callback.firstCall, 'a', false);
    assert.calledWith(callback.secondCall, 'b', false);
    assert.calledWith(callback.thirdCall, 'c', false);
    assert.calledWith(callback.lastCall, undefined, true);
  });

  it('calls the callback for each value in an array, waiting for promises to resolve', function(done) {
    var callback = spy(function(result, iterationDone) {
      if (!iterationDone) return;
      process.nextTick(function() { // get out of promise error handling
        assert.calledWith(callback.firstCall, same(value), false);
        assert.calledWith(callback.secondCall, 'b', false);
        assert.calledWith(callback.thirdCall, 'c', false);
        done();
      });
    });

    iter([Promise.resolve(value), Promise.resolve('b'), 'c'], callback);
  });

  it('does not call the callback for rejected promises, and continues iteration', function(done) {
    var callback = spy(function(result, iterationDone) {
      if (!iterationDone) return;
      process.nextTick(function() { // get out of promise error handling
        assert.calledWith(callback.firstCall, same(value), false);
        done();
      });
    });
    iter([Promise.reject(Error('arbitrary')), value], callback);
  });

  it('calls the callback for each value produced by an iterator', function() {
    var callback = spy();

    iter(Iterator('a', 'b', 'c'), callback);

    assert.calledWith(callback.firstCall, 'a', false);
    assert.calledWith(callback.secondCall, 'b', false);
    assert.calledWith(callback.thirdCall, 'c', false);
    assert.calledWith(callback.lastCall, undefined, true);
  });

  it('calls the callback for each value produced by an iterator, waiting for promises to resolve', function(done) {
    var callback = spy(function(result, iterationDone) {
      if (!iterationDone) return;
      process.nextTick(function() { // get out of promise error handling
        assert.calledWith(callback.firstCall, same(value), false);
        assert.calledWith(callback.secondCall, 'b', false);
        assert.calledWith(callback.thirdCall, 'c', false);
        done();
      });
    });

    iter(Iterator(Promise.resolve(value), Promise.resolve('b'), 'c'), callback);
  });

  it('does not call the callback for rejected promises, and continues iteration', function(done) {
    var callback = spy(function(result, iterationDone) {
      if (!iterationDone) return;
      process.nextTick(function() { // get out of promise error handling
        assert.calledWith(callback.firstCall, same(value), false);
        done();
      });
    });
    iter(Iterator(Promise.reject(Error('arbitrary')), value), callback);
  });
});

function Iterator() {
  var items = arguments;
  var position = -1;
  var length = items.length;
  return {
    next: function() {
      position += 1;
      return {value: items[position], done: position >= length};
    }
  };
}
