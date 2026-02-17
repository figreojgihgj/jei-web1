/**
 * JEI Browser - Type Definitions
 * APIs available when running in JEIBrowser environment
 * @see https://github.com/AndreaFrederica/JEIWebBrowser
 */

declare global {
  const __APP_VERSION__: string | undefined;

  /**
   * JEI Storage API
   * Provides persistent storage for webview pages, similar to localStorage
   * but persisted across sessions using the browser's electron-store backend.
   *
   * Default behavior is origin-isolated storage (protocol + host + port).
   * If a namespace is provided, data is stored in that namespace instead
   * of the current origin bucket, allowing sharing across origins.
   */
  interface JEIStorage {
    /**
     * Retrieves a value from storage
     * @param key - The key to retrieve
     * @param namespace - Optional namespace; when provided, reads from namespace storage
     */
    getItem(key: string, namespace?: string): Promise<string | null>;

    /**
     * Stores a key-value pair
     * @param key - The key to store under
     * @param value - The value to store
     * @param namespace - Optional namespace; when provided, writes to namespace storage
     */
    setItem(key: string, value: string, namespace?: string): Promise<void>;

    /**
     * Removes a single item from storage
     * @param key - The key to remove
     * @param namespace - Optional namespace; when provided, removes from namespace storage
     */
    removeItem(key: string, namespace?: string): Promise<void>;

    /**
     * Clears all items for current origin, or for a namespace if provided
     * @param namespace - Optional namespace; when provided, clears that namespace
     */
    clear(namespace?: string): Promise<void>;

    /**
     * Gets all keys stored for current origin, or for a namespace if provided
     * @param namespace - Optional namespace; when provided, lists namespace keys
     */
    keys(namespace?: string): Promise<string[]>;

    /**
     * Gets item count for current origin, or for a namespace if provided
     * @param namespace - Optional namespace; when provided, counts namespace items
     */
    getLength(namespace?: string): Promise<number>;
  }

  interface Window {
    /**
     * JEI Storage API - Persistent storage for webview pages
     * Only available in JEIBrowser environment
     */
    JEIStorage?: JEIStorage;
  }
}

export {};
