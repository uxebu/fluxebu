var SubscriptionList = require('../../lib/subscription-list');

var same = sinon.match.same, spy = sinon.spy, stub = sinon.stub;
var slice = Array.prototype.slice;

describe('Subscription list:', function() {
  var list;
  function addAll() {
    var all = slice.call(arguments);
    all.forEach(list.add, list);
    return all;
  }
  beforeEach(function() {
    list = new SubscriptionList();
  });

  it('allows a listener to be added', function() {
    var listener = spy();
    list.add(listener);
    list.dispatch('arbitrary');

    expect(listener).toHaveBeenCalled();
  });

  it('allows multiple listeners to be added', function() {
    var listeners = addAll(spy(), spy(), spy());
    list.dispatch('arbitrary');

    listeners.forEach(function(listener) {
      expect(listener).toHaveBeenCalled();
    });
  });

  it('won\'t invoke listeners added during a dispatch in that cycle', function() {
    var added = spy();
    addAll(noop(), function() { list.add(added); }, noop());
    list.dispatch('arbitrary');

    expect(added).not.toHaveBeenCalled();
  });

  it('allows listeners to be added multiple times', function() {
    var a = spy();
    list.add(a);
    list.add(a);
    list.dispatch('arbitrary');

    expect(a).toHaveBeenCalledTwice();
  });

  it('allows listeners to be removed', function() {
    var listener = spy();
    list.add(listener);
    list.remove(listener);
    list.dispatch('arbitrary');

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not affect other registered listeners if a listener is removed', function() {
    var a = spy(), b = noop(), c = spy();
    addAll(a, b, c);
    list.remove(b);
    list.dispatch('arbitrary');

    expect(a).toHaveBeenCalled();
    expect(c).toHaveBeenCalled();
  });

  it('will invoke listeners removed during a dispatch in that cycle', function() {
    var a = spy(), c = spy();
    var b = function() {
      list.remove(a);
      list.remove(c);
    };
    addAll(a, b, c);
    list.dispatch('arbitrary');

    expect(a).toHaveBeenCalled();
    expect(c).toHaveBeenCalled();
  });

  it('removes a listener that has been added multiple times completely', function() {
    var a = spy();
    list.add(a);
    list.add(a);
    list.remove(a);
    list.dispatch('arbitrary');

    expect(a).not.toHaveBeenCalled();
  });

  it('does now swallow errors thrown by listeners', function() {
    list.add(stub().throws());
    expect(function() {
      list.dispatch('arbitrary');
    }).toThrow();
  });

  it('invokes all listeners, even if an error is thrown by a listener', function() {
    var listeners = addAll(spy(), stub().throws(), spy());
    try {
      list.dispatch('arbitrary');
    } catch (e) {}

    listeners.forEach(function(listener) {
      expect(listener).toHaveBeenCalled();
    });
  });

  it('passes all dispatched data to listeners', function() {
    var listener = spy();
    list.add(listener);
    var a = Error('arbitrary'), b = {}, c = 'arbitrary';
    list.dispatch(a, b, c);

    expect(listener).toHaveBeenCalledWith(same(a), same(b), c);
  });

  it('can be cleared completely', function() {
    var listeners = addAll(spy(), spy(), spy());
    list.clear();
    list.dispatch('arbitrary');

    listeners.forEach(function(listener) {
      expect(listener).not.toHaveBeenCalled();
    });
  });

  it('still invokes all listeners if cleared during a dispatch', function() {
    var listeners = addAll(spy(), spy(function() { list.clear(); }), spy());
    list.dispatch('arbitrary');

    listeners.forEach(function(listener) {
      expect(listener).toHaveBeenCalled();
    });
  });

  it('allows listeners to be added for a single invocation', function() {
    var listener = spy();
    list.once(listener);
    list.dispatch('arbitrary');
    list.dispatch('arbitrary');
    expect(listener).toHaveBeenCalledOnce();
  });
});

function noop() {
  return function() {};
}
