import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import JSZip from 'jszip';
import type { ItemDef, PackData, Recipe } from 'src/jei/types';
import { stableJsonStringify } from 'src/jei/utils/stableJson';
import { idbDeletePackZip, idbGetPackZip, idbSetPackZip } from 'src/jei/utils/idb';
import { useEditorStore } from 'src/stores/editor';
import { storage } from 'src/utils/storage';

export interface LocalPackEntry {
  id: string;
  name: string;
  packId: string;
  updatedAt: number;
}

interface StoredPackIndex {
  version: 1;
  currentId?: string;
  entries: LocalPackEntry[];
}

function now() {
  return Date.now();
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function itemKeyHash(def: { key: { id: string; meta?: number | string; nbt?: unknown } }): string {
  return `${def.key.id}::${def.key.meta ?? ''}::${stableJsonStringify(def.key.nbt ?? null)}`;
}

function mergeInlineItems(items: ItemDef[], recipes: Recipe[]): ItemDef[] {
  const byHash = new Map<string, ItemDef>();
  items.forEach((it) => byHash.set(itemKeyHash(it), it));
  recipes.forEach((r) => {
    r.inlineItems?.forEach((it) => {
      const key = itemKeyHash(it);
      if (!byHash.has(key)) byHash.set(key, it);
    });
  });
  return Array.from(byHash.values());
}

function extractInlineRecipes(items: ItemDef[]): Recipe[] {
  const recipes: Recipe[] = [];
  items.forEach((item) => {
    if (item.recipes) {
      item.recipes.forEach((r) => {
        recipes.push({
          id: r.id,
          type: r.type,
          slotContents: r.slotContents,
          params: r.params ?? {},
          inlineItems: r.inlineItems ?? [],
        });
      });
    }
  });
  return recipes;
}

function extractWikiData(items: ItemDef[]): Record<string, Record<string, unknown>> {
  const wikiMap: Record<string, Record<string, unknown>> = {};
  items.forEach((item) => {
    if (item.wiki && item.key.id) {
      wikiMap[item.key.id] = item.wiki;
    }
  });
  return wikiMap;
}

function safeParseIndex(raw: string | null): StoredPackIndex {
  if (!raw) return { version: 1, entries: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPackIndex>;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) return { version: 1, entries: [] };
    const currentId = typeof parsed.currentId === 'string' ? parsed.currentId : undefined;
    return currentId
      ? { version: 1, currentId, entries: parsed.entries }
      : { version: 1, entries: parsed.entries };
  } catch {
    return { version: 1, entries: [] };
  }
}

async function zipToPackData(zipBlob: Blob): Promise<{ pack: PackData; assets: { path: string; blob: Blob }[] }> {
  const zip = await JSZip.loadAsync(zipBlob);
  const manifestFile = zip.file(/manifest\.json$/i)[0];
  if (!manifestFile) throw new Error('manifest.json not found in zip');
  const manifest = JSON.parse(await manifestFile.async('string')) as PackData['manifest'];
  const baseDir = manifestFile.name.replace(/manifest\.json$/i, '');
  const readJson = async (rel: string | undefined) => {
    if (!rel) return undefined;
    const file = zip.file(`${baseDir}${rel}`);
    if (!file) throw new Error(`Missing ${rel}`);
    return JSON.parse(await file.async('string')) as unknown;
  };

  // 加载物品数据 - 支持数组模式和目录模式
  let items: PackData['items'] = [];
  if (manifest.files.items) {
    if (manifest.files.items.endsWith('/')) {
      // 目录模式
      if (!manifest.files.itemsIndex) {
        throw new Error('items directory specified but itemsIndex not defined in manifest');
      }
      const itemsIndex = await readJson(manifest.files.itemsIndex);
      if (!Array.isArray(itemsIndex)) {
        throw new Error('itemsIndex: expected array');
      }
      items = [];
      for (let i = 0; i < itemsIndex.length; i++) {
        const itemFile = itemsIndex[i];
        if (typeof itemFile !== 'string') {
          throw new Error(`itemsIndex[${i}]: expected string`);
        }
        const raw = await readJson(itemFile);
        if (raw) {
          items.push(raw as ItemDef);
        }
      }
    } else {
      // 数组模式
      const raw = await readJson(manifest.files.items);
      items = (raw as PackData['items']) || [];
    }
  }

  const tags = (await readJson(manifest.files.tags)) as PackData['tags'];
  const recipeTypes = (await readJson(manifest.files.recipeTypes)) as PackData['recipeTypes'];
  const recipes = (await readJson(manifest.files.recipes)) as PackData['recipes'];

  // 从物品文件中提取内联的 recipes 和 wiki 数据
  const inlineRecipes = extractInlineRecipes(items);
  const wikiData = extractWikiData(items);

  // 合并所有 recipes：全局 recipes + 物品内联 recipes
  const allRecipes = [...(recipes || []), ...inlineRecipes];

  const pack: PackData = {
    manifest,
    items: mergeInlineItems(items || [], allRecipes),
    recipeTypes: recipeTypes || [],
    recipes: allRecipes,
  };
  if (tags) pack.tags = tags;
  if (Object.keys(wikiData).length > 0) pack.wiki = wikiData;

  const assets: { path: string; blob: Blob }[] = [];
  const isItemFile = (rel: string) => {
    // 如果是目录模式，检查是否是物品目录下的文件
    if (manifest.files.items?.endsWith('/')) {
      return rel.startsWith(manifest.files.items);
    }
    // 如果是数组模式，检查是否是items.json
    return rel === manifest.files.items;
  };

  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    if (!relativePath.startsWith(baseDir)) return;
    const rel = relativePath.slice(baseDir.length);
    if (!rel) return;
    if (rel === 'manifest.json') return;
    if (rel === manifest.files.tags) return;
    if (rel === manifest.files.recipeTypes) return;
    if (rel === manifest.files.recipes) return;
    if (rel === manifest.files.itemsIndex) return;
    if (isItemFile(rel)) return;
    assets.push({
      path: rel,
      blob: new Blob([]),
    });
  });

  for (let i = 0; i < assets.length; i += 1) {
    const rel = assets[i]!.path;
    const file = zip.file(`${baseDir}${rel}`);
    if (!file) continue;
    const blob = await file.async('blob');
    assets[i] = { path: rel, blob };
  }

  return { pack, assets };
}

