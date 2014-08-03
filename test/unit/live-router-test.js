var LiveRouter = require('../../src/live-router');
var MockDispatcher = require('../mock/dispatcher');
var mockStoreResponse = require('../mock/store-response');

describe('LiveRouter:', function() {
  require('./router-test')(LiveRouter);

  describe('live functionality:', function() {
    var dispatcher, router, storeResponses, onData;
    beforeEach(function() {
      storeResponses = {
        a: mockStoreResponse.sync('value A'),
        b: mockStoreResponse.sync('value B'),
        c: mockStoreResponse.sync('value C')
      };
      dispatcher = new MockDispatcher();
      dispatcher.dispatch.returns(storeResponses);
      onData = sinon.spy();
      router = new LiveRouter(dispatcher, onData);
      router.addRoute('/a', ['a', 'b']);
      router.addRoute('/b', ['b', 'c']);
    });

    it('calls the `onData()` callback when store responses publish new data', function(done) {
      router.handleUrl('/a', null, function() {
        var valueA = 'new value A', valueB = 'new value B';
        storeResponses.a.publishUpdate(valueA);
        storeResponses.b.publishUpdate(valueB);

        expect(onData).toHaveBeenCalledWithMatch({a: valueA});
        expect(onData).not.toHaveBeenCalledWithMatch({b: valueB});

        done();
      });
    });
  });
});
