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

    it('forwards the passed-in data to the wrapped dispatcher', function() {
      var data = {arbitrary: 'data'};
      var statefulDispatcher = StatefulDispatcher(dispatcher, data);

      statefulDispatcher.dispatch({});

      assert.calledWith(dispatcher.dispatch, any, same(data));
    });

    it('uses data provided by the wrapped dispatcher for the next dispatch', function() {
      var statefulDispatcher = StatefulDispatcher(dispatcher);
      var data = {arbitrary: 'data'};
      statefulDispatcher.dispatch({});
      dispatcher.dispatch.callArg(2, data);
      statefulDispatcher.dispatch({});
      assert.calledWith(dispatcher.dispatch.secondCall, any, data);
    });

    it('passes the optional `updated data` getter to the wrapped dispatcher, to sync data across dispatches', function() {
      var statefulDispatcher = StatefulDispatcher(dispatcher);
      statefulDispatcher.dispatch({});
      var updatedData = dispatcher.dispatch.args[0][3];
      var data1 = {};
      var data2 = {};

      dispatcher.dispatch.callArg(2, data1);
      assert.equal(updatedData(), data1);

      dispatcher.dispatch.callArg(2, data2);
      assert.equal(updatedData(), data2);
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

  describe('binding action creators:', function() {
    var statefulDispatcher, actionCreatorA, actionCreatorB, actionCreatorC;
    beforeEach(function() {
      statefulDispatcher = StatefulDispatcher(dispatcher);
      spy(statefulDispatcher, 'dispatch');
      actionCreatorA = spy(function() { return {type: 'A'}; });
      actionCreatorB = spy(function() { return {type: 'B'}; });
      actionCreatorC = spy(function() { return {type: 'C'}; });
    });

    it('wraps action creators, so that their return value is dispatched on the dispatcher', function() {
      var actions = statefulDispatcher.bindActions({
        a: actionCreatorA,
        b: actionCreatorB,
        c: actionCreatorC
      });

      actions.a();
      assert.calledWith(dispatcher.dispatch, {type: 'A'});

      actions.b();
      assert.calledWith(dispatcher.dispatch, {type: 'B'});

      actions.c();
      assert.calledWith(dispatcher.dispatch, {type: 'C'});
    });

    it('passes all arguments passed to the wrapper on to the action creator', function() {
      var actions = statefulDispatcher.bindActions({a: actionCreatorA});
      var arbitraryObject = {arbitrary: 'object'};
      actions.a(1, 2, arbitraryObject, null, true, 'abc');

      assert.calledWith(actionCreatorA, 1, 2, same(arbitraryObject), null, true, 'abc');
    });
  });
});
