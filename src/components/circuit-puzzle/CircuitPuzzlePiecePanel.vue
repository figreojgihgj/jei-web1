<template>
  <section v-if="piecePanelState.docked" class="editor-card piece-docked-card">
    <div class="piece-docked-head">
      <h3>方块列表</h3>
      <div class="piece-docked-actions">
        <button type="button" class="editor-btn" @click="emit('add-piece')">+ 添加方块</button>
        <button type="button" class="editor-btn" @click="emit('set-docked', false)">
          改为悬浮
        </button>
      </div>
    </div>

    <div
      ref="pieceColumnsRef"
      class="piece-columns piece-columns--docked"
      :class="{ 'piece-columns--stacked': isStacked }"
      :style="stackedStyle"
    >
      <div class="piece-column">
        <div class="favorite-panel">
          <div class="favorite-head">
            <h3>收藏方块</h3>
            <span class="favorite-meta">{{ favoritePieces.length }} 个</span>
          </div>
          <div class="favorite-body">
            <div v-if="favoritePieces.length" class="favorite-list">
              <article v-for="fav in favoritePieces" :key="fav.key" class="piece-card">
                <div class="piece-preview-wrap">
                  <CircuitPuzzlePieceCard
                    :item-id="fav.key"
                    :piece="toFavoriteDefinition(fav)"
                    :label="fav.name"
                    :counter-text="`数量 ${Math.max(0, fav.count)}`"
                    :footer-text="fav.id"
                    :rotation="0"
                    :placed-anchor="null"
                    :selected="false"
                    :can-rotate="false"
                    :can-pickup="false"
                    :show-pickup="false"
                    :unavailable="false"
                    @select="emit('import-favorite', fav.key)"
                  />
                </div>
                <div class="piece-actions">
                  <button
                    type="button"
                    class="editor-btn"
                    @click="emit('import-favorite', fav.key)"
                  >
                    导入到当前
                  </button>
                  <button
                    type="button"
                    class="editor-btn editor-btn--danger"
                    @click="emit('remove-favorite', fav.key)"
                  >
                    移除收藏
                  </button>
                </div>
              </article>
            </div>
            <div v-else class="favorite-empty">暂无收藏</div>
          </div>
        </div>
      </div>

      <div v-if="isStacked" class="piece-splitter" @pointerdown="onSplitPointerDown" />

      <div class="piece-column">
        <div class="piece-list piece-list--docked">
          <article
            v-for="(piece, idx) in pieces"
            :key="piece.uid"
            class="piece-card"
            :class="{ 'piece-card--selected': selectedPieceUid === piece.uid }"
          >
            <div class="piece-preview-wrap">
              <CircuitPuzzlePieceCard
                :item-id="piece.uid"
                :piece="toPieceDefinition(piece)"
                :label="piece.name"
                :counter-text="`剩余 ${remainingCountByUid.get(piece.uid) ?? 0}/${Math.max(0, piece.count)}`"
                :footer-text="`已放置 ${usedCountByUid.get(piece.uid) ?? 0}`"
                :rotation="pieceListRotationByUid[piece.uid] ?? 0"
                :placed-anchor="null"
                :selected="selectedPieceUid === piece.uid"
                :can-rotate="true"
                :can-pickup="false"
                :show-pickup="false"
                :unavailable="(remainingCountByUid.get(piece.uid) ?? 0) <= 0"
                @select="emit('select-piece', piece.uid)"
                @rotate="emit('rotate-piece-in-palette', piece.uid)"
              />
            </div>

            <div class="piece-card-head">
              <label class="editor-field"
                ><span>id</span><input v-model.trim="piece.id" type="text"
              /></label>
              <label class="editor-field"
                ><span>name</span><input v-model.trim="piece.name" type="text"
              /></label>
              <label class="editor-field"
                ><span>color</span
                ><input v-model.trim="piece.color" type="text" placeholder="#9ddb22"
              /></label>
              <label class="editor-field"
                ><span>count</span><input v-model.number="piece.count" type="number" min="0"
              /></label>
            </div>

            <div class="piece-meta-row">
              <span :class="{ 'text-unavailable': remainingCountByUid.get(piece.uid) === 0 }"
                >剩余 {{ remainingCountByUid.get(piece.uid) ?? 0 }}/{{
                  Math.max(0, piece.count)
                }}</span
              >
              <span>已放置 {{ usedCountByUid.get(piece.uid) ?? 0 }}</span>
            </div>

            <div class="piece-actions">
              <button type="button" class="editor-btn" @click="emit('select-piece', piece.uid)">
                选中摆放
              </button>
              <button
                type="button"
                class="editor-btn"
                @click="emit('select-piece-shape', piece.uid)"
              >
                编辑形状
              </button>
              <button
                type="button"
                class="editor-btn"
                @click="emit('rotate-piece-shape', piece.uid)"
              >
                旋转形状
              </button>
              <button
                type="button"
                class="editor-btn"
                @click="emit('clear-piece-cells', piece.uid)"
              >
                清空形状
              </button>
              <button type="button" class="editor-btn" @click="emit('favorite-piece', piece.uid)">
                收藏
              </button>
              <button
                type="button"
                class="editor-btn editor-btn--danger"
                @click="emit('remove-piece', idx)"
              >
                删除
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>

  <aside
    v-else-if="!piecePanelState.minimized"
    class="piece-float-panel"
    :style="piecePanelStyle"
    @pointerdown.stop
  >
    <div class="piece-float-head" @pointerdown="emit('head-pointer-down', $event)">
      <div class="piece-float-dragger">方块列表</div>
      <div class="piece-float-head-actions" @pointerdown.stop>
        <button type="button" class="editor-btn" @click="emit('add-piece')">+ 添加方块</button>
        <button type="button" class="editor-btn" @click="emit('set-docked', true)">停泊入页</button>
        <button type="button" class="editor-btn" @click="emit('minimize')">最小化</button>
      </div>
    </div>

    <div
      ref="pieceColumnsRef"
      class="piece-columns piece-columns--floating"
      :class="{ 'piece-columns--stacked': isStacked }"
      :style="stackedStyle"
    >
      <div class="piece-column">
        <div class="piece-list piece-list--floating">
          <article
            v-for="(piece, idx) in pieces"
            :key="piece.uid"
            class="piece-card"
            :class="{ 'piece-card--selected': selectedPieceUid === piece.uid }"
          >
            <div class="piece-preview-wrap">
              <CircuitPuzzlePieceCard
                :item-id="piece.uid"
                :piece="toPieceDefinition(piece)"
                :label="piece.name"
                :counter-text="`剩余 ${remainingCountByUid.get(piece.uid) ?? 0}/${Math.max(0, piece.count)}`"
                :footer-text="`已放置 ${usedCountByUid.get(piece.uid) ?? 0}`"
                :rotation="pieceListRotationByUid[piece.uid] ?? 0"
                :placed-anchor="null"
                :selected="selectedPieceUid === piece.uid"
                :can-rotate="true"
                :can-pickup="false"
                :show-pickup="false"
                :unavailable="(remainingCountByUid.get(piece.uid) ?? 0) <= 0"
                @select="emit('select-piece', piece.uid)"
                @rotate="emit('rotate-piece-in-palette', piece.uid)"
              />
            </div>

            <div class="piece-card-head">
              <label class="editor-field"
                ><span>id</span><input v-model.trim="piece.id" type="text"
              /></label>
              <label class="editor-field"
                ><span>name</span><input v-model.trim="piece.name" type="text"
              /></label>
              <label class="editor-field"
                ><span>color</span
                ><input v-model.trim="piece.color" type="text" placeholder="#9ddb22"
              /></label>
              <label class="editor-field"
                ><span>count</span><input v-model.number="piece.count" type="number" min="0"
              /></label>
            </div>

            <div class="piece-meta-row">
              <span :class="{ 'text-unavailable': remainingCountByUid.get(piece.uid) === 0 }"
                >剩余 {{ remainingCountByUid.get(piece.uid) ?? 0 }}/{{
                  Math.max(0, piece.count)
                }}</span
              >
              <span>已放置 {{ usedCountByUid.get(piece.uid) ?? 0 }}</span>
            </div>

            <div class="piece-actions">
              <button type="button" class="editor-btn" @click="emit('select-piece', piece.uid)">
                选中摆放
              </button>
              <button
                type="button"
                class="editor-btn"
                @click="emit('select-piece-shape', piece.uid)"
              >
                编辑形状
              </button>
              <button
                type="button"
                class="editor-btn"
                @click="emit('rotate-piece-shape', piece.uid)"
              >
                旋转形状
              </button>
              <button
                type="button"
                class="editor-btn"
                @click="emit('clear-piece-cells', piece.uid)"
              >
                清空形状
              </button>
              <button type="button" class="editor-btn" @click="emit('favorite-piece', piece.uid)">
                收藏
              </button>
              <button
                type="button"
                class="editor-btn editor-btn--danger"
                @click="emit('remove-piece', idx)"
              >
                删除
              </button>
            </div>
          </article>
        </div>
      </div>
      <div v-if="isStacked" class="piece-splitter" @pointerdown="onSplitPointerDown" />

      <div class="piece-column">
        <div class="favorite-panel">
          <div class="favorite-head">
            <p>收藏方块</p>
            <span class="favorite-meta">{{ favoritePieces.length }} 个</span>
          </div>
          <div class="favorite-body">
            <div v-if="favoritePieces.length" class="favorite-list">
              <article v-for="fav in favoritePieces" :key="fav.key" class="piece-card">
                <div class="piece-preview-wrap">
                  <CircuitPuzzlePieceCard
                    :item-id="fav.key"
                    :piece="toFavoriteDefinition(fav)"
                    :label="fav.name"
                    :counter-text="`数量 ${Math.max(0, fav.count)}`"
                    :footer-text="fav.id"
                    :rotation="0"
                    :placed-anchor="null"
                    :selected="false"
                    :can-rotate="false"
                    :can-pickup="false"
                    :show-pickup="false"
                    :unavailable="false"
                    @select="emit('import-favorite', fav.key)"
                  />
                </div>
                <div class="piece-actions">
                  <button
                    type="button"
                    class="editor-btn"
                    @click="emit('import-favorite', fav.key)"
                  >
                    导入到当前
                  </button>
                  <button
                    type="button"
                    class="editor-btn editor-btn--danger"
                    @click="emit('remove-favorite', fav.key)"
                  >
                    移除收藏
                  </button>
                </div>
              </article>
            </div>
            <div v-else class="favorite-empty">暂无收藏</div>
          </div>
        </div>
      </div>
    </div>

    <div class="piece-float-resizer" @pointerdown.stop.prevent="emit('resize-start', $event)" />
  </aside>

  <div v-else class="piece-float-minimized-wrap" :style="piecePanelMinStyle">
    <button type="button" class="piece-float-minimized" @click="emit('restore')">
      方块列表 ({{ pieces.length }})
    </button>
    <button
      type="button"
      class="piece-float-minimized piece-float-minimized--ghost"
      @click="emit('set-docked', true)"
    >
      停泊入页
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import CircuitPuzzlePieceCard from './CircuitPuzzlePieceCard.vue';
import type { PuzzlePieceDefinition } from './types';

