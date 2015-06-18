'use strict';

/*eslint-env mocha */
/*eslint max-nested-callbacks: 0 */

var assert = require('assert');

var defaults = require('./defaults');
var get = defaults.get;
var set = defaults.set;
var equals = defaults.equals;

describe('default get function:', function() {
  it('can lookup a nested value', function() {
    var root = {nested: {sub: {value: {}}}};
    assert.equal(get(root, ['nested', 'sub', 'value']), root.nested.sub.value);
  });
});

describe('default set function:', function() {
  it('returns the passed-in object', function() {
    var object = {a: {b: {}}};
    assert.equal(set(object, ['a', 'b', 'c'], null), object);
  });

  it('can set a deep value', function() {
    var object = {nested: {sub: {value: null}}};
    var value = {};
    set(object, ['nested', 'sub', 'value'], value);
    assert.equal(object.nested.sub.value, value);
  });

  it('can set a direct property', function() {
    var object = {};
    var value = {};
    set(object, ['name'], value);
    assert.equal(object.name, value);
  });

  it('replaces the object when given an empty keypath', function() {
    var value = {};
    assert.equal(set({}, [], value), value);
  });
});

describe('default equals function:', function() {
  it('returns true for immutable values', function() {
    assert(equals('abc', 'abc'));
    assert(equals(123, 123));
    assert(equals(true, true));
    assert(equals(false, false));
    assert(equals(undefined, undefined));
    assert(equals(null, null));
  });

  it('returns false for different objects', function() {
    assert.equal(equals({}, {}), false);
  });

  it('returns false when comparing the same object', function() {
    var object = {};
    assert.equal(equals(object, object), false);
  });
});
