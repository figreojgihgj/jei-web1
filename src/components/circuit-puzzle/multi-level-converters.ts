import {
  multiPuzzleToJson,
  parsePuzzleJsonDocument,
  singleLevelToMultiPuzzle,
  type PuzzleMultiLevelJson,
} from './multi-level-format';
import { decodeMultiLevelFromUrlV3, encodeMultiLevelForUrlV3 } from './url-format-v3';
import type { PuzzleLevelDefinition } from './types';

export function convertPuzzleJsonToV3Url(value: unknown): { encoded: string | null; errors: string[] } {
  const parsed = parsePuzzleJsonDocument(value);
  if (!parsed.document) {
    return { encoded: null, errors: parsed.errors };
  }

  const multi =
    parsed.document.kind === 'multi'
      ? parsed.document.puzzle
      : singleLevelToMultiPuzzle(parsed.document.level);

  return {
    encoded: encodeMultiLevelForUrlV3(multi),
    errors: [],
  };
}

export function convertV3UrlToMultiPuzzleJson(encoded: string): PuzzleMultiLevelJson {
  const multi = decodeMultiLevelFromUrlV3(encoded);
  return multiPuzzleToJson(multi);
}

export function convertV3UrlToSingleLevel(encoded: string, levelIndex = 0): PuzzleLevelDefinition {
  const multi = decodeMultiLevelFromUrlV3(encoded);
  const level = multi.levels[levelIndex];
  if (!level) {
    throw new Error(`v3 URL has no level at index ${levelIndex}`);
  }
  return level;
}
