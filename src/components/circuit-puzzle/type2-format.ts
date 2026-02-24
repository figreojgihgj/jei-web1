import type { GridCell, PuzzleFixedPlacementDefinition, PuzzleLevelDefinition, PuzzlePieceDefinition } from './types';
import type { PuzzleJsonDocument, PuzzleMultiLevelDefinition } from './multi-level-format';

type Type2PuzzleEntry = {
  minigameId?: string;
  title?: string;
  puzzleData?: unknown;
};

type Type2PuzzleData = {
  chessBoardID?: string;
  sizeX?: number;
  sizeY?: number;
  rowCondition?: unknown;
  columnCondition?: unknown;
  bannedGrids?: unknown;
  preGrids?: unknown;
  attachBlocks?: unknown;
  refAnswerGrids?: unknown;
};

type Type2AttachBlock = {
  blockID?: string;
  number?: number;
  color?: number;
};

type Type2BlockJson = {
  blockID?: string;
  originBlocks?: unknown;
};

const TYPE2_COLOR_PALETTE = [
  '#9ddb22',
  '#89d817',
  '#ff6f6f',
  '#ffffff',
  '#ffcc00',
  '#00ccff',
  '#cc66ff',
  '#ff6600',
];

const COLOR_KEY_RE = /^Color(\d+)$/;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asInteger(value: unknown): number | null {
  const num = Number(value);
  return Number.isInteger(num) ? num : null;
}

function asGridCell(value: unknown): GridCell | null {
  const obj = asObject(value);
  if (!obj) return null;
  const x = asInteger(obj.x);
  const y = asInteger(obj.y);
  if (x === null || y === null) return null;
  return { x, y };
}

function normalizeShapeCells(cells: GridCell[]): GridCell[] {
  if (!cells.length) return [];
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  return cells.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));
}

function uniqueCells(cells: GridCell[]): GridCell[] {
  const out: GridCell[] = [];
  const seen = new Set<string>();
  for (const cell of cells) {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cell);
  }
  return out;
}

