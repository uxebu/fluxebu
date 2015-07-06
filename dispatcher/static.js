'use strict';

module.exports = function StaticDispatcher(dispatcher) {
  return {
    register: dispatcher.register,
    dispatch: function(action, data, callback) {
      dispatcher.dispatch(action, data, function(newData, isDone) {
        if (isDone) callback(newData);
      });
    }
  };
};
