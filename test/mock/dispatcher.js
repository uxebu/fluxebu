function DispatcherMock() {
  this.dispatch = sinon.stub().returns({});
}

module.exports = DispatcherMock;