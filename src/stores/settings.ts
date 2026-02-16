import { defineStore } from 'pinia';
import { Dark } from 'quasar';

export type DarkMode = 'auto' | 'light' | 'dark';
export type Language = 'zh-CN' | 'en-US' | 'ja-JP';
const PROXY_ACCESS_TOKEN_KEY = 'access_token';
const PROXY_ANONYMOUS_TOKEN_KEY = 'anonymous_token';
const PROXY_FRAMEWORK_TOKEN_KEY = 'framework_token';

type CircuitEditorPiecePanelState = {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  docked: boolean;
};

function darkModeToQuasar(mode: DarkMode): boolean | 'auto' {
  if (mode === 'auto') return 'auto';
  return mode === 'dark';
}

function safeStorageGet(key: string): string {
  try {
    return String(localStorage.getItem(key) ?? '');
  } catch {
    return '';
  }
}

function safeStorageSetOrRemove(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function syncProxyTokensToStorage(state: {
  packImageProxyAccessToken: string;
  packImageProxyAnonymousToken: string;
  packImageProxyFrameworkToken: string;
}): void {
  safeStorageSetOrRemove(PROXY_ACCESS_TOKEN_KEY, state.packImageProxyAccessToken);
  safeStorageSetOrRemove(PROXY_ANONYMOUS_TOKEN_KEY, state.packImageProxyAnonymousToken);
  safeStorageSetOrRemove(PROXY_FRAMEWORK_TOKEN_KEY, state.packImageProxyFrameworkToken);
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
      packImageProxyUsePackProvided: true,
      packImageProxyUseManual: false,
      packImageProxyUseDev: false,
      packImageProxyManualUrl: '',
      packImageProxyDevUrl: '',
      packImageProxyAccessToken: safeStorageGet(PROXY_ACCESS_TOKEN_KEY),
      packImageProxyAnonymousToken: safeStorageGet(PROXY_ANONYMOUS_TOKEN_KEY),
      packImageProxyFrameworkToken: safeStorageGet(PROXY_FRAMEWORK_TOKEN_KEY),
      circuitCollectionPreviewShowPieces: false,
      circuitEditorPiecePanel: { x: 16, y: 120, width: 420, height: 620, minimized: false, docked: false } as CircuitEditorPiecePanelState,
      circuitEditorPiecePanelSplitRatio: 0.5,
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
      const panelParsed = parsed.circuitEditorPiecePanel;
      const circuitEditorPiecePanel =
        panelParsed
          && typeof panelParsed.x === 'number'
          && Number.isFinite(panelParsed.x)
          && typeof panelParsed.y === 'number'
          && Number.isFinite(panelParsed.y)
          && typeof panelParsed.width === 'number'
          && Number.isFinite(panelParsed.width)
          && typeof panelParsed.height === 'number'
          && Number.isFinite(panelParsed.height)
          && typeof panelParsed.minimized === 'boolean'
          ? {
            x: panelParsed.x,
            y: panelParsed.y,
            width: panelParsed.width,
            height: panelParsed.height,
            minimized: panelParsed.minimized,
            docked: typeof panelParsed.docked === 'boolean' ? panelParsed.docked : defaults.circuitEditorPiecePanel.docked,
          }
          : defaults.circuitEditorPiecePanel;
      const restored = {
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
        packImageProxyUsePackProvided:
          typeof parsed.packImageProxyUsePackProvided === 'boolean'
            ? parsed.packImageProxyUsePackProvided
            : defaults.packImageProxyUsePackProvided,
        packImageProxyUseManual:
          typeof parsed.packImageProxyUseManual === 'boolean'
            ? parsed.packImageProxyUseManual
            : defaults.packImageProxyUseManual,
        packImageProxyUseDev:
          typeof parsed.packImageProxyUseDev === 'boolean'
            ? parsed.packImageProxyUseDev
            : defaults.packImageProxyUseDev,
        packImageProxyManualUrl:
          typeof parsed.packImageProxyManualUrl === 'string'
            ? parsed.packImageProxyManualUrl
            : defaults.packImageProxyManualUrl,
        packImageProxyDevUrl:
          typeof parsed.packImageProxyDevUrl === 'string'
            ? parsed.packImageProxyDevUrl
            : defaults.packImageProxyDevUrl,
        packImageProxyAccessToken:
          typeof parsed.packImageProxyAccessToken === 'string'
            ? parsed.packImageProxyAccessToken
            : defaults.packImageProxyAccessToken,
        packImageProxyAnonymousToken:
          typeof parsed.packImageProxyAnonymousToken === 'string'
            ? parsed.packImageProxyAnonymousToken
            : defaults.packImageProxyAnonymousToken,
        packImageProxyFrameworkToken:
          typeof parsed.packImageProxyFrameworkToken === 'string'
            ? parsed.packImageProxyFrameworkToken
            : defaults.packImageProxyFrameworkToken,
        circuitCollectionPreviewShowPieces:
          typeof parsed.circuitCollectionPreviewShowPieces === 'boolean'
            ? parsed.circuitCollectionPreviewShowPieces
            : defaults.circuitCollectionPreviewShowPieces,
        circuitEditorPiecePanel,
        circuitEditorPiecePanelSplitRatio:
          typeof parsed.circuitEditorPiecePanelSplitRatio === 'number'
            && Number.isFinite(parsed.circuitEditorPiecePanelSplitRatio)
            ? parsed.circuitEditorPiecePanelSplitRatio
            : defaults.circuitEditorPiecePanelSplitRatio,
      };
      syncProxyTokensToStorage(restored);
      return restored;
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
    setPackImageProxyUsePackProvided(value: boolean) {
      this.packImageProxyUsePackProvided = value;
      this.save();
    },
    setPackImageProxyUseManual(value: boolean) {
      this.packImageProxyUseManual = value;
      this.save();
    },
    setPackImageProxyUseDev(value: boolean) {
      this.packImageProxyUseDev = value;
      this.save();
    },
    setPackImageProxyManualUrl(value: string) {
      this.packImageProxyManualUrl = value;
      this.save();
    },
    setPackImageProxyDevUrl(value: string) {
      this.packImageProxyDevUrl = value;
      this.save();
    },
    setPackImageProxyAccessToken(value: string) {
      this.packImageProxyAccessToken = value;
      syncProxyTokensToStorage(this);
      this.save();
    },
    setPackImageProxyAnonymousToken(value: string) {
      this.packImageProxyAnonymousToken = value;
      syncProxyTokensToStorage(this);
      this.save();
    },
    setPackImageProxyFrameworkToken(value: string) {
      this.packImageProxyFrameworkToken = value;
      syncProxyTokensToStorage(this);
      this.save();
    },
    setCompletedTutorial(value: boolean) {
      this.completedTutorial = value;
      this.save();
    },
    setCircuitCollectionPreviewShowPieces(value: boolean) {
      this.circuitCollectionPreviewShowPieces = value;
      this.save();
    },
    setCircuitEditorPiecePanelSplitRatio(value: number) {
      this.circuitEditorPiecePanelSplitRatio = value;
      this.save();
    },
    setCircuitEditorPiecePanel(value: CircuitEditorPiecePanelState) {
      this.circuitEditorPiecePanel = {
        x: value.x,
        y: value.y,
        width: value.width,
        height: value.height,
        minimized: value.minimized,
        docked: value.docked,
      };
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
          packImageProxyUsePackProvided: this.packImageProxyUsePackProvided,
          packImageProxyUseManual: this.packImageProxyUseManual,
          packImageProxyUseDev: this.packImageProxyUseDev,
          packImageProxyManualUrl: this.packImageProxyManualUrl,
          packImageProxyDevUrl: this.packImageProxyDevUrl,
          packImageProxyAccessToken: this.packImageProxyAccessToken,
          packImageProxyAnonymousToken: this.packImageProxyAnonymousToken,
          packImageProxyFrameworkToken: this.packImageProxyFrameworkToken,
          circuitCollectionPreviewShowPieces: this.circuitCollectionPreviewShowPieces,
          circuitEditorPiecePanel: this.circuitEditorPiecePanel,
          circuitEditorPiecePanelSplitRatio: this.circuitEditorPiecePanelSplitRatio,
        }),
      );
    },
  },
});
