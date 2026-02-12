import type { GridCell, PuzzleLevelDefinition, PuzzlePieceDefinition } from './types';

export type SolverPlacement = {
  pieceId: string;
  pieceColor: string;
  rot: number;
  anchor: GridCell;
  cells: GridCell[];
};

export type SolverOptions = {
  exactHintCover?: boolean;
  onlyHintCells?: boolean;
  enforceHintColors?: boolean;
  maxNodes?: number;
  timeoutMs?: number;
};

export type SolverResult = {
  status: 'solved' | 'no-solution' | 'timeout' | 'node-limit';
  solution: SolverPlacement[] | null;
  nodes: number;
};

function keyOf(c: GridCell): string {
  return `${c.x},${c.y}`;
}

function inBounds(level: PuzzleLevelDefinition, c: GridCell): boolean {
  return c.x >= 0 && c.x < level.cols && c.y >= 0 && c.y < level.rows;
}

function rot90cw(c: GridCell, r: number): GridCell {
  const rr = ((r % 4) + 4) % 4;
  if (rr === 0) return { x: c.x, y: c.y };
  if (rr === 1) return { x: c.y, y: -c.x };
  if (rr === 2) return { x: -c.x, y: -c.y };
  return { x: -c.y, y: c.x };
}

function normalizeCells(cells: GridCell[]): GridCell[] {
  if (cells.length === 0) return [];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  for (const c of cells) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
  }
  const shifted = cells.map((c) => ({ x: c.x - minX, y: c.y - minY }));
  shifted.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  return shifted;
}

function shapeSignature(cells: GridCell[]): string {
  return cells.map((c) => `${c.x}:${c.y}`).join('|');
}

function uniqueRotations(piece: PuzzlePieceDefinition): Array<{ rot: number; cells: GridCell[] }> {
  const out: Array<{ rot: number; cells: GridCell[] }> = [];
  const seen = new Set<string>();
  for (let r = 0; r < 4; r++) {
    const rotated = piece.cells.map((c) => rot90cw(c, r));
    const norm = normalizeCells(rotated);
    const sig = shapeSignature(norm);
    if (!seen.has(sig)) {
      seen.add(sig);
      out.push({ rot: r, cells: norm });
    }
  }
  return out;
}

function rotateAndNormalize(cells: GridCell[], rot: number): GridCell[] {
  return normalizeCells(cells.map((c) => rot90cw(c, rot)));
}

type FixedOccupiedCell = {
  key: string;
  x: number;
  y: number;
  color: string;
};

function enumerateFixedOccupiedCells(level: PuzzleLevelDefinition): FixedOccupiedCell[] {
  const out: FixedOccupiedCell[] = [];
  for (const fixed of level.fixedPlacements ?? []) {
    const anchor = fixed.anchor;
    const rotation = ((fixed.rotation ?? 0) % 4 + 4) % 4;
    const relCells = rotateAndNormalize(fixed.cells ?? [], rotation);
    const color = fixed.color || '#9ddb22';
    for (const rel of relCells) {
      const cell = { x: anchor.x + rel.x, y: anchor.y + rel.y };
      out.push({
        key: keyOf(cell),
        x: cell.x,
        y: cell.y,
        color,
      });
    }
  }
  return out;
}

function colorScore(level: PuzzleLevelDefinition, color: string): number {
  const key = color.trim().toLowerCase();
  const weight = level.colorWeights?.[key] ?? level.colorWeights?.[color] ?? 1;
  return Number.isFinite(weight) ? weight : 1;
}

function isClose(a: number, b: number): boolean {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) < 1e-6;
}

