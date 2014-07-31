var Dispatcher = require('../src/dispatcher');

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
});

function mockStore() {
  var storeView = {};
  var notify = sinon.stub().returns(storeView);
  return {
    notify: notify,
    storeView: storeView
  };
}
