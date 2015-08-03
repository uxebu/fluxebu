'use strict';
/*eslint-env mocha */
/*eslint max-nested-callbacks: 0 */

var assert = require('assert');
var sinon = require('sinon');

var Immutable = require('immutable');
var Stack = Immutable.Stack;
var List = Immutable.List;

var History = require('./history');
var UndoAction = History.UndoAction;
var RedoAction = History.RedoAction;
var Store = History.Store;

function assertEqual(value, immutableValue) {
  if (!immutableValue.equals(value)) {
    assert.equal(
      value && value.toJS ? value.toJS() : value,
      immutableValue.toJS()
    );
  }
}

function setPresent(history, value) {
  return history.set('present', value);
}

describe('history data structure:', function() {
  describe('building history:', function() {
    var history, initialValue;
    beforeEach(function() {
      initialValue = {initial: 'value'};
      history = History(initialValue);
    });

    it('exposes the passed-in initial value', function() {
      assert.equal(history.present, initialValue);
    });

    it('pushes the initial value to the past when setting the present to a new value', function() {
      var newHistory = history.set('present', {});
      assertEqual(newHistory.past, Stack([initialValue]));
    });

    it('allows to set the present to a new value', function() {
      var newValue = {};
      var newHistory = history.set('present', newValue);
      assert.equal(newHistory.present, newValue);
    });

    it('allows to update the present multiple times', function() {
      var values = [{first: 'value'}, {second: 'value'}, {third: 'value'}];
      var newHistory = values.reduce(setPresent, history);

      assert.equal(newHistory.present, values[2]);
      assertEqual(newHistory.past, Stack([values[1], values[0], initialValue]));
    });

    it('does not add a history step when setting the present value again', function() {
      var value = {arbitrary: 'value'};
      var newHistory = (
        history
          .set('present', value)
          .set('present', value)
      );

      assertEqual(newHistory.past, Stack([initialValue]));
    });

    it('does not add a history step when setting a value equal to the present', function() {
      var values = [1, 2, 3];
      var present = List(values);
      var equal = List(values);
      assert.notEqual(
        equal, present,
        'Precondition failed: present and equal are the same object'
      );

      var newHistory = (
        history
          .set('present', present)
          .set('present', equal)
      );

      assertEqual(newHistory.past, Stack([initialValue]));
    });
  });

  describe('undoing', function() {
    var initialValue, steppedBack, values;
    beforeEach(function() {
      initialValue = {initial: 'value'};
      values = [{second: 'value'}, {third: 'value'}, {fourth: 'value'}];
      steppedBack =
        values
          .reduce(setPresent, History(initialValue).asMutable())
          .undo()
          .asImmutable();
    });

    it('restores the present from the past', function() {
      assert.equal(steppedBack.present, values[1]);
    });

    it('adds the present to the future', function() {
      assertEqual(steppedBack.future, Stack([values[2]]));
    });

    it('removes the first entry from the past', function() {
      assertEqual(steppedBack.past, Stack([values[0], initialValue]));
    });

    it('clears the future if setting the present again', function() {
      var history = steppedBack.set('present', {arbitrary: 'value'});
      assertEqual(history.future, Stack());
    });
  });

  describe('redoing:', function() {
    var history, initialValue, values;
    beforeEach(function() {
      initialValue = {initial: 'value'};
      values = [{second: 'value'}, {third: 'value'}, {fourth: 'value'}];
      history =
        values
          .reduce(setPresent, History(initialValue).asMutable())
          .undo()
          .undo()
          .redo()
          .asImmutable();
    });

    it('restores the present from the future', function() {
      assert.equal(history.present, values[1]);
    });

    it('adds the present to the past', function() {
      assertEqual(history.past, Stack([values[0], initialValue]));
    });

    it('removes the first entry from the future', function() {
      assertEqual(history.future, Stack([values[2]]));
    });
  });

  describe('maximum history size:', function() {
    var history, initialValue, maxEntries, values;
    beforeEach(function() {
      initialValue = 0;
      values = [1, 2, 3, 4, 5, 6, 7];
      maxEntries = values.length - 1;
      history =
        values
          .reduce(setPresent, History(initialValue, {keep: maxEntries}))
          .asImmutable();
    });

    it('only keeps the specified number of history steps', function() {
      var expected =
        values
          .reverse()
          .concat(initialValue)
          .slice(1, 1 + maxEntries);

      assertEqual(history.past, Stack(expected));
    });
  });

  describe('merging history entries:', function() {
    var history, initialValue, merge, values;
    beforeEach(function() {
      merge = function(newValue, precedingValue) {
        return newValue === 3 && precedingValue === 2;
      };

      initialValue = 0;
      values = [1, 2, 3];
      history =
        values
          .reduce(setPresent, History(initialValue, {merge: merge}))
          .asImmutable();
    });

    it('replaces the present if the optional `merge` function returns true for two values', function() {
      assert.strictEqual(history.present, 3);
      assertEqual(history.past, Stack([1, 0]));
    });
  });
});

describe('history store:', function() {
  var history;
  beforeEach(function() {
    history = {
      undo: sinon.stub().returns({}),
      redo: sinon.stub().returns({}),
    };
  });

  it('does nothing for arbitrary actions', function() {
    var data = {};
    assert.strictEqual(Store({arbitrary: 'action'}, data), data);
  });

  it('returns the result of `history.undo()` when handling an `UndoAction`', function() {
    assert.strictEqual(Store(UndoAction(), history), history.undo());
  });

  it('returns the result of `history.redo()` when handling an `RedoAction`', function() {
    assert.strictEqual(Store(RedoAction(), history), history.redo());
  });
});
