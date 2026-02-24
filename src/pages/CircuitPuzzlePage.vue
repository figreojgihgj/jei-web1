<template>
  <q-page :class="['circuit-page', isDark ? 'circuit-page--dark' : 'circuit-page--light']">
    <div class="circuit-shell">
      <div class="circuit-toolbar">
        <div class="tab-group">
          <button
            type="button"
            class="tab-btn"
            :class="{ 'tab-btn--active': activeTab === 'play' }"
            @click="activeTab = 'play'"
          >
            试玩
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ 'tab-btn--active': activeTab === 'editor' }"
            @click="activeTab = 'editor'"
          >
            关卡编辑器
          </button>
        </div>
        <div v-if="activeTab === 'editor'" class="tab-group">
          <button
            type="button"
            class="tab-btn"
            :class="{ 'tab-btn--active': !isMultiMode }"
            @click="setEditorMode('single')"
          >
            单关模式
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ 'tab-btn--active': isMultiMode }"
            @click="setEditorMode('multi')"
          >
            多关模式
          </button>
        </div>

        <div class="toolbar-actions">
          <button type="button" class="toolbar-btn" @click="openCollectionPage">题目收录</button>
          <button type="button" class="toolbar-btn" @click="writeCurrentLevelToUrl">写入当前URL</button>
          <button type="button" class="toolbar-btn" @click="copyShareUrl">复制分享链接</button>
          <button type="button" class="toolbar-btn" @click="openAdvancedShare">高级共享</button>
          <button type="button" class="toolbar-btn" @click="restoreDefaultLevel">恢复默认关卡</button>
        </div>
      </div>
      <p v-if="loadedFromUrl" class="toolbar-tip">当前关卡来自 URL 参数，可直接分享当前地址。</p>

      <div v-if="activeTab === 'play'" class="tab-panel">
        <div class="stage-nav">
          <template v-if="isMultiMode && stageCount > 1">
            <button type="button" class="toolbar-btn" :disabled="!hasPrevStage" @click="goPrevStage">
              上一关
            </button>
            <span class="stage-nav-label">
              第 {{ activeStageIndex + 1 }} / {{ stageCount }} 关：{{ activeStageName }}
            </span>
            <button type="button" class="toolbar-btn" :disabled="!hasNextStage" @click="goNextStage">
              下一关
            </button>
          </template>
          <template v-else>
            <span class="stage-nav-label">当前关卡：{{ activeStageName }}</span>
          </template>
          <button type="button" class="toolbar-btn" @click="syncPlayToEditor">同步到编辑器</button>
        </div>
        <CircuitPuzzleGame :level="activeLevel" @solved="onPlaySolved" />
      </div>

      <div v-else class="tab-panel">
        <div v-if="isMultiMode" class="stage-editor-nav">
          <div class="stage-editor-main">
            <button type="button" class="toolbar-btn" :disabled="!hasPrevStage" @click="goPrevStage">
              上一关
            </button>
            <span class="stage-nav-label">
              第 {{ activeStageIndex + 1 }} / {{ stageCount }} 关：{{ activeStageName }}
            </span>
            <button type="button" class="toolbar-btn" :disabled="!hasNextStage" @click="goNextStage">
              下一关
            </button>
          </div>

          <div class="stage-editor-main">
            <button type="button" class="toolbar-btn" @click="addStageAfterCurrent">+ 新增关卡</button>
            <button type="button" class="toolbar-btn" @click="duplicateCurrentStage">复制当前关卡</button>
            <button type="button" class="toolbar-btn" :disabled="stageCount <= 1" @click="removeCurrentStage">
              删除当前关卡
            </button>
          </div>

          <div class="stage-editor-meta">
            <label class="stage-meta-field">
              <span>题组 ID</span>
              <input v-model.trim="puzzleId" type="text" />
            </label>
            <label class="stage-meta-field">
              <span>题组名称</span>
              <input v-model.trim="puzzleName" type="text" />
            </label>
            <label class="stage-meta-field">
              <span>题组模式</span>
              <select v-model="puzzleMode">
                <option value="sequential">顺序闯关</option>
                <option value="independent">独立关卡</option>
              </select>
            </label>
          </div>

          <div class="stage-chip-list">
            <button
              v-for="(stage, index) in activePuzzle.levels"
              :key="`stage-chip-${stage.id}-${index}`"
              type="button"
              class="stage-chip-btn"
              :class="{ 'stage-chip-btn--active': index === activeStageIndex }"
              @click="switchStage(index)"
            >
              {{ index + 1 }}. {{ stage.name || stage.id || `Stage ${index + 1}` }}
            </button>
          </div>

          <p class="toolbar-tip">切换关卡前建议先点编辑器里的“应用到试玩”，避免未应用改动丢失。</p>
        </div>
        <p v-else class="toolbar-tip">当前是旧版单关模式，分享与编辑行为与旧逻辑一致。</p>
        <CircuitPuzzleLevelEditor
          ref="levelEditorRef"
          v-model:level="activeLevel"
          :multi-puzzle="isMultiMode ? activePuzzle : null"
          :active-stage-index="isMultiMode ? activeStageIndex : 0"
          @import:multi-puzzle="onEditorImportMultiPuzzle"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CircuitPuzzleGame from 'src/components/circuit-puzzle/CircuitPuzzleGame.vue';
