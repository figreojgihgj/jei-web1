import { storage } from './storage';

/**
 * Storage helper for synchronously accessing settings
 *
 * This module handles the initial loading of settings from either
 * JEIStorage (async) or localStorage (sync), and provides a synchronous
 * API for the settings store.
 */

const SETTINGS_KEY = 'jei.settings';
const PROXY_ACCESS_TOKEN_KEY = 'access_token';
const PROXY_ANONYMOUS_TOKEN_KEY = 'anonymous_token';
const PROXY_FRAMEWORK_TOKEN_KEY = 'framework_token';

/**
 * Cached settings loaded from storage
 * Used to provide synchronous access after initial load
 */
let cachedSettings: string | null = null;
let initialLoadDone = false;
let pendingUpdate: (() => void) | null = null;

/**
 * Initialize settings from storage
 * Should be called during app initialization
 */
export async function initSettings(): Promise<void> {
  if (initialLoadDone) return;

  if (storage.isUsingJEIStorage()) {
    // Load from JEIStorage (async)
    try {
      const jeiStorageValue = await storage.getItem(SETTINGS_KEY);
      if (jeiStorageValue) {
        cachedSettings = jeiStorageValue;
        console.log('[Settings] ✓ Loaded from JEIStorage');
      } else {
        console.log('[Settings] No data in JEIStorage, checking localStorage...');
        // Check if there's data in localStorage to migrate
        const localValue = localStorage.getItem(SETTINGS_KEY);
        if (localValue) {
          cachedSettings = localValue;
          console.log('[Settings] Using data from localStorage (will migrate to JEIStorage)');
          // Migrate to JEIStorage
          void storage.setItem(SETTINGS_KEY, localValue);
        }
      }
    } catch (e) {
      console.warn('[Settings] Failed to load from JEIStorage, falling back to localStorage:', e);
      cachedSettings = localStorage.getItem(SETTINGS_KEY);
    }
  } else {
    // Load from localStorage (sync)
    cachedSettings = localStorage.getItem(SETTINGS_KEY);
    if (cachedSettings) {
      console.log('[Settings] ✓ Loaded from localStorage');
    } else {
      console.log('[Settings] No saved settings found, using defaults');
    }
  }

  initialLoadDone = true;

  // Notify pending listeners
  if (pendingUpdate) {
    pendingUpdate();
    pendingUpdate = null;
  }
}

/**
 * Register a callback to be called when settings are loaded
 * This allows the store to update after async loading completes
 */
export function onSettingsLoaded(callback: () => void): () => void {
  if (initialLoadDone) {
    // Already loaded, call immediately
    callback();
    return () => {};
  }
  // Store callback for later
  pendingUpdate = callback;
  // Return cleanup function
  return () => {
    if (pendingUpdate === callback) {
      pendingUpdate = null;
    }
  };
}

/**
 * Check if settings have been initialized
 */
export function isSettingsInitialized(): boolean {
  return initialLoadDone;
}

/**
 * Get settings JSON string
 * Returns cached value, or null if not loaded yet
 */
export function getSettingsJSON(): string | null {
  // During first load (before initSettings), try localStorage for immediate access
  if (!initialLoadDone && !storage.isUsingJEIStorage()) {
    const localValue = localStorage.getItem(SETTINGS_KEY);
    if (localValue) {
      console.log('[Settings] Using localStorage for initial load');
      return localValue;
    }
  }
  return cachedSettings;
}

/**
 * Save settings JSON string
 */
export async function saveSettingsJSON(json: string): Promise<void> {
  cachedSettings = json;

  if (storage.isUsingJEIStorage()) {
    try {
      await storage.setItem(SETTINGS_KEY, json);
      console.log(`[Settings] Saved to JEIStorage (${json.length} chars)`);
    } catch (e) {
      console.error('[Settings] Failed to save to JEIStorage:', e);
      // Fallback to localStorage
      localStorage.setItem(SETTINGS_KEY, json);
    }
  } else {
    localStorage.setItem(SETTINGS_KEY, json);
  }
}

/**
 * Get a value from storage by key (for proxy tokens)
 */
export function getStorageItem(key: string): string {
  // For proxy tokens, always check localStorage first for immediate access
  const localValue = localStorage.getItem(key);
  if (localValue !== null) return localValue;
  return '';
}

/**
 * Set or remove a value in storage by key
 */
export function setStorageItem(key: string, value: string): void {
  if (storage.isUsingJEIStorage()) {
    // Async write to JEIStorage, but also keep localStorage in sync for immediate reads
    storage.setItem(key, value).catch(e => {
      console.warn(`[Storage] Failed to save ${key} to JEIStorage:`, e);
      localStorage.setItem(key, value);
    });
    localStorage.setItem(key, value); // Keep localStorage in sync
  } else {
    localStorage.setItem(key, value);
  }
}

/**
 * Remove a value from storage by key
 */
export function removeStorageItem(key: string): void {
  if (storage.isUsingJEIStorage()) {
    storage.removeItem(key).catch(e => {
      console.warn(`[Storage] Failed to remove ${key} from JEIStorage:`, e);
      localStorage.removeItem(key);
    });
    localStorage.removeItem(key); // Keep localStorage in sync
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Get whether JEIStorage is being used
 */
export function isUsingJEIStorage(): boolean {
  return storage.isUsingJEIStorage();
}

// Re-export token keys
export { PROXY_ACCESS_TOKEN_KEY, PROXY_ANONYMOUS_TOKEN_KEY, PROXY_FRAMEWORK_TOKEN_KEY };
