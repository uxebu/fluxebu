'use strict';

module.exports = function StatefulDispatcher(dispatcher, data, onData) {
  function wrappedOnData(newData) {
    data = newData;
    if (onData) onData(newData);
  }

  function getCurrentData() {
    return data;
  }

  function dispatch(action) {
    dispatcher.dispatch(action, data, wrappedOnData, getCurrentData);
  }

  return {
    dispatch: dispatch,
    register: dispatcher.register,

    bindActions: function(actions) {
      return mapObject(actions, function(actionCreator) {
        return function() {
          dispatch(actionCreator.apply(undefined, arguments));
        };
      }, this);
    }
  };
};

function mapObject(object, callback) {
  return Object.keys(object).reduce(function(mapped, key) {
    mapped[key] = callback(object[key]);
    return mapped;
  }, {});
}
