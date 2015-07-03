'use strict';

module.exports = function DataPointer(value) {
  return {
    get: function() { return value; },
    set: function(newValue) { value = newValue; }
  };
};
