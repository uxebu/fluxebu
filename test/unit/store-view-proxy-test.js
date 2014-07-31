var StoreViewProxy = require('../../src/store-view-proxy');
var StoreViewMock = require('../mock/store-view');

describe('StoreViewProxy:', function() {
  var proxy, wrapped;
  var callbacks;
  beforeEach(function() {
    proxy = new StoreViewProxy();
    wrapped = new StoreViewMock();
    callbacks = [function() {}, function() {}, function() {}];
  });

  it('proxies query callbacks once resolved', function() {
    callbacks.forEach(proxy.query, proxy);
    proxy.resolve(wrapped);

    expect(wrapped.query).toHaveBeenCalledWith(callbacks[0]);
    expect(wrapped.query).toHaveBeenCalledWith(callbacks[1]);
    expect(wrapped.query).toHaveBeenCalledWith(callbacks[2]);
  });

  it('proxies subscription callbacks once resolved', function() {
    callbacks.forEach(proxy.subscribe, proxy);
    proxy.unsubscribe(callbacks[1]);
    proxy.resolve(wrapped);

    expect(wrapped.subscribe).toHaveBeenCalledWith(callbacks[0]);
    expect(wrapped.subscribe).not.toHaveBeenCalledWith(callbacks[1]);
    expect(wrapped.subscribe).toHaveBeenCalledWith(callbacks[2]);
  });

  describe('once resolved:', function() {
    beforeEach(function() {
      proxy.resolve(wrapped);
    });
    it('throws an error when resolved again', function() {
      expect(function() {
        proxy.resolve(new StoreViewMock());
      }).toThrow();
    });

    it('delegates queries to the wrapped store view directly', function() {
      var callback = function() {};
      proxy.query(callback);
      expect(wrapped.query).toHaveBeenCalledWith(callback);
    });

    it('delegates subscriptions to the wrapped store view directly', function() {
      var callback = function() {};
      proxy.subscribe(callback);
      expect(wrapped.subscribe).toHaveBeenCalledWith(callback);
    });

    it('delegates unsubscriptions to the wrapped store view directly', function() {
      var callback = function() {};
      proxy.unsubscribe(callback);
      expect(wrapped.unsubscribe).toHaveBeenCalledWith(callback);
    });
  });
});
