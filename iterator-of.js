'use strict';

module.exports = function iterateOf() {
  var args = arguments;
  var i = -1;
  var n = args.length;
  return {
    next: function() {
      i += 1;
      return {done: i >= n, value: args[i]};
    }
  };
};
