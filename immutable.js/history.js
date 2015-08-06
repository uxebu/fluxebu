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
  if (!to.size) return history;

  var from = history.get(fromKey);
  var present = history.get('present');
  return (
    history
      .asMutable()
      .set('present', to.peek())
      .set(toKey, to.pop())
      .set(fromKey, from.push(present))
      .asImmutable()
  );
}

function extend(history, action, maxSize, merge) {
  var past = history.get('past');
  var present = history.get('present');
  var previous = past.peek();

  if (is(present, previous)) return history;

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

exports.Record = Record({
  past: Stack(),
  present: undefined,
  future: Stack(),
  lastAction: undefined
});

exports.Store = function(options) {
  var maxSize = Infinity;
  var merge = returnFalse;
  if (options) {
    maxSize = options.maxSize || maxSize;
    merge = options.merge || merge;
  }
  return function(action, history) {
    return (
      action.type === UNDO ? walk(history, 'future', 'past') :
      action.type === REDO ? walk(history, 'past', 'future') :
      extend(history, action, maxSize, merge)
    );
  };
};

function returnFalse() { return false; }
