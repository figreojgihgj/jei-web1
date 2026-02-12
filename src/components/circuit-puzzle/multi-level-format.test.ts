import { describe, expect, it } from 'vitest';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from './defaultLevel';
import { levelToJson } from './levelFormat';
import {
  multiPuzzleToJson,
  parseMultiPuzzleJson,
  parsePuzzleJsonDocument,
  singleLevelToMultiPuzzle,
} from './multi-level-format';

describe('multi-level-format', () => {
  it('wraps single level as sequential multi puzzle by default', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const wrapped = singleLevelToMultiPuzzle(level);

    expect(wrapped.mode).toBe('sequential');
    expect(wrapped.levels).toHaveLength(1);
    expect(wrapped.levels[0]).toEqual(level);
  });

  it('parses valid multi puzzle json', () => {
    const levelA = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const levelB = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    levelB.id = 'stage-2';
    levelB.name = 'Stage 2';

    const raw = {
      version: 2,
      id: 'pack-1',
      name: 'Pack One',
      mode: 'independent',
      levels: [levelToJson(levelA), levelToJson(levelB)],
    };

    const parsed = parseMultiPuzzleJson(raw);
    expect(parsed.errors).toEqual([]);
    expect(parsed.puzzle?.id).toBe('pack-1');
    expect(parsed.puzzle?.mode).toBe('independent');
    expect(parsed.puzzle?.levels).toHaveLength(2);
  });

  it('reports nested level errors for invalid stage json', () => {
    const parsed = parseMultiPuzzleJson({
      version: 2,
      id: 'pack-err',
      name: 'Pack Err',
      levels: [
        {
          version: 1,
          id: 'bad-level',
          name: 'Bad',
          board: { rows: 1, cols: 1, blocked: [], hintCells: [], hintColors: [] },
          clues: { rows: [0], cols: [0] },
          pieces: [],
        },
      ],
    });

    expect(parsed.puzzle).toBeNull();
    expect(parsed.errors.some((err) => err.includes('levels[0]: pieces must contain at least one valid piece'))).toBe(
      true,
    );
  });

  it('parses document as multi when version is 2', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const document = parsePuzzleJsonDocument({
      version: 2,
      id: 'pack-doc',
      name: 'Pack Doc',
      levels: [levelToJson(level)],
    });

    expect(document.document?.kind).toBe('multi');
    expect(document.errors).toEqual([]);
  });

  it('keeps version 2 documents on multi parser and reports multi errors', () => {
    const document = parsePuzzleJsonDocument({
      version: 2,
      id: 'broken-pack',
      name: 'Broken Pack',
    });

    expect(document.document).toBeNull();
    expect(document.errors).toContain('levels must be an array');
  });

  it('serializes multi puzzle json with version 2', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const multi = singleLevelToMultiPuzzle(level, { id: 'root', name: 'Root' });
    const json = multiPuzzleToJson(multi);

    expect(json.version).toBe(2);
    expect(json.id).toBe('root');
    expect(json.levels).toHaveLength(1);
  });
});
