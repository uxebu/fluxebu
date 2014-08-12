var util = require('../../lib/util');
var mockStoreResponse = require('../mock/store-response');

describe('store response utilities:', function() {
  describe('queryAll:', function() {
    testBasicQuerying(function(storeResponses, callback) {
      util.queryAll(storeResponses, callback);
    });
  });

  describe('subscribeToAll:', function() {
    testBasicQuerying(function(storeResponses, callback) {
      util.subscribeToAll(storeResponses, callback, noop);
    });

    describe('update behaviour:', function() {
      var storeResponses, a, b;
      beforeEach(function() {
        storeResponses = {
          a: mockStoreResponse.sync.unresolved('value A'),
          b: mockStoreResponse.sync.unresolved('value B'),
          c: null
        };
        a = storeResponses.a;
        b = storeResponses.b;
      });

      it('invokes the update callback with new values', function(done) {
        util.subscribeToAll(storeResponses, noop, function(data) {
          expect(data).toMatch({a: newValue});
          done();
        });
        a.resolve();
        b.resolve();

        var newValue = 'new A value';
        a.publishUpdate(newValue);
      });

      it('invokes the update callback with new values if store responses respond synchronously', function(done) {
        a.resolve();
        b.resolve();
        util.subscribeToAll(storeResponses, noop, function(data) {
          expect(data).toMatch({a: newValue});
          done();
        });

        var newValue = 'new A value';
        a.publishUpdate(newValue);
      });

      it('does not invoke the update callback before all store responses have provided one value', function() {
        var onUpdate = sinon.spy();
        util.subscribeToAll(storeResponses, noop, onUpdate);
        a.resolve();
        a.publishUpdate('arbitrary');
        expect(onUpdate).not.toHaveBeenCalled();
      });

      it('calls the `onComplete` callback with updated data if a store response publishes updates before the initial data set is complete', function(done) {
        var newValue = 'new B value';
        util.subscribeToAll(storeResponses, function(data) {
          expect(data).toEqual({
            a: 'value A',
            b: newValue,
            c: undefined
          });
          done();
        }, noop);

        b.resolve();
        b.publishUpdate(newValue);
        a.resolve();
      });

      it('can handle store updates from within the `onComplete` callback', function() {
        storeResponses.a.resolve();
        storeResponses.b.resolve();
        function onUpdate() {}
        util.subscribeToAll(storeResponses, function() {
          expect(function() {
            storeResponses.a.publishUpdate('new value A');
          }).not.toThrow();
        }, onUpdate);
      });

      describe('unsubscribe:', function() {
        var a, b, storeResponses, unsubscribe, onUpdate;
        beforeEach(function() {
          a = mockStoreResponse.sync('value A');
          b = mockStoreResponse.sync('value B');
          storeResponses = {a: a, b: b, c: null};
          onUpdate = sinon.spy();
          unsubscribe = util.subscribeToAll(storeResponses, noop, onUpdate);
        });

        it('returns an object that provides a function per store to unsubscribe', function() {
          unsubscribe.a();
          a.publishUpdate('arbitrary');
          b.publishUpdate('arbitrary');
          expect(onUpdate).not.toHaveBeenCalledWithMatch({a: 'arbitrary'});
          expect(onUpdate).toHaveBeenCalledWithMatch({b: 'arbitrary'});
        });

        it('provides unsubscription functions for null / undefined store responses', function() {
          expect(function() {
            unsubscribe.c();
          }).not.toThrow();
        });
      });
    });
  });
});

function testBasicQuerying(query) {
  var storeResponses;
  beforeEach(function() {
    storeResponses = {
      a: mockStoreResponse.sync('value A'),
      b: mockStoreResponse.sync('value B', respondAfter(1)),
      c: mockStoreResponse.async('value C')
    };
  });

  it('calls back when all store responses have responded to `query()`', function(done) {
    query(storeResponses, function(collectedData) {
      expect(collectedData).toEqual({
        a: 'value A',
        b: 'value B',
        c: 'value C'
      });
      done();
    });
  });

  it('can handle purely synchronous store responses', function(done) {
    storeResponses = {
      a: mockStoreResponse.sync('value A'),
      b: mockStoreResponse.sync('value B'),
      c: mockStoreResponse.sync('value C')
    };
    query(storeResponses, function(collectedData) {
      expect(collectedData).toEqual({
        a: 'value A',
        b: 'value B',
        c: 'value C'
      });
      done();
    });
  });

  it('can handle `null` values', function(done) {
    storeResponses.d = null;
    query(storeResponses, function(collectedData) {
      expect(collectedData).toEqual({
        a: 'value A',
        b: 'value B',
        c: 'value C',
        d: undefined
      });
      done();
    });
  });

  it('can handle 0 store responses', function(done) {
    query({}, function(collectedData) {
      expect(collectedData).toEqual({});
      done();
    });
  });
}

function respondAfter(time) {
  return function(fn, value) { setTimeout(function() { fn(value); }, time); };
}

function noop() {}
