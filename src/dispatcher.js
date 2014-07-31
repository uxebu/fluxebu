function Dispatcher() {
  this.stores = {};
}

Dispatcher.prototype = {
  dispatch: function(actionType, payload) {
    var storeViews = {};
    var stores = this.stores;
    for (var key in stores) {
      storeViews[key] = stores[key].notify(actionType, payload);
    }
    return storeViews;
  },
  subscribeStore: function(name, store) {
    this.stores[name] = store;
  },
  unsubscribeStore: function(name) {
    delete this.stores[name];
  }
};

module.exports = Dispatcher;
