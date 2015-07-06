'use strict';

module.exports = function StatefulDispatcher(dispatcher, data, onData) {
  function wrappedOnData(newData) {
    data = newData;
    if (onData) onData(newData);
  }

  function getCurrentData() {
    return data;
  }

  return {
    register: dispatcher.register,

    dispatch: function(action) {
      dispatcher.dispatch(action, data, wrappedOnData, getCurrentData);
    }
  };
};
