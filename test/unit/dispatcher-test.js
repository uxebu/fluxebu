var Dispatcher = require('../../lib/dispatcher');
var mockStoreResponse = require('../mock/store-response');

describe('dispatcher:', function() {
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

    var storeResponses = dispatcher.dispatch('arbitrary', null);
    expect(storeResponses['a-store']).toBe(storeA.storeResponse);
    expect(storeResponses['b-store']).toBe(storeB.storeResponse);
    expect(storeResponses['c-store']).toBe(storeC.storeResponse);
    expect(storeResponses.d).toBe(null);
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
      var storeResponses = dispatcher.dispatch('arbitrary', null);
      queryAandB(storeResponses, function(values) {
        expect(values.a).toBe(values.b);
        done();
      });
    });

    it('synchronizes the first store to the second store', function(done) {
      storeA.notify = function(actionType, payload, waitFor) {
        return waitFor('b');
      };
      var storeResponses = dispatcher.dispatch('arbitrary', null);
      queryAandB(storeResponses, function(values) {
        expect(values.a).toBe(values.b);
        done();
      });
    });

    function queryAandB(storeResponses, callback) {
      var values = {};
      storeResponses.a.query(function(error, value) {
        values.a = value;
        if (values.b) { callback(values); }
      });
      storeResponses.b.query(function(error, value) {
        values.b = value;
        if (values.a) { callback(values); }
      });
    }
  });
});

function mockStore() {
  var storeResponse = {};
  var notify = sinon.stub().returns(storeResponse);
  return {
    notify: notify,
    storeResponse: storeResponse
  };
}

function asyncStore(value) {
  var storeResponse = mockStoreResponse.async(value);
  return {notify: function() { return storeResponse; }};
}
