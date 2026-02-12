import type {
  CoordTuple,
  GridCell,
  PuzzleFixedPlacementDefinition,
  PuzzleLevelDefinition,
  PuzzleLevelJson,
  PuzzlePieceDefinition,
} from './types';

function toTuple(cell: GridCell): CoordTuple {
  return [cell.x, cell.y];
}

function fromTuple(tuple: CoordTuple): GridCell {
  return { x: tuple[0], y: tuple[1] };
}

export function levelToJson(level: PuzzleLevelDefinition): PuzzleLevelJson {
  const colorWeights = Object.fromEntries(
    Object.entries(level.colorWeights ?? {}).filter(([, weight]) => Number.isFinite(weight) && weight >= 0),
  );

  const out: PuzzleLevelJson = {
    version: 1,
    id: level.id,
    name: level.name,
    board: {
      rows: level.rows,
      cols: level.cols,
      blocked: level.blocked.map(toTuple),
      hintCells: (level.hintCells ?? []).map(toTuple),
      hintColors: Object.entries(level.hintColors ?? {})
        .filter(([key, color]) => typeof color === 'string' && color.trim().length > 0 && isCoordKey(key))
        .map(([key, color]) => {
          const [xRaw, yRaw] = key.split(',');
          return {
            cell: [Number(xRaw), Number(yRaw)] as CoordTuple,
            color: color.trim(),
          };
        }),
      fixedPlacements: (level.fixedPlacements ?? []).map((fixed) => ({
        id: fixed.id,
        ...(fixed.name ? { name: fixed.name } : {}),
        color: fixed.color,
        cells: fixed.cells.map(toTuple),
        anchor: toTuple(fixed.anchor),
        ...(typeof fixed.rotation === 'number' ? { rotation: fixed.rotation } : {}),
      })),
    },
    clues: {
      rows: [...level.rowTargets],
      cols: [...level.colTargets],
    },
    pieces: level.pieces.map((piece) => ({
      id: piece.id,
      name: piece.name,
      color: piece.color,
      cells: piece.cells.map(toTuple),
      count: piece.count ?? 1,
    })),
  };

  if (Object.keys(colorWeights).length) {
    out.scoring = { colorWeights };
  }

  return out;
}

function isTuple(value: unknown): value is CoordTuple {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isInteger(value[0]) &&
    Number.isInteger(value[1])
  );
}

function parsePiece(raw: unknown, index: number, errors: string[]): PuzzlePieceDefinition | null {
  if (!raw || typeof raw !== 'object') {
    errors.push(`pieces[${index}] must be an object`);
    return null;
  }

  const item = raw as Record<string, unknown>;
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const color = typeof item.color === 'string' ? item.color.trim() : '#9ddb22';
  const countRaw = Number(item.count ?? 1);
  const count = Number.isInteger(countRaw) && countRaw >= 0 ? countRaw : 1;
  const cellsRaw = Array.isArray(item.cells) ? item.cells : [];

  if (!id) errors.push(`pieces[${index}].id is required`);
  if (!name) errors.push(`pieces[${index}].name is required`);
  if (!cellsRaw.length) errors.push(`pieces[${index}].cells must not be empty`);

  const cells: GridCell[] = [];
  for (let i = 0; i < cellsRaw.length; i += 1) {
    const coord = cellsRaw[i];
    if (!isTuple(coord)) {
      errors.push(`pieces[${index}].cells[${i}] must be [x,y] integer tuple`);
      continue;
    }
    cells.push(fromTuple(coord));
  }

  if (!id || !name || !cells.length) return null;
  return {
    id,
    name,
    color: color || '#9ddb22',
    count,
    cells,
  };
}

