function StoreViewMock() {
  this.query = sinon.stub();
  this.subscribe = sinon.stub();
  this.unsubscribe = sinon.stub();
}

module.exports = StoreViewMock;
