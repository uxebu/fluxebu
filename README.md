fluxebu
===

An approach to flux that works for server-side (stateless) and client-side (stateful) component rendering.

Aims
---

This project aims to provide components for URL-routing and dispatching that follow the philosophy of [flux][], working for node.js servers and browsers.

Rendering a view (e. g. a [React][] component) has different implications on server and browser: While the browser has the notion of the “currently active view” which typically is “alive” and can receive updates from stores, there is no such thing on the server side. Quite the contrary, on the server the typical usecase is to dispatch route events to the stores and to use the provided data once. In addition, servers must be able to handle requests asynchronously. That means that stores that provide request specific data (like stores that depend on the current route or provide user specific data) must be able to provide concurrent data views that are tied to one specific dispatched “request” or “route” event. 


Ideas and Concepts
---

- Routes are a central concept for *fluxebu.* Route configuration must work on browsers and server-side.
- Route changes are just actions that get dispatched.
- Stores that depend on request-specific data (URL, user information, etc.) must provide data views that are tied to specific request. 


  [React]: http://facebook.github.io/react/
  [flux]: http://facebook.github.io/react/docs/flux-overview.html

TODOs
---

- Convenience API on the router
- store synchronization within the dispatcher aka `waitsFor()`. Or maybe `subscribeStore(name, store, [waitForNames])`.
  `Store#notify()` could also get the already collected store views in addition to action type and payload.
- Router implementation that has a notion of the “current route” and can subscribe to stores to provide data updates.
  It also has to cancel all live subscriptions as soon as the route changes.
- Example stores and an example Application
