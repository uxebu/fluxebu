/**
 * Callbacks that receive data from stores receive a single argument that can
 * be anything.
 */
interface DataCallback {
  (data: any): void;
}

/**
 * StoreViews provide asynchronous access to a store. They are provided by
 * stores when these are notified about actions.
 */
interface StoreView {
  /**
   * Invokes the callback a single time with the data provided by the store
   * view. If data is available, the callback may be invoked synchronously.
   */
  query(callback: DataCallback): void;

  /**
   * Invokes the provided callback whenever new data is available. If
   * `subscribe` is called and data is already available, the callback must be
   * invoked immediately with existing data.
   */
  subscribe(callback: DataCallback): void;

  /**
   * Removes a registered callback so that it won't receive any data updates.
   *
   * If the last subscribed callback to a StoreView is removed, it might be
   * appropriate to disconnect the instance from the parent store and brint in
   * into a state where it can be garbage collected. An example is a store that
   * returns payload-specific store views when notified about an action.
   */
  unsubscribe(callback: DataCallback): void;
}

/**
 * A Store is anything that can provide data when notified about actions.
 *
 * Stores will be notified about actions by a dispatcher and respond to actions
 * by returning StoreView instances that provide access to their data.
 */
interface Store {
  /**
   * The `notify` method will be invoked with an action type identifier and
   * action payload.
   *
   * The store returns a StoreView instance to provide access to the data that
   * the store will provide in reaction to the action.
   *
   * If the state of the data hold by the store does not depend on specifics of
   * actions, the store may always return the same StoreView instance.
   *
   * If the store provides different data for different action types or payloads
   * it **must** return different StoreView instances for different
   * notifications. This is necessary to handle concurrent actions.
   */
  notify(actionType: string, payload?: any): StoreView;
}

interface MapObject<T> {
  [index: string]: T;
}

interface Pair<T, U> {
  0: T;
  1: U;
}

/**
 * Dispatcher instances allow stores to be registered and for actions to be
 * dispatched.
 */
interface Dispatcher {
  /**
   * Subscribes a named store for action notifications.
   */
  subscribeStore(name: string, store: Store): void;

  /**
   * Unsubscribes a named store.
   */
  unsubscribeStore(name: string): void;

  /**
   * Dispatches an action with a payload.
   *
   * All registered stores will be notified about the action.
   *
   * Returns a map object containing all produced StoreView instances keyed by
   * store name.
   */
  dispatch(actionType: string, payload?: any): MapObject<StoreView>;
}

interface RouteHandledCallback {
  (collectedData: Object, ...userData: any[]): void;
}

interface RouteInformation {
  /** Matches from route placeholders */
  params: MapObject<string>;

  /** Splats matched by the route */
  splats: Array<string>;

  /** The URL hash including the leading '#' */
  hash: string;

  /** The path component of the handled URL */
  pathname: string;

  /** The path and search components of the handled URL */
  path: string;

  /** The parsed query string of the handled URL */
  query: Object;
}

/**
 * Contains a route definition that can be used with Router.addRoutes
 */
interface RouteTuple {
  /** names of needed stores */
  0: Array<string>;

  /** any user data */
  [index: number]: any;
}

/**
 * Routers provide mechanics that allow to collect data from different stores
 * in for specific routes.
 */
interface Router {
  /**
   * The dispatcher to use for route dispatching
   */
  dispatcher: Dispatcher;

  /**
   * Returns whether the router has a route that matches the passed in URL.
   */
  canHandleURL(url: string): boolean;

  /**
   * Handles a path if possible. Returns whether a mathing routes exist.
   *
   * If an URL can be handled, a `'route'` action will be dispatched using the
   * `dispatcher`. The action payload will be route information and the
   * passed in user data ({@see RouteInformation}).
   *
   * @param url - the URL to handle
   * @param userData - An object with predefined or additional data.
   * @param callback - will receive the collected data and the user data of
   *    the dispatched route.
   * @returns Whether the URL can be handled and the callback will be invoked.
   */
  handleURL(url: string, userData: Object, callback: RouteHandledCallback): boolean;

  /**
   * Adds a route
   *
   * @param pattern - The pattern of the route to register
   * @param stores - The name of the stores to query for this route.
   *    The names must match the names that have been used to register stores
   *    with the dispatcher.
   * @param userData - Any additional data that should be forwarded to callbacks
   *    of `handleRoute`.
   * @returns The router instance
   */
  addRoute(pattern: string, stores: Array<string>, ...userData: any[]): Router;

  /**
   * Adds a route where the pattern is a regular expression rather than a string.
   */
  addRoute(pattern: RegExp, stores: Array<string>, ...userData: any[]): Router;

  /**
   * Adds all routes from an object: keys are patterns, values are arrays
   * containing an array with store names and user data
   */
  addRoutes(routes: MapObject<RouteTuple>): Router;

  /**
   * Adds all routes from a list of pairs: the first member must be a string or
   * a regular expression, the second a RouteTuple;
   */
  addRoutes(...routes: Array<Pair<any, RouteTuple>>): Router;
}
