import { levelToJson, parseLevelJson } from './levelFormat';
import type { PuzzleLevelDefinition, PuzzleLevelJson } from './types';

export type PuzzleMultiStageMode = 'sequential' | 'independent';

export type PuzzleMultiLevelDefinition = {
  id: string;
  name: string;
  mode: PuzzleMultiStageMode;
  levels: PuzzleLevelDefinition[];
};

export type PuzzleMultiLevelJson = {
  version: 2;
  id: string;
  name: string;
  mode?: PuzzleMultiStageMode;
  levels: PuzzleLevelJson[];
};

export type PuzzleJsonDocument =
  | { kind: 'single'; level: PuzzleLevelDefinition }
  | { kind: 'multi'; puzzle: PuzzleMultiLevelDefinition };

function normalizeMode(raw: unknown): PuzzleMultiStageMode {
  return raw === 'independent' ? 'independent' : 'sequential';
}

export function singleLevelToMultiPuzzle(
  level: PuzzleLevelDefinition,
  options?: { id?: string; name?: string; mode?: PuzzleMultiStageMode },
): PuzzleMultiLevelDefinition {
  return {
    id: options?.id?.trim() || level.id || 'multi-puzzle',
    name: options?.name?.trim() || level.name || 'Multi Puzzle',
    mode: options?.mode ?? 'sequential',
    levels: [level],
  };
}

export function multiPuzzleToSingleLevel(
  puzzle: PuzzleMultiLevelDefinition,
  levelIndex = 0,
): PuzzleLevelDefinition {
  const level = puzzle.levels[levelIndex];
  if (!level) {
    throw new Error(`multi puzzle has no level at index ${levelIndex}`);
  }
  return level;
}

export function multiPuzzleToJson(puzzle: PuzzleMultiLevelDefinition): PuzzleMultiLevelJson {
  return {
    version: 2,
    id: puzzle.id,
    name: puzzle.name,
    mode: puzzle.mode,
    levels: puzzle.levels.map((level) => levelToJson(level)),
  };
}

export function parseMultiPuzzleJson(value: unknown): {
  puzzle: PuzzleMultiLevelDefinition | null;
  errors: string[];
} {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') {
    return { puzzle: null, errors: ['Multi puzzle JSON must be an object'] };
  }

  const obj = value as Record<string, unknown>;
  const version = Number(obj.version ?? 0);
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const mode = normalizeMode(obj.mode);
  const levelsRaw = Array.isArray(obj.levels) ? obj.levels : null;

  if (version !== 2) errors.push('version must be 2 for multi puzzle JSON');
  if (!id) errors.push('id is required');
  if (!name) errors.push('name is required');
  if (!levelsRaw) errors.push('levels must be an array');

  const levels: PuzzleLevelDefinition[] = [];
  for (let i = 0; i < (levelsRaw?.length ?? 0); i += 1) {
    const rawLevel = levelsRaw?.[i];
    const parsed = parseLevelJson(rawLevel);
    if (!parsed.level) {
      for (const err of parsed.errors) {
        errors.push(`levels[${i}]: ${err}`);
      }
      continue;
    }
    levels.push(parsed.level);
  }

  if (levelsRaw && levelsRaw.length === 0) {
    errors.push('levels must contain at least one level');
  }
  if (levelsRaw && levels.length === 0) {
    errors.push('levels has no valid level entries');
  }

  if (errors.length) return { puzzle: null, errors };

  return {
    puzzle: {
      id,
      name,
      mode,
      levels,
    },
    errors: [],
  };
}

export function parsePuzzleJsonDocument(value: unknown): {
  document: PuzzleJsonDocument | null;
  errors: string[];
} {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Number(obj.version) === 2) {
      const parsedMulti = parseMultiPuzzleJson(value);
      if (!parsedMulti.puzzle) return { document: null, errors: parsedMulti.errors };
      return { document: { kind: 'multi', puzzle: parsedMulti.puzzle }, errors: [] };
    }
  }

  const parsedSingle = parseLevelJson(value);
  if (!parsedSingle.level) return { document: null, errors: parsedSingle.errors };
  return { document: { kind: 'single', level: parsedSingle.level }, errors: [] };
}

export function puzzleDocumentToJson(value: PuzzleJsonDocument): PuzzleLevelJson | PuzzleMultiLevelJson {
  if (value.kind === 'multi') return multiPuzzleToJson(value.puzzle);
  return levelToJson(value.level);
}