import CircuitPuzzleLevelEditor from 'src/components/circuit-puzzle/CircuitPuzzleLevelEditor.vue';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from 'src/components/circuit-puzzle/defaultLevel';
import { decodeMultiLevelFromSharedUrl } from 'src/components/circuit-puzzle/url-format-share';
import { buildSharePayload, getShareValue, resolveShareMode } from 'src/components/circuit-puzzle/url-share-options';
import { encodeMultiLevelForUrlV3 } from 'src/components/circuit-puzzle/url-format-v3';
import {
  multiPuzzleToJson,
  singleLevelToMultiPuzzle,
  type PuzzleMultiLevelDefinition,
} from 'src/components/circuit-puzzle/multi-level-format';
import type { PuzzleLevelDefinition } from 'src/components/circuit-puzzle/types';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const isDark = computed(() => $q.dark.isActive);

const SHARE_QUERY_KEY = 'l';
const TAB_QUERY_KEY = 'tab';
type EditorMode = 'single' | 'multi';
type LevelEditorExpose = {
  flushDraftUpdate: () => void;
};

const activeTab = ref<'play' | 'editor'>('play');
const levelEditorRef = ref<LevelEditorExpose | null>(null);
const activeEditorMode = ref<EditorMode>('single');
const singleLevel = ref<PuzzleLevelDefinition>(cloneLevel(DEFAULT_CIRCUIT_LEVEL));
const activePuzzle = ref<PuzzleMultiLevelDefinition>(
  singleLevelToMultiPuzzle(cloneLevel(DEFAULT_CIRCUIT_LEVEL), {
    id: DEFAULT_CIRCUIT_LEVEL.id,
    name: DEFAULT_CIRCUIT_LEVEL.name,
  }),
);
const activeStageIndex = ref(0);
const loadedFromUrl = ref(false);
const lastLoadedShareCode = ref<string | null>(null);

const isMultiMode = computed(() => activeEditorMode.value === 'multi');
const stageCount = computed(() => activePuzzle.value.levels.length);
const hasPrevStage = computed(() => activeStageIndex.value > 0);
const hasNextStage = computed(() => activeStageIndex.value + 1 < stageCount.value);
const activeStageName = computed(
  () =>
    activePuzzle.value.levels[activeStageIndex.value]?.name
    ?? `Stage ${activeStageIndex.value + 1}`,
);
const puzzleId = computed({
  get: () => activePuzzle.value.id,
  set: (value: string) => {
    activePuzzle.value = { ...activePuzzle.value, id: value.trim() || 'multi-puzzle' };
  },
});
const puzzleName = computed({
  get: () => activePuzzle.value.name,
  set: (value: string) => {
    activePuzzle.value = { ...activePuzzle.value, name: value.trim() || 'Multi Puzzle' };
  },
});
const puzzleMode = computed({
  get: () => activePuzzle.value.mode,
  set: (value: PuzzleMultiLevelDefinition['mode']) => {
    activePuzzle.value = { ...activePuzzle.value, mode: value === 'independent' ? 'independent' : 'sequential' };
  },
});
const activeLevel = computed<PuzzleLevelDefinition>({
  get() {
    if (!isMultiMode.value) {
      return singleLevel.value;
    }
    const level = activePuzzle.value.levels[activeStageIndex.value];
    return level ?? cloneLevel(DEFAULT_CIRCUIT_LEVEL);
  },
  set(nextLevel) {
    if (!isMultiMode.value) {
      singleLevel.value = cloneLevel(nextLevel);
      return;
    }
    const levels = [...activePuzzle.value.levels];
    levels[activeStageIndex.value] = cloneLevel(nextLevel);
    activePuzzle.value = {
      ...activePuzzle.value,
      levels,
    };
  },
});

