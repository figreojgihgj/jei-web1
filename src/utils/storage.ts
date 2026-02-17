/**
 * JEIStorage is defined in env.d.ts
 * The namespace parameter allows sharing data across different origins.
 */

/**
 * Storage adapter that provides a unified interface for both localStorage and JEIStorage
 *
 * When running in JEIBrowser with JEIStorage available, it will use JEIStorage
 * (persistent file-based storage). Otherwise falls back to localStorage.
 *
 * @param namespace - Optional namespace for JEIStorage. When provided, data is shared
 *                    across all pages using the same namespace. Defaults to 'jei-web-app'.
 */
export class StorageAdapter {
  private useJEIStorage: boolean;
  private hasLogged: boolean = false;
  private readonly namespace: string;

  constructor(namespace: string = 'jei-web-app') {
    // Check if we're in JEIBrowser and JEIStorage is available
    this.useJEIStorage = this.isJEIBrowser() && typeof window.JEIStorage !== 'undefined';
    this.namespace = namespace;
  }

  /**
   * Detect if running in JEIBrowser environment
   */
  private isJEIBrowser(): boolean {
    const ua = navigator.userAgent;
    return ua.includes('JEIBrowser');
  }

  /**
   * Log storage usage info (only once)
   */
  private logInfo(): void {
    if (this.hasLogged) return;
    this.hasLogged = true;

    const isJEIBrowser = this.isJEIBrowser();
    const hasJEIStorage = typeof window.JEIStorage !== 'undefined';

    console.log('%c[Storage] Storage Backend Info:', 'color: #00bcd4; font-weight: bold');
    console.log(`  Browser: ${isJEIBrowser ? 'JEIBrowser ✓' : 'Standard Browser'}`);
    console.log(`  JEIStorage Available: ${hasJEIStorage ? 'Yes ✓' : 'No'}`);
    console.log(`  Using JEIStorage: ${this.useJEIStorage ? 'Yes ✓ (Persistent File Storage)' : 'No (localStorage)'}`);
    console.log(`  Namespace: ${this.namespace}`);

    if (this.useJEIStorage) {
      console.log(
        `%c[Storage] ✓ Using JEIStorage with namespace "${this.namespace}" - Data will be persisted to file!`,
        'color: #4caf50; font-weight: bold'
      );
    } else if (isJEIBrowser && !hasJEIStorage) {
      console.warn(
        '%c[Storage] ⚠ JEIBrowser detected but JEIStorage not available, falling back to localStorage',
        'color: #ff9800; font-weight: bold'
      );
    } else {
      console.log(
        '%c[Storage] Using standard localStorage (session-limited)',
        'color: #9e9e9e; font-weight: bold'
      );
    }
  }

  /**
   * Get whether JEIStorage is being used
   */
  isUsingJEIStorage(): boolean {
    return this.useJEIStorage;
  }

  /**
   * Get the namespace being used
   */
  getNamespace(): string {
    return this.namespace;
  }

  /**
   * Get a value from storage
   * @param key - The key to retrieve
   * @returns The stored value or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    this.logInfo();

    if (this.useJEIStorage) {
      try {
        const value = await window.JEIStorage!.getItem(key, this.namespace);
        console.log(`[Storage] JEIStorage getItem (ns: ${this.namespace}): ${key} -> ${value ? 'found' : 'not found'}`);
        return value;
      } catch (e) {
        console.warn(`[Storage] JEIStorage getItem failed for ${key}, falling back to localStorage:`, e);
        return localStorage.getItem(key);
      }
    }
    return localStorage.getItem(key);
  }

  /**
   * Set a value in storage
   * @param key - The key to store under
   * @param value - The value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    this.logInfo();

    if (this.useJEIStorage) {
      try {
        await window.JEIStorage!.setItem(key, value, this.namespace);
        console.log(`[Storage] JEIStorage setItem (ns: ${this.namespace}): ${key} (${value.length} chars)`);
      } catch (e) {
        console.warn(`[Storage] JEIStorage setItem failed for ${key}, falling back to localStorage:`, e);
        localStorage.setItem(key, value);
      }
    } else {
      localStorage.setItem(key, value);
    }
  }

  /**
   * Remove a value from storage
   * @param key - The key to remove
   */
  async removeItem(key: string): Promise<void> {
    this.logInfo();

    if (this.useJEIStorage) {
      try {
        await window.JEIStorage!.removeItem(key, this.namespace);
        console.log(`[Storage] JEIStorage removeItem (ns: ${this.namespace}): ${key}`);
      } catch (e) {
        console.warn(`[Storage] JEIStorage removeItem failed for ${key}, falling back to localStorage:`, e);
        localStorage.removeItem(key);
      }
    } else {
      localStorage.removeItem(key);
    }
  }

