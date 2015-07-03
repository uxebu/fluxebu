'use strict';

var DataPointer = require('./data-pointer');

module.exports = function StaticDispatcher(dispatcher) {
  return {
    register: dispatcher.register,
    dispatch: function(action, data, callback) {
      dispatcher.dispatch(action, DataPointer(data), function(newData, isDone) {
        if (isDone) callback(newData);
      });
    }
  };
};
