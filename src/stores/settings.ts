import { defineStore } from 'pinia';
import { Dark } from 'quasar';

export type DarkMode = 'auto' | 'light' | 'dark';

function darkModeToQuasar(mode: DarkMode): boolean | 'auto' {
  if (mode === 'auto') return 'auto';
  return mode === 'dark';
}

export const useSettingsStore = defineStore('settings', {
  state: () => {
    const defaults = {
      historyLimit: 6,
      debugLayout: false,
      debugNavPanel: false,
      recipeViewMode: 'panel' as 'dialog' | 'panel',
      recipeSlotShowName: true,
      selectedPack: 'aef',
      favoritesCollapsed: false,
      panelCollapsed: false,
      darkMode: 'auto' as DarkMode,
      debugPanelPos: { x: 10, y: 10 },
    };
    try {
      const raw = localStorage.getItem('jei.settings');
      if (!raw) {
        Dark.set('auto');
        return defaults;
      }
      const parsed = JSON.parse(raw) as Partial<typeof defaults>;
      const darkMode =
        parsed.darkMode === 'auto' || parsed.darkMode === 'light' || parsed.darkMode === 'dark'
          ? parsed.darkMode
          : defaults.darkMode;
      Dark.set(darkModeToQuasar(darkMode));
      const recipeViewMode: 'dialog' | 'panel' = parsed.recipeViewMode === 'panel' ? 'panel' : 'dialog';
      return {
        historyLimit: typeof parsed.historyLimit === 'number' ? parsed.historyLimit : defaults.historyLimit,
        debugLayout: typeof parsed.debugLayout === 'boolean' ? parsed.debugLayout : defaults.debugLayout,
        debugNavPanel: typeof parsed.debugNavPanel === 'boolean' ? parsed.debugNavPanel : defaults.debugNavPanel,
        recipeViewMode,
        recipeSlotShowName:
          typeof parsed.recipeSlotShowName === 'boolean'
            ? parsed.recipeSlotShowName
            : defaults.recipeSlotShowName,
        selectedPack: typeof parsed.selectedPack === 'string' ? parsed.selectedPack : defaults.selectedPack,
        favoritesCollapsed:
          typeof parsed.favoritesCollapsed === 'boolean'
            ? parsed.favoritesCollapsed
            : defaults.favoritesCollapsed,
        panelCollapsed:
          typeof parsed.panelCollapsed === 'boolean' ? parsed.panelCollapsed : defaults.panelCollapsed,
        darkMode,
        debugPanelPos:
          parsed.debugPanelPos && typeof parsed.debugPanelPos.x === 'number' && typeof parsed.debugPanelPos.y === 'number'
            ? parsed.debugPanelPos
            : defaults.debugPanelPos,
      };
    } catch {
      Dark.set('auto');
      return defaults;
    }
  },
  actions: {
    setHistoryLimit(limit: number) {
      this.historyLimit = limit;
      this.save();
    },
    setDebugLayout(enabled: boolean) {
      this.debugLayout = enabled;
      this.save();
    },
    setDebugNavPanel(enabled: boolean) {
      this.debugNavPanel = enabled;
      this.save();
    },
    setRecipeViewMode(mode: 'dialog' | 'panel') {
      this.recipeViewMode = mode;
      this.save();
    },
    setRecipeSlotShowName(enabled: boolean) {
      this.recipeSlotShowName = enabled;
      this.save();
    },
    setSelectedPack(packId: string) {
      this.selectedPack = packId;
      this.save();
    },
    setFavoritesCollapsed(value: boolean) {
      this.favoritesCollapsed = value;
      this.save();
    },
    setPanelCollapsed(value: boolean) {
      this.panelCollapsed = value;
      this.save();
    },
    setDarkMode(mode: DarkMode) {
      this.darkMode = mode;
      Dark.set(darkModeToQuasar(mode));
      this.save();
    },
    setDebugPanelPos(pos: { x: number; y: number }) {
      this.debugPanelPos = pos;
      this.save();
    },
    save() {
      localStorage.setItem(
        'jei.settings',
        JSON.stringify({
          historyLimit: this.historyLimit,
          debugLayout: this.debugLayout,
          debugNavPanel: this.debugNavPanel,
          recipeViewMode: this.recipeViewMode,
          recipeSlotShowName: this.recipeSlotShowName,
          selectedPack: this.selectedPack,
          favoritesCollapsed: this.favoritesCollapsed,
          panelCollapsed: this.panelCollapsed,
          darkMode: this.darkMode,
          debugPanelPos: this.debugPanelPos,
        }),
      );
    },
  },
});