function clonePuzzle(puzzle: PuzzleMultiLevelDefinition): PuzzleMultiLevelDefinition {
  return {
    id: puzzle.id,
    name: puzzle.name,
    mode: puzzle.mode,
    levels: puzzle.levels.map((level) => cloneLevel(level)),
  };
}

function flushEditorDraft(): void {
  levelEditorRef.value?.flushDraftUpdate();
}

function setEditorMode(mode: EditorMode): void {
  if (mode === activeEditorMode.value) return;
  flushEditorDraft();

  if (mode === 'single') {
    const source = activePuzzle.value.levels[activeStageIndex.value] ?? activePuzzle.value.levels[0];
    if (source) singleLevel.value = cloneLevel(source);
    activeEditorMode.value = 'single';
    return;
  }

  activePuzzle.value = singleLevelToMultiPuzzle(cloneLevel(singleLevel.value), {
    id: activePuzzle.value.id || singleLevel.value.id || 'multi-puzzle',
    name: activePuzzle.value.name || singleLevel.value.name || 'Multi Puzzle',
    mode: activePuzzle.value.mode,
  });
  activeStageIndex.value = 0;
  activeEditorMode.value = 'multi';
}

function setActiveStage(index: number): void {
  if (!stageCount.value) {
    activeStageIndex.value = 0;
    return;
  }
  const clamped = Math.max(0, Math.min(stageCount.value - 1, Math.floor(index)));
  activeStageIndex.value = clamped;
}

function goPrevStage(): void {
  switchStage(activeStageIndex.value - 1);
}

function goNextStage(): void {
  switchStage(activeStageIndex.value + 1);
}

function switchStage(index: number): void {
  flushEditorDraft();
  setActiveStage(index);
}

function createBlankStage(stageIndex: number): PuzzleLevelDefinition {
  const id = `stage-${stageIndex + 1}`;
  const name = `第 ${stageIndex + 1} 关`;
  const rows = 6;
  const cols = 6;
  return {
    id,
    name,
    rows,
    cols,
    blocked: [],
    hintCells: [],
    hintColors: {},
    rowTargets: Array.from({ length: rows }, () => 0),
    colTargets: Array.from({ length: cols }, () => 0),
    pieces: [],
    fixedPlacements: [],
  };
}

function addStageAfterCurrent(): void {
  if (!isMultiMode.value) return;
  flushEditorDraft();
  const insertIndex = activeStageIndex.value + 1;
  const levels = [...activePuzzle.value.levels];
  levels.splice(insertIndex, 0, createBlankStage(insertIndex));
  for (let i = insertIndex + 1; i < levels.length; i += 1) {
    const stage = levels[i];
    if (!stage) continue;
    if (/^stage-\d+$/.test(stage.id)) stage.id = `stage-${i + 1}`;
    if (/^第 \d+ 关$/.test(stage.name)) stage.name = `第 ${i + 1} 关`;
  }
  activePuzzle.value = { ...activePuzzle.value, levels };
  setActiveStage(insertIndex);
}

function duplicateCurrentStage(): void {
  if (!isMultiMode.value) return;
  flushEditorDraft();
  const levels = [...activePuzzle.value.levels];
  const source = levels[activeStageIndex.value];
  if (!source) return;
  const insertIndex = activeStageIndex.value + 1;
  const cloned = cloneLevel(source);
  cloned.id = `${source.id || 'stage'}-copy-${Date.now().toString(36).slice(-4)}`;
  cloned.name = `${source.name || `Stage ${activeStageIndex.value + 1}`} (复制)`;
  levels.splice(insertIndex, 0, cloned);
  activePuzzle.value = { ...activePuzzle.value, levels };
  setActiveStage(insertIndex);
}

function removeCurrentStage(): void {
  if (!isMultiMode.value) return;
  flushEditorDraft();
  if (stageCount.value <= 1) return;
  const levels = [...activePuzzle.value.levels];
  levels.splice(activeStageIndex.value, 1);
  activePuzzle.value = { ...activePuzzle.value, levels };
  setActiveStage(activeStageIndex.value);
}

