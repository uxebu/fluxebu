'use strict';

/*eslint-env mocha */
/*eslint max-nested-callbacks: 0 */

var assert = require('assert');
var DataPointer = require('./data-pointer');

describe('data pointer objects:', function() {
  it('returns the value passed to the constructor when calling `get`', function() {
    var value = {};
    var dataPointer = DataPointer(value);

    assert.equal(dataPointer.get(), value);
  });

  it('allows to replace the wrapped data with the `set` method', function() {
    var value = {};
    var dataPointer = DataPointer(null);
    dataPointer.set(value);

    assert.equal(dataPointer.get(), value);
  });
});
