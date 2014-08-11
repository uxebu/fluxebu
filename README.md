fluxebu
===

An URL-oriented approach to [Flux][] that works well for both server and browser.

[![Build Status](https://travis-ci.org/uxebu/fluxebu.svg?branch=master)](https://travis-ci.org/uxebu/fluxebu)
[![Coverage Status](https://img.shields.io/coveralls/uxebu/fluxebu.svg?branch=master)](https://coveralls.io/r/uxebu/fluxebu?branch=master)

Aims
---

*fluxebu* aims to provide a small library that aids in building URL-oriented web
applications with the same code running on the server and in the browser.

It is built with [React][] in mind, but *fluxebu* is completely framework-agnostic and can work in any setup.

*fluxebu* is built around these core ideas:

- The same code can work on the server and in the browser. Platform differences are handled through different implementations.
- Route configuration is declarative and short, so that it is easy to read.
- Specific tasks (like creating, mounting and updating React components) are not handled by the library.
- URL changes are just actions published through the dispatcher.


Contstraints
---

Routing and dispatching on the server and in the browser have a fundamental difference:

A node.js server must be able to handle multiple concurrent requests. Therefore it is not possible to have a global stateful dispatching system. Furthermore, store updates are not relevant: The server responds with the initial response of the relevant stores.

In the browser, on the other hand, the system has a notion of the *currently active URL/view.* Updates from stores must be reflected, and the dispatcher should be able to enforce that only one action can be dispatched concurrently.

Two possible solutions to handle these differences are:

1. A new dispatcher is created for every incoming requests. If stores are stateful, they might also be created for every requests.
2. Dispatcher and stores are able to handle concurrent actions and data queries. This is the approach that *fluxebu* is following.


Ideas and Concepts
---

Following the [Flux][] paradigm, an application consists of a *dispatcher* that notifies stores about actions and *stores* that update their internal state in reaction to actions. *fluxebu* adds another component: the *router.*

### The Dispatcher and Stores

Stores can be registered with the dispatcher by name. The dispatcher will broadcast any dispatched action by calling the `notify(actionType, payload, waitFor)` method of every registered store. In order to provide data in reaction to an action, stores may return a *store response.* This is a synchronous operation. The dispatcher returns the aggregated store responses as an object where store names map to store responses.

If a store needs data from another store, it can call the `waitFor(storeName)` function passed to `notify`. `waitFor` will return a store response, which can be queried as needed.


### Store Responses

Since dispatcher – and consequently – all registered stores cannot keep any URL-/request-related state on the server, stores provide data by returning a *store response object* from the `notify()` method.

Store responses are objects that encapsulate action-specific state and asynchronous behaviour that may be needed to query the underlying data source. In the case that the needed store has not been notified yet, a “future” store response is provided.

The contract that store responses have to fulfill, is:

- The `query(callback)` method invokes any passed-in callback with the represented data as soon as it is available.
- The `subscribe(callback)` method works like `query()`, but will invoke the callback repeatedly every time new data becomes available. This is only useful for the browser, when the *currently active view* shall be updated with changed data.
- `unsubscribe(callback)` can be used to unsubscribe any previously registered callback.


### Routing

The router is used to match URLs against the set of known routes. A route consists of a *pattern* and the names of the stores that are relevant to a route. In addition, it is possible to add *user data* to a route. That could be a React component constructor and actions belonging to the route.

```js
// Setup routes
router
  // route pattern,              names of stores needed,           user data ...
  .addRoute('/',                 ['news', 'blog', 'user-session'], Homepage, actions)
  .addRoute('/blog/:page(\\d+)', ['blog', 'user-session'],         BlogList, actions)
  .addRoute('/blog/:slug?',      ['blog', 'user-session'],         BlogArticle, actions);
```

Routing is simple: when the router is asked to handle an URL, it will dispatch a `'route'` action and wait for all relevant stores to provide data:

```js
router.handleRoute(url, null, function(data, Component, actions) {
  // here, data will be an object where keys are store names and values are
  // data returned by the stores

  // Component and actions are the user data attached to the route

  // use the data ... e.g. to render a React component
  React.renderComponent(Component(merge(data, {actions: actions})), document.body);
});
```

The second parameter to `handleRoute` is *user data* that will be passed to the stores as part of the action payload. It could be used to provide cached values to the stores, e.g. to prevent refetches of already known data.

TODOs
---

- Allow routes to have names
- Make callbacks accept an `error` parameter as in node.js
- Think harder about naming
- A “synchronized” dispatcher for the browser that only allows one action to be dispatched at the same time.
  Questions: What does “finished” mean? All collected store responses have invoked the callback to `query()`?
- Example stores and an example application


Stripped-Down Bootstrapping Example
---

### bootstrap.js

```js
function bootstrap(router, dispatcher, environmentSpecificStores) {
  registerStores(environmentSpecificStores);
  registerStores(createCommonStores());

  var fooActions = {
    commentOnFoo: function(id, data) {
      // manipulate data
      dispatcher.dispatch(actionType.COMMENT_FOO, {
        id: id,
        data: data
      });
    },
    // ...
  };

  var barActions = {
    // ...
  };

  router
    .addRoute('/foo', ['foo', 'common'], FooComponent, fooActions)
    // ...
    .addRoute('/bar', ['bar', 'common'], BarComponent, barActions);
}

function registerStores(dispatcher, stores) {
  for (name in stores) {
    dispatcher.addStore(name, stores[name]);
  }
}
```

### server.js

```js
var dispatcher = new Dispatcher();
var router = new Router(dispatcher);
var environmentSpecificStores = createServerSpecificStores();

bootstrap(router, dispatcher, environmentSpecificStores);

function myConnectMiddleware(request, response, next) {
  if (router.canHandleUrl(request.url)) {
    router.handleUrl(request.url, state, function(data, Component) {
      var htmlString = React.renderComponentToString(Component(data));
      // ... respond here
    });
  } else {
    next();
  }
}
```


### browser.js

```js
var dispatcher = new SynchronizedDispatcher();
var router = new LiveRouter(dispatcher);
var environmentSpecificStores = createBrowserSpecificStores();

bootstrap(router, dispatcher, environmentSpecificStores);

function onUrlChange(url, state) { // onpopstate, link click, form submit
  if (router.canHandleUrl(request.url)) {
    router.handleUrl(request.url, null, function(data, Component, actions) {
      var props = merge(data, {actions: actions});
      React.renderComponent(Component(props), document.body);
      history.pushState(data, null, url);
    });
  }
}
```


  [Flux]: http://facebook.github.io/flux/
  [React]: http://facebook.github.io/react/