  /**
   * Clear all values from storage (for current namespace)
   */
  async clear(): Promise<void> {
    this.logInfo();

    if (this.useJEIStorage) {
      try {
        await window.JEIStorage!.clear(this.namespace);
        console.log(`[Storage] JEIStorage cleared all items (ns: ${this.namespace})`);
      } catch (e) {
        console.warn('[Storage] JEIStorage clear failed, falling back to localStorage:', e);
        localStorage.clear();
      }
    } else {
      localStorage.clear();
    }
  }

  /**
   * Get all keys in storage
   * @returns Array of all stored keys
   */
  async keys(): Promise<string[]> {
    this.logInfo();

    if (this.useJEIStorage) {
      try {
        const keys = await window.JEIStorage!.keys(this.namespace);
        console.log(`[Storage] JEIStorage keys (ns: ${this.namespace}): ${keys.length} items`);
        return keys;
      } catch (e) {
        console.warn('[Storage] JEIStorage keys failed, falling back to localStorage:', e);
        return Object.keys(localStorage);
      }
    }
    return Object.keys(localStorage);
  }

  /**
   * Get the number of items in storage
   * @returns Count of stored items
   */
  async getLength(): Promise<number> {
    this.logInfo();

    if (this.useJEIStorage) {
      try {
        const length = await window.JEIStorage!.getLength(this.namespace);
        console.log(`[Storage] JEIStorage length (ns: ${this.namespace}): ${length}`);
        return length;
      } catch (e) {
        console.warn('[Storage] JEIStorage getLength failed, falling back to localStorage:', e);
        return localStorage.length;
      }
    }
    return localStorage.length;
  }

  /**
   * Synchronous getItem for backward compatibility
   * Note: When using JEIStorage, this will return null on first call
   * The caller should use the async version when possible
   * @deprecated Use async getItem instead
   */
  getItemSync(key: string): string | null {
    this.logInfo();

    if (this.useJEIStorage) {
      // Can't provide sync access to async storage
      console.warn('[Storage] getItemSync called while using JEIStorage, returning null. Use async getItem instead.');
      return null;
    }
    return localStorage.getItem(key);
  }

  /**
   * Synchronous setItem for backward compatibility
   * @deprecated Use async setItem instead
   */
  setItemSync(key: string, value: string): void {
    this.logInfo();

    if (this.useJEIStorage) {
      // Queue the async operation but don't wait
      window.JEIStorage!.setItem(key, value, this.namespace).catch(e => {
        console.warn(`[Storage] Async setItem failed for ${key}:`, e);
        localStorage.setItem(key, value);
      });
      console.log(`[Storage] JEIStorage setItem (queued, ns: ${this.namespace}): ${key}`);
    } else {
      localStorage.setItem(key, value);
    }
  }

  /**
   * Synchronous removeItem for backward compatibility
   * @deprecated Use async removeItem instead
   */
  removeItemSync(key: string): void {
    this.logInfo();

    if (this.useJEIStorage) {
      // Queue the async operation but don't wait
      window.JEIStorage!.removeItem(key, this.namespace).catch(e => {
        console.warn(`[Storage] Async removeItem failed for ${key}:`, e);
        localStorage.removeItem(key);
      });
      console.log(`[Storage] JEIStorage removeItem (queued, ns: ${this.namespace}): ${key}`);
    } else {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Global storage adapter instance
 * Uses 'jei-web-app' namespace for JEIStorage
 */
export const storageAdapter = new StorageAdapter('jei-web-app');

/**
 * Convenience functions that mirror localStorage API but use the adapter
 */
export const storage = {
  getItem: (key: string) => storageAdapter.getItem(key),
  setItem: (key: string, value: string) => storageAdapter.setItem(key, value),
  removeItem: (key: string) => storageAdapter.removeItem(key),
  clear: () => storageAdapter.clear(),
  keys: () => storageAdapter.keys(),
  getLength: () => storageAdapter.getLength(),

  // Sync versions for backward compatibility
  getItemSync: (key: string) => storageAdapter.getItemSync(key),
  setItemSync: (key: string, value: string) => storageAdapter.setItemSync(key, value),
  removeItemSync: (key: string) => storageAdapter.removeItemSync(key),

  // Check which storage backend is being used
  isUsingJEIStorage: () => storageAdapter.isUsingJEIStorage(),

  // Get the namespace being used
  getNamespace: () => storageAdapter.getNamespace(),
};
