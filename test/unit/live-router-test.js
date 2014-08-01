var LiveRouter = require('../../src/live-router');
var MockDispatcher = require('../mock/dispatcher');


describe('LiveRouter:', function() {
  require('./router-test')(LiveRouter);
});