function parseFixedPlacement(
  raw: unknown,
  index: number,
  errors: string[],
): PuzzleFixedPlacementDefinition | null {
  if (!raw || typeof raw !== 'object') {
    errors.push(`board.fixedPlacements[${index}] must be an object`);
    return null;
  }

  const item = raw as Record<string, unknown>;
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const color = typeof item.color === 'string' ? item.color.trim() : '';
  const cellsRaw = Array.isArray(item.cells) ? item.cells : [];
  const rotationRaw = Number(item.rotation ?? 0);
  const rotation = Number.isInteger(rotationRaw) ? ((rotationRaw % 4) + 4) % 4 : 0;

  if (!id) errors.push(`board.fixedPlacements[${index}].id is required`);
  if (!color) errors.push(`board.fixedPlacements[${index}].color is required`);
  if (!isTuple(item.anchor)) {
    errors.push(`board.fixedPlacements[${index}].anchor must be [x,y] integer tuple`);
  }
  if (!cellsRaw.length) errors.push(`board.fixedPlacements[${index}].cells must not be empty`);

  const cells: GridCell[] = [];
  for (let i = 0; i < cellsRaw.length; i += 1) {
    const coord = cellsRaw[i];
    if (!isTuple(coord)) {
      errors.push(`board.fixedPlacements[${index}].cells[${i}] must be [x,y] integer tuple`);
      continue;
    }
    cells.push(fromTuple(coord));
  }

  if (!id || !color || !isTuple(item.anchor) || !cells.length) return null;
  const anchor = fromTuple(item.anchor);
  return {
    id,
    ...(name ? { name } : {}),
    color,
    cells,
    anchor,
    ...(rotation ? { rotation } : {}),
  };
}

