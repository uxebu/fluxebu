'use strict';

var DataPointer = require('./data-pointer');

module.exports = function StatefulDispatcher(dispatcher, initialData, onData) {
  var dataPointer = DataPointer(initialData);
  function wrappedOnData(data) { onData(data); }

  return {
    register: function register() {
      return dispatcher.register.apply(dispatcher, arguments);
    },

    dispatch: function(action) {
      dispatcher.dispatch(action, dataPointer, wrappedOnData);
    }
  };
};
