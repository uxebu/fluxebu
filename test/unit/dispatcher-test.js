var Dispatcher = require('../../src/dispatcher');

describe('dispatcher', function() {
  var dispatcher, storeA, storeB, storeC;
  beforeEach(function() {
    storeA = mockStore();
    storeB = mockStore();
    storeC = mockStore();
    dispatcher = new Dispatcher();
    dispatcher.subscribeStore('a-store', storeA);
    dispatcher.subscribeStore('b-store', storeB);
    dispatcher.subscribeStore('c-store', storeC);
  });

  it('notifies all subscribed stores with the payload when an action is dispatched', function() {
    var actionType = 'arbitrary', payload = {arbitrary: 'payload'};
    dispatcher.dispatch(actionType, payload);
    expect(storeA.notify).toHaveBeenCalledWith(actionType, payload);
    expect(storeB.notify).toHaveBeenCalledWith(actionType, payload);
    expect(storeC.notify).toHaveBeenCalledWith(actionType, payload);
  });

  it('does not notify stores that have been unsubscribed', function() {
    dispatcher.unsubscribeStore('b-store');
    dispatcher.dispatch('arbitrary', null);
    expect(storeB.notify).not.toHaveBeenCalled();
  });

  it('`dispatch()` returns an object that collects the return values of the notified stores', function() {
    dispatcher.subscribeStore('d', {notify: function() { return null; }});

    var storeViews = dispatcher.dispatch('arbitrary', null);
    expect(storeViews['a-store']).toBe(storeA.storeView);
    expect(storeViews['b-store']).toBe(storeB.storeView);
    expect(storeViews['c-store']).toBe(storeC.storeView);
    expect(storeViews.d).toBe(null);
  });

  describe('synchronisation:', function() {
    var storeA, storeB;
    beforeEach(function() {
      dispatcher = new Dispatcher();
      storeA = asyncStore('A');
      storeB = asyncStore('B');
      dispatcher.subscribeStore('a', storeA);
      dispatcher.subscribeStore('b', storeB);
    });

    it('synchronizes the second store to the first store', function(done) {
      storeB.notify = function(actionType, payload, waitFor) {
        return waitFor('a');
      };
      var storeViews = dispatcher.dispatch('arbitrary', null);
      queryAandB(storeViews, function(values) {
        expect(values.a).toBe(values.b);
        done();
      });
    });

    it('synchronizes the first store to the second store', function(done) {
      storeA.notify = function(actionType, payload, waitFor) {
        return waitFor('b');
      };
      var storeViews = dispatcher.dispatch('arbitrary', null);
      queryAandB(storeViews, function(values) {
        expect(values.a).toBe(values.b);
        done();
      });
    });

    function queryAandB(storeViews, callback) {
      var values = {};
      storeViews.a.query(function(value) {
        values.a = value;
        if (values.b) { callback(values); }
      });
      storeViews.b.query(function(value) {
        values.b = value;
        if (values.a) { callback(values); }
      });
    }
  });
});

function mockStore() {
  var storeView = {};
  var notify = sinon.stub().returns(storeView);
  return {
    notify: notify,
    storeView: storeView
  };
}

function asyncStore(value) {
  return {
    notify: function() {
      return {
        query: function(callback) {
          process.nextTick(function() { callback(value); });
        }
      };
    }
  };
}
