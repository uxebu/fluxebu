var Router = require('../../lib/router');

describe('Router:', function() {
  require('./suite/router')(function(dispatcher) {
    return new Router(dispatcher);
  });
});

