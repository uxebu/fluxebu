'use strict';
/*eslint-env mocha */
/*eslint max-nested-callbacks: 0 */

var sinon = require('sinon');
var assert = require('assert');
sinon.assert.expose(assert, {prefix: ''});
var stub = sinon.stub;
var spy = sinon.spy;
var same = sinon.match.same;
var any = sinon.match.any;

var StaticDispatcher = require('./static');

describe('static dispatcher wrapper:', function() {
  var dispatcher;
  beforeEach(function() {
    dispatcher = {
      dispatch: stub(),
      register: stub()
    };
  });

  it('delegates `register` to the `register` method of the wrapped dispatcher', function() {
    var staticDispatcher = StaticDispatcher(dispatcher);
    var returnValue = {};
    var handler = function() {};
    var keypath = ['arbitrary', 'keypath'];
    var keypath2 = ['another', 'keypath'];
    dispatcher.register.returns(returnValue);

    assert.strictEqual(
      staticDispatcher.register(handler, keypath, keypath2),
      returnValue
    );
    assert.calledWithExactly(
      dispatcher.register, same(handler), same(keypath), same(keypath2));
  });

  describe('dispatching:', function() {
    it('forwards the passed-in action to the wrapped dispatcher', function() {
      var staticDispatcher = StaticDispatcher(dispatcher);
      var action = {arbitrary: 'action'};
      staticDispatcher.dispatch(action);

      assert.calledWith(dispatcher.dispatch, same(action));
    });

    it('forwards the passed-in data to the wrapped dispatcher', function() {
      var data = {arbitrary: 'data'};
      var staticDispatcher = StaticDispatcher(dispatcher);
      staticDispatcher.dispatch({}, data);

      assert.calledWith(dispatcher.dispatch, any, same(data));
    });

    it('passes on the callback to the wrapped dispatcher, filtering out all but the final call', function() {
      var onData = spy();
      var staticDispatcher = StaticDispatcher(dispatcher);
      staticDispatcher.dispatch({}, {}, onData);

      dispatcher.dispatch.yield('a', false);
      dispatcher.dispatch.yield('b', false);
      dispatcher.dispatch.yield('c', true);

      assert.calledOnce(onData);
      assert.calledWithExactly(onData, 'c');
    });
  });
});