function parseColorCodeFromKey(key: string): number | null {
  const match = COLOR_KEY_RE.exec(key.trim());
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function colorCodeToHex(code: number): string {
  const paletteIdx = ((code - 1) % TYPE2_COLOR_PALETTE.length + TYPE2_COLOR_PALETTE.length)
    % TYPE2_COLOR_PALETTE.length;
  return TYPE2_COLOR_PALETTE[paletteIdx] ?? TYPE2_COLOR_PALETTE[0] ?? '#9ddb22';
}

function parseConditionTotals(
  raw: unknown,
  axisLength: number,
  axisLabel: 'row' | 'column',
  errors: string[],
): { totals: number[]; countsByColorCode: Map<number, number[]> } {
  const totals = Array.from({ length: axisLength }, () => 0);
  const countsByColorCode = new Map<number, number[]>();
  const obj = asObject(raw);
  if (!obj) {
    errors.push(`${axisLabel}Condition must be an object`);
    return { totals, countsByColorCode };
  }

  for (const [key, value] of Object.entries(obj)) {
    const colorCode = parseColorCodeFromKey(key);
    if (colorCode === null) continue;
    if (!Array.isArray(value) || value.length === 0) continue;
    if (value.length !== axisLength) {
      errors.push(`${axisLabel}Condition.${key} length (${value.length}) must equal ${axisLength}`);
      continue;
    }

    const counts: number[] = [];
    let valid = true;
    for (let i = 0; i < value.length; i += 1) {
      const num = Number(value[i]);
      if (!Number.isInteger(num) || num < 0) {
        errors.push(`${axisLabel}Condition.${key}[${i}] must be a non-negative integer`);
        valid = false;
        break;
      }
      counts.push(num);
    }
    if (!valid) continue;
    countsByColorCode.set(colorCode, counts);
  }

  return { totals, countsByColorCode };
}

function fillWeightedTotals(
  totals: number[],
  countsByColorCode: Map<number, number[]>,
  weightByColorCode: Map<number, number>,
): void {
  for (const [code, counts] of countsByColorCode.entries()) {
    const weight = weightByColorCode.get(code) ?? 1;
    for (let i = 0; i < totals.length; i += 1) {
      totals[i] = (totals[i] ?? 0) + (counts[i] ?? 0) * weight;
    }
  }
}

function parseCellsArray(raw: unknown, path: string, errors: string[]): GridCell[] {
  if (!Array.isArray(raw)) {
    errors.push(`${path} must be an array`);
    return [];
  }
  const out: GridCell[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const cell = asGridCell(raw[i]);
    if (!cell) {
      errors.push(`${path}[${i}] must be {x:int,y:int}`);
      continue;
    }
    out.push(cell);
  }
  return out;
}

function parseFixedPlacements(raw: unknown, errors: string[]): {
  fixedPlacements: PuzzleFixedPlacementDefinition[];
  usedColorCodes: Set<number>;
} {
  const fixedPlacements: PuzzleFixedPlacementDefinition[] = [];
  const usedColorCodes = new Set<number>();
  const obj = asObject(raw);
  if (!obj) return { fixedPlacements, usedColorCodes };

  for (const [key, value] of Object.entries(obj)) {
    const colorCode = parseColorCodeFromKey(key);
    if (colorCode === null) continue;
    const color = colorCodeToHex(colorCode);
    const cells = parseCellsArray(value, `preGrids.${key}`, errors);
    usedColorCodes.add(colorCode);

    cells.forEach((cell, idx) => {
      fixedPlacements.push({
        id: `pre-${colorCode}-${cell.x}-${cell.y}-${idx}`,
        name: `${key} (${cell.x},${cell.y})`,
        color,
        cells: [{ x: 0, y: 0 }],
        anchor: { x: cell.x, y: cell.y },
      });
    });
  }

  return { fixedPlacements, usedColorCodes };
}

function parseAttachBlocks(
  raw: unknown,
  blockCellsById: Map<string, GridCell[]>,
  errors: string[],
): { pieces: PuzzlePieceDefinition[]; usedColorCodes: Set<number> } {
  const pieces: PuzzlePieceDefinition[] = [];
  const usedColorCodes = new Set<number>();
  if (!Array.isArray(raw)) {
    errors.push('attachBlocks must be an array');
    return { pieces, usedColorCodes };
  }

  const idSeqByBase = new Map<string, number>();
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i] as Type2AttachBlock;
    const blockId = asString(item?.blockID);
    const count = Number(item?.number ?? 1);
    const colorCode = Number(item?.color ?? 1);
    if (!blockId) {
      errors.push(`attachBlocks[${i}].blockID is required`);
      continue;
    }
    if (!Number.isInteger(count) || count < 0) {
      errors.push(`attachBlocks[${i}].number must be a non-negative integer`);
      continue;
    }
    if (!Number.isInteger(colorCode) || colorCode <= 0) {
      errors.push(`attachBlocks[${i}].color must be a positive integer`);
      continue;
    }
    if (count === 0) continue;

    const cells = blockCellsById.get(blockId);
    if (!cells?.length) {
      errors.push(`attachBlocks[${i}] references unknown block: ${blockId}`);
      continue;
    }

    usedColorCodes.add(colorCode);
    const baseId = `${blockId}-c${colorCode}`;
    const seq = (idSeqByBase.get(baseId) ?? 0) + 1;
    idSeqByBase.set(baseId, seq);
    const pieceId = seq > 1 ? `${baseId}-${seq}` : baseId;
    const color = colorCodeToHex(colorCode);

    pieces.push({
      id: pieceId,
      name: blockId,
      color,
      cells: cells.map((cell) => ({ ...cell })),
      count,
    });
  }

  return { pieces, usedColorCodes };
}

function parseHintCellsFromRefAnswerGrids(raw: unknown, errors: string[]): {
  hintCells: GridCell[];
  hintColors: Record<string, string>;
  usedColorCodes: Set<number>;
} {
  const hintCells: GridCell[] = [];
  const hintColors: Record<string, string> = {};
  const usedColorCodes = new Set<number>();
  const obj = asObject(raw);
  if (!obj) return { hintCells, hintColors, usedColorCodes };

  for (const [key, value] of Object.entries(obj)) {
    const colorCode = parseColorCodeFromKey(key);
    if (colorCode === null) continue;
    if (!Array.isArray(value) || value.length === 0) continue;

    const color = colorCodeToHex(colorCode);
    usedColorCodes.add(colorCode);
    const cells = parseCellsArray(value, `refAnswerGrids.${key}`, errors);
    for (const cell of cells) {
      const cellKey = `${cell.x},${cell.y}`;
      if (hintColors[cellKey] && hintColors[cellKey] !== color) {
        errors.push(`refAnswerGrids.${key} conflicts on cell ${cellKey}`);
        continue;
      }
      if (!hintColors[cellKey]) {
        hintCells.push(cell);
      }
      hintColors[cellKey] = color;
    }
  }

  return {
    hintCells: uniqueCells(hintCells),
    hintColors,
    usedColorCodes,
  };
}

