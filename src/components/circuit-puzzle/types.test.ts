/**
 * JSON 格式转换单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  levelToJson,
  jsonToLevel,
  levelToJsonString,
  jsonStringToLevel,
} from './types';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from './defaultLevel';
import type { PuzzleLevelDefinition, FullPuzzleLevelJson } from './types';

describe('types format conversion', () => {
  const sampleLevel: PuzzleLevelDefinition = {
    id: 'test-level-1',
    name: 'Sample Level',
    rows: 5,
    cols: 6,
    blocked: [
      { x: 0, y: 0 },
      { x: 2, y: 3 },
    ],
    hintCells: [
      { x: 1, y: 1 },
      { x: 3, y: 2 },
    ],
    hintColors: {
      '1,1': '#9ddb22',
      '3,2': '#ff6f6f',
    },
    rowTargets: [2, 3, 2, 1, 2],
    colTargets: [1, 2, 2, 2, 2, 1],
    colorWeights: {
      '#9ddb22': 1,
      '#ff6f6f': 2,
    },
    pieces: [
      {
        id: 'p-a',
        name: 'Piece A',
        color: '#9ddb22',
        cells: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
        ],
        count: 1,
      },
      {
        id: 'p-b',
        name: 'Piece B',
        color: '#89d817',
        cells: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
        count: 2,
      },
    ],
  };

  describe('levelToJson', () => {
    it('should convert PuzzleLevelDefinition to FullPuzzleLevelJson', () => {
      const json = levelToJson(sampleLevel);

      expect(json.version).toBe(1);
      expect(json.id).toBe(sampleLevel.id);
      expect(json.name).toBe(sampleLevel.name);
    });

    it('should convert board properties correctly', () => {
      const json = levelToJson(sampleLevel);

      expect(json.board.rows).toBe(sampleLevel.rows);
      expect(json.board.cols).toBe(sampleLevel.cols);
      expect(json.board.blocked).toEqual([
        [0, 0],
        [2, 3],
      ]);
      expect(json.board.hintCells).toEqual([
        [1, 1],
        [3, 2],
      ]);
    });

    it('should convert hintColors correctly', () => {
      const json = levelToJson(sampleLevel);

      expect(json.board.hintColors).toHaveLength(2);
      expect(json.board.hintColors).toContainEqual({
        cell: [1, 1],
        color: '#9ddb22',
      });
      expect(json.board.hintColors).toContainEqual({
        cell: [3, 2],
        color: '#ff6f6f',
      });
    });

    it('should convert clues correctly', () => {
      const json = levelToJson(sampleLevel);

      expect(json.clues.rows).toEqual(sampleLevel.rowTargets);
      expect(json.clues.cols).toEqual(sampleLevel.colTargets);
    });

    it('should convert pieces correctly', () => {
      const json = levelToJson(sampleLevel);

      expect(json.pieces).toHaveLength(2);
      expect(json.pieces[0]).toEqual({
        id: 'p-a',
        name: 'Piece A',
        color: '#9ddb22',
        cells: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
        count: 1,
      });
      expect(json.pieces[1]).toEqual({
        id: 'p-b',
        name: 'Piece B',
        color: '#89d817',
        cells: [
          [0, 0],
          [0, 1],
        ],
        count: 2,
      });
    });

    it('should convert scoring with colorWeights', () => {
      const json = levelToJson(sampleLevel);

      expect(json.scoring?.colorWeights).toEqual({
        '#9ddb22': 1,
        '#ff6f6f': 2,
      });
    });

    it('should convert fixed placements correctly', () => {
      const level: PuzzleLevelDefinition = {
        ...sampleLevel,
        fixedPlacements: [
          {
            id: 'fx-a',
            name: 'Locked A',
            color: '#9ddb22',
            cells: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
            anchor: { x: 2, y: 1 },
            rotation: 1,
          },
        ],
      };

      const json = levelToJson(level);

      expect(json.board.fixedPlacements).toEqual([
        {
          id: 'fx-a',
          name: 'Locked A',
          color: '#9ddb22',
          cells: [
            [0, 0],
            [1, 0],
          ],
          anchor: [2, 1],
          rotation: 1,
        },
      ]);
    });

    it('should handle empty hintCells', () => {
      const baseLevel: PuzzleLevelDefinition = { ...sampleLevel };
      delete (baseLevel as Partial<PuzzleLevelDefinition>).hintColors;
      const level: PuzzleLevelDefinition = {
        ...baseLevel,
        hintCells: [],
      };

      const json = levelToJson(level);

      expect(json.board.hintCells).toEqual([]);
      expect(json.board.hintColors).toEqual([]);
    });

    it('should handle undefined colorWeights', () => {
      const baseLevel: PuzzleLevelDefinition = { ...sampleLevel };
      delete (baseLevel as Partial<PuzzleLevelDefinition>).colorWeights;
      const level: PuzzleLevelDefinition = {
        ...baseLevel,
      };

      const json = levelToJson(level);

      expect(json.scoring?.colorWeights).toBeUndefined();
    });

    it('should handle pieces with default count', () => {
      const level: PuzzleLevelDefinition = {
        ...sampleLevel,
        pieces: [
          {
            id: 'p-x',
            name: 'Piece X',
            color: '#ffffff',
            cells: [{ x: 0, y: 0 }],
            count: 1,
          },
        ],
      };

      const json = levelToJson(level);

      expect(json.pieces[0]!.count).toBe(1);
    });
  });

  describe('jsonToLevel', () => {
    it('should convert FullPuzzleLevelJson to PuzzleLevelDefinition', () => {
      const json = levelToJson(sampleLevel);
      const level = jsonToLevel(json);

      expect(level.id).toBe(json.id);
      expect(level.name).toBe(json.name);
    });

    it('should convert board properties correctly', () => {
      const json = levelToJson(sampleLevel);
      const level = jsonToLevel(json);

      expect(level.rows).toBe(json.board.rows);
      expect(level.cols).toBe(json.board.cols);
      expect(level.blocked).toEqual([
        { x: 0, y: 0 },
        { x: 2, y: 3 },
      ]);
      expect(level.hintCells).toEqual([
        { x: 1, y: 1 },
        { x: 3, y: 2 },
      ]);
    });

    it('should convert hintColors correctly', () => {
      const json = levelToJson(sampleLevel);
      const level = jsonToLevel(json);

      expect(level.hintColors).toEqual({
        '1,1': '#9ddb22',
        '3,2': '#ff6f6f',
      });
    });

    it('should convert clues correctly', () => {
      const json = levelToJson(sampleLevel);
      const level = jsonToLevel(json);

      expect(level.rowTargets).toEqual(json.clues.rows);
      expect(level.colTargets).toEqual(json.clues.cols);
    });

    it('should convert pieces correctly', () => {
      const json = levelToJson(sampleLevel);
      const level = jsonToLevel(json);

      expect(level.pieces).toHaveLength(2);
      expect(level.pieces[0]).toEqual({
        id: 'p-a',
        name: 'Piece A',
        color: '#9ddb22',
        cells: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
        ],
        count: 1,
      });
      expect(level.pieces[1]).toEqual({
        id: 'p-b',
        name: 'Piece B',
        color: '#89d817',
        cells: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
        count: 2,
      });
    });

    it('should convert scoring with colorWeights', () => {
      const json = levelToJson(sampleLevel);
      const level = jsonToLevel(json);

      expect(level.colorWeights).toEqual({
        '#9ddb22': 1,
        '#ff6f6f': 2,
      });
    });

    it('should convert fixed placements back to level format', () => {
      const json = levelToJson({
        ...sampleLevel,
        fixedPlacements: [
          {
            id: 'fx-a',
            name: 'Locked A',
            color: '#9ddb22',
            cells: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
            anchor: { x: 2, y: 1 },
            rotation: 2,
          },
        ],
      });
      const level = jsonToLevel(json);
      expect(level.fixedPlacements).toEqual([
        {
          id: 'fx-a',
          name: 'Locked A',
          color: '#9ddb22',
          cells: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
          anchor: { x: 2, y: 1 },
          rotation: 2,
        },
      ]);
    });

    it('should handle missing scoring', () => {
      const json: FullPuzzleLevelJson = {
        version: 1,
        id: 'test-no-scoring',
        name: 'No Scoring',
        board: {
          rows: 3,
          cols: 3,
          blocked: [],
          hintCells: [],
          hintColors: [],
        },
        clues: {
          rows: [0, 0, 0],
          cols: [0, 0, 0],
        },
        pieces: [],
      };

      const level = jsonToLevel(json);

      expect(level.colorWeights).toBeUndefined();
    });

    it('should handle undefined count in pieces', () => {
      const json: FullPuzzleLevelJson = {
        version: 1,
        id: 'test-undefined-count',
        name: 'Undefined Count',
        board: {
          rows: 3,
          cols: 3,
          blocked: [],
          hintCells: [],
          hintColors: [],
        },
        clues: {
          rows: [0, 0, 0],
          cols: [0, 0, 0],
        },
        pieces: [
          {
            id: 'p-x',
            name: 'Piece X',
            color: '#ffffff',
            cells: [[0, 0]],
          },
        ],
      };

      const level = jsonToLevel(json);

      expect(level.pieces[0]!.count).toBe(1);
    });

    it('should handle empty hintCells', () => {
      const json: FullPuzzleLevelJson = {
        version: 1,
        id: 'test-empty-hints',
        name: 'Empty Hints',
        board: {
          rows: 3,
          cols: 3,
          blocked: [],
          hintCells: [],
          hintColors: [],
        },
        clues: {
          rows: [0, 0, 0],
          cols: [0, 0, 0],
        },
        pieces: [],
      };

      const level = jsonToLevel(json);

      expect(level.hintCells).toEqual([]);
      expect(level.hintColors).toBeUndefined();
    });
  });

  describe('levelToJsonString and jsonStringToLevel', () => {
    it('should serialize and deserialize correctly', () => {
      const json = levelToJson(sampleLevel);
      const jsonString = levelToJsonString(json);
      const restoredJson = jsonStringToLevel(jsonString);

      expect(restoredJson).toEqual(json);
    });

    it('should produce valid JSON string', () => {
      const json = levelToJson(sampleLevel);
      const jsonString = levelToJsonString(json);

      expect(() => JSON.parse(jsonString)).not.toThrow();
      const parsed = JSON.parse(jsonString);
      expect(parsed).toEqual(json);
    });

    it('should handle complex nested structures', () => {
      const complexLevel: PuzzleLevelDefinition = {
        id: 'complex',
        name: 'Complex Level',
        rows: 10,
        cols: 10,
        blocked: Array.from({ length: 5 }, (_, i) => ({ x: i, y: i })),
        hintCells: Array.from({ length: 3 }, (_, i) => ({ x: i + 2, y: i + 2 })),
        hintColors: {
          '2,2': '#9ddb22',
          '3,3': '#ff6f6f',
          '4,4': '#ffffff',
        },
        rowTargets: Array.from({ length: 10 }, () => 5),
        colTargets: Array.from({ length: 10 }, () => 5),
        colorWeights: {
          '#9ddb22': 1,
          '#ff6f6f': 2,
          '#ffffff': 3,
        },
        pieces: [
          {
            id: 'p-complex',
            name: 'Complex Piece',
            color: '#89d817',
            cells: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 2, y: 0 },
              { x: 0, y: 1 },
              { x: 1, y: 1 },
            ],
            count: 3,
          },
        ],
      };

      const json = levelToJson(complexLevel);
      const jsonString = levelToJsonString(json);
      const restoredJson = jsonStringToLevel(jsonString);
      const restoredLevel = jsonToLevel(restoredJson);

      expect(restoredLevel.rows).toBe(complexLevel.rows);
      expect(restoredLevel.cols).toBe(complexLevel.cols);
      expect(restoredLevel.blocked).toEqual(complexLevel.blocked);
      expect(restoredLevel.hintCells).toEqual(complexLevel.hintCells);
      expect(restoredLevel.pieces[0]!.cells).toEqual(complexLevel.pieces[0]!.cells);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data integrity through levelToJson -> jsonToLevel', () => {
      const json = levelToJson(sampleLevel);
      const restoredLevel = jsonToLevel(json);

      expect(restoredLevel.id).toBe(sampleLevel.id);
      expect(restoredLevel.name).toBe(sampleLevel.name);
      expect(restoredLevel.rows).toBe(sampleLevel.rows);
      expect(restoredLevel.cols).toBe(sampleLevel.cols);
      expect(restoredLevel.blocked).toEqual(sampleLevel.blocked);
      expect(restoredLevel.hintCells).toEqual(sampleLevel.hintCells);
      expect(restoredLevel.hintColors).toEqual(sampleLevel.hintColors);
      expect(restoredLevel.rowTargets).toEqual(sampleLevel.rowTargets);
      expect(restoredLevel.colTargets).toEqual(sampleLevel.colTargets);
      expect(restoredLevel.colorWeights).toEqual(sampleLevel.colorWeights);
      expect(restoredLevel.pieces).toHaveLength(sampleLevel.pieces.length);

      for (let i = 0; i < restoredLevel.pieces.length; i++) {
        const restoredPiece = restoredLevel.pieces[i]!;
        const sourcePiece = sampleLevel.pieces[i]!;
        expect(restoredPiece.id).toBe(sourcePiece.id);
        expect(restoredPiece.name).toBe(sourcePiece.name);
        expect(restoredPiece.color).toBe(sourcePiece.color);
        expect(restoredPiece.cells).toEqual(sourcePiece.cells);
        expect(restoredPiece.count).toBe(sourcePiece.count);
      }
    });

    it('should handle edge case: minimal level', () => {
      const minimalLevel: PuzzleLevelDefinition = {
        id: 'minimal',
        name: 'Minimal',
        rows: 1,
        cols: 1,
        blocked: [],
        hintCells: [],
        rowTargets: [0],
        colTargets: [0],
        pieces: [],
      };

      const json = levelToJson(minimalLevel);
      const restored = jsonToLevel(json);

      expect(restored.rows).toBe(1);
      expect(restored.cols).toBe(1);
      expect(restored.pieces).toHaveLength(0);
    });

    it('should handle level with no hints', () => {
      const baseLevel: PuzzleLevelDefinition = { ...sampleLevel };
      delete (baseLevel as Partial<PuzzleLevelDefinition>).hintColors;
      const noHintsLevel: PuzzleLevelDefinition = {
        ...baseLevel,
        hintCells: [],
      };

      const json = levelToJson(noHintsLevel);
      const restored = jsonToLevel(json);

      expect(restored.hintCells).toEqual([]);
      expect(restored.hintColors).toBeUndefined();
    });

    it('should handle level with no colorWeights', () => {
      const baseLevel: PuzzleLevelDefinition = { ...sampleLevel };
      delete (baseLevel as Partial<PuzzleLevelDefinition>).colorWeights;
      const noWeightsLevel: PuzzleLevelDefinition = {
        ...baseLevel,
      };

      const json = levelToJson(noWeightsLevel);
      const restored = jsonToLevel(json);

      expect(restored.colorWeights).toBeUndefined();
    });

    it('should handle multiple pieces with different colors', () => {
      const multiColorLevel: PuzzleLevelDefinition = {
        id: 'multi-color',
        name: 'Multi Color',
        rows: 5,
        cols: 5,
        blocked: [],
        hintCells: [],
        rowTargets: [1, 1, 1, 1, 1],
        colTargets: [1, 1, 1, 1, 1],
        pieces: [
          {
            id: 'p-a',
            name: 'Red Piece',
            color: '#ff6f6f',
            cells: [{ x: 0, y: 0 }],
            count: 1,
          },
          {
            id: 'p-b',
            name: 'White Piece',
            color: '#ffffff',
            cells: [{ x: 1, y: 0 }],
            count: 1,
          },
          {
            id: 'p-c',
            name: 'Yellow Piece',
            color: '#ffcc00',
            cells: [{ x: 2, y: 0 }],
            count: 1,
          },
          {
            id: 'p-d',
            name: 'Blue Piece',
            color: '#00ccff',
            cells: [{ x: 3, y: 0 }],
            count: 1,
          },
        ],
      };

      const json = levelToJson(multiColorLevel);
      const restored = jsonToLevel(json);

      expect(restored.pieces).toHaveLength(4);
      expect(restored.pieces[0]!.color).toBe('#ff6f6f');
      expect(restored.pieces[1]!.color).toBe('#ffffff');
      expect(restored.pieces[2]!.color).toBe('#ffcc00');
      expect(restored.pieces[3]!.color).toBe('#00ccff');
    });

    it('should handle complex piece shapes', () => {
      const complexPiecesLevel: PuzzleLevelDefinition = {
        id: 'complex-shapes',
        name: 'Complex Shapes',
        rows: 5,
        cols: 5,
        blocked: [],
        hintCells: [],
        rowTargets: [2, 2, 2, 2, 2],
        colTargets: [2, 2, 2, 2, 2],
        pieces: [
          {
            id: 'p-cross',
            name: 'Cross',
            color: '#9ddb22',
            cells: [
              { x: 1, y: 0 },
              { x: 0, y: 1 },
              { x: 1, y: 1 },
              { x: 2, y: 1 },
              { x: 1, y: 2 },
            ],
            count: 1,
          },
          {
            id: 'p-l-shape',
            name: 'L Shape',
            color: '#89d817',
            cells: [
              { x: 0, y: 0 },
              { x: 0, y: 1 },
              { x: 0, y: 2 },
              { x: 1, y: 2 },
            ],
            count: 2,
          },
        ],
      };

      const json = levelToJson(complexPiecesLevel);
      const restored = jsonToLevel(json);

      expect(restored.pieces[0]!.cells).toHaveLength(5);
      expect(restored.pieces[0]!.cells).toEqual([
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ]);
      expect(restored.pieces[1]!.cells).toHaveLength(4);
      expect(restored.pieces[1]!.count).toBe(2);
    });

    it('should preserve default level through json conversion and parsing', () => {
      const original = cloneLevel(DEFAULT_CIRCUIT_LEVEL);

      const json = levelToJson(original);
      const restored = jsonToLevel(json);

      expect(restored).toEqual(original);

      const serialized = levelToJsonString(json);
      const parsedJson = jsonStringToLevel(serialized);
      const restoredFromString = jsonToLevel(parsedJson);

      expect(restoredFromString).toEqual(original);
      expect(restoredFromString.hintCells).toHaveLength(original.hintCells.length);
      expect(Object.keys(restoredFromString.hintColors ?? {})).toHaveLength(
        Object.keys(original.hintColors ?? {}).length,
      );
    });
  });
});