type PieceForm = {
  uid: string;
  id: string;
  name: string;
  color: string;
  count: number;
  cells: string[];
};
type FavoritePiece = {
  key: string;
  id: string;
  name: string;
  color: string;
  count: number;
  cells: string[];
};
type PiecePanelState = {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  docked: boolean;
};

const props = defineProps<{
  pieces: PieceForm[];
  selectedPieceUid: string | null;
  remainingCountByUid: Map<string, number>;
  usedCountByUid: Map<string, number>;
  pieceListRotationByUid: Record<string, number>;
  favoritePieces: FavoritePiece[];
  piecePanelState: PiecePanelState;
  piecePanelStyle: Record<string, string>;
  piecePanelMinStyle: Record<string, string>;
  piecePanelSplitRatio: number;
  toPieceDefinition: (piece: PieceForm) => PuzzlePieceDefinition;
  toFavoriteDefinition: (favorite: FavoritePiece) => PuzzlePieceDefinition;
}>();

const emit = defineEmits<{
  (e: 'add-piece'): void;
  (e: 'set-docked', docked: boolean): void;
  (e: 'minimize'): void;
  (e: 'restore'): void;
  (e: 'select-piece', uid: string): void;
  (e: 'select-piece-shape', uid: string): void;
  (e: 'rotate-piece-shape', uid: string): void;
  (e: 'clear-piece-cells', uid: string): void;
  (e: 'favorite-piece', uid: string): void;
  (e: 'import-favorite', key: string): void;
  (e: 'remove-favorite', key: string): void;
  (e: 'remove-piece', index: number): void;
  (e: 'rotate-piece-in-palette', uid: string): void;
  (e: 'head-pointer-down', event: PointerEvent): void;
  (e: 'resize-start', event: PointerEvent): void;
  (e: 'update-piece-panel-split-ratio', value: number): void;
}>();

