var LazyStoreResponse = require('../../lib/store-response/lazy');

var same = sinon.match.same, spy = sinon.spy, stub = sinon.stub;

describe('store-response/lazy:', function() {
  var response, initCallback;
  beforeEach(function() {
    initCallback = stub();
    response = new LazyStoreResponse(initCallback);
  });

  it('invokes the callback as soon as the response is queried', function() {
    response.query(noop);
    expect(initCallback).toHaveBeenCalled();
  });

  it('invokes the callback as soon as the response is subscribed to', function() {
    response.subscribe(noop);
    expect(initCallback).toHaveBeenCalled();
  });

  it('invokes the callback only for the first query', function() {
    response.query(noop);
    response.query(noop);
    expect(initCallback).toHaveBeenCalledOnce();
  });

  it('invokes the callback only for the first subscription or query', function() {
    response.subscribe(noop);
    response.subscribe(noop);
    response.query(noop);
    expect(initCallback).toHaveBeenCalledOnce();
  });

  it('does not invoke the callback without being queried or subscribed to', function() {
    /* jshint nonew: false */
    new LazyStoreResponse(initCallback);
    expect(initCallback).not.toHaveBeenCalled();
  });

  describe('error/value resolution:', function() {
    var error, value;
    beforeEach(function() {
      error = new Error('arbitrary');
      value = {};
      initCallback.yields(error, value);
    });

    it('it notifies all query callbacks about errors and values passed to the passed-in callback', function() {
      var spies = [spy(), spy(), spy()];
      spies.forEach(response.query, response);

      spies.forEach(function(spy) {
        expect(spy).toHaveBeenCalledWith(same(error), same(value));
      });
    });

    it('it notifies all subscribers about errors and values passed to the passed-in callback', function() {
      var spies = [spy(), spy(), spy()];
      spies.forEach(response.subscribe, response);

      spies.forEach(function(spy) {
        expect(spy).toHaveBeenCalledWith(same(error), same(value));
      });
    });

    it('notifies query callbacks and subscribers if errors and values are provided asynchronously', function(done) {
      initCallback.yieldsAsync(error, value);

      var a = spy(), b = spy(), c = spy();
      response.query(a);
      response.query(b);
      response.subscribe(c);

      response.query(function() {
        [a, b, c].forEach(function(spy) {
          expect(spy).toHaveBeenCalledWith(same(error), same(value));
        });
        done();
      });
    });

    it('notifies subscribers about error/value updates', function() {
      var updatedError = null, updatedValue = {arbitrary: 1};
      var subscriber = spy();
      response.subscribe(subscriber);
      initCallback.yield(updatedError, updatedValue);

      expect(subscriber).toHaveBeenCalledWith(updatedError, updatedValue);
    });

    it('does not notify query callbacks about error/value updates', function() {
      var updatedError = null, updatedValue = {arbitrary: 1};
      var callback = spy();
      response.query(callback);
      initCallback.yield(updatedError, updatedValue);

      expect(callback).not.toHaveBeenCalledWith(updatedError, updatedValue);
    });

    it('notifies additional subscribers about any update', function() {
      var subscriber = spy(), newValue = {arbitrary: null};
      response.subscribe(function() {});
      response.subscribe(subscriber);

      initCallback.yield(null, newValue);
      expect(subscriber).toHaveBeenCalledWith(null, same(newValue));
    });
  });

  it('allows subscription callbacks to be unsubscribed', function() {
    var subscriber = spy();
    response.subscribe(subscriber);
    response.unsubscribe(subscriber);
    initCallback.yield(new Error('arbitrary'));
    expect(subscriber).not.toHaveBeenCalled();
  });

  describe('destruction callbacks:', function() {
    var destroy;
    beforeEach(function() {
      destroy = spy();
      initCallback.returns(destroy);
    });

    it('invokes a destruction function returned by the initialization callback when the last query callback is removed asynchronously', function(done) {
      queryAndThenUnsubscribe(response, function() {});
      setTimeout(function() {
        expect(destroy).toHaveBeenCalled();
        done();
      }, 1);
    });

    it('invokes a destruction function returned by the initialization callback when the last subscriber callback is removed asynchronously', function(done) {
      var subscriber = function() {};
      response.subscribe(subscriber);
      response.unsubscribe(subscriber);
      setTimeout(function() {
        expect(destroy).toHaveBeenCalled();
        done();
      }, 1);
    });

    it('does not invoke the destruction callback on arbitrary unsubscribtions', function(done) {
      response.subscribe(function() {});
      response.unsubscribe(function() {});
      setTimeout(function() {
        expect(destroy).not.toHaveBeenCalled();
        done();
      }, 1);
    });
    
    it('invokes the destruction callback asynchronously', function() {
      queryAndThenUnsubscribe(response, function() {});
      expect(destroy).not.toHaveBeenCalled();
    });
    
    it('does not invoke the destruction callback more than once', function(done) {
      queryAndThenUnsubscribe(response, function() {});
      queryAndThenUnsubscribe(response, function() {});
      setTimeout(function() {
        expect(destroy).toHaveBeenCalledOnce();
        done();
      }, 1);
    });
    
    it('does not invoke the destruction callback if another subscriber is added in the meantime', function(done) {
      queryAndThenUnsubscribe(response, function() {});
      response.subscribe(function() {});
      setTimeout(function() {
        expect(destroy).not.toHaveBeenCalled();
        done();
      }, 1);
    });

    it('does not invoke the destruction callback if another query callback is added in the meantime and the response is still awaiting a value', function(done) {
      queryAndThenUnsubscribe(response, function() {});
      response.query(function() {});
      setTimeout(function() {
        expect(destroy).not.toHaveBeenCalled();
        done();
      }, 1);
    });

    it('invokes the destruction callback if another query callback is added in the meantime but the response has received a value', function(done) {
      queryAndThenUnsubscribe(response, function() {});
      initCallback.yield(null, 'arbitrary');
      response.query(function() {});
      setTimeout(function() {
        expect(destroy).toHaveBeenCalled();
        done();
      }, 1);
    });

    it('invokes the destruction callback if another query callback is added in the meantime but the response has received an error', function(done) {
      queryAndThenUnsubscribe(response, function() {});
      initCallback.yield(new Error('arbitrary'));
      response.query(function() {});
      setTimeout(function() {
        expect(destroy).toHaveBeenCalled();
        done();
      }, 1);
    });
    
    it('invokes the destruction callback if only queries were registered and no listeners are remaining', function(done) {
      var initCallback = stub().returns(destroy);
      var response = new LazyStoreResponse(initCallback);
      response.query(function() {});
      response.query(function() {});
      initCallback.yield(null, null);
      setTimeout(function() {
        expect(destroy).toHaveBeenCalled();
        done();
      }, 1);
    });
  });
});

function noop() {}

function queryAndThenUnsubscribe(response, queryCallback) {
  response.query(queryCallback);
  response.unsubscribe(queryCallback);
}