export const usePackManagerStore = defineStore('packManager', () => {
  const INDEX_KEY = 'jei.editor.localPacks.v1';
  const editorStore = useEditorStore();

  // Initialize with empty values, will be loaded asynchronously
  const entries = ref<LocalPackEntry[]>([]);
  const currentId = ref<string | null>(null);

  // Async initialization function
  async function initStore() {
    const raw = storage.isUsingJEIStorage()
      ? await storage.getItem(INDEX_KEY)
      : localStorage.getItem(INDEX_KEY);
    const parsed = safeParseIndex(raw);
    entries.value = parsed.entries;
    currentId.value = parsed.currentId ?? null;
  }

  // Auto-initialize when using JEIStorage
  if (storage.isUsingJEIStorage()) {
    initStore().catch(e => console.error('[PackManager] Failed to initialize:', e));
  } else {
    // Synchronous initialization for localStorage
    const parsed = safeParseIndex(localStorage.getItem(INDEX_KEY));
    entries.value = parsed.entries;
    currentId.value = parsed.currentId ?? null;
  }

  function persist() {
    const out: StoredPackIndex = currentId.value
      ? { version: 1, currentId: currentId.value, entries: entries.value }
      : { version: 1, entries: entries.value };
    if (storage.isUsingJEIStorage()) {
      void storage.setItem(INDEX_KEY, JSON.stringify(out));
    } else {
      localStorage.setItem(INDEX_KEY, JSON.stringify(out));
    }
  }

  const currentEntry = computed(() => entries.value.find((e) => e.id === currentId.value) || null);

  async function loadLocalPack(id: string) {
    const zipBlob = await idbGetPackZip(id);
    if (!zipBlob) throw new Error('Pack zip not found');
    const { pack, assets } = await zipToPackData(zipBlob);
    editorStore.loadPack(pack);
    editorStore.resetAssets();
    await editorStore.addAssetBlobs(
      assets.map((a) => ({
        path: a.path,
        blob: a.blob,
      })),
    );
    editorStore.setBaselineFromCurrent();
    currentId.value = id;
    persist();
  }

  async function saveToExisting() {
    if (!currentId.value) throw new Error('No current pack selected');
    const id = currentId.value;
    const entry = entries.value.find((e) => e.id === id);
    if (!entry) throw new Error('Pack entry not found');
    const snapshot = editorStore.getSaveSnapshot();
    const blob = await editorStore.buildZipForExport({ includeReferenced: true });
    await idbSetPackZip(id, blob);
    entry.packId = snapshot.pack.manifest.packId;
    entry.name = snapshot.pack.manifest.displayName || snapshot.pack.manifest.packId;
    entry.updatedAt = now();
    persist();
    editorStore.commitAcceptedToBaseline();
  }

  async function saveAs(name?: string) {
    const id = makeId();
    const snapshot = editorStore.getSaveSnapshot();
    const blob = await editorStore.buildZipForExport({ includeReferenced: true });
    await idbSetPackZip(id, blob);
    const entry: LocalPackEntry = {
      id,
      name: name || snapshot.pack.manifest.displayName || snapshot.pack.manifest.packId,
      packId: snapshot.pack.manifest.packId,
      updatedAt: now(),
    };
    entries.value.unshift(entry);
    currentId.value = id;
    persist();
    editorStore.commitAcceptedToBaseline();
  }

  async function deleteLocalPack(id: string) {
    await idbDeletePackZip(id);
    entries.value = entries.value.filter((e) => e.id !== id);
    if (currentId.value === id) currentId.value = null;
    persist();
  }

  function selectCurrent(id: string | null) {
    currentId.value = id;
    persist();
  }

  return {
    entries,
    currentId,
    currentEntry,
    loadLocalPack,
    saveToExisting,
    saveAs,
    deleteLocalPack,
    selectCurrent,
  };
});
