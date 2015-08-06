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

function assertEqual(value, immutableValue) {
  if (!immutableValue.equals(value)) {
    assert.equal(
      value && value.toJS ? value.toJS() : value,
      immutableValue.toJS()
    );
  }
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

  function createHistory(past, future, otherPresent) {
    return HistoryRecord({
      past: Stack((past || []).reverse()),
      present: arguments.length < 3 ? present : otherPresent,
      future: Stack(future)
    });
  }

  describe('creating:', function() {
    it('returns a history with past and present containing the current value', function() {
      var history = HistoryRecord.create(present);
      assertEqual(history.past, Stack([present]));
      assert.equal(history.present, present);
    });
  });

  describe('building history:', function() {
    it('adds to the history for a handled action', function() {
      var history = store({arbitrary: 'action'}, createHistory());
      assertEqual(history.past, Stack([present]));
    });

    it('appends to the existing history', function() {
      var initial = Value('initial');
      var later = Value('later');
      var history = store({arbitrary: 'action'}, createHistory([initial, later]));
      assertEqual(history.past, Stack([present, later, initial]));
    });

    it('does not append to the history if the present value and the next value in the history are identical', function() {
      var initial = Value('initial');
      var history = store({arbitrary: 'action'}, createHistory([initial, present]));
      assertEqual(history.past, Stack([present, initial]));
    });

    it('does not append to the history if the present value and the next value in the history are considered equal by Immutable.js', function() {
      var initial = Value('initial');
      var previous = Value('present');
      assert.notEqual(previous, present, 'Precondition failed: previous and present are the same object');
      assert(Immutable.is(previous, present), 'Precondition failed: previous and present are not considered equal by Immutable.js');
      var history = store({arbitrary: 'action'}, createHistory([initial, previous]));
      assertEqual(history.past, Stack([previous, initial]));
    });

    it('discards any future state when adding to the history', function() {
      var initialHistory = createHistory([], [Value('arbitrary')]);
      var history = store({arbitrary: 'action'}, initialHistory);
      assertEqual(history.future, Stack());
    });
  });

  describe('capabilities:', function() {
    it('`canUndo` reports `false` if the past is empty', function() {
      assert.equal(createHistory().canUndo(), false);
    });

    it('`canUndo` reports `false` if the past contains only the present', function() {
      assert.equal(createHistory([present, present]).canUndo(), false);
    });

    it('`canUndo` reports `true` if the past contains a value different from the present', function() {
      assert.equal(createHistory([Value('other')]).canUndo(), true);
    });

    it('`canRedo()` reports `false` if the future is empty', function() {
      assert.equal(createHistory().canRedo(), false);
    });

    it('`canRedo()` reports `false` if the future contains only the present', function() {
      assert.equal(createHistory([], [present, present]).canRedo(), false);
    });

    it('`canRedo()` reports `true` if the future contains a value different from the present', function() {
      assert.equal(createHistory([], [Value('other')]).canRedo(), true);
    });
  });

  describe('undoing:', function() {
    var history, initial, previous, next;
    beforeEach(function() {
      initial = Value('initial');
      previous = Value('previous');
      next = Value('next');
      var previousHistory = createHistory([initial, previous], [next]);
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
      assertEqual(store(UndoAction(), previousHistory), previousHistory);
    });

    it('does not do anything if the past contains only the present', function() {
      var previousHistory = createHistory([present, present]);
      assertEqual(store(RedoAction(), previousHistory), previousHistory);
    });

    it('skips any items on the past stack that are identical to the present', function() {
      history = createHistory([previous, present, present], [next]);
      var afterUndo = store(UndoAction(), history);

      assertEqual(afterUndo.past, Stack());
      assertEqual(afterUndo.future, Stack([present, next]));
      assertEqual(afterUndo.present, previous);
    });
  });

  describe('redoing:', function() {
    var history, last, next, previous;
    beforeEach(function() {
      last = Value('last');
      next = Value('next');
      previous = Value('previous');
      var previousHistory = createHistory([previous], [next, last]);
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
      assertEqual(store(RedoAction(), previousHistory), previousHistory);
    });

    it('does not do anything if the future contains only the present', function() {
      var previousHistory = createHistory([], [present, present]);
      assertEqual(store(RedoAction(), previousHistory), previousHistory);
    });

    it('skips any items on the future stack that are identical to the present', function() {
      history = createHistory([previous], [present, present, next]);
      var afterRedo = store(RedoAction(), history);

      assertEqual(afterRedo.future, Stack());
      assertEqual(afterRedo.past, Stack([present, previous]));
      assertEqual(afterRedo.present, next);
    });
  });

  describe('constrain history size:', function() {
    it('discards history entries if the maximum amount of entries is reached', function() {
      var maxSize = 3;
      store = Store({maxSize: maxSize});
      var previousHistory = createHistory(range(maxSize).map(Value));
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

    function applyActions(storeFn) {
      return (
        [firstAction, secondAction, thirdAction]
          .reduce(function(history, action) {
            return storeFn(action, history).update('present', increase);
          }, createHistory([], [], 1))
      );
    }

    it('passes the current action and value as well as the previous action and value to the `merge` callback', function() {
      var merge = sinon.spy();
      store = Store({merge: merge});

      applyActions(store);

      sinon.assert.calledWith(merge, 1, firstAction, undefined, undefined);
      sinon.assert.calledWith(merge, 2, secondAction, 1, firstAction);
      sinon.assert.calledWith(merge, 3, thirdAction, 2, secondAction);
      sinon.assert.calledThrice(merge);
    });

    it('replaces history entries rather than replacing them if `merge` returns `true`', function() {
      function merge(_, action, __, previousAction) {
        return action === thirdAction && previousAction === secondAction;
      }

      var history = applyActions(Store({merge: merge}));
      assertEqual(history.past, Stack([3, 1]));
    });

    it('discards any future state when merging the first history entry', function() {
      var initialHistory = createHistory([Value('previous')], [Value('arbitrary')]);
      store = Store({merge: function() { return true; }});
      var history = store({arbitrary: 'action'}, initialHistory);
      assertEqual(history.future, Stack());
    });

    it('passes the correct actions to `merge` when replacing', function() {
      var merge = sinon.spy(function(_, action) {
        return action === secondAction;
      });
      store = Store({merge: merge});

      applyActions(store);

      sinon.assert.calledWith(merge, 1, firstAction, undefined, undefined);
      sinon.assert.calledWith(merge, 2, secondAction, 1, firstAction);
      sinon.assert.calledWith(merge, 3, thirdAction, 2, secondAction);
    });
  });

  describe("including actions that didn't change data:", function() {
    it('includes actions even though no data has changed if the `includeAction` calback returns true', function() {
      var action1 = {action: 1};
      var action2 = {action: 2};
      var action3 = {action: 3};
      var merge = sinon.spy();

      function setPresent(action, history) {
        return action === action3 ? history.set('present', {}) : history;
      }

      store = Store({
        includeAction: function(action) { return action === action2; },
        merge: merge
      });
      [action1, action2, action3].reduce(function(history, action) {
        return store(action, setPresent(action, history));
      }, HistoryRecord());

      assert.calledWith(merge, {}, action3, undefined, action2);
    });
  });
});

function range(stop) {
  return Array.apply(null, Array(stop)).map(function(_, i) { return i; });
}

function increase(n) {
  return n + 1;
}
