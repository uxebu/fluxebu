# v0.6.3 / 2015-08-06 15:58 GMT
- Make history work as expected and actually useful
- `canUndo()` and `canRedo()` methods on Record instances

# v0.6.2 / 2015-08-06 9:47 GMT
- Add `includeAction` callback for history

# v0.6.1 / 2015-08-06 7:34 GMT
- Clean up history module
- Make exports of `immutable.js` module clearer

# v0.6.0 / 2015-08-05 22:56 GMT
- Retake on history implementation and idea

# v0.5.0 / 2015-08-03 22:42 GMT
- Add history implementation for immutable.js
- Move immutable.js implementations to own sub-module

# v0.4.0 / 2015-07-30 10:33 GMT
- Add the possibility to dispatch iterators over actions

# v0.3.0-alpha.2 / 2015-07-20 22:21 GMT
- Shorten parameter list of `Dispatcher#dispatch`

# v0.3.0-alpha.1 / 2015-07-12 12:38 GMT
- Add the possibility to dispatch promises

# v0.2.0-alpha.3 / 2015-07-06 12:35 GMT
- Fix setter for immutable.js

# v0.2.0-alpha.2 / 2015-07-06 09:11 GMT
- Add helper to bind action creators to stateful dispatcher


# v0.2.0-alpha.1 / 2015-07-06 08:37 GMT

- initial release containing only the base dispatcher and wrappers for browsers
  (stateful dispatcher) and server (static dispatcher).
