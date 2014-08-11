var LiveRouter = require('../../src/live-router');
var MockDispatcher = require('../mock/dispatcher');
var mockStoreResponse = require('../mock/store-response');

describe('LiveRouter:', function() {
  require('./router-test')(LiveRouter);

  describe('live functionality:', function() {
    var dispatcher, router, storeResponses, onUpdate;
    beforeEach(function() {
      storeResponses = {
        a: mockStoreResponse.sync.unresolved('value A'),
        b: mockStoreResponse.sync.unresolved('value B'),
        c: mockStoreResponse.sync('value C')
      };
      dispatcher = new MockDispatcher();
      dispatcher.dispatch.returns(storeResponses);
      onUpdate = sinon.spy();
      router = new LiveRouter(dispatcher, onUpdate);
      router.addRoute('a', '/a', ['a', 'b']);
      router.addRoute('b', '/b', ['b', 'c']);
    });

    it('calls the `onUpdate()` callback when store responses publish new data', function(done) {
      router.handleUrl('/a', null, function() {
        var valueA = 'new value A', valueC = 'new value C';
        storeResponses.a.publishUpdate(valueA);
        storeResponses.c.publishUpdate(valueC);

        expect(onUpdate).toHaveBeenCalledWithMatch({a: valueA});
        expect(onUpdate).not.toHaveBeenCalledWithMatch({c: valueC});

        done();
      });
      storeResponses.a.resolve();
      storeResponses.b.resolve();
    });

    it('does not invoke the update callback before all store responses have provided a value', function() {
      router.handleUrl('/a', null, function() {});
      storeResponses.a.resolve();
      storeResponses.a.publishUpdate('arbitrary');
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('provides an initial data set with the latest published values', function(done) {
      var newValueA = 'new value A';
      router.handleUrl('/a', null, function(data) {
        expect(data).toMatch({a: newValueA});
        done();
      });

      storeResponses.a.resolve();
      storeResponses.a.publishUpdate(newValueA);
      storeResponses.b.resolve();
    });

    it('does not invoke the update callback of no-longer needed stores after a route change', function(done) {
      router.handleUrl('/a', null, function() {
        router.handleUrl('/b', null, function() {
          storeResponses.a.publishUpdate('newValueA');
          expect(onUpdate).not.toHaveBeenCalledWithMatch({a: 'newValueA'});
          done();
        });
      });

      storeResponses.a.resolve();
      storeResponses.b.resolve();
    });

    it('does not unsubscribe from store responses that are used across routes', function(done) {
      router.handleUrl('/a', null, function() {
        router.handleUrl('/b', null, function() {
          storeResponses.b.publishUpdate('newValueB');
          expect(onUpdate).toHaveBeenCalledWithMatch({b: 'newValueB'});
          done();
        });
      });

      storeResponses.a.resolve();
      storeResponses.b.resolve();
    });
  });
});