const pieceColumnsRef = ref<HTMLElement | null>(null);
const isStacked = ref(false);
const columnsSize = ref({ width: 0, height: 0 });
let columnsObserver: ResizeObserver | null = null;
const MIN_COLUMN_WIDTH = 320;
const MIN_COLUMN_HEIGHT = 180;
const COLUMN_GAP = 10;
const SPLITTER_SIZE = 8;
const splitDrag = ref<{
  pointerId: number;
  startY: number;
  startTop: number;
  available: number;
  minSize: number;
} | null>(null);

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function updateColumnsSize(): void {
  const el = pieceColumnsRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  columnsSize.value = { width: rect.width, height: rect.height };
  isStacked.value = rect.width < MIN_COLUMN_WIDTH * 2 + COLUMN_GAP;
}

const stackedStyle = computed(() => {
  if (!isStacked.value) return {};
  const height = columnsSize.value.height;
  const available = Math.max(0, height - SPLITTER_SIZE);
  if (available <= 0) return {};
  const minSize = Math.min(MIN_COLUMN_HEIGHT, available / 2);
  const top = clampNumber(available * props.piecePanelSplitRatio, minSize, available - minSize);
  const bottom = Math.max(0, available - top);
  return {
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: `${top}px ${SPLITTER_SIZE}px ${bottom}px`,
  };
});

