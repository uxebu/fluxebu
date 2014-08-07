'use strict';

var Router = require('./router');
var util = require('./util'), subscribeToAll = util.subscribeToAll;

function LiveRouter(dispatcher, onUpdate) {
  Router.call(this, dispatcher);
  this.onUpdate = onUpdate;
}

var proto = LiveRouter.prototype = Object.create(Router.prototype);
proto._resolveStoreResponses = function(storeResponses, userData, callback) {
  subscribeToAll(storeResponses, function(collectedData) {
    callback.apply(null, [collectedData].concat(userData));
  }, this.onUpdate);
};

module.exports = LiveRouter;
