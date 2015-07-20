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

  describe('dispatch:', function() {
    var action, data, handlers;
    beforeEach(function() {
      action = {};
      data = {};
      handlers = [spy(), spy(), spy()];
      handlers.forEach(function(handler) { dispatcher.register(handler); });
    });

    it('passes actions and data to all registered handlers', function() {
      dispatcher.dispatch(action, data);

      handlers.forEach(function(handler) {
        assert.calledWith(handler, same(action), same(data));
      });
    });

    it('allows to dispatch a promise via the dispatch method', function(done) {
      var fakePromise = {then: stub()};
      dispatcher.dispatch(fakePromise, data, function(_, isDone) {
        if (!isDone) return;

        handlers.forEach(function(handler) {
          assert.calledOnce(handler);
          assert.calledWith(handler, same(action), same(data));
        });
        done();
      });

      fakePromise.then.yield(action);
    });

    it('uses a provided ', function() {

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

    describe('`equals` function:', function() {
      var action1, action2, store1, store2;
      beforeEach(function() {
        action1 = {action: 1};
        action2 = {action: 2};
        store1 = stub();
        store2 = stub();

        store1
          .onFirstCall(action1)
          .returns(iteratorOf('a', action2));

        store2
          .withArgs(action2)
          .returns(iteratorOf('b'));
      });

      it('uses the passed-in `equals` function to decide whether to call the update handler', function(done) {
        function equals(a, b) { return a === b; }
        dispatcher = Dispatcher(undefined, undefined, equals);

        dispatcher.register(store1);
        dispatcher.register(store2);

        var onUpdate = spy(function(_, isDone) {
          if (!isDone) return;

          assert.neverCalledWith(onUpdate, 'a', false);
          done();
        });
        dispatcher.dispatch({}, 'a', onUpdate);
      });

      it('still calls the update handler after all actions have been handled', function(done) {
        function equals() { return true; }
        dispatcher = Dispatcher(undefined, undefined, equals);

        dispatcher.register(store1);
        dispatcher.register(store2);

        var onUpdate = spy(function(_, isDone) {
          if (!isDone) return;

          assert.calledWith(onUpdate, 'b', true);
          done();
        });
        dispatcher.dispatch({}, 'a', onUpdate);
      });
    });

    it('uses the passed in `equals` function to decide whether to call the data change handler', function() {
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

  it('still dispatches on handlers that are removed during a dispatch', function() {
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

      dispatcher = Dispatcher(undefined, set);
      dispatcher.register(handler1, keypath);

      dispatcher.dispatch({}, data1);
      assert.calledWith(set, same(data1), keypath, same(data2));
    });

    it('uses the return value of the passed in `set` function as data', function() {
      var handler = stub().returns(data2);
      var handler2 = spy();
      var keypath = ['abc', 'def'];
      var returnValue = {};
      var set = stub();
      set
        .withArgs(same(data1), keypath, same(data2))
        .returns(returnValue);

      dispatcher = Dispatcher(undefined, set);
      dispatcher.register(handler, keypath);
      dispatcher.register(handler2);
      dispatcher.dispatch({}, data1);
      assert.calledWith(handler2, any, same(returnValue));
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
    var action1, action2, action3, action4, action5, store1, store2, store3;
    beforeEach(function() {
      action1 = {action: 1};
      action2 = {action: 2};
      action3 = {action: 3};
      action4 = {action: 4};
      action5 = {action: 5};
      store1 = stub();
      store2 = stub();
      store3 = stub();
      dispatcher.register(store1);
      dispatcher.register(store2);
      dispatcher.register(store3);
    });

    it('dispatches an additional action scheduled by a store after the first action', function() {
      store2
        .withArgs(same(action1))
        .returns(iteratorOf({a: 2}, action2));

      dispatcher.dispatch(action1, {a: 1});

      [action1, action2].forEach(function(action, i) {
        assert.calledWith(store1.getCall(i), same(action), any);
        assert.calledWith(store2.getCall(i), same(action), any);
        assert.calledWith(store3.getCall(i), same(action), any);
      });
    });

    it('dispatches multiple additional actions scheduled by a store after the first action', function() {
      store2
        .withArgs(same(action1))
        .returns(iteratorOf({a: 2}, action2, action3, action4));

      dispatcher.dispatch(action1, {a: 1});

      [action1, action2, action3, action4].forEach(function(action, i) {
        assert.calledWith(store1.getCall(i), same(action), any);
        assert.calledWith(store2.getCall(i), same(action), any);
        assert.calledWith(store3.getCall(i), same(action), any);
      });
    });

    it('dispatches multiple additional actions scheduled by different stores after other actions', function() {
      store1
        .withArgs(same(action1))
        .returns(iteratorOf(undefined, action2));
      store2
        .withArgs(same(action3))
        .returns(iteratorOf(undefined, action4, action5));
      store3
        .withArgs(same(action2))
        .returns(iteratorOf(undefined, action3));

      dispatcher.dispatch(action1, {});

      [action1, action2, action3, action4, action5].forEach(function(action, i) {
        assert.calledWith(store1.getCall(i), same(action), any);
        assert.calledWith(store2.getCall(i), same(action), any);
        assert.calledWith(store3.getCall(i), same(action), any);
      });
    });

    it('handles values contained by the eventual call to `iterator.next()`, too', function() {
      var next = stub();
      next.returns({done: true});
      next.onFirstCall().returns({value: undefined});
      next.onSecondCall().returns({value: action2});
      next.onThirdCall().returns({value: action3, done: true});

      store1
        .withArgs(same(action1))
        .returns({next: next});

      dispatcher.dispatch(action1, undefined);

      [action1, action2, action3].forEach(function(action, i) {
        assert.calledWith(store1.getCall(i), same(action), any);
        assert.calledWith(store2.getCall(i), same(action), any);
        assert.calledWith(store3.getCall(i), same(action), any);
      });
    });

    it('filters out `undefined` values', function() {
      store3
        .withArgs(same(action1))
        .returns(iteratorOf({}, undefined, action2, undefined, undefined, action3));

      dispatcher.dispatch(action1, {});

      [action1, action2, action3].forEach(function(action, i) {
        assert.calledWith(store1.getCall(i), same(action), any);
        assert.calledWith(store2.getCall(i), same(action), any);
        assert.calledWith(store3.getCall(i), same(action), any);
      });
    });

    it('invokes the callback only once after all actions have run, with the eventual data', function() {
      var data1 = {data: 1};
      var data2 = {data: 2};
      var data3 = {data: 3};
      var onDone = spy();

      store3
        .withArgs(same(action1))
        .returns(iteratorOf(data1, action2));
      store2
        .withArgs(same(action2))
        .returns(iteratorOf(data2, action3));
      [store1, store2, store3].forEach(function(store) {
        store.withArgs(same(action3)).returns(data3);
      });

      dispatcher.dispatch(action1, {}, onDone);
      assert.calledOnce(onDone);
      assert.calledWith(onDone, data3, true);
    });

    describe('promises:', function() {
      var data1, data2, data3, data4;
      beforeEach(function() {
        data1 = {data: 1};
        data2 = {data: 2};
        data3 = {data: 3};
        data4 = {data: 4};

        store1
          .withArgs(same(action1))
          .returns(iteratorOf(data2, Promise.resolve(action3), action4));

        store2
          .withArgs(same(action1))
          .returns(iteratorOf(data3, action2));

        store3
          .withArgs(same(action3))
          .returns(iteratorOf(data4, action5));
      });

      it('can wait for future actions wrapped with promises', function(done) {
        dispatcher.dispatch(action1, data1, function(_, isDone) {
          if (!isDone) return;

          [action1, action2, action3, action4, action5].forEach(function(action, i) {
            assert.calledWith(store1.getCall(i), same(action), any);
            assert.calledWith(store2.getCall(i), same(action), any);
            assert.calledWith(store3.getCall(i), same(action), any);
          });
          done();
        });
      });

      it('uses data returned by the stores, correctly handing it on on following dispatches', function(done) {
        dispatcher.dispatch(action1, data1, function(eventualData, isDone) {
          if (!isDone) return;

          [data1, data3, data3, data4, data4].forEach(function(data, i) {
            assert.calledWith(store1.getCall(i), any, same(data));
          });
          [data2, data3, data3, data4, data4].forEach(function(data, i) {
            assert.calledWith(store2.getCall(i), any, same(data));
          });
          [data3, data3, data3, data4, data4].forEach(function(data, i) {
            assert.calledWith(store3.getCall(i), any, same(data));
          });

          done();
        });
      });

      it('works correctly with subtrees', function(done) {
        dispatcher = Dispatcher();
        var dataTree = {a: null, b: null, c: {d: null}};

        var storeA = stub();
        var storeB = stub();
        var storeC = stub();

        storeA
          .withArgs(same(action1))
          .returns(iteratorOf(undefined, Promise.resolve(action2)));

        storeA
          .withArgs(same(action1))
          .returns('a');

        storeB
          .withArgs(same(action2))
          .returns(iteratorOf('b', Promise.resolve(action3)));

        storeC
          .withArgs(same(action3))
          .returns(iteratorOf('d', Promise.resolve(action4)));

        dispatcher.register(storeA, ['a']);
        dispatcher.register(storeB, ['b']);
        dispatcher.register(storeC, ['c']);
        dispatcher.dispatch(action1, dataTree, function(updatedData, isDone) {
          if (!isDone) return;
          done();

          assert.deepEqual(updatedData, {a: 'a', b: 'b', c: {d: 'd'}});
        });
      });

      it('calls the callback for every data change', function(done) {
        var store4 = stub();
        var action6 = {action: 6};
        var eventualData = {data: 'eventual'};
        dispatcher.register(store4);

        store4
          .withArgs(same(action3))
          .returns(iteratorOf(undefined, Promise.resolve(action6)));
        store4
          .withArgs(same(action6))
          .returns(eventualData);

        var callback = spy(function(_, isDone) {
          if (!isDone) return;

          assert.calledWith(callback.firstCall, same(data3), false);
          assert.calledWith(callback.secondCall, same(data4), false);
          assert.calledWith(callback.thirdCall, same(eventualData), true);

          done();
        });

        dispatcher.dispatch(action1, data1, callback);
      });
    });
  });

  describe('retrieval of data that has changed over time:', function() {
    var fakePromise, data, replacedData;
    beforeEach(function() {
      fakePromise = {then: stub()};
      data = {initial: 'data'};
      replacedData = {replaced: 'data'};
    });

    it('uses functions passed as `data` parameter to re-fetch data after promises resolve', function(done) {
      var action1 = {action: 1};
      var action2 = {action: 2};
      var store = stub()
        .withArgs(action1)
        .returns(iteratorOf(undefined, fakePromise));
      dispatcher.register(store);

      function onData(_, isDone) {
        if (!isDone) return;

        assert.calledWith(store, action2, replacedData);
        done();
      }

      var getData = stub().returns(data);
      dispatcher.dispatch(action1, getData, onData);
      getData.returns(replacedData);
      fakePromise.then.yield(action2);
    });

    it('also uses the getter when dispatching a promise directly', function(done) {
      var action = {action: 1};
      var store = spy();
      dispatcher.register(store);

      function onData(_, isDone) {
        if (!isDone) return;

        assert.calledWith(store, action, replacedData);
        done();
      }

      var getData = stub().returns(data);
      dispatcher.dispatch(fakePromise, getData, onData);
      getData.returns(replacedData);
      fakePromise.then.yield(action);
    });
  });
});

function noop() {}
