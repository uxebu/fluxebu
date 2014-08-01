var Router = require('./Router');

function LiveRouter(dispatcher) {
  Router.call(this, dispatcher);
}
LiveRouter.prototype = Object.create(Router.prototype);

module.exports = LiveRouter;