function enumeratePlacements(
  level: PuzzleLevelDefinition,
  piece: PuzzlePieceDefinition,
  opts: Required<Pick<SolverOptions, 'onlyHintCells' | 'enforceHintColors'>>,
): SolverPlacement[] {
  const blocked = new Set(level.blocked.map(keyOf));
  for (const fixedCell of enumerateFixedOccupiedCells(level)) blocked.add(fixedCell.key);
  const hints = new Set(level.hintCells.map(keyOf));
  const hintColorByCell = level.hintColors ?? {};

  const out: SolverPlacement[] = [];
  const rotations = uniqueRotations(piece);

  for (const r of rotations) {
    const maxX = Math.max(...r.cells.map((c) => c.x));
    const maxY = Math.max(...r.cells.map((c) => c.y));
    for (let ax = 0; ax <= level.cols - (maxX + 1); ax++) {
      for (let ay = 0; ay <= level.rows - (maxY + 1); ay++) {
        const absCells = r.cells.map((c) => ({ x: c.x + ax, y: c.y + ay }));
        if (absCells.some((c) => !inBounds(level, c))) continue;
        if (absCells.some((c) => blocked.has(keyOf(c)))) continue;
        if (opts.onlyHintCells && absCells.some((c) => !hints.has(keyOf(c)))) continue;

        if (opts.enforceHintColors) {
          let ok = true;
          for (const c of absCells) {
            const required = hintColorByCell[keyOf(c)];
            if (required !== undefined && required.toLowerCase() !== piece.color.toLowerCase()) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
        }

        out.push({
          pieceId: piece.id,
          pieceColor: piece.color,
          rot: r.rot,
          anchor: { x: ax, y: ay },
          cells: absCells,
        });
      }
    }
  }
  return out;
}

export function solveLevel(
  level: PuzzleLevelDefinition,
  opts: SolverOptions = {},
): SolverResult {
  const exactHintCover = opts.exactHintCover ?? true;
  const onlyHintCells = opts.onlyHintCells ?? exactHintCover;
  const enforceHintColors = opts.enforceHintColors ?? true;
  const maxNodes = Math.max(1, opts.maxNodes ?? 400_000);
  const timeoutMs = Math.max(1, opts.timeoutMs ?? 2_500);

  const blocked = new Set(level.blocked.map(keyOf));
  const fixedOccupied = enumerateFixedOccupiedCells(level);
  for (const cell of fixedOccupied) blocked.add(cell.key);
  const hintSet = new Set(level.hintCells.map(keyOf));
  const startTime = Date.now();
  let nodes = 0;
  let stopReason: 'timeout' | 'node-limit' | null = null;

  const usablePieces = level.pieces.filter((p) => (p.count ?? 1) > 0 && p.cells.length > 0);
  const placementsByPiece = new Map<string, SolverPlacement[]>();
  for (const piece of usablePieces) {
    placementsByPiece.set(piece.id, enumeratePlacements(level, piece, { onlyHintCells, enforceHintColors }));
  }

  const pieceById = new Map(usablePieces.map((p) => [p.id, p]));
  type PieceInstance = { pieceId: string; index: number };
  const instances: PieceInstance[] = [];
  for (const piece of usablePieces) {
    const count = Math.max(0, piece.count ?? 1);
    for (let i = 0; i < count; i++) instances.push({ pieceId: piece.id, index: i });
  }
  instances.sort((a, b) => {
    const ca = placementsByPiece.get(a.pieceId)?.length ?? 0;
    const cb = placementsByPiece.get(b.pieceId)?.length ?? 0;
    return ca - cb;
  });

  const rowScore = Array.from({ length: level.rows }, () => 0);
  const colScore = Array.from({ length: level.cols }, () => 0);
  const used = new Set<string>();
  const chosen: SolverPlacement[] = [];

  for (const fixedCell of fixedOccupied) {
    used.add(fixedCell.key);
    if (fixedCell.y >= 0 && fixedCell.y < level.rows) {
      rowScore[fixedCell.y] = (rowScore[fixedCell.y] ?? 0) + colorScore(level, fixedCell.color);
    }
    if (fixedCell.x >= 0 && fixedCell.x < level.cols) {
      colScore[fixedCell.x] = (colScore[fixedCell.x] ?? 0) + colorScore(level, fixedCell.color);
    }
  }

  function checkStop(): boolean {
    nodes++;
    if (nodes > maxNodes) {
      stopReason = 'node-limit';
      return true;
    }
    if (Date.now() - startTime > timeoutMs) {
      stopReason = 'timeout';
      return true;
    }
    return false;
  }

  function canPlace(pl: SolverPlacement): boolean {
    const score = colorScore(level, pl.pieceColor);
    for (const c of pl.cells) {
      const k = keyOf(c);
      if (used.has(k) || blocked.has(k)) return false;
      const nextRowScore = (rowScore[c.y] ?? 0) + score;
      const nextColScore = (colScore[c.x] ?? 0) + score;
      if (nextRowScore > (level.rowTargets[c.y] ?? 0) + 1e-6) return false;
      if (nextColScore > (level.colTargets[c.x] ?? 0) + 1e-6) return false;
    }
    return true;
  }

  function addPlacement(pl: SolverPlacement): void {
    const score = colorScore(level, pl.pieceColor);
    chosen.push(pl);
    for (const c of pl.cells) {
      used.add(keyOf(c));
      rowScore[c.y] = (rowScore[c.y] ?? 0) + score;
      colScore[c.x] = (colScore[c.x] ?? 0) + score;
    }
  }

  function removePlacement(pl: SolverPlacement): void {
    const score = colorScore(level, pl.pieceColor);
    chosen.pop();
    for (const c of pl.cells) {
      used.delete(keyOf(c));
      rowScore[c.y] = (rowScore[c.y] ?? 0) - score;
      colScore[c.x] = (colScore[c.x] ?? 0) - score;
    }
  }

  function scoresMatchExactly(): boolean {
    for (let y = 0; y < level.rows; y++) {
      if (!isClose(rowScore[y] ?? 0, level.rowTargets[y] ?? 0)) return false;
    }
    for (let x = 0; x < level.cols; x++) {
      if (!isClose(colScore[x] ?? 0, level.colTargets[x] ?? 0)) return false;
    }
    return true;
  }

  function hintCoverMatchExactly(): boolean {
    if (!exactHintCover) return true;
    if (used.size !== hintSet.size) return false;
    for (const k of used) if (!hintSet.has(k)) return false;
    for (const k of hintSet) if (!used.has(k)) return false;
    return true;
  }

  function dfs(idx: number): SolverPlacement[] | null {
    if (checkStop()) return null;
    if (idx >= instances.length) {
      if (!scoresMatchExactly()) return null;
      if (!hintCoverMatchExactly()) return null;
      return [...chosen];
    }

    const instance = instances[idx];
    if (!instance) return null;
    const piece = pieceById.get(instance.pieceId);
    if (!piece) return null;
    const candidates = placementsByPiece.get(piece.id) ?? [];

    for (const pl of candidates) {
      if (!canPlace(pl)) continue;
      addPlacement(pl);
      const solved = dfs(idx + 1);
      if (solved) return solved;
      removePlacement(pl);
    }

    return dfs(idx + 1);
  }

  const solution = dfs(0);
  if (solution) return { status: 'solved', solution, nodes };
  if (stopReason === 'timeout') return { status: 'timeout', solution: null, nodes };
  if (stopReason === 'node-limit') return { status: 'node-limit', solution: null, nodes };
  return { status: 'no-solution', solution: null, nodes };
}

export function verifySolution(
  level: PuzzleLevelDefinition,
  solution: SolverPlacement[],
  opts: Pick<SolverOptions, 'exactHintCover' | 'enforceHintColors'> = {},
): { ok: boolean; errors: string[] } {
  const exactHintCover = opts.exactHintCover ?? true;
  const enforceHintColors = opts.enforceHintColors ?? true;

  const errors: string[] = [];
  const blocked = new Set(level.blocked.map(keyOf));
  const fixedOccupied = enumerateFixedOccupiedCells(level);
  for (const fixedCell of fixedOccupied) blocked.add(fixedCell.key);
  const hints = new Set(level.hintCells.map(keyOf));
  const hintColors = level.hintColors ?? {};
  const used = new Set<string>();
  const rowScore = Array.from({ length: level.rows }, () => 0);
  const colScore = Array.from({ length: level.cols }, () => 0);

  for (const fixedCell of fixedOccupied) {
    if (fixedCell.x < 0 || fixedCell.x >= level.cols || fixedCell.y < 0 || fixedCell.y >= level.rows) {
      errors.push(`Fixed out of bounds: ${fixedCell.key}`);
      continue;
    }
    if (used.has(fixedCell.key)) {
      errors.push(`Fixed overlap: ${fixedCell.key}`);
      continue;
    }
    used.add(fixedCell.key);
    rowScore[fixedCell.y] = (rowScore[fixedCell.y] ?? 0) + colorScore(level, fixedCell.color);
    colScore[fixedCell.x] = (colScore[fixedCell.x] ?? 0) + colorScore(level, fixedCell.color);
    if (enforceHintColors) {
      const required = hintColors[fixedCell.key];
      if (required !== undefined && required.toLowerCase() !== fixedCell.color.toLowerCase()) {
        errors.push(
          `Fixed hint color mismatch at ${fixedCell.key}: required=${required}, got=${fixedCell.color}`,
        );
      }
    }
  }

  for (const pl of solution) {
    const score = colorScore(level, pl.pieceColor);
    for (const c of pl.cells) {
      const k = keyOf(c);
      if (!inBounds(level, c)) errors.push(`Out of bounds: ${k}`);
      if (blocked.has(k) && !used.has(k)) errors.push(`Covers blocked: ${k}`);
      if (used.has(k)) errors.push(`Overlap: ${k}`);
      used.add(k);
      rowScore[c.y] = (rowScore[c.y] ?? 0) + score;
      colScore[c.x] = (colScore[c.x] ?? 0) + score;

      if (enforceHintColors) {
        const required = hintColors[k];
        if (required !== undefined && required.toLowerCase() !== pl.pieceColor.toLowerCase()) {
          errors.push(`Hint color mismatch at ${k}: required=${required}, got=${pl.pieceColor}`);
        }
      }
    }
  }

  for (let y = 0; y < level.rows; y++) {
    const actual = rowScore[y] ?? 0;
    const target = level.rowTargets[y] ?? 0;
    if (!isClose(actual, target)) errors.push(`Row ${y} score=${actual} target=${target}`);
  }
  for (let x = 0; x < level.cols; x++) {
    const actual = colScore[x] ?? 0;
    const target = level.colTargets[x] ?? 0;
    if (!isClose(actual, target)) errors.push(`Col ${x} score=${actual} target=${target}`);
  }

  if (exactHintCover) {
    for (const k of used) if (!hints.has(k)) errors.push(`Covers non-hint cell: ${k}`);
    for (const k of hints) if (!used.has(k)) errors.push(`Missing hint cell: ${k}`);
  }

  return { ok: errors.length === 0, errors };
}
