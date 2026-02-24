import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { solveLevel } from './auto-solver';
import {
  collectType2BlockIds,
  isType2PuzzleDocument,
  parseType2BlockJson,
  parseType2PuzzleDocument,
} from './type2-format';
import type { GridCell, PuzzleLevelDefinition } from './types';

function cellKeys(cells: GridCell[]): string[] {
  return cells.map((cell) => `${cell.x},${cell.y}`).sort();
}

function solveWithPolicy(level: PuzzleLevelDefinition) {
  const hasHints = level.hintCells.length > 0;
  const strict = solveLevel(level, {
    exactHintCover: hasHints,
    onlyHintCells: hasHints,
    enforceHintColors: true,
    timeoutMs: 1_200,
    maxNodes: 260_000,
  });
  if (strict.status === 'no-solution' && hasHints) {
    return solveLevel(level, {
      exactHintCover: false,
      onlyHintCells: false,
      enforceHintColors: true,
      timeoutMs: 1_200,
      maxNodes: 260_000,
    });
  }
  return strict;
}

describe('type2-format', () => {
  it('detects type2 puzzle documents and collects block ids', () => {
    const raw = [
      {
        minigameId: 'm-1',
        puzzleData: {
          attachBlocks: [
            { blockID: 'a', number: 1, color: 1 },
            { blockID: 'b', number: 2, color: 2 },
          ],
        },
      },
      {
        minigameId: 'm-2',
        puzzleData: {
          attachBlocks: [{ blockID: 'b', number: 1, color: 1 }],
        },
      },
    ];

    expect(isType2PuzzleDocument(raw)).toBe(true);
    expect(collectType2BlockIds(raw).sort()).toEqual(['a', 'b']);
  });

  it('normalizes block shape coordinates from originBlocks', () => {
    const parsed = parseType2BlockJson({
      blockID: 'shape-z',
      originBlocks: [
        { x: 0.0, y: 0.0 },
        { x: -1.0, y: 0.0 },
        { x: 0.0, y: -1.0 },
      ],
    });

    expect(parsed.errors).toEqual([]);
    expect(parsed.blockId).toBe('shape-z');
    expect(cellKeys(parsed.cells ?? [])).toEqual(['0,0', '1,0', '1,1']);
  });

  it('applies attachBlocks.rotation to imported piece shapes', () => {
    const blocks = new Map<string, GridCell[]>([
      ['line-2', [{ x: 0, y: 0 }, { x: 1, y: 0 }]],
    ]);

    const raw = [
      {
        minigameId: 'rot-test',
        title: 'Rotation Test',
        puzzleData: {
          chessBoardID: 'rot-test',
          sizeX: 2,
          sizeY: 2,
          rowCondition: {
            Color1: [0, 0],
          },
          columnCondition: {
            Color1: [0, 0],
          },
          bannedGrids: [],
          preGrids: {},
          refAnswerGrids: {},
          attachBlocks: [
            { blockID: 'line-2', number: 1, color: 1, rotation: 1 },
          ],
        },
      },
    ];

    const parsed = parseType2PuzzleDocument(raw, blocks);
    expect(parsed.errors).toEqual([]);
    expect(parsed.document?.kind).toBe('single');
    if (!parsed.document || parsed.document.kind !== 'single') {
      throw new Error('expected single document');
    }
    expect(cellKeys(parsed.document.level.pieces[0]?.cells ?? [])).toEqual(['0,0', '0,1']);
  });

  it('converts type2 list to multi puzzle and uses single-point totals across colors', () => {
    const blocks = new Map<string, GridCell[]>([
      ['line-2', [{ x: 0, y: 0 }, { x: 1, y: 0 }]],
      ['l-3', [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }]],
    ]);

    const raw = [
      {
        minigameId: 'single-color',
        title: 'Single Color',
        puzzleData: {
          chessBoardID: 'single-color',
          sizeX: 4,
          sizeY: 4,
          rowCondition: {
            Color1: [1, 2, 1, 0],
            Color2: [],
          },
          columnCondition: {
            Color1: [2, 1, 1, 0],
            Color2: [],
          },
          bannedGrids: [{ x: 3, y: 3 }],
          preGrids: {
            Color1: [{ x: 0, y: 0 }],
          },
          refAnswerGrids: {
            Color1: [{ x: 2, y: 2 }],
          },
          attachBlocks: [
            { blockID: 'line-2', number: 2, color: 1 },
          ],
        },
      },
      {
        minigameId: 'dual-color',
        title: 'Dual Color',
        puzzleData: {
          chessBoardID: 'dual-color',
          sizeX: 4,
          sizeY: 4,
          rowCondition: {
            Color1: [1, 0, 1, 0],
            Color2: [0, 2, 0, 2],
          },
          columnCondition: {
            Color1: [1, 1, 0, 0],
            Color2: [0, 1, 2, 1],
          },
          bannedGrids: [],
          preGrids: {
            Color2: [{ x: 1, y: 1 }],
          },
          refAnswerGrids: {
            Color1: [{ x: 0, y: 0 }],
            Color2: [{ x: 3, y: 3 }],
          },
          attachBlocks: [
            { blockID: 'line-2', number: 1, color: 1 },
            { blockID: 'l-3', number: 2, color: 2 },
          ],
        },
      },
    ];

    const parsed = parseType2PuzzleDocument(raw, blocks);
    expect(parsed.errors).toEqual([]);
    expect(parsed.document?.kind).toBe('multi');

    if (!parsed.document || parsed.document.kind !== 'multi') {
      throw new Error('expected multi document');
    }

    const first = parsed.document.puzzle.levels[0];
    const second = parsed.document.puzzle.levels[1];
    if (!first || !second) throw new Error('missing levels');

    expect(first.id).toBe('single-color');
    expect(first.rows).toBe(4);
    expect(first.cols).toBe(4);
    expect(first.rowTargets).toEqual([1, 2, 1, 0]);
    expect(first.colTargets).toEqual([2, 1, 1, 0]);
    expect(first.pieces[0]?.count).toBe(2);
    expect(first.pieces[0]?.color).toBe('#9ddb22');
    expect(first.fixedPlacements?.length).toBe(1);
    expect(first.hintCells).toEqual([{ x: 2, y: 2 }]);
    expect(first.hintColors).toEqual({ '2,2': '#9ddb22' });

    expect(second.pieces).toHaveLength(2);
    expect(second.pieces[0]?.color).toBe('#9ddb22');
    expect(second.pieces[1]?.color).toBe('#89d817');
    expect(second.hintCells).toEqual([{ x: 0, y: 0 }, { x: 3, y: 3 }]);
    expect(second.hintColors).toEqual({
      '0,0': '#9ddb22',
      '3,3': '#89d817',
    });
    expect(second.colorWeights).toBeUndefined();
    expect(second.rowTargets).toEqual([1, 2, 1, 2]);
    expect(second.colTargets).toEqual([1, 2, 2, 1]);
  });

  it('parses bundled file_type2 dataset with block files', () => {
    const root = process.cwd();
    const minigamePath = join(
      root,
      'public',
      'circuit-puzzle-levels',
      'file_type2',
      'minigame_puzzle.json',
    );
    const blocksDir = join(root, 'public', 'circuit-puzzle-levels', 'file_type2', 'blocks');
    const raw = JSON.parse(readFileSync(minigamePath, 'utf8')) as unknown;
    const blockIds = collectType2BlockIds(raw);
    const blockMap = new Map<string, GridCell[]>();

    for (const blockId of blockIds) {
      const blockPath = join(blocksDir, `${blockId}.json`);
      const blockRaw = JSON.parse(readFileSync(blockPath, 'utf8')) as unknown;
      const parsedBlock = parseType2BlockJson(blockRaw);
      if (!parsedBlock.cells) {
        throw new Error(`invalid bundled type2 block: ${blockId}`);
      }
      blockMap.set(blockId, parsedBlock.cells);
    }

    const parsed = parseType2PuzzleDocument(raw, blockMap);
    expect(parsed.errors).toEqual([]);
    expect(parsed.document?.kind).toBe('multi');
    if (!parsed.document || parsed.document.kind !== 'multi') {
      throw new Error('expected bundled type2 dataset to parse as multi puzzle');
    }
    expect(parsed.document.puzzle.levels.length).toBeGreaterThan(50);

    const wl0014 = parsed.document.puzzle.levels.find((level) => level.id === 'M02L02_mid_3_1');
    const wl0016 = parsed.document.puzzle.levels.find((level) => level.id === 'M02L02_mid_5_1');
    const v40012 = parsed.document.puzzle.levels.find((level) => level.id === 'M01L03_mid_1_1');
    if (!wl0014 || !wl0016) {
      throw new Error('missing expected bundled levels for regression assertions');
    }
    if (!v40012) {
      throw new Error('missing expected bundled level M01L03_mid_1_1 for regression assertions');
    }
    expect(wl0014.rowTargets).toEqual([5, 5, 4, 4, 2]);
    expect(wl0014.colTargets).toEqual([4, 5, 2, 5, 4]);
    expect(wl0014.colorWeights).toBeUndefined();
    expect(wl0016.rowTargets).toEqual([5, 3, 5, 3, 5]);
    expect(wl0016.colTargets).toEqual([5, 3, 5, 3, 5]);
    expect(wl0016.colorWeights).toBeUndefined();
    expect(solveWithPolicy(v40012).status).toBe('solved');
  });
});
