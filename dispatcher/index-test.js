'use strict';

/*eslint-env mocha */
/*eslint max-nested-callbacks: 0 */

var sinon = require('sinon');
var assert = require('assert');
sinon.assert.expose(assert, {prefix: ''});

var any = sinon.match.any;
var same = sinon.match.same;
var spy = sinon.spy;

var Promise = global.Promise || require('pinkie-promise');

var Dispatcher = require('./index');

describe('dispatcher:', function() {
  var dispatcher;
  beforeEach(function() {
    dispatcher = new Dispatcher();
  });

  it('passes actions to all registered callbacks', function() {
    var action = {};
    var callbacks = [spy(), spy(), spy()];
    callbacks.forEach(function(callback) { dispatcher.register(callback); });

    dispatcher.dispatch(action);
    callbacks.forEach(function(callback) {
      assert.calledWith(callback, same(action));
    });
  });

  it('allows to unregister callbacks', function() {
    var cb = spy();
    [noop, cb, noop].forEach(function(callback) { dispatcher.register(callback); });
    dispatcher.unregister(cb);

    dispatcher.dispatch({});
    assert.notCalled(cb);
  });

  it('allows to unregister callbacks that have not been registered', function() {
    var cb = function() {};

    assert.doesNotThrow(function() {
      dispatcher.unregister(cb);
    });
  });

  it('still dispatches to callbacks that are removed during that dispatch', function() {
    var cb = spy();
    var remove = function() { dispatcher.unregister(cb); };
    [remove, cb, remove].forEach(function(callback) { dispatcher.register(callback); });
    dispatcher.dispatch({});

    assert.called(cb);
  });

  it('does not dispatch to callbacks that are added during a dispatch in the same dispatch', function() {
    var cb = spy();
    function add() { dispatcher.register(cb); }
    dispatcher.register(add);
    dispatcher.dispatch({});

    assert.notCalled(cb);
  });

  it('unregisters a function only for the registration keypaths', function() {
    var callback1 = spy();
    var callback2 = spy();
    var callback3 = spy();

    dispatcher.register(callback1, ['foo']);
    dispatcher.register(callback2, ['foo']);
    dispatcher.register(callback3, ['foo'], ['bar']);
    dispatcher.unregister(callback1, ['foo', 'bar']);
    dispatcher.unregister(callback2, ['foo']);
    dispatcher.unregister(callback3, ['foo'], ['bar']);
    dispatcher.dispatch({}, {});

    assert.called(callback1);
    assert.notCalled(callback2);
    assert.notCalled(callback3);
  });

  it('supports deregistration with strings as keypaths', function() {
    var callback = spy();
    dispatcher.register(callback, ['ab', 'cd', 'ef'], ['ab', 'cd', 'gh']);
    dispatcher.unregister(callback, 'ab.cd.ef', 'ab.cd.gh');
    dispatcher.dispatch({}, {});
    assert.notCalled(callback);
  });

  describe('consumption of data transformations:', function() {
    it('passes the passed-in action data to all transformations', function() {
      var transformations = [spy(), spy(), spy()];
      var action = {};
      var data = {};
      dispatcher.register(returns(transformations));
      dispatcher.dispatch(action, data);
      transformations.forEach(function(transformation) {
        assert.calledWith(transformation, same(action), same(data));
      });
    });

    it('passes sub-portions of the data to transformations if specified', function() {
      var transformation = spy();
      var subData = {};
      var keypath = ['arbitrary', 'keypath'];
      var data = {arbitrary: {keypath: subData}};

      dispatcher.register(returns(transformation), keypath);
      dispatcher.dispatch({}, data);
      assert.calledWith(transformation, any, same(subData));
    });

    it('passes multiple sub-values to callbacks, if specified', function() {
      var transformation = spy();
      var keypath1 = ['a'];
      var keypath2 = ['b'];
      var keypath3 = ['c', 'd'];
      var data1 = {};
      var data2 = {};
      var data3 = {};
      var data = {a: data1, b: data2, c: {d: data3}};

      dispatcher.register(returns(transformation), keypath1, keypath2, keypath3);
      dispatcher.dispatch({}, data);
      assert.calledWith(transformation, any, same(data1), same(data2), same(data3));
    });

    it('supports registration with strings as keypaths', function() {
      var transformation = spy();
      var data = {ab: {cd: {ef: {}, gh: {}}}};
      dispatcher.register(returns(transformation), 'ab.cd.ef', 'ab.cd.gh');
      dispatcher.dispatch({}, data);
      assert.calledWith(transformation, any, data.ab.cd.ef, data.ab.cd.gh);
    });

    it('invokes the callback after all transformations have run', function(testDone) {
      var a = spy(function a() {});
      var b = spy(function b() {});
      var c = spy(function c() {});
      var d = spy(function d() {});
      var e = spy(function e() {});

      dispatcher.register(returns([Promise.resolve(a), Promise.resolve(b)]));
      dispatcher.register(returns(Iterator(Promise.resolve(c), Promise.resolve(d))));
      dispatcher.register(returns(Promise.resolve(e)));

      dispatcher.dispatch({}, {}, function(_, dispatchingDone) {
        if (!dispatchingDone) return;
        [a, b, c, d, e].forEach(assert.called);
        testDone();
      });
    });

    it('calls transformations in callback order, waiting for promises', function() {
      var a = spy(function a() {});
      var b = spy(function b() {});
      var c = spy(function c() {});
      var promise = Promise.resolve(c);

      dispatcher.register(returns([a, promise]));
      dispatcher.register(returns(b));
      dispatcher.dispatch({}, {});
      return promise.then(function() {
        process.nextTick(assert.callOrder, a, b, c);
      });
    });
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
function noop() {}
function returns(value) {
  return function() { return value; };
}
