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

interface Map<T> {
  [index: string]: T;
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
  dispatch(actionType: string, payload?: any): Map<StoreView>;
}
