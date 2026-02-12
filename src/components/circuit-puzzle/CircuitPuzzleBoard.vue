<template>
  <div :class="['puzzle-board', isDark ? 'puzzle-board--dark' : 'puzzle-board--light']" :style="boardVars">
    <div class="board-shell">
      <div class="board-ring" :style="ringStyle" @mouseleave="$emit('board-leave')" @contextmenu.prevent="$emit('cancel-selection')">
        <div class="ring-corner ring-item" />

        <CircuitPuzzleClueCell
          v-for="col in props.cols"
          :key="`clue-col-${col}`"
          class="ring-item"
          :style="{ gridColumnStart: col + 1, gridRowStart: 1 }"
          :mode="props.displayMode"
          orientation="col"
          :target="colTargets[col - 1] ?? 0"
          :current="colFilled[col - 1] ?? 0"
          :target-parts="colTargetParts[col - 1] ?? []"
          :current-parts="colFilledParts[col - 1] ?? []"
          :focused="props.focusCol === col - 1"
          :cell-size="cellSize"
        />

        <CircuitPuzzleClueCell
          v-for="row in props.rows"
          :key="`clue-row-${row}`"
          class="ring-item"
          :style="{ gridColumnStart: 1, gridRowStart: row + 1 }"
          :mode="props.displayMode"
          orientation="row"
          :target="rowTargets[row - 1] ?? 0"
          :current="rowFilled[row - 1] ?? 0"
          :target-parts="rowTargetParts[row - 1] ?? []"
          :current-parts="rowFilledParts[row - 1] ?? []"
          :focused="props.focusRow === row - 1"
          :cell-size="cellSize"
        />

        <button
          v-for="cell in cells"
          :key="cell.key"
          type="button"
          class="ring-item board-cell"
          :class="cell.classMap"
          :style="{ gridColumnStart: cell.x + 2, gridRowStart: cell.y + 2 }"
          @mouseenter="$emit('cell-hover', { x: cell.x, y: cell.y })"
          @click="$emit('cell-click', { x: cell.x, y: cell.y })"
        >
          <span v-if="cell.hinted" class="hint-fill" :style="cell.hintFillStyle" />
          <span v-if="cell.hinted" class="hint-outline" :style="cell.hintOutlineStyle" />

          <span v-if="cell.filled" class="piece-fill" :style="cell.fillStyle" />
          <span v-else-if="cell.preview" class="piece-preview-fill" :style="cell.previewStyle" />

          <span v-if="cell.filled" class="piece-outline" :style="cell.fillOutlineStyle" />
          <span
            v-else-if="cell.preview"
            class="piece-outline piece-outline--preview"
            :style="cell.previewOutlineStyle"
          />

          <span v-if="cell.blocked" class="blocked-mark">X</span>
          <span v-else-if="cell.locked" class="locked-mark">LOCK</span>
        </button>
      </div>
    </div>

    <div class="board-caption">
      <span class="caption-key caption-key--filled" /> filled
      <span class="caption-key caption-key--preview" /> preview
      <span class="caption-key caption-key--blocked" /> blocked
      <span class="caption-key caption-key--hint" /> hint
      <span class="caption-key caption-key--locked" /> fixed
      <span v-if="selectedPieceName" class="caption-selected">selected: {{ selectedPieceName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import CircuitPuzzleClueCell from './CircuitPuzzleClueCell.vue';
import type { ClueDisplayMode, GridCell, PuzzleScorePart } from './types';

type BoardOverlayCell = {
  key: string;
  color?: string;
  groupId?: string;
};

type EdgeMap = {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
};

type OverlayResolved = {
  key: string;
  color: string;
  groupId: string;
};

const props = defineProps<{
  rows: number;
  cols: number;
  maxBoardSize?: number;
  blockedKeys: string[];
  lockedKeys?: string[];
  hintKeys: string[];
  hintCells?: BoardOverlayCell[];
  showHints: boolean;
  occupiedKeys: string[];
  occupiedCells?: BoardOverlayCell[];
  previewKeys: string[];
  previewCells?: BoardOverlayCell[];
  previewValid: boolean;
  rowTargets: number[];
  rowFilled: number[];
  rowTargetParts?: PuzzleScorePart[][];
  rowFilledParts?: PuzzleScorePart[][];
  colTargets: number[];
  colFilled: number[];
  colTargetParts?: PuzzleScorePart[][];
  colFilledParts?: PuzzleScorePart[][];
  selectedPieceName: string | null;
  focusRow: number | null;
  focusCol: number | null;
  displayMode: ClueDisplayMode;
}>();
const $q = useQuasar();
const isDark = computed(() => $q.dark.isActive);

defineEmits<{
  (e: 'cell-click', cell: GridCell): void;
  (e: 'cell-hover', cell: GridCell): void;
  (e: 'board-leave'): void;
  (e: 'cancel-selection'): void;
}>();

const boardGap = 4;
const boardPadding = 8;
const outlineWidth = 4;

const cellSize = computed(() => {
  const axis = Math.max(props.rows, props.cols);
  const ringAxis = axis + 1;
  const fallbackSize = 620;
  const maxBoardSize =
    typeof props.maxBoardSize === 'number' && Number.isFinite(props.maxBoardSize) && props.maxBoardSize > 0
      ? props.maxBoardSize
      : fallbackSize;
  const usable = maxBoardSize - boardPadding * 2 - (ringAxis - 1) * boardGap;
  const ideal = Math.floor(usable / ringAxis);
  return Math.max(26, Math.min(110, ideal));
});

const boardVars = computed(() => ({
  '--cell-size': `${cellSize.value}px`,
  '--cell-gap': `${boardGap}px`,
  '--board-pad': `${boardPadding}px`,
}));

const ringStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.cols + 1}, var(--cell-size))`,
  gridTemplateRows: `repeat(${props.rows + 1}, var(--cell-size))`,
}));

const blockedSet = computed(() => new Set(props.blockedKeys));
const lockedSet = computed(() => new Set(props.lockedKeys ?? []));
const hintOverlayMap = computed(() => buildOverlayMap(props.hintKeys, props.hintCells, '#9ddb22'));
const occupiedOverlayMap = computed(() => buildOverlayMap(props.occupiedKeys, props.occupiedCells, '#9ddb22'));
const previewOverlayMap = computed(() =>
  buildOverlayMap(props.previewKeys, props.previewCells, props.previewValid ? '#9ddb22' : '#ff6f6f'),
);

const rowTargets = computed(() => props.rowTargets);
const rowFilled = computed(() => props.rowFilled);
const rowTargetParts = computed(() => props.rowTargetParts ?? []);
const rowFilledParts = computed(() => props.rowFilledParts ?? []);
const colTargets = computed(() => props.colTargets);
const colFilled = computed(() => props.colFilled);
const colTargetParts = computed(() => props.colTargetParts ?? []);
const colFilledParts = computed(() => props.colFilledParts ?? []);

const cells = computed(() => {
  const result: Array<{
    x: number;
    y: number;
    key: string;
    blocked: boolean;
    locked: boolean;
    hinted: boolean;
    filled: boolean;
    preview: boolean;
    hintFillStyle: Record<string, string> | undefined;
    hintOutlineStyle: Record<string, string> | undefined;
    fillStyle: Record<string, string> | undefined;
    previewStyle: Record<string, string> | undefined;
    fillOutlineStyle: Record<string, string> | undefined;
    previewOutlineStyle: Record<string, string> | undefined;
    classMap: Record<string, boolean>;
  }> = [];

  for (let y = 0; y < props.rows; y += 1) {
    for (let x = 0; x < props.cols; x += 1) {
      const key = `${x},${y}`;
      const blocked = blockedSet.value.has(key);
      const locked = lockedSet.value.has(key);
      const hintCell = props.showHints ? hintOverlayMap.value.get(key) : undefined;
      const hinted = props.showHints && !!hintCell;
      const filledCell = occupiedOverlayMap.value.get(key);
      const previewCell = previewOverlayMap.value.get(key);
      const filled = !blocked && !!filledCell;
      const preview = !blocked && !filled && !!previewCell;

      const fillEdges = filledCell
        ? getGroupEdges(key, occupiedOverlayMap.value, filledCell.groupId)
        : { top: false, right: false, bottom: false, left: false };
      const previewEdges = previewCell
        ? getGroupEdges(key, previewOverlayMap.value, previewCell.groupId)
        : { top: false, right: false, bottom: false, left: false };
      const hintEdges = hintCell
        ? getGroupEdges(key, hintOverlayMap.value, hintCell.groupId)
        : { top: false, right: false, bottom: false, left: false };

      const fillOutlineColor = filledCell ? getContrastOutlineColor(filledCell.color) : 'rgba(255, 255, 255, 0.9)';
      const previewOutlineColor = previewCell
        ? withAlpha(previewCell.color, props.previewValid ? 0.95 : 0.9)
        : 'rgba(230, 255, 170, 0.95)';
      const hintOutlineColor = hintCell ? withAlpha(hintCell.color, 0.9) : 'rgba(196, 255, 53, 0.84)';

      result.push({
        x,
        y,
        key,
        blocked,
        locked,
        hinted,
        filled,
        preview,
        hintFillStyle: hintCell
          ? {
              backgroundColor: withAlpha(hintCell.color, 0.14),
            }
          : undefined,
        hintOutlineStyle: hinted ? edgeStyle(hintEdges, 2, hintOutlineColor, true) : undefined,
        fillStyle: filledCell
          ? {
              backgroundColor: withAlpha(filledCell.color, 0.78),
            }
          : undefined,
        previewStyle: previewCell
          ? {
              backgroundColor: props.previewValid
                ? withAlpha(previewCell.color, 0.36)
                : withAlpha('#ff7474', 0.46),
            }
          : undefined,
        fillOutlineStyle: filledCell ? edgeStyle(fillEdges, outlineWidth, fillOutlineColor, false) : undefined,
        previewOutlineStyle: previewCell
          ? edgeStyle(previewEdges, outlineWidth, previewOutlineColor, false)
          : undefined,
        classMap: {
          'board-cell--blocked': blocked,
          'board-cell--locked': locked,
          'board-cell--hint': hinted,
          'board-cell--filled': filled,
          'board-cell--preview': preview,
          'board-cell--preview-ok': preview && props.previewValid,
          'board-cell--preview-bad': preview && !props.previewValid,
        },
      });
    }
  }
  return result;
});

function isKeyInsideBoard(key: string): boolean {
  const [xRaw, yRaw] = key.split(',');
  const x = Number(xRaw);
  const y = Number(yRaw);
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < props.cols && y >= 0 && y < props.rows;
}

function buildOverlayMap(
  keys: string[],
  details: BoardOverlayCell[] | undefined,
  fallbackColor: string,
): Map<string, OverlayResolved> {
  const map = new Map<string, OverlayResolved>();

  for (const key of keys) {
    if (!isKeyInsideBoard(key)) continue;
    map.set(key, {
      key,
      color: fallbackColor,
      groupId: key,
    });
  }

  for (const detail of details ?? []) {
    if (!detail || typeof detail.key !== 'string') continue;
    if (!isKeyInsideBoard(detail.key)) continue;
    map.set(detail.key, {
      key: detail.key,
      color: detail.color?.trim() || fallbackColor,
      groupId: detail.groupId?.trim() || detail.key,
    });
  }

  return map;
}

function parseKey(key: string): GridCell {
  const [xRaw, yRaw] = key.split(',');
  return { x: Number(xRaw), y: Number(yRaw) };
}

function getGroupEdges(key: string, overlayMap: Map<string, OverlayResolved>, groupId: string): EdgeMap {
  const { x, y } = parseKey(key);
  const top = overlayMap.get(`${x},${y - 1}`)?.groupId !== groupId;
  const right = overlayMap.get(`${x + 1},${y}`)?.groupId !== groupId;
  const bottom = overlayMap.get(`${x},${y + 1}`)?.groupId !== groupId;
  const left = overlayMap.get(`${x - 1},${y}`)?.groupId !== groupId;
  return { top, right, bottom, left };
}

function edgeStyle(edges: EdgeMap, width: number, color: string, dashed: boolean): Record<string, string> {
  const style = dashed ? 'dashed' : 'solid';
  return {
    borderTop: `${edges.top ? width : 0}px ${style} ${color}`,
    borderRight: `${edges.right ? width : 0}px ${style} ${color}`,
    borderBottom: `${edges.bottom ? width : 0}px ${style} ${color}`,
    borderLeft: `${edges.left ? width : 0}px ${style} ${color}`,
  };
}

function withAlpha(color: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const hex = color.trim();
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return color;
  const raw = match[1];
  if (!raw) return color;
  const full = raw.length === 3 ? raw.split('').map((ch) => `${ch}${ch}`).join('') : raw;
  if (!full) return color;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

// 计算对比色作为描边颜色（使描边更明显）
function getContrastOutlineColor(color: string): string {
  const hex = color.trim();
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex);
  if (!match || !match[1]) return 'rgba(255, 255, 255, 0.9)';
  const raw = match[1];
  const full = raw.length === 3 ? raw.split('').map((ch) => `${ch}${ch}`).join('') : raw;
  if (!full) return 'rgba(255, 255, 255, 0.9)';
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  // 计算亮度
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // 如果颜色偏亮，用深色描边；如果颜色偏暗，用亮色描边
  if (luminance > 0.5) {
    return `rgba(20, 40, 35, 0.95)`; // 深色描边
  } else {
    return `rgba(255, 255, 255, 0.9)`; // 白色描边
  }
}
</script>

<style scoped>
.puzzle-board {
  --bd-shell-border: rgba(118, 148, 139, 0.42);
  --bd-shell-bg: linear-gradient(180deg, rgba(235, 244, 241, 0.95), rgba(224, 236, 232, 0.96));
  --bd-corner-bg: rgba(124, 149, 141, 0.22);
  --bd-corner-border: rgba(114, 138, 130, 0.32);
  --bd-cell-border: rgba(123, 146, 138, 0.32);
  --bd-cell-bg: rgba(245, 250, 248, 0.88);
  --bd-cell-text: #60817a;
  --bd-caption: rgba(68, 94, 88, 0.86);
  --bd-caption-selected: #4d7f18;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.puzzle-board--dark {
  --bd-shell-border: rgba(187, 255, 0, 0.4);
  --bd-shell-bg: linear-gradient(180deg, rgba(9, 12, 11, 0.9), rgba(3, 6, 5, 0.95));
  --bd-corner-bg: rgba(72, 91, 87, 0.22);
  --bd-corner-border: rgba(113, 138, 130, 0.24);
  --bd-cell-border: rgba(121, 148, 140, 0.25);
  --bd-cell-bg: rgba(10, 18, 17, 0.8);
  --bd-cell-text: #9eb7ae;
  --bd-caption: rgba(193, 213, 208, 0.82);
  --bd-caption-selected: #dbff85;
}

.board-shell {
  width: max-content;
  padding: var(--board-pad);
  border: 1px solid var(--bd-shell-border);
  border-radius: 10px;
  background: var(--bd-shell-bg);
}

.board-ring {
  display: grid;
  gap: var(--cell-gap);
  width: max-content;
}

.ring-item {
  width: var(--cell-size);
  height: var(--cell-size);
}

.ring-corner {
  border-radius: 4px;
  background: var(--bd-corner-bg);
  border: 1px solid var(--bd-corner-border);
}

.board-cell {
  border: 1px solid var(--bd-cell-border);
  border-radius: 4px;
  background: var(--bd-cell-bg);
  color: var(--bd-cell-text);
  cursor: pointer;
  position: relative;
  padding: 0;
  overflow: hidden;
}

.board-cell:hover {
  border-color: rgba(187, 255, 0, 0.42);
}

.board-cell--filled {
  border-color: rgba(200, 255, 88, 0.72);
}

.board-cell--locked {
  box-shadow: inset 0 0 0 1px rgba(255, 238, 120, 0.45);
}

.board-cell--blocked {
  cursor: not-allowed;
  background:
    repeating-linear-gradient(
      135deg,
      rgba(134, 145, 145, 0.45) 0 5px,
      rgba(97, 108, 108, 0.35) 5px 10px
    ),
    rgba(35, 41, 41, 0.9);
  border-color: rgba(167, 177, 177, 0.42);
}

.board-cell--preview {
  box-shadow: inset 0 0 0 2px rgba(240, 255, 196, 0.35);
}

.board-cell--preview-bad {
  border-color: rgba(255, 120, 120, 0.85);
}

.hint-fill,
.hint-outline,
.piece-fill,
.piece-preview-fill,
.piece-outline {
  position: absolute;
  inset: 1px;
  border-radius: 3px;
  pointer-events: none;
}

.hint-fill {
  z-index: 1;
}

.hint-outline {
  z-index: 2;
  box-shadow: 0 0 6px rgba(220, 255, 140, 0.25);
}

.piece-fill {
  z-index: 3;
  box-shadow: inset 0 0 0 1px rgba(230, 255, 190, 0.22);
}

.piece-preview-fill {
  z-index: 4;
}

.piece-outline {
  z-index: 5;
  filter: drop-shadow(0 0 4px rgba(233, 255, 164, 0.35));
}

.piece-outline--preview {
  filter: drop-shadow(0 0 4px rgba(233, 255, 164, 0.35));
}

.blocked-mark {
  position: relative;
  z-index: 6;
  font-size: 11px;
  color: rgba(225, 232, 232, 0.85);
}

.locked-mark {
  position: absolute;
  right: 2px;
  bottom: 1px;
  z-index: 6;
  font-size: 8px;
  letter-spacing: 0.2px;
  color: rgba(245, 239, 166, 0.95);
  text-shadow: 0 0 4px rgba(248, 232, 122, 0.35);
  pointer-events: none;
}

.board-caption {
  font-size: 12px;
  color: var(--bd-caption);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.caption-key {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  display: inline-block;
}

.caption-key--filled {
  border: 1px solid rgba(200, 255, 88, 0.8);
  background: rgba(150, 205, 30, 0.85);
}

.caption-key--preview {
  border: 1px dashed rgba(240, 255, 196, 0.8);
  background: rgba(162, 228, 0, 0.35);
}

.caption-key--blocked {
  border: 1px solid rgba(167, 177, 177, 0.6);
  background: rgba(103, 114, 114, 0.8);
}

.caption-key--hint {
  border: 1px dashed rgba(196, 255, 53, 0.8);
  background: transparent;
}

.caption-key--locked {
  border: 1px solid rgba(255, 229, 120, 0.75);
  background: rgba(255, 230, 120, 0.28);
}

.caption-selected {
  margin-left: auto;
  color: var(--bd-caption-selected);
}

@media (max-width: 960px) {
  .puzzle-board {
    overflow: auto;
  }
}
</style>
