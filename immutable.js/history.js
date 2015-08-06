'use strict';

var Immutable = require('immutable');
var Stack = Immutable.Stack;
var Record = Immutable.Record;
var is = Immutable.is;

var UNDO = exports.UNDO = Object('UNDO');
var REDO = exports.REDO = Object('REDO');

exports.UndoAction = function UndoAction() { return {type: UNDO}; };
exports.RedoAction = function RedoAction() { return {type: REDO}; };

function walk(history, fromKey, toKey) {
  var to = history.get(toKey);
  var canWalk = toKey === 'future' ? history.canRedo() : history.canUndo();

  if (!canWalk) return history;

  var from = history.get(fromKey);
  var present = history.get('present');
  to = to.asMutable();
  while (to.size && to.peek() === present) {
    to.pop();
  }
  return (
    history
      .asMutable()
      .set('present', to.peek())
      .set(toKey, to.pop().asImmutable())
      .set(fromKey, from.push(present))
      .asImmutable()
  );
}

function extend(history, action, maxSize, merge, includeAction) {
  var past = history.get('past');
  var present = history.get('present');
  var previous = past.peek();

  if (is(present, previous)) {
    return includeAction(action) ? history.set('lastAction', action) : history;
  }

  var newPast = past.asMutable();
  if (merge(present, action, past.peek(), history.lastAction)) {
    newPast.pop();
  }

  return (
    history
      .asMutable()
      .set('past', newPast.push(present).take(maxSize).asImmutable())
      .set('future', Stack())
      .set('lastAction', action)
      .asImmutable()
  );
}

var HistoryRecord = Record({
  past: Stack(),
  present: undefined,
  future: Stack(),
  lastAction: undefined
});

HistoryRecord.prototype.canUndo = function() {
  var present = this.get('present');
  return this.past.some(function(value) { return value !== present; });
};

HistoryRecord.prototype.canRedo = function() {
  var present = this.get('present');
  return this.future.some(function(value) { return value !== present; });
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
      action.type === UNDO ? walk(history, 'future', 'past') :
      action.type === REDO ? walk(history, 'past', 'future') :
      extend(history, action, maxSize, merge, includeAction)
    );
  };
};

function returnFalse() { return false; }
