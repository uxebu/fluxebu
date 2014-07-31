var Router = require('../../src/router');

describe('Router', function() {
  var dispatcher, router;
  beforeEach(function() {
    dispatcher = {dispatch: sinon.stub().returns({})};
    router = new Router(dispatcher);
  });

  it('cannot handle URLs whan no pattern has been registered', function() {
    expect(router.canHandleURL('/arbitrary')).toBe(false);
  });

  describe('pattern matching', function() {
    var arbitraryStoreData = {arbitrary: 'data'};
    beforeEach(function() {
      dispatcher.dispatch = sinon.spy(function() {
        return {arbitrary: storeViewMock(arbitraryStoreData)};
      });
      router.addRoute('/arbitrary/:id(\\d+)', ['arbitrary']);
    });

    describe('`canHandle()`', function() {
      it('can handle paths if a matching pattern has been registered', function() {
        expect(router.canHandleURL('/arbitrary/123')).toBe(true);
      });

      it('can handle a fully qualified URL if a matching pattern has been registered', function() {
        expect(router.canHandleURL('http://example.org/arbitrary/345')).toBe(true);
      });

      it('can handle a path containing query parameters', function() {
        expect(router.canHandleURL('/arbitrary/123?foo=bar')).toBe(true);
      });

      it('cannot handle a non-matching URL', function() {
        expect(router.canHandleURL('/arbitrary/')).toBe(false);
      });
    });

    describe('handleUrl', function() {
      it('indicates success when handling paths if a matching pattern has been registered', function() {
        expect(router.handleURL('/arbitrary/123', null, noop)).toBe(true);
      });

      it('handles paths if a matching pattern has been registered', function(done) {
        router.handleURL('/arbitrary/123', null, function(collectedData) {
          expect(collectedData).toEqual({arbitrary: arbitraryStoreData});
          done();
        });
      });

      it('indicates success when handling a fully qualified URL if a matchin pattern has been registered', function() {
        expect(router.handleURL('http://example.org/arbitrary/345', null, noop)).toBe(true);
      });

      it('handles a fully qualified URL if a matching pattern has been registered', function(done) {
        router.handleURL('http://example.org/arbitrary/345', null, function(collectedData) {
          expect(collectedData).toEqual({arbitrary: arbitraryStoreData});
          done();
        });
      });

      it('indicates success when handling a path containing query parameters', function() {
        expect(router.handleURL('/arbitrary/123?foo=bar', null, noop)).toBe(true);
      });

      it('handles a path containing query parameters', function(done) {
        expect(router.handleURL('/arbitrary/123?foo=bar', null, function(collectedData) {
          expect(collectedData).toEqual({arbitrary: arbitraryStoreData});
          done();
        }));
      });

      it('indicates failure when handling a non-matching URL', function() {
        expect(router.handleURL('/arbitrary/', null, noop)).toBe(false);
      });
    });
  });

  describe('dispatching', function() {
    var userData = {additional: 'user data'};
    beforeEach(function() {
      router.addRoute('/:name/*/:id.*', [], userData);
    });

    it('exposes the passed in dispatcher as `dispatcher` property', function() {
      expect(router.dispatcher).toBe(dispatcher);
    });

    it('dispatches a "route" event when handling a route, containing URL information', function(done) {
      router.handleURL('http://example.org/foo/bar/baz/123.png?a=b#hash', null, function() {
        expect(dispatcher.dispatch).toHaveBeenCalledWithMatch('route', {
          params: {name: 'foo', id: '123'},
          splats: ['bar/baz', 'png'],
          hash: '#hash',
          pathname: '/foo/bar/baz/123.png',
          path: '/foo/bar/baz/123.png?a=b',
          query: {a: 'b'}
        });
        done();
      });
    });

    it('adds the provided user data to the "route" action payload', function(done) {
      var userData = {additional: userData};
      router.handleURL('/foo/a/123.json', userData, function() {
        expect(dispatcher.dispatch).toHaveBeenCalledWithMatch('route', {
          test: function(object) { return object.userData === userData; }
        });
        done();
      });
    });
  });

  describe('store data collection', function() {
    var storeViewsReturnedByDispatcher;
    var dataA = 123, dataB = 'bcd', dataC = {foo: 'bar'};

    beforeEach(function() {
      router.addRoute('/', ['a', 'b', 'c']);
      storeViewsReturnedByDispatcher = {
        a: storeViewMock(dataA),
        b: storeViewMock(dataB),
        c: storeViewMock(dataC)
      };
      dispatcher.dispatch = function() {
        return storeViewsReturnedByDispatcher;
      };
    });
    it('provides the data with the specified names, using the store views returned by the dispatcher', function(done) {
      router.handleURL('/', null, function(collectedData) {
        expect(collectedData.a).toBe(dataA);
        expect(collectedData.b).toBe(dataB);
        expect(collectedData.c).toBe(dataC);
        done();
      });
    });

    it('does not query data that is not needed', function(done) {
      storeViewsReturnedByDispatcher.notNeeded = {query: sinon.spy()};
      router.handleURL('/', null, function() {
        expect(storeViewsReturnedByDispatcher.notNeeded.query).not.toHaveBeenCalled();
        done();
      });
    });

    it('sets collected data to undefined if no store view is provided by the dispatcher, but the store key exists', function(done) {
      storeViewsReturnedByDispatcher.b = undefined;
      router.handleURL('/', null, function(collectedData) {
        expect(collectedData.b).toBe(undefined);
        done();
      });
    });

    it('throws a `TypeError` if a data source is not provided by the dispatcher', function() {
      delete storeViewsReturnedByDispatcher.b;
      expect(function() {
        router.handleURL('/', null, noop);
      }).toThrow('TypeError');
    });
  });

  describe('route user data', function() {
    var routeDataA = '123', routeDataB = {arbitrary: 'arbitrary'};
    beforeEach(function() {
      router.addRoute('/', [], routeDataA, routeDataB);
    });

    it('passes user data for a route to the callback of `handleURL`', function(done) {
      router.handleURL('/', null, function(_, dataA, dataB) {
        expect(dataA).toBe(routeDataA);
        expect(dataB).toBe(routeDataB);
        done();
      });
    });
  });
});

function storeViewMock(data) {
  return {
    query: function(callback) {
      process.nextTick(function() {
        callback(data);
      });
    }
  };
}

function noop() {}
