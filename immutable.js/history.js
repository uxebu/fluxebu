'use strict';

var Immutable = require('immutable');
var Stack = Immutable.Stack;
var Record = Immutable.Record;
var is = Immutable.is;

var UNDO = exports.UNDO = Object('UNDO');
var REDO = exports.REDO = Object('REDO');

exports.UndoAction = function UndoAction() { return {type: UNDO}; };
exports.RedoAction = function RedoAction() { return {type: REDO}; };

var HistoryRecord = Record({
  past: Stack(),
  present: undefined,
  future: Stack(),
  lastAction: undefined
});

HistoryRecord.prototype.canUndo = function() {
  var present = this.get('present');
  return this.get('past').some(function(value) {
    return value !== present;
  });
};

HistoryRecord.prototype.canRedo = function() {
  var present = this.get('present');
  return this.get('future').some(function(value) {
    return value !== present;
  });
};

HistoryRecord.create = function(initialData) {
  return HistoryRecord({
    past: Stack.of(initialData),
    present: initialData
  });
};

exports.Record = HistoryRecord;

exports.Store = function(options) {
  var includeAction = returnFalse;
  var maxSize = Infinity;
  var merge = returnFalse;
  if (options) {
    includeAction = options.includeAction || includeAction;
    maxSize = options.maxSize || maxSize;
    merge = options.merge || merge;
  }
  return function(action, history) {
    return (
      action.type === UNDO ? undo(history) :
      action.type === REDO ? redo(history) :
      extend(history, action, maxSize, merge, includeAction)
    );
  };
};

function returnFalse() { return false; }

function equals(value) {
  return function(other) {
    return other === value;
  };
}

function walk(history, fromKey, toKey) {
  var present = history.get('present');
  var to = history.get(toKey).skipWhile(equals(present));

  return (
    history
      .asMutable()
      .set('present', to.peek())
      .set(toKey, to)
      .update(fromKey, function(from) {
        return from.peek() === present ? from : from.push(present);
      })
      .asImmutable()
  );
}

function undo(history) {
  return history.canUndo() ? walk(history, 'future', 'past') : history;
}

function redo(history) {
  return history.canRedo() ? walk(history, 'past', 'future') : history;
}

function extend(history, action, maxSize, merge, includeAction) {
  var past = history.get('past');
  var present = history.get('present');
  var previous = past.peek();

  if (is(present, previous) || is(present, history.get('future').peek())) {
    return includeAction(action) ? history.set('lastAction', action) : history;
  }

  var lastAction = history.get('lastAction');
  var shouldMerge = merge(present, action, previous, lastAction);

  return (
    history
      .asMutable()
      .set('past',
        past
          .asMutable()
          .skip(shouldMerge ? 1 : 0)
          .push(present)
          .take(maxSize)
          .asImmutable()
      )
      .set('future', Stack())
      .set('lastAction', action)
      .asImmutable()
  );
}