function onSplitPointerMove(event: PointerEvent): void {
  if (!splitDrag.value) return;
  if (event.pointerId !== splitDrag.value.pointerId) return;
  const { startY, startTop, available, minSize } = splitDrag.value;
  const delta = event.clientY - startY;
  const nextTop = clampNumber(startTop + delta, minSize, available - minSize);
  const ratio = available > 0 ? nextTop / available : 0.5;
  emit('update-piece-panel-split-ratio', ratio);
}

function onSplitPointerUp(event: PointerEvent): void {
  if (!splitDrag.value) return;
  if (event.pointerId !== splitDrag.value.pointerId) return;
  splitDrag.value = null;
  window.removeEventListener('pointermove', onSplitPointerMove);
  window.removeEventListener('pointerup', onSplitPointerUp);
}

function onSplitPointerDown(event: PointerEvent): void {
  if (!isStacked.value) return;
  const height = columnsSize.value.height;
  const available = Math.max(0, height - SPLITTER_SIZE);
  if (available <= 0) return;
  const minSize = Math.min(MIN_COLUMN_HEIGHT, available / 2);
  const startTop = clampNumber(
    available * props.piecePanelSplitRatio,
    minSize,
    available - minSize,
  );
  splitDrag.value = {
    pointerId: event.pointerId,
    startY: event.clientY,
    startTop,
    available,
    minSize,
  };
  (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
  window.addEventListener('pointermove', onSplitPointerMove);
  window.addEventListener('pointerup', onSplitPointerUp);
}

onMounted(() => {
  updateColumnsSize();
  if (!pieceColumnsRef.value || typeof ResizeObserver === 'undefined') return;
  columnsObserver = new ResizeObserver(() => updateColumnsSize());
  columnsObserver.observe(pieceColumnsRef.value);
});

onUnmounted(() => {
  columnsObserver?.disconnect();
  columnsObserver = null;
  window.removeEventListener('pointermove', onSplitPointerMove);
  window.removeEventListener('pointerup', onSplitPointerUp);
});
</script>

<style scoped>
.editor-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.editor-field span {
  font-size: 12px;
  color: var(--ed-text);
}
.editor-field input {
  border: 1px solid var(--ed-input-border);
  border-radius: 8px;
  background: var(--ed-input-bg);
  color: var(--ed-text);
  padding: 8px;
  font-size: 13px;
  font-family: 'Consolas', 'Courier New', monospace;
}
.editor-btn {
  border: 1px solid var(--ed-btn-border);
  border-radius: 6px;
  background: var(--ed-btn-bg);
  color: var(--ed-btn-text);
  font-size: 12px;
  line-height: 1;
  padding: 8px 10px;
  cursor: pointer;
}
.editor-btn:hover {
  border-color: var(--ed-btn-hover);
  color: var(--ed-btn-active);
}
.editor-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.editor-btn--danger {
  border-color: rgba(255, 124, 124, 0.55);
  color: var(--ed-danger);
}
.piece-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.favorite-panel {
  border: 1px solid var(--ed-card-border);
  border-radius: 8px;
  background: var(--ed-panel-bg);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
}
.favorite-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.favorite-head h3 {
  margin: 0;
}
.favorite-meta {
  font-size: 12px;
  color: var(--ed-muted);
}
.favorite-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.favorite-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}
.favorite-empty {
  font-size: 12px;
  color: var(--ed-muted);
}
.piece-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}
.piece-columns--stacked {
  grid-template-columns: minmax(0, 1fr);
}
.piece-splitter {
  height: 8px;
  border-radius: 999px;
  background: var(--ed-btn-border);
  cursor: row-resize;
  align-self: stretch;
}
.piece-splitter:hover {
  background: var(--ed-btn-hover);
}
.piece-columns--docked {
  max-height: 68vh;
  height: 68vh;
}
.piece-columns--floating {
  flex: 1;
  min-height: 0;
  padding: 8px;
  height: 100%;
}
.piece-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.piece-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.piece-list--docked {
  max-height: none;
}
.piece-docked-card {
  grid-column: 1 / -1;
}
.piece-docked-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.piece-docked-head h3 {
  margin: 0;
}
.piece-docked-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.piece-card {
  border: 1px solid var(--ed-card-border);
  border-radius: 8px;
  background: var(--ed-panel-bg);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.piece-card--selected {
  border-color: rgba(198, 255, 73, 0.8);
}
.piece-preview-wrap {
  border: 1px solid var(--ed-card-border);
  border-radius: 8px;
  padding: 6px;
  background: var(--ed-card-bg);
}
.piece-card-head {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  align-items: end;
}
.piece-meta-row {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--ed-text);
}
.text-unavailable {
  color: #ff9e9e;
}
.piece-float-panel {
  position: fixed;
  z-index: 80;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ed-card-border);
  border-radius: 10px;
  background: var(--ed-card-bg);
  box-shadow: 0 14px 34px rgba(2, 10, 9, 0.3);
  overflow: hidden;
  backdrop-filter: blur(6px);
}
.piece-float-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--ed-card-border);
  background: var(--ed-panel-bg);
  cursor: move;
  user-select: none;
}
.piece-float-dragger {
  font-size: 13px;
  color: var(--ed-title);
  font-weight: 600;
}
.piece-float-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: default;
}
.piece-list--floating {
  max-height: none;
  padding: 0;
}
.piece-float-resizer {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(176, 204, 192, 0.65) 50%) no-repeat;
  border: 0;
  padding: 0;
}
.piece-float-minimized-wrap {
  position: fixed;
  z-index: 80;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.piece-float-minimized {
  border: 1px solid var(--ed-btn-border);
  border-radius: 999px;
  background: var(--ed-btn-bg);
  color: var(--ed-btn-text);
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(2, 10, 9, 0.24);
}
.piece-float-minimized--ghost {
  background: var(--ed-panel-bg);
}
@media (max-width: 1400px) {
  .piece-list {
    max-height: 46vh;
  }
}
@media (max-width: 860px) {
  .piece-card-head {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .piece-float-head {
    cursor: grab;
  }
  .piece-float-panel {
    z-index: 90;
  }
}
</style>