function onEditorImportMultiPuzzle(payload: {
  puzzle: PuzzleMultiLevelDefinition;
  stageIndex: number;
}): void {
  const nextPuzzle = clonePuzzle(payload.puzzle);
  if (!nextPuzzle.levels.length) return;
  activePuzzle.value = nextPuzzle;
  activeEditorMode.value = 'multi';
  setActiveStage(payload.stageIndex);
  const current = nextPuzzle.levels[Math.max(0, Math.min(nextPuzzle.levels.length - 1, payload.stageIndex))]
    ?? nextPuzzle.levels[0];
  if (current) {
    singleLevel.value = cloneLevel(current);
  }
}

function restoreDefaultLevel(): void {
  const baseLevel = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
  singleLevel.value = cloneLevel(baseLevel);
  activePuzzle.value = singleLevelToMultiPuzzle(cloneLevel(DEFAULT_CIRCUIT_LEVEL), {
    id: DEFAULT_CIRCUIT_LEVEL.id,
    name: DEFAULT_CIRCUIT_LEVEL.name,
  });
  activeStageIndex.value = 0;
  loadedFromUrl.value = false;
  lastLoadedShareCode.value = null;
  const nextQuery = buildQueryFromRoute();
  delete nextQuery[SHARE_QUERY_KEY];
  void router.replace({ path: route.path, query: nextQuery }).catch(() => undefined);
}

function openCollectionPage(): void {
  void router.push('/circuit-puzzle-collection').catch(() => undefined);
}

function getSingleQueryValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

function parseTab(value: unknown): 'play' | 'editor' | null {
  const raw = getSingleQueryValue(value);
  if (raw === 'play' || raw === 'editor') return raw;
  return null;
}

function buildQueryFromRoute(): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, raw] of Object.entries(route.query)) {
    const value = getSingleQueryValue(raw);
    if (value === null) continue;
    next[key] = value;
  }
  return next;
}

function loadLevelFromQuery(rawCode: string | null): void {
  if (!rawCode) {
    loadedFromUrl.value = false;
    lastLoadedShareCode.value = null;
    return;
  }
  if (rawCode === lastLoadedShareCode.value) return;

  try {
    const decoded = decodeMultiLevelFromSharedUrl(rawCode);
    if (!decoded.levels.length) {
      throw new Error('shared puzzle has no levels');
    }
    const firstSourceLevel = decoded.levels[0];
    if (!firstSourceLevel) {
      throw new Error('shared puzzle first level missing');
    }
    const firstLevel = cloneLevel(firstSourceLevel);
    singleLevel.value = firstLevel;
    if (rawCode.startsWith('v3-')) {
      activePuzzle.value = clonePuzzle(decoded);
      activeEditorMode.value = 'multi';
    } else {
      activePuzzle.value = singleLevelToMultiPuzzle(cloneLevel(firstLevel), {
        id: firstLevel.id || 'single-level',
        name: firstLevel.name || 'Single Level',
      });
      activeEditorMode.value = 'single';
    }
    activeStageIndex.value = 0;
    loadedFromUrl.value = true;
    lastLoadedShareCode.value = rawCode;
  } catch {
    loadedFromUrl.value = false;
    $q.notify({
      type: 'negative',
      message: 'URL 关卡解析失败，已保留当前关卡。',
    });
  }
}

function toShareRoute(encoded: string): { path: string; query: Record<string, string> } {
  const query = buildQueryFromRoute();
  query[SHARE_QUERY_KEY] = encoded;
  query[TAB_QUERY_KEY] = activeTab.value;
  return {
    path: route.path,
    query,
  };
}

function buildShareUrl(encoded: string): string {
  const resolved = router.resolve(toShareRoute(encoded));
  return new URL(resolved.href, window.location.origin).toString();
}

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  window.prompt('请复制以下内容', text);
}

function buildCurrentShareEncoding(): { encoded: string; mode: 'v1' | 'v2' | 'v3' } {
  if (isMultiMode.value) {
    return {
      encoded: encodeMultiLevelForUrlV3(activePuzzle.value),
      mode: 'v3',
    };
  }

  const payload = buildSharePayload(activeLevel.value);
  const autoMode = resolveShareMode(payload, 'auto');
  const mode: 'v1' | 'v2' = autoMode === 'v2' ? 'v2' : 'v1';
  const encoded = getShareValue(payload, mode);
  return { encoded, mode };
}

