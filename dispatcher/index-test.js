'use strict';

/*eslint-env mocha */
/*eslint max-nested-callbacks: 0 */

var sinon = require('sinon');

var any = sinon.match.any;
var same = sinon.match.same;
var spy = sinon.spy;

var assert = require('assert');
sinon.assert.expose(assert);

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

  it('passes the passed-in data to all callbacks', function() {
    var callback = spy();
    var data = {};
    dispatcher.register(callback);
    dispatcher.dispatch({}, data);
    assert.calledWith(callback, any, same(data));
  });

  it('passes sub-portions of the data to callbacks, if specified', function() {
    var callback = spy();
    var subData = {};
    var keypath = ['arbitrary', 'keypath'];
    var data = {arbitrary: {keypath: subData}};

    dispatcher.register(callback, keypath);
    dispatcher.dispatch({}, data);
    assert.calledWith(callback, any, same(subData));
  });

  it('passes multiple sub-values to callbacks, if specified', function() {
    var callback = spy();
    var keypath1 = ['a'];
    var keypath2 = ['b'];
    var keypath3 = ['c', 'd'];
    var data1 = {};
    var data2 = {};
    var data3 = {};
    var data = {a: data1, b: data2, c: {d: data3}};

    dispatcher.register(callback, keypath1, keypath2, keypath3);
    dispatcher.dispatch({}, data);
    assert.calledWith(callback, any, same(data1), same(data2), same(data3));
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

  it('supports registration with strings as keypaths', function() {
    var callback = spy();
    var data = {ab: {cd: {ef: {}, gh: {}}}};
    dispatcher.register(callback, 'ab.cd.ef', 'ab.cd.gh');
    dispatcher.dispatch({}, data);
    assert.calledWith(callback, any, data.ab.cd.ef, data.ab.cd.gh);
  });

  it('supports deregistration with strings as keypaths', function() {
    var callback = spy();
    dispatcher.register(callback, ['ab', 'cd', 'ef'], ['ab', 'cd', 'gh']);
    dispatcher.unregister(callback, 'ab.cd.ef', 'ab.cd.gh');
    dispatcher.dispatch({}, {});
    assert.notCalled(callback);
  });
});

function noop() {}