export function parseLevelJson(value: unknown): { level: PuzzleLevelDefinition | null; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') {
    return { level: null, errors: ['Level JSON must be an object'] };
  }

  const obj = value as Record<string, unknown>;
  const version = Number(obj.version ?? 1);
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const board = (obj.board ?? {}) as Record<string, unknown>;
  const clues = (obj.clues ?? {}) as Record<string, unknown>;
  const scoring = (obj.scoring ?? {}) as Record<string, unknown>;
  const piecesRaw = Array.isArray(obj.pieces) ? obj.pieces : [];

  const rows = Number(board.rows);
  const cols = Number(board.cols);
  const blockedRaw = Array.isArray(board.blocked) ? board.blocked : [];
  const hintRaw = Array.isArray(board.hintCells) ? board.hintCells : [];
  const hintColorsRaw = Array.isArray(board.hintColors) ? board.hintColors : [];
  const fixedPlacementsRaw = Array.isArray(board.fixedPlacements) ? board.fixedPlacements : [];
  const rowTargetsRaw = Array.isArray(clues.rows) ? clues.rows : [];
  const colTargetsRaw = Array.isArray(clues.cols) ? clues.cols : [];
  const colorWeightsRaw =
    scoring.colorWeights && typeof scoring.colorWeights === 'object'
      ? (scoring.colorWeights as Record<string, unknown>)
      : {};

  if (version !== 1) errors.push('version must be 1');
  if (!id) errors.push('id is required');
  if (!name) errors.push('name is required');
  if (!Number.isInteger(rows) || rows < 1) errors.push('board.rows must be a positive integer');
  if (!Number.isInteger(cols) || cols < 1) errors.push('board.cols must be a positive integer');

  const blocked: GridCell[] = [];
  for (let i = 0; i < blockedRaw.length; i += 1) {
    const tuple = blockedRaw[i];
    if (!isTuple(tuple)) {
      errors.push(`board.blocked[${i}] must be [x,y] integer tuple`);
      continue;
    }
    blocked.push(fromTuple(tuple));
  }

  const hintCells: GridCell[] = [];
  for (let i = 0; i < hintRaw.length; i += 1) {
    const tuple = hintRaw[i];
    if (!isTuple(tuple)) {
      errors.push(`board.hintCells[${i}] must be [x,y] integer tuple`);
      continue;
    }
    hintCells.push(fromTuple(tuple));
  }

  const hintColors: Record<string, string> = {};
  for (let i = 0; i < hintColorsRaw.length; i += 1) {
    const item = hintColorsRaw[i];
    if (!item || typeof item !== 'object') {
      errors.push(`board.hintColors[${i}] must be {cell:[x,y], color:string}`);
      continue;
    }
    const raw = item as Record<string, unknown>;
    if (!isTuple(raw.cell)) {
      errors.push(`board.hintColors[${i}].cell must be [x,y] integer tuple`);
      continue;
    }
    const color = typeof raw.color === 'string' ? raw.color.trim() : '';
    if (!color) {
      errors.push(`board.hintColors[${i}].color must be non-empty string`);
      continue;
    }
    const coord = fromTuple(raw.cell);
    hintColors[`${coord.x},${coord.y}`] = color;
  }

  const rowTargets = rowTargetsRaw.map((v) => Number(v));
  const colTargets = colTargetsRaw.map((v) => Number(v));
  if (rowTargets.some((v) => !Number.isInteger(v) || v < 0)) {
    errors.push('clues.rows must contain non-negative integers');
  }
  if (colTargets.some((v) => !Number.isInteger(v) || v < 0)) {
    errors.push('clues.cols must contain non-negative integers');
  }
  if (Number.isInteger(rows) && rowTargets.length !== rows) {
    errors.push(`clues.rows length (${rowTargets.length}) must equal board.rows (${rows})`);
  }
  if (Number.isInteger(cols) && colTargets.length !== cols) {
    errors.push(`clues.cols length (${colTargets.length}) must equal board.cols (${cols})`);
  }

  const pieces: PuzzlePieceDefinition[] = [];
  for (let i = 0; i < piecesRaw.length; i += 1) {
    const piece = parsePiece(piecesRaw[i], i, errors);
    if (piece) pieces.push(piece);
  }
  if (!pieces.length) {
    errors.push('pieces must contain at least one valid piece');
  }

  const idSet = new Set<string>();
  for (const piece of pieces) {
    if (idSet.has(piece.id)) {
      errors.push(`duplicate piece id: ${piece.id}`);
    }
    idSet.add(piece.id);
  }

  const fixedPlacements: PuzzleFixedPlacementDefinition[] = [];
  const fixedIdSet = new Set<string>();
  for (let i = 0; i < fixedPlacementsRaw.length; i += 1) {
    const fixed = parseFixedPlacement(fixedPlacementsRaw[i], i, errors);
    if (!fixed) continue;
    if (fixedIdSet.has(fixed.id)) {
      errors.push(`duplicate fixed placement id: ${fixed.id}`);
      continue;
    }
    fixedIdSet.add(fixed.id);
    fixedPlacements.push(fixed);
  }

  const colorWeights: Record<string, number> = {};
  for (const [color, value] of Object.entries(colorWeightsRaw)) {
    const weight = Number(value);
    if (!Number.isFinite(weight) || weight < 0) {
      errors.push(`scoring.colorWeights.${color} must be a non-negative number`);
      continue;
    }
    colorWeights[color] = weight;
  }

  if (errors.length) return { level: null, errors };

  const level: PuzzleLevelDefinition = {
    id,
    name,
    rows,
    cols,
    blocked,
    hintCells,
    ...(Object.keys(hintColors).length ? { hintColors } : {}),
    rowTargets,
    colTargets,
    pieces,
  };
  if (Object.keys(colorWeights).length) {
    level.colorWeights = colorWeights;
  }
  if (fixedPlacements.length > 0) {
    level.fixedPlacements = fixedPlacements;
  }

  return { level, errors: [] };
}

function isCoordKey(key: string): boolean {
  const [xRaw, yRaw] = key.split(',');
  const x = Number(xRaw);
  const y = Number(yRaw);
  return Number.isInteger(x) && Number.isInteger(y);
}
