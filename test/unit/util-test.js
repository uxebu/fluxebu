var util = require('../../src/util');
var MockStoreResponse = require('../mock/store-response');

describe('utilities:', function() {
  var storeResponses;
  beforeEach(function() {
    storeResponses = {
      a: MockStoreResponse('value A'),
      b: MockStoreResponse('value B', respondAfter(1)),
      c: MockStoreResponse.async('value C')
    };
  });

  describe('queryStoreResponses:', function() {
    it('calls back when all store responses have responded to `query()`', function(done) {
      util.queryStoreResponses(storeResponses, function(collectedData) {
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
        a: MockStoreResponse('value A'),
        b: MockStoreResponse('value B'),
        c: MockStoreResponse('value C')
      };
      util.queryStoreResponses(storeResponses, function(collectedData) {
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
      util.queryStoreResponses(storeResponses, function(collectedData) {
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
      util.queryStoreResponses({}, function(collectedData) {
        expect(collectedData).toEqual({});
        done();
      });
    });
  });
});

function respondAfter(time) {
  return function(fn, value) { setTimeout(function() { fn(value); }, time); };
}
