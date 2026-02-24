import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  collectType2BlockIds,
  isType2PuzzleDocument,
  parseType2BlockJson,
  parseType2PuzzleDocument,
} from './type2-format';
import type { GridCell } from './types';

function cellKeys(cells: GridCell[]): string[] {
  return cells.map((cell) => `${cell.x},${cell.y}`).sort();
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
    expect(cellKeys(parsed.cells ?? [])).toEqual(['0,1', '1,0', '1,1']);
  });

  it('converts type2 list to multi puzzle and preserves color constraints via weighted targets', () => {
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
    expect(second.colorWeights).toEqual({
      '#9ddb22': 1,
      '#89d817': 5,
    });
    expect(second.rowTargets).toEqual([1, 10, 1, 10]);
    expect(second.colTargets).toEqual([1, 6, 10, 5]);
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
  });
});