async function copyShareUrl(): Promise<void> {
  try {
    if (activeTab.value === 'editor') flushEditorDraft();
    const { encoded, mode } = buildCurrentShareEncoding();
    const url = buildShareUrl(encoded);
    await copyText(url);
    $q.notify({ type: 'positive', message: `分享链接已复制（${mode}，${encoded.length} 字符）。` });
  } catch {
    $q.notify({ type: 'negative', message: '生成分享链接失败。' });
  }
}

function writeCurrentLevelToUrl(): void {
  try {
    if (activeTab.value === 'editor') flushEditorDraft();
    const { encoded, mode } = buildCurrentShareEncoding();
    void router.replace(toShareRoute(encoded)).catch(() => undefined);
    loadedFromUrl.value = true;
    lastLoadedShareCode.value = encoded;
    $q.notify({ type: 'positive', message: `已将当前关卡写入 URL（${mode}，${encoded.length} 字符）。` });
  } catch {
    $q.notify({ type: 'negative', message: '写入 URL 失败。' });
  }
}

function openAdvancedShare(): void {
  if (activeTab.value === 'editor') flushEditorDraft();
  if (isMultiMode.value) {
    const encoded = encodeMultiLevelForUrlV3(activePuzzle.value);
    const multiJson = JSON.stringify(multiPuzzleToJson(activePuzzle.value));

    $q.dialog({
      title: '高级共享',
      message: '多关卡模式仅支持 v3 链接或多关 JSON',
      options: {
        type: 'radio',
        model: 'v3',
        isValid: (val: unknown) => ['v3', 'json'].includes(String(val)),
        items: [
          { label: `v3 链接（${encoded.length} 字符）`, value: 'v3' },
          { label: `复制多关 JSON（${multiJson.length} 字符）`, value: 'json' },
        ],
      },
      cancel: true,
      ok: { label: '复制' },
    }).onOk((modeValue: unknown) => {
      void (async () => {
        const useJson = String(modeValue) === 'json';
        if (useJson) {
          await copyText(multiJson);
          $q.notify({ type: 'positive', message: `多关 JSON 已复制（${multiJson.length} 字符）。` });
          return;
        }

        const url = buildShareUrl(encoded);
        await copyText(url);
        $q.notify({ type: 'positive', message: `v3 分享链接已复制（${encoded.length} 字符）。` });
      })();
    });
    return;
  }

  const payload = buildSharePayload(activeLevel.value);
  const autoMode = resolveShareMode(payload, 'auto');
  const autoLength = payload.lengths[autoMode];

  $q.dialog({
    title: '高级共享',
    message: '选择共享格式',
    options: {
      type: 'radio',
      model: 'auto',
      isValid: (val: unknown) => ['auto', 'v2', 'v1', 'json'].includes(String(val)),
      items: [
        { label: `自动最短（当前 ${autoMode}，${autoLength} 字符）`, value: 'auto' },
        { label: `v2 链接（${payload.lengths.v2} 字符）`, value: 'v2' },
        { label: `v1 链接（${payload.lengths.v1} 字符）`, value: 'v1' },
        { label: `复制 JSON（${payload.lengths.json} 字符）`, value: 'json' },
      ],
    },
    cancel: true,
    ok: { label: '复制' },
  }).onOk((modeValue: unknown) => {
    void (async () => {
      const mode = ['auto', 'v1', 'v2', 'json'].includes(String(modeValue))
        ? (String(modeValue) as 'auto' | 'v1' | 'v2' | 'json')
        : 'auto';
      const resolvedMode = resolveShareMode(payload, mode);
      const content = getShareValue(payload, mode);

      if (resolvedMode === 'json') {
        await copyText(content);
        $q.notify({ type: 'positive', message: `JSON 已复制（${content.length} 字符）。` });
        return;
      }

      const url = buildShareUrl(content);
      await copyText(url);
      $q.notify({
        type: 'positive',
        message: `分享链接已复制（${resolvedMode}，${content.length} 字符）。`,
      });
    })();
  });
}

