import { defineBoot } from '#q-app/wrappers';
import { initSettingsStore, setupSettingsStoreAutoReload } from 'src/stores/settings';
import { initKeyBindingsStore } from 'src/stores/keybindings';
import { storage } from 'src/utils/storage';
import { useSettingsStore } from 'src/stores/settings';

/**
 * Initialize storage (JEIStorage if available, otherwise localStorage)
 * and load initial data before app starts
 */
export default defineBoot(async () => {
  // Trigger storage info log (will show which backend is being used)
  storage.isUsingJEIStorage();

  try {
    // Initialize settings store (loads from JEIStorage or localStorage)
    await initSettingsStore();

    // Setup auto-reload when JEIStorage async loading completes
    const settingsStore = useSettingsStore();
    setupSettingsStoreAutoReload(settingsStore);

    // Initialize keybindings store
    await initKeyBindingsStore();

    console.log('[Storage] ✓ Settings and keybindings loaded');
  } catch (error) {
    console.error('[Storage] Failed to initialize:', error);
    // Continue anyway - stores will use defaults
  }
});
