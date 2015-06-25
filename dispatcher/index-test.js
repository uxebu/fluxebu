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
    it('uses the data returned by each handler to pass it to the next handler', function() {
      var data1 = {};
      var data2 = {};
      var store1 = stub().returns(data1);
      var store2 = stub().withArgs(same(data1)).returns(data2);
      var store3 = spy();

      dispatcher.register(store1);
      dispatcher.register(store2);
      dispatcher.register(store3);

      dispatcher.dispatch({}, {});
      assert.calledWith(store2, any, same(data1));
      assert.calledWith(store3, any, same(data2));
    });
  });

  xdescribe('consumption of data transformations:', function() {
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
