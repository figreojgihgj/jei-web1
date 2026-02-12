export type GridCell = {
  x: number;
  y: number;
};

export type ClueDisplayMode = 'numeric' | 'graphic';

export type PuzzleColorWeights = Record<string, number>;

export type PuzzleScorePart = {
  color: string;
  value: number;
};

export type PuzzlePieceDefinition = {
  id: string;
  name: string;
  color: string;
  cells: GridCell[];
  count: number;
};

export type PuzzleFixedPlacementDefinition = {
  id: string;
  name?: string;
  color: string;
  cells: GridCell[];
  anchor: GridCell;
  rotation?: number;
};

export type PuzzleLevelDefinition = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  blocked: GridCell[];
  hintCells: GridCell[];
  hintColors?: Record<string, string>;
  rowTargets: number[];
  colTargets: number[];
  colorWeights?: PuzzleColorWeights;
  pieces: PuzzlePieceDefinition[];
  fixedPlacements?: PuzzleFixedPlacementDefinition[];
};

export type CoordTuple = [number, number];

export type PuzzlePieceJson = {
  id: string;
  name: string;
  color: string;
  cells: CoordTuple[];
  count?: number;
};

export type PuzzleLevelJson = {
  version: 1;
  id: string;
  name: string;
  board: {
    rows: number;
    cols: number;
    blocked: CoordTuple[];
    hintCells?: CoordTuple[];
    hintColors: Array<{ cell: CoordTuple; color: string }>;
    fixedPlacements?: Array<{
      id: string;
      name?: string;
      color: string;
      cells: CoordTuple[];
      anchor: CoordTuple;
      rotation?: number;
    }>;
  };
  clues: {
    rows: number[];
    cols: number[];
  };
  pieces: PuzzlePieceJson[];
  scoring?: {
    colorWeights?: Record<string, number> | undefined;
  };
};

/**
 * 完整的关卡 JSON 格式（用于 URL 分享）
 */
export type FullPuzzleLevelJson = {
  version: 1;
  id: string;
  name: string;
  board: {
    rows: number;
    cols: number;
    blocked: CoordTuple[];
    hintCells?: CoordTuple[];
    hintColors: Array<{ cell: CoordTuple; color: string }>;
    fixedPlacements?: Array<{
      id: string;
      name?: string;
      color: string;
      cells: CoordTuple[];
      anchor: CoordTuple;
      rotation?: number;
    }>;
  };
  clues: {
    rows: number[];
    cols: number[];
  };
  pieces: PuzzlePieceJson[];
  scoring?: {
    colorWeights?: Record<string, number> | undefined;
  };
};

/**
 * 将 PuzzleLevelDefinition 转换为 URL 分享用的 JSON 格式
 */
export function levelToJson(level: PuzzleLevelDefinition): FullPuzzleLevelJson {
  const scoring = level.colorWeights ? { colorWeights: level.colorWeights } : undefined;

  return {
    version: 1,
    id: level.id,
    name: level.name,
    board: {
      rows: level.rows,
      cols: level.cols,
      blocked: level.blocked.map((c) => [c.x, c.y] as CoordTuple),
      hintCells: level.hintCells?.map((c) => [c.x, c.y] as CoordTuple) ?? [],
      hintColors: Object.entries(level.hintColors ?? {}).map(([key, color]) => ({
        cell: key.split(',').map(Number) as CoordTuple,
        color,
      })),
      fixedPlacements: (level.fixedPlacements ?? []).map((fixed) => ({
        id: fixed.id,
        ...(fixed.name ? { name: fixed.name } : {}),
        color: fixed.color,
        cells: fixed.cells.map((c) => [c.x, c.y] as CoordTuple),
        anchor: [fixed.anchor.x, fixed.anchor.y] as CoordTuple,
        ...(typeof fixed.rotation === 'number' ? { rotation: fixed.rotation } : {}),
      })),
    },
    clues: {
      rows: level.rowTargets,
      cols: level.colTargets,
    },
    pieces: level.pieces.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      cells: p.cells.map((c) => [c.x, c.y] as CoordTuple),
      count: p.count,
    })),
    ...(scoring ? { scoring } : {}),
  };
}

/**
 * 将 URL 分享用的 JSON 格式解析为 PuzzleLevelDefinition
 */
export function jsonToLevel(json: FullPuzzleLevelJson): PuzzleLevelDefinition {
  const hintColors = json.board.hintColors?.reduce((acc, { cell, color }) => {
    acc[cell.join(',')] = color;
    return acc;
  }, {} as Record<string, string>);
  const colorWeights = json.scoring?.colorWeights;
  const fixedPlacements = (json.board.fixedPlacements ?? []).map((fixed) => ({
    id: fixed.id,
    ...(typeof fixed.name === 'string' && fixed.name.trim().length > 0 ? { name: fixed.name } : {}),
    color: fixed.color,
    cells: fixed.cells.map(([x, y]) => ({ x, y })),
    anchor: { x: fixed.anchor[0], y: fixed.anchor[1] },
    ...(typeof fixed.rotation === 'number' ? { rotation: fixed.rotation } : {}),
  }));

  const level: PuzzleLevelDefinition = {
    id: json.id,
    name: json.name,
    rows: json.board.rows,
    cols: json.board.cols,
    blocked: json.board.blocked.map(([x, y]) => ({ x, y })),
    hintCells: json.board.hintCells?.map(([x, y]) => ({ x, y })) ?? [],
    rowTargets: json.clues.rows,
    colTargets: json.clues.cols,
    pieces: json.pieces.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      cells: p.cells.map(([x, y]) => ({ x, y })),
      count: p.count ?? 1,
    })),
  };

  if (hintColors && Object.keys(hintColors).length > 0) {
    level.hintColors = hintColors;
  }
  if (colorWeights) {
    level.colorWeights = colorWeights;
  }
  if (fixedPlacements.length > 0) {
    level.fixedPlacements = fixedPlacements;
  }

  return level;
}

/**
 * 将 FullPuzzleLevelJson 序列化为 JSON 字符串（压缩格式）
 */
export function levelToJsonString(json: FullPuzzleLevelJson): string {
  return JSON.stringify(json);
}

/**
 * 从 JSON 字符串解析 FullPuzzleLevelJson
 */
export function jsonStringToLevel(str: string): FullPuzzleLevelJson {
  return JSON.parse(str) as FullPuzzleLevelJson;
}
