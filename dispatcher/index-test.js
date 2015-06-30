'use strict';

/*eslint-env mocha */
/*eslint max-nested-callbacks: 0 */

var sinon = require('sinon');
var assert = require('assert');
sinon.assert.expose(assert, {prefix: ''});

var any = sinon.match.any;
var same = sinon.match.same;
var spy = sinon.spy;
var stub = sinon.stub;

var Promise = global.Promise || require('pinkie-promise');
var Dispatcher = require('./index');
var iteratorOf = require('../iterator-of');

describe('dispatcher:', function() {
  var dispatcher;
  beforeEach(function() {
    dispatcher = Dispatcher();
  });

  it('passes actions and data to all registered handlers', function() {
    var handlers = [spy(), spy(), spy()];
    handlers.forEach(function(handler) { dispatcher.register(handler); });

    var action = {};
    var data = {};
    dispatcher.dispatch(action, data);

    handlers.forEach(function(handler) {
      assert.calledWith(handler, same(action), same(data));
    });
  });

  describe('data subtrees:', function() {
    var data;
    beforeEach(function() {
      data = {a: {}, b: [null, null, {c: {}}]};
    });

    it('passes subtrees of the data to handlers, depending on registration', function() {
      var a = spy();
      var b = spy();
      dispatcher.register(a, ['a']);
      dispatcher.register(b, ['b', 2]);

      dispatcher.dispatch({}, data);
      assert.calledWith(a, {}, same(data.a));
      assert.calledWith(b, {}, same(data.b[2]));
    });

    it('allows keypath to be strings', function() {
      var a = spy();
      var b = spy();
      dispatcher.register(a, 'a');
      dispatcher.register(b, 'b.2.c');

      dispatcher.dispatch({}, data);
      assert.calledWith(a, {}, same(data.a));
      assert.calledWith(b, {}, same(data.b[2].c));
    });

    it('allows handlers to be registered with multiple subpaths', function() {
      var handler = spy();
      dispatcher.register(handler, ['a'], [], 'b.2');

      dispatcher.dispatch({}, data);
      assert.calledWith(handler, any, same(data.a), same(data), same(data.b[2]));
    });

    it('uses the passed in `get` function to retrieve sub-objects', function() {
      var get = stub();
      var keypath1 = ['a', 'b', 'c'];
      var keypath2 = 'de.fg.hi';
      var keypath3 = ['jk', 0, 'lm'];
      var handler = spy();
      data = [{}, {}, {}];

      dispatcher = Dispatcher(get);
      dispatcher.register(handler, keypath1, keypath2);
      dispatcher.register(handler, keypath3);
      get.withArgs(same(data), keypath1).returns(data[0]);
      get.withArgs(same(data), keypath2.split('.')).returns(data[1]);
      get.withArgs(same(data), keypath3).returns(data[2]);

      dispatcher.dispatch({}, data);
      assert.calledWith(handler, any, same(data[0]), same(data[1]));
      assert.calledWith(handler, any, same(data[2]));
    });
  });

  it('allows to unregister handlers', function() {
    var handler = spy();
    dispatcher.register(noop);
    var unregister = dispatcher.register(handler);
    dispatcher.register(noop);

    unregister();
    dispatcher.dispatch({}, {});
    assert.notCalled(handler);
  });

  it('still dispatches ponm handlers that are removed during that dispatch', function() {
    var handler = spy();
    var remove;
    var removeHandler = function() { remove(); };
    dispatcher.register(removeHandler);
    remove = dispatcher.register(handler);
    dispatcher.register(removeHandler);

    dispatcher.dispatch({}, {});

    assert.called(handler);
  });

  it('does not dispatch to callbacks that are added during a dispatch in the same dispatch', function() {
    var handler = spy();
    function add() { dispatcher.register(handler); }
    dispatcher.register(add);
    dispatcher.register(noop);
    dispatcher.dispatch({}, {});

    assert.notCalled(handler);
  });

  describe('data transformation:', function() {
    var data1, data2;
    beforeEach(function() {
      data1 = {abc: {}};
      data2 = {};
    });

    it('uses the data returned by each handler to pass it to the next handler', function() {
      var handler1 = stub().returns(data1);
      var handler2 = stub().withArgs(same(data1)).returns(data2);
      var handler3 = spy();

      dispatcher.register(handler1);
      dispatcher.register(handler2);
      dispatcher.register(handler3);

      dispatcher.dispatch({}, {});
      assert.calledWith(handler2, any, same(data1));
      assert.calledWith(handler3, any, same(data2));
    });

    it('merges returned sub-tree data into the root object using the provided `set` function ', function() {
      var handler1 = stub().returns(data2);
      var keypath = ['abc', 'def'];
      var set = spy();

      dispatcher = new Dispatcher(undefined, set);
      dispatcher.register(handler1, keypath);

      dispatcher.dispatch({}, data1);
      assert.calledWith(set, same(data1), keypath, same(data2));
    });

    it('calls the passed-in callback with the result of the last handler', function() {
      var lastStore = stub().returns(data1);
      var callback = spy();
      [stub(), stub(), lastStore]
        .forEach(function(store) { dispatcher.register(store); });

      dispatcher.dispatch({}, {}, callback);

      assert.calledWith(callback, same(data1), true);
    });

  });

  describe('additional actions to dispatch:', function() {
    it('dispatches an additional action scheduled by a store after the first action', function() {
      var action1 = {};
      var action2 = {};
      var store1 = spy();
      var store2 =
        stub()
          .withArgs(same(action1))
          .returns(iteratorOf({a: 2}, action2));
      var store3 = spy();

      dispatcher.register(store1);
      dispatcher.register(store2);
      dispatcher.register(store3);

      dispatcher.dispatch(action1, {a: 1});

      assert.calledWith(store1.firstCall, same(action1), any);
      assert.calledWith(store2.firstCall, same(action1), any);
      assert.calledWith(store3.firstCall, same(action1), any);
      assert.calledWith(store1.secondCall, same(action2), any);
      assert.calledWith(store2.secondCall, same(action2), any);
      assert.calledWith(store3.secondCall, same(action2), any);
    });
  });
});


function noop() {}
