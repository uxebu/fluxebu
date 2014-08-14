'use strict';

var Router = require('./router');
var util = require('./util'), subscribeToAll = util.subscribeToAll;

function LiveRouter(dispatcher, onUpdate) {
  Router.call(this, dispatcher);
  this._unsubscribe = null;
  this.onUpdate = onUpdate;
}

var proto = LiveRouter.prototype = Object.create(Router.prototype);
proto.resolveStoreResponses = function(storeResponses, userData, callback) {
  var unsubscribe = this._unsubscribe;
  for (var name in unsubscribe) {
    unsubscribe[name]();
  }

  this._unsubscribe = subscribeToAll(storeResponses, function(error, collectedData) {
    callback.apply(null, [error, collectedData].concat(userData));
  }, this.onUpdate);
};

module.exports = LiveRouter;
