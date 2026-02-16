import type { GridCell, PuzzleScorePart } from './types';

type ScorePartCell = { x: number; y: number; color: string };

export function keyOf(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseKey(key: string): GridCell {
  const [xRaw, yRaw] = key.split(',');
  return { x: Number(xRaw), y: Number(yRaw) };
}

export function uniqueKeys(keys: string[]): string[] {
  return Array.from(new Set(keys));
}

export function normalizeHexColor(input: string): string | null {
  const raw = input.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return raw.toLowerCase();
  return null;
}

export function rotateCells(cells: GridCell[], rotation: number): GridCell[] {
  const normRotation = ((rotation % 4) + 4) % 4;
  const rotated = cells.map((cell) => {
    if (normRotation === 0) return { x: cell.x, y: cell.y };
    if (normRotation === 1) return { x: cell.y, y: -cell.x };
    if (normRotation === 2) return { x: -cell.x, y: -cell.y };
    return { x: -cell.y, y: cell.x };
  });
  const minX = Math.min(...rotated.map((cell) => cell.x));
  const minY = Math.min(...rotated.map((cell) => cell.y));
  return rotated.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));
}

export function normalizeShapeCells(cells: GridCell[]): GridCell[] {
  if (!cells.length) return [];
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  return cells.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));
}

export function cloneShapeCells(cells: GridCell[]): GridCell[] {
  return cells.map((cell) => ({ x: cell.x, y: cell.y }));
}

export function cellsForShape(anchor: GridCell, rotation: number, shape: GridCell[]): string[] {
  if (!shape.length) return [];
  const rel = rotateCells(shape, rotation);
  return rel.map((cell) => keyOf(anchor.x + cell.x, anchor.y + cell.y));
}

export function getPlacementAnchorFromPointer(
  shape: GridCell[],
  pointer: GridCell,
  rotation: number,
): GridCell {
  const rel = rotateCells(shape, rotation);
  if (!rel.length) return { ...pointer };

  const centerX = rel.reduce((sum, cell) => sum + cell.x, 0) / rel.length;
  const centerY = rel.reduce((sum, cell) => sum + cell.y, 0) / rel.length;

  let closestCell: GridCell | undefined;
  let minDist = Number.POSITIVE_INFINITY;
  for (const cell of rel) {
    const dx = cell.x - centerX;
    const dy = cell.y - centerY;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closestCell = cell;
    }
  }

  const pivot = closestCell ?? rel[0];
  return { x: pointer.x - (pivot?.x ?? 0), y: pointer.y - (pivot?.y ?? 0) };
}

export function formatScore(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (Math.abs(safe - Math.round(safe)) < 1e-6) return String(Math.round(safe));
  return safe.toFixed(1);
}

export function sumScoreParts(parts: PuzzleScorePart[]): number {
  return parts.reduce((acc, part) => acc + (Number.isFinite(part.value) ? part.value : 0), 0);
}

export function buildAxisScoreParts(
  axisSize: number,
  cells: ScorePartCell[],
  axis: 'row' | 'col',
  getScoreForColor: (color: string) => number,
): PuzzleScorePart[][] {
  const maps = Array.from({ length: axisSize }, () => new Map<string, number>());
  const orders = Array.from({ length: axisSize }, () => [] as string[]);
  for (const cell of cells) {
    const idx = axis === 'row' ? cell.y : cell.x;
    if (idx < 0 || idx >= axisSize) continue;
    const color = normalizeHexColor(cell.color) ?? '#9ddb22';
    const map = maps[idx];
    const order = orders[idx];
    if (!map || !order) continue;
    if (!map.has(color)) order.push(color);
    map.set(color, (map.get(color) ?? 0) + getScoreForColor(color));
  }
  return maps.map((map, idx) =>
    (orders[idx] ?? [])
      .map((color) => ({ color, value: map.get(color) ?? 0 }))
      .filter((part) => part.value > 0),
  );
}
