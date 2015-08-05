'use strict';

var Immutable = require('immutable');
var Stack = Immutable.Stack;
var Record = Immutable.Record;
var is = Immutable.is;

var HistoryRecord = Record({
  past: Stack(),
  present: null,
  future: Stack(),
  keep: Infinity,
  merge: function() { return false; }
});

var prototype = HistoryRecord.prototype;
var set = prototype.set;

prototype.set = function(key, value) {
  if (key !== 'present') return set.call(this, key, value);

  var present = this.get('present');
  if (is(value, present)) return this;

  var keep = this.get('keep');
  var merge = this.get('merge');
  var past = this.get('past');
  var mutable = this.asMutable();
  if (!merge(value, present)) {
    mutable.set('past', past.push(present).take(keep));
  }
  return (
    set.call(mutable, key, value)
      .set('future', Stack())
      .asImmutable()
  );
};

function walk2(history, fromKey, toKey) {
  var present = history.get('present');
  var from = history.get(fromKey).push(present);
  var to = history.get(toKey);
  var mutable = history.asMutable();
  return (
    set.call(mutable, 'present', to.peek())
      .set(toKey, to.pop())
      .set(fromKey, from)
      .asImmutable()
  );
}

prototype.undo = function() {
  return walk2(this, 'future', 'past');
};

prototype.redo = function() {
  return walk2(this, 'past', 'future');
};

exports = module.exports = function History(initialValue, options) {
  var keep, merge;
  if (options) {
    keep = options.keep;
    merge = options.merge;
  }

  var init = {present: initialValue};
  if (isFinite(keep)) init.keep = keep;
  if (typeof merge == 'function') init.merge = merge;

  return HistoryRecord(init);
};

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

  return (
    is(present, previous) ? history :
    merge(present, action, past.peek(), history.lastAction) ?
      history.set('past', past.pop().push(present)) :
    history
      .set('past', past.push(present).take(maxSize))
      .set('lastAction', action)
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
