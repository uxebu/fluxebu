var macrotask = require('macrotask');

function defer(fn) {
  return macrotask(fn);
}

defer.remove = function(handle) {
  return macrotask.clear(handle);
};

module.exports = defer;