function buildWeightByColorCode(
  usedColorCodes: Set<number>,
  rows: number,
  cols: number,
): Map<number, number> {
  const sortedCodes = Array.from(usedColorCodes).sort((a, b) => a - b);
  const map = new Map<number, number>();
  if (sortedCodes.length === 0) return map;
  if (sortedCodes.length === 1) {
    map.set(sortedCodes[0] ?? 1, 1);
    return map;
  }

  const base = Math.max(rows, cols) + 1;
  for (let i = 0; i < sortedCodes.length; i += 1) {
    const code = sortedCodes[i];
    if (!code) continue;
    map.set(code, base ** i);
  }
  return map;
}

function buildColorWeights(weightByColorCode: Map<number, number>): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const [code, weight] of weightByColorCode.entries()) {
    const color = colorCodeToHex(code);
    weights[color] = weight;
  }
  return weights;
}

function convertType2EntryToLevel(
  entryRaw: unknown,
  blockCellsById: Map<string, GridCell[]>,
  index: number,
): { level: PuzzleLevelDefinition | null; errors: string[] } {
  const errors: string[] = [];
  const entryObj = asObject(entryRaw) as Type2PuzzleEntry | null;
  if (!entryObj) {
    return { level: null, errors: [`entries[${index}] must be an object`] };
  }

  const puzzleData = asObject(entryObj.puzzleData) as Type2PuzzleData | null;
  if (!puzzleData) {
    return { level: null, errors: [`entries[${index}].puzzleData must be an object`] };
  }

  const cols = Number(puzzleData.sizeX);
  const rows = Number(puzzleData.sizeY);
  if (!Number.isInteger(cols) || cols <= 0) errors.push(`entries[${index}].puzzleData.sizeX must be positive integer`);
  if (!Number.isInteger(rows) || rows <= 0) errors.push(`entries[${index}].puzzleData.sizeY must be positive integer`);
  if (errors.length) return { level: null, errors };

  const blocked = parseCellsArray(puzzleData.bannedGrids ?? [], `entries[${index}].puzzleData.bannedGrids`, errors);
  const { fixedPlacements, usedColorCodes: fixedColorCodes } = parseFixedPlacements(puzzleData.preGrids, errors);
  const { pieces, usedColorCodes: pieceColorCodes } = parseAttachBlocks(
    puzzleData.attachBlocks,
    blockCellsById,
    errors,
  );
  const {
    hintCells,
    hintColors,
    usedColorCodes: hintColorCodes,
  } = parseHintCellsFromRefAnswerGrids(puzzleData.refAnswerGrids, errors);
  if (!pieces.length) {
    errors.push(`entries[${index}] has no valid attachBlocks`);
  }

  const rowParsed = parseConditionTotals(
    puzzleData.rowCondition,
    rows,
    'row',
    errors,
  );
  const colParsed = parseConditionTotals(
    puzzleData.columnCondition,
    cols,
    'column',
    errors,
  );

  const usedConditionColorCodes = new Set<number>([
    ...rowParsed.countsByColorCode.keys(),
    ...colParsed.countsByColorCode.keys(),
  ]);
  const usedColorCodes = new Set<number>([
    ...usedConditionColorCodes,
    ...fixedColorCodes,
    ...pieceColorCodes,
    ...hintColorCodes,
  ]);
  const weightByColorCode = buildWeightByColorCode(usedColorCodes, rows, cols);

  fillWeightedTotals(rowParsed.totals, rowParsed.countsByColorCode, weightByColorCode);
  fillWeightedTotals(colParsed.totals, colParsed.countsByColorCode, weightByColorCode);

  const id =
    asString(entryObj.minigameId)
    || asString(puzzleData.chessBoardID)
    || `type2-level-${index + 1}`;
  const name =
    asString(entryObj.title)
    || asString(puzzleData.chessBoardID)
    || id;

  if (errors.length) return { level: null, errors };

  const level: PuzzleLevelDefinition = {
    id,
    name,
    rows,
    cols,
    blocked,
    hintCells,
    rowTargets: rowParsed.totals,
    colTargets: colParsed.totals,
    pieces,
  };

  if (Object.keys(hintColors).length > 0) {
    level.hintColors = hintColors;
  }
  const colorWeights = buildColorWeights(weightByColorCode);
  if (Object.keys(colorWeights).length > 0) {
    level.colorWeights = colorWeights;
  }
  if (fixedPlacements.length > 0) {
    level.fixedPlacements = fixedPlacements;
  }

  return { level, errors: [] };
}

