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
var HistoryRecord = History.Record;

var reverse = Function.call.bind([].reverse);

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

describe('history store:', function() {
  var present, store;

  function Value(label) {
    return List([label, 'value']);
  }

  beforeEach(function() {
    present = Value('present');
    store = Store();
  });

  function createHistory() {
    return HistoryRecord({
      past: Stack(reverse(arguments)),
      present: present
    });
  }

  describe('building history:', function() {
    it('adds to the history for a handled action', function() {
      var history = store({arbitrary: 'action'}, createHistory());
      assertEqual(history.past, Stack([present]));
    });

    it('appends to the existing history', function() {
      var initial = Value('initial');
      var later = Value('later');
      var history = store({arbitrary: 'action'}, createHistory(initial, later));
      assertEqual(history.past, Stack([present, later, initial]));
    });

    it('does not append to the history if the present value and the next value in the history are identical', function() {
      var initial = Value('initial');
      var history = store({arbitrary: 'action'}, createHistory(initial, present));
      assertEqual(history.past, Stack([present, initial]));
    });

    it('does not append to the history if the present value and the next value in the history are considered equal by Immutable.js', function() {
      var initial = Value('initial');
      var previous = Value('present');
      assert.notEqual(previous, present, 'Precondition failed: previous and present are the same object');
      assert(Immutable.is(previous, present), 'Precondition failed: previous and present are not considered equal by Immutable.js');
      var history = store({arbitrary: 'action'}, createHistory(initial, previous));
      assertEqual(history.past, Stack([previous, initial]));
    });
  });

  describe('undoing:', function() {
    var history, initial, previous, next;
    beforeEach(function() {
      initial = Value('initial');
      previous = Value('previous');
      next = Value('next');
      var previousHistory =
        createHistory(initial, previous).set('future', Stack([next]));
      history = store(UndoAction(), previousHistory);
    });

    it('restores the present from the past', function() {
      assert.equal(history.present, previous);
    });

    it('adds the present to the future', function() {
      assertEqual(history.future, Stack([present, next]));
    });

    it('removes the first entry from the past', function() {
      assertEqual(history.past, Stack([initial]));
    });

    it('does not do anything if the past is empty', function() {
      var previousHistory = createHistory();
      assert.equal(store(UndoAction(), previousHistory), previousHistory);
    });
  });

  describe('redoing:', function() {
    var history, last, next, previous;
    beforeEach(function() {
      last = Value('last');
      next = Value('next');
      previous = Value('previous');
      var previousHistory =
        createHistory(previous).set('future', Stack([next, last]));
      history = store(RedoAction(), previousHistory);
    });

    it('restores the present from the future', function() {
      assert.equal(history.present, next);
    });

    it('adds the present to the past', function() {
      assertEqual(history.past, Stack([present, previous]));
    });

    it('removes the first entry from the future', function() {
      assertEqual(history.future, Stack([last]));
    });

    it('does not do anything if the future is empty', function() {
      var previousHistory = createHistory();
      assert.equal(store(RedoAction(), previousHistory), previousHistory);
    });
  });

  describe('constrain history size:', function() {
    it('discards history entries if the maximum amount of entries is reached', function() {
      var maxSize = 3;
      store = Store({maxSize: maxSize});
      var previousHistory = createHistory.apply(null, range(maxSize).map(Value));
      var history = store({arbitrary: 'action'}, previousHistory);

      assertEqual(
        history.past,
        previousHistory.past.push(present).slice(0, -1)
      );
    });
  });

  describe('merging history entries:', function() {
    var firstAction, secondAction, thirdAction;
    beforeEach(function() {
      firstAction = {first: 'action'};
      secondAction = {second: 'action'};
      thirdAction = {third: 'action'};
    });

    it('passes the current and the previous action to the `merge` callback', function(done) {
      function merge(action, previousAction) {
        if (!previousAction) return;
        assert.equal(action, secondAction);
        assert.equal(previousAction, firstAction);
        done();
      }

      store = Store({merge: merge});
      store(secondAction, store(firstAction, createHistory()));
    });
  });
});

xdescribe('history data structure:', function() {

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

function range(stop) {
  return Array.apply(null, Array(stop)).map(function(_, i) { return i; });
}