function onPlaySolved(): void {
  if (!isMultiMode.value) return;
  if (hasNextStage.value) {
    const finishedStage = activeStageIndex.value + 1;
    const nextStage = finishedStage + 1;
    setActiveStage(activeStageIndex.value + 1);
    $q.notify({
      type: 'positive',
      message: `第 ${finishedStage} 关完成，已切换到第 ${nextStage} 关。`,
    });
    return;
  }

  if (stageCount.value > 1) {
    $q.notify({
      type: 'positive',
      message: `已完成全部 ${stageCount.value} 关。`,
    });
  }
}

function syncPlayToEditor(): void {
  activeTab.value = 'editor';
}

watch(
  () => route.query[TAB_QUERY_KEY],
  (value) => {
    const tab = parseTab(value);
    if (!tab) return;
    if (activeTab.value !== tab) activeTab.value = tab;
  },
  { immediate: true },
);

watch(activeTab, (tab) => {
  const current = parseTab(route.query[TAB_QUERY_KEY]);
  if (current === tab) return;
  const nextQuery = buildQueryFromRoute();
  nextQuery[TAB_QUERY_KEY] = tab;
  void router.replace({ path: route.path, query: nextQuery }).catch(() => undefined);
});

watch(
  () => getSingleQueryValue(route.query[SHARE_QUERY_KEY]),
  (rawCode) => {
    loadLevelFromQuery(rawCode);
  },
  { immediate: true },
);
</script>

<style scoped>
.circuit-page {
  --cp-page-bg: #f1f7f4;
  --cp-btn-border: rgba(114, 145, 137, 0.45);
  --cp-btn-bg: rgba(235, 243, 240, 0.95);
  --cp-btn-text: #2f4d46;
  --cp-btn-hover-border: rgba(124, 178, 95, 0.9);
  --cp-btn-accent: #6f9f23;
  --cp-tip-color: #49645f;
  padding: 12px;
  background: var(--cp-page-bg);
}
.circuit-page--dark {
  --cp-page-bg: #0b1412;
  --cp-btn-border: rgba(163, 185, 179, 0.4);
  --cp-btn-bg: rgba(26, 35, 34, 0.95);
  --cp-btn-text: #d2e1dd;
  --cp-btn-hover-border: rgba(198, 255, 73, 0.88);
  --cp-btn-accent: #e8ff9f;
  --cp-tip-color: #cfe3df;
}

.circuit-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.circuit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-group {
  display: inline-flex;
  gap: 6px;
}

.tab-btn,
.toolbar-btn {
  border: 1px solid var(--cp-btn-border);
  border-radius: 8px;
  background: var(--cp-btn-bg);
  color: var(--cp-btn-text);
  font-size: 13px;
  line-height: 1;
  padding: 9px 12px;
  cursor: pointer;
}

.tab-btn--active {
  border-color: var(--cp-btn-hover-border);
  color: var(--cp-btn-accent);
  box-shadow: inset 0 0 0 1px rgba(198, 255, 73, 0.35);
}

.tab-panel {
  min-height: 1px;
}

.stage-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.stage-nav-label {
  font-size: 13px;
  color: var(--cp-btn-text);
}

.stage-editor-nav {
  border: 1px solid var(--cp-btn-border);
  border-radius: 10px;
  background: var(--cp-btn-bg);
  padding: 10px;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-editor-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.stage-editor-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.stage-meta-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--cp-btn-text);
}

.stage-meta-field input,
.stage-meta-field select {
  border: 1px solid var(--cp-btn-border);
  border-radius: 6px;
  background: var(--cp-page-bg);
  color: var(--cp-btn-text);
  font-size: 13px;
  padding: 6px 8px;
}

.stage-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stage-chip-btn {
  border: 1px solid var(--cp-btn-border);
  border-radius: 999px;
  background: var(--cp-page-bg);
  color: var(--cp-btn-text);
  font-size: 12px;
  line-height: 1;
  padding: 6px 10px;
  cursor: pointer;
}

.stage-chip-btn--active {
  border-color: var(--cp-btn-hover-border);
  color: var(--cp-btn-accent);
  box-shadow: inset 0 0 0 1px rgba(198, 255, 73, 0.35);
}

.toolbar-tip {
  margin: 0;
  color: var(--cp-tip-color);
  font-size: 12px;
}

@media (max-width: 900px) {
  .stage-editor-meta {
    grid-template-columns: 1fr;
  }
}
</style>
