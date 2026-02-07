import { defineStore } from 'pinia';
import { Dark } from 'quasar';

export type DarkMode = 'auto' | 'light' | 'dark';
export type Language = 'zh-CN' | 'en-US' | 'ja-JP';

function darkModeToQuasar(mode: DarkMode): boolean | 'auto' {
  if (mode === 'auto') return 'auto';
  return mode === 'dark';
}

// 探测浏览器语言
function detectBrowserLanguage(): Language {
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) return 'zh-CN';
  if (browserLang.startsWith('ja')) return 'ja-JP';
  return 'en-US';
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
      language: detectBrowserLanguage(),
      debugPanelPos: { x: 10, y: 10 },
      acceptedStartupDialogs: [] as string[],
      completedTutorial: false,
      favoritesOpensNewStack: false,
      // Wiki 渲染器设置
      wikiImageUseProxy: false,
      wikiImageProxyUrl: 'https://r.jina.ai/http://',
      wikiCatalogFileName: '',
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
      const language: Language =
        parsed.language === 'zh-CN' || parsed.language === 'en-US' || parsed.language === 'ja-JP'
          ? parsed.language
          : defaults.language;
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
        language,
        debugPanelPos:
          parsed.debugPanelPos && typeof parsed.debugPanelPos.x === 'number' && typeof parsed.debugPanelPos.y === 'number'
            ? parsed.debugPanelPos
            : defaults.debugPanelPos,
        acceptedStartupDialogs: Array.isArray(parsed.acceptedStartupDialogs)
          ? parsed.acceptedStartupDialogs.filter((x): x is string => typeof x === 'string')
          : defaults.acceptedStartupDialogs,
        completedTutorial:
          typeof parsed.completedTutorial === 'boolean'
            ? parsed.completedTutorial
            : defaults.completedTutorial,
        favoritesOpensNewStack:
          typeof parsed.favoritesOpensNewStack === 'boolean'
            ? parsed.favoritesOpensNewStack
            : defaults.favoritesOpensNewStack,
        wikiImageUseProxy:
          typeof parsed.wikiImageUseProxy === 'boolean'
            ? parsed.wikiImageUseProxy
            : defaults.wikiImageUseProxy,
        wikiImageProxyUrl:
          typeof parsed.wikiImageProxyUrl === 'string'
            ? parsed.wikiImageProxyUrl
            : defaults.wikiImageProxyUrl,
        wikiCatalogFileName:
          typeof parsed.wikiCatalogFileName === 'string'
            ? parsed.wikiCatalogFileName
            : defaults.wikiCatalogFileName,
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
    setLanguage(lang: Language) {
      this.language = lang;
      this.save();
    },
    setDebugPanelPos(pos: { x: number; y: number }) {
      this.debugPanelPos = pos;
      this.save();
    },
    addAcceptedStartupDialog(id: string) {
      if (!this.acceptedStartupDialogs.includes(id)) {
        this.acceptedStartupDialogs.push(id);
        this.save();
      }
    },
    setFavoritesOpensNewStack(value: boolean) {
      this.favoritesOpensNewStack = value;
      this.save();
    },
    setWikiImageUseProxy(value: boolean) {
      this.wikiImageUseProxy = value;
      this.save();
    },
    setWikiImageProxyUrl(value: string) {
      this.wikiImageProxyUrl = value;
      this.save();
    },
    setWikiCatalogFileName(value: string) {
      this.wikiCatalogFileName = value;
      this.save();
    },
    setCompletedTutorial(value: boolean) {
      this.completedTutorial = value;
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
          language: this.language,
          debugPanelPos: this.debugPanelPos,
          acceptedStartupDialogs: this.acceptedStartupDialogs,
          completedTutorial: this.completedTutorial,
          favoritesOpensNewStack: this.favoritesOpensNewStack,
          wikiImageUseProxy: this.wikiImageUseProxy,
          wikiImageProxyUrl: this.wikiImageProxyUrl,
          wikiCatalogFileName: this.wikiCatalogFileName,
        }),
      );
    },
  },
});
