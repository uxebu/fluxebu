'use strict';
/*eslint-env mocha */
/*eslint max-nested-callbacks: 0 */

var sinon = require('sinon');
var assert = require('assert');
sinon.assert.expose(assert, {prefix: ''});
var stub = sinon.stub;
var spy = sinon.spy;
var same = sinon.match.same;

var StatefulDispatcher = require('./stateful');

describe('stateful dispatcher wrapper:', function() {
  var dispatcher;
  beforeEach(function() {
    dispatcher = {
      dispatch: stub(),
      register: stub()
    };
  });

  it('delegates `register` to the `register` method of the wrapped dispatcher', function() {
    var statefulDispatcher = StatefulDispatcher(dispatcher);
    var returnValue = {};
    var handler = function() {};
    var keypath = ['arbitrary', 'keypath'];
    var keypath2 = ['another', 'keypath'];
    dispatcher.register.returns(returnValue);

    assert.strictEqual(
      statefulDispatcher.register(handler, keypath, keypath2),
      returnValue
    );
    assert.calledWithExactly(
      dispatcher.register, same(handler), same(keypath), same(keypath2));
  });

  describe('dispatching:', function() {
    it('forwards the passed-in action to the wrapped dispatcher', function() {
      var statefulDispatcher = StatefulDispatcher(dispatcher);
      var action = {arbitrary: 'action'};

      statefulDispatcher.dispatch(action);

      assert.calledWith(dispatcher.dispatch, same(action));
    });

    it('wraps the passed in data in a data pointer and forwards that', function() {
      var data = {arbitrary: 'data'};
      var statefulDispatcher = StatefulDispatcher(dispatcher, data);
      statefulDispatcher.dispatch({});

      var dataPointer = dispatcher.dispatch.firstCall.args[1];
      assert.equal(dataPointer.get(), data);

      var newData = {other: 'data'};
      dataPointer.set(newData);
      assert.equal(dataPointer.get(), newData);
    });

    it('uses the same shared data pointer across dispatches', function() {
      var statefulDispatcher = StatefulDispatcher(dispatcher, {});
      statefulDispatcher.dispatch({});
      statefulDispatcher.dispatch({});
      statefulDispatcher.dispatch({});

      var firstCallDataPointer = dispatcher.dispatch.firstCall.args[1];
      var secondCallDataPointer = dispatcher.dispatch.secondCall.args[1];
      var thirdCallDataPointer = dispatcher.dispatch.thirdCall.args[1];

      assert.equal(firstCallDataPointer, secondCallDataPointer);
      assert.equal(firstCallDataPointer, thirdCallDataPointer);
    });

    it('uses the passed-in data callback for all dispatches', function() {
      var onData = spy();
      var statefulDispatcher = StatefulDispatcher(dispatcher, {}, onData);
      statefulDispatcher.dispatch({});

      dispatcher.dispatch.yield();

      assert.called(onData);
    });

    it('filters out the `isDone` parameter passed to the callback', function() {
      var onData = spy();
      var statefulDispatcher = StatefulDispatcher(dispatcher, {}, onData);
      statefulDispatcher.dispatch({});

      dispatcher.dispatch.yield('a', false);
      dispatcher.dispatch.yield('b', true);

      assert.calledWithExactly(onData, 'a');
      assert.calledWithExactly(onData, 'b');
    });
  });
});