function toType2Entries(value: unknown): Type2PuzzleEntry[] | null {
  if (Array.isArray(value)) {
    return value as Type2PuzzleEntry[];
  }
  const obj = asObject(value);
  if (obj?.puzzleData) {
    return [obj as Type2PuzzleEntry];
  }
  return null;
}

export function isType2PuzzleDocument(value: unknown): boolean {
  const entries = toType2Entries(value);
  if (!entries?.length) return false;
  return entries.some((entry) => asObject(entry?.puzzleData) !== null);
}

export function collectType2BlockIds(value: unknown): string[] {
  const entries = toType2Entries(value);
  if (!entries?.length) return [];

  const out = new Set<string>();
  for (const entry of entries) {
    const puzzleData = asObject(entry?.puzzleData) as Type2PuzzleData | null;
    if (!puzzleData || !Array.isArray(puzzleData.attachBlocks)) continue;
    for (const block of puzzleData.attachBlocks as Type2AttachBlock[]) {
      const blockId = asString(block?.blockID);
      if (!blockId) continue;
      out.add(blockId);
    }
  }
  return Array.from(out);
}

export function parseType2BlockJson(value: unknown): {
  blockId: string | null;
  cells: GridCell[] | null;
  errors: string[];
} {
  const errors: string[] = [];
  const obj = asObject(value) as Type2BlockJson | null;
  if (!obj) return { blockId: null, cells: null, errors: ['type2 block must be an object'] };

  const blockId = asString(obj.blockID);
  if (!blockId) errors.push('blockID is required');
  if (!Array.isArray(obj.originBlocks)) {
    errors.push('originBlocks must be an array');
    return { blockId: blockId || null, cells: null, errors };
  }

  const cells: GridCell[] = [];
  for (let i = 0; i < obj.originBlocks.length; i += 1) {
    const item = asObject(obj.originBlocks[i]);
    if (!item) {
      errors.push(`originBlocks[${i}] must be {x:number,y:number}`);
      continue;
    }
    const xRaw = Number(item.x);
    const yRaw = Number(item.y);
    if (!Number.isFinite(xRaw) || !Number.isFinite(yRaw)) {
      errors.push(`originBlocks[${i}] x/y must be finite numbers`);
      continue;
    }
    const x = Math.round(xRaw);
    const y = Math.round(yRaw);
    if (Math.abs(x - xRaw) > 1e-6 || Math.abs(y - yRaw) > 1e-6) {
      errors.push(`originBlocks[${i}] x/y must be integer-like values`);
      continue;
    }
    cells.push({ x, y });
  }

  const normalized = normalizeShapeCells(uniqueCells(cells));
  if (!normalized.length) {
    errors.push('originBlocks must contain at least one valid cell');
  }

  if (errors.length) return { blockId: blockId || null, cells: null, errors };
  return { blockId, cells: normalized, errors: [] };
}

export function parseType2PuzzleDocument(
  value: unknown,
  blockCellsById: Map<string, GridCell[]>,
): { document: PuzzleJsonDocument | null; errors: string[] } {
  const entries = toType2Entries(value);
  if (!entries?.length) {
    return { document: null, errors: ['type2 puzzle document must be a puzzle object or array'] };
  }

  const errors: string[] = [];
  const levels: PuzzleLevelDefinition[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const converted = convertType2EntryToLevel(entries[i], blockCellsById, i);
    if (!converted.level) {
      for (const err of converted.errors) {
        errors.push(err);
      }
      continue;
    }
    levels.push(converted.level);
  }

  if (errors.length || !levels.length) {
    if (!levels.length && !errors.length) errors.push('type2 document has no valid entries');
    return { document: null, errors };
  }

  if (levels.length === 1) {
    const onlyLevel = levels[0];
    if (!onlyLevel) {
      return { document: null, errors: ['type2 document has no valid entries'] };
    }
    return {
      document: { kind: 'single', level: onlyLevel },
      errors: [],
    };
  }

  const firstLevel = levels[0];
  const puzzle: PuzzleMultiLevelDefinition = {
    id: `${firstLevel?.id ?? 'type2'}-multi`,
    name: `${firstLevel?.name ?? 'Type2 Puzzle'} (Type2)`,
    mode: 'sequential',
    levels,
  };
  return {
    document: { kind: 'multi', puzzle },
    errors: [],
  };
}
