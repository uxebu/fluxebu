var SharedValueStoreResponse = require('../../lib/store-response/shared-value');
var defer = require('../../lib/defer');

var same = sinon.match.same, spy = sinon.spy, stub = sinon.stub;

describe('SharedValueStoreResponse:', function() {
  var response, subscriber;
  var sharedValueMock, wrappedValue;
  beforeEach(function() {
    subscriber = spy();
    wrappedValue = {};
    sharedValueMock = {
      subscribe: stub().yields(wrappedValue),
      unsubscribe: spy()
    };
    response = new SharedValueStoreResponse(sharedValueMock);
  });
  
  it('yields the initial value of the shared value wrapper to queries', function() {
    response.query(subscriber);
    expect(subscriber).toHaveBeenCalledWith(null, same(wrappedValue));
  });

  it('yields the initial value of the shared value wrapper to subscribers', function() {
    response.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledWith(null, same(wrappedValue));
  });

  it('yields any value updates of the shared value wrapper to subscribers', function() {
    var newValue = {arbitrary: true};
    var subscriber = spy();
    response.subscribe(subscriber);
    sharedValueMock.subscribe.yield(newValue);
    expect(subscriber).toHaveBeenCalledWith(null, same(newValue));
  });
  
  it('unsubscribes asynchronously from the shared value if the last subscriber has been removed', function(done) {
    var subscriber = function() {};
    response.subscribe(subscriber);
    response.unsubscribe(subscriber);

    defer(function() {
      expect(sharedValueMock.unsubscribe).toHaveBeenCalled();
      done();
    });
  });
  
  it('unsubscribes from the shared value if no listeners are left (only queries have been registered)', function(done) {
    response.query(function() {});

    defer(function() {
      expect(sharedValueMock.unsubscribe).toHaveBeenCalled();
      done();
    });
  });
});
