'use strict';

/*eslint-env mocha */
/*eslint max-nested-callbacks: 0 */

var assert = require('assert');
var iteratorOf = require('./iterator-of');

function consume(iterator) {
  var results = [];
  do {
    var result = iterator.next();
    results.push(result);
  } while (!result.done);
  return results;
}

describe('iterator-of:', function() {
  it('creates an iterator that can iterate over no arguments', function() {
    assert.deepEqual(consume(iteratorOf()), [{value: undefined, done: true}]);
  });

  it('creates an iterator that can iterate over one argument', function() {
    assert.deepEqual(
      consume(iteratorOf(1)),
      [{value: 1, done: false}, {value: undefined, done: true}]
    );
  });

  it('creates an iterator that can iterate over multiple arguments', function() {
    assert.deepEqual(
      consume(iteratorOf(1, 2, 3, 4, 5)), [
        {value: 1, done: false},
        {value: 2, done: false},
        {value: 3, done: false},
        {value: 4, done: false},
        {value: 5, done: false},
        {value: undefined, done: true}
      ]);
  });
});
