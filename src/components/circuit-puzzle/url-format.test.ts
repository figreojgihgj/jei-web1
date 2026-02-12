/**
 * URL 格式编码/解码单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  encodeLevelForUrl,
  decodeLevelFromUrl,
  getDefaultCompression,
} from './url-format';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from './defaultLevel';
import type { PuzzleLevelDefinition } from './types';

describe('url-format', () => {
  describe('encodeLevelForUrl', () => {
    it('should encode a simple level', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-1',
        name: 'Test Level',
        rows: 5,
        cols: 5,
        blocked: [],
        hintCells: [],
        rowTargets: [1, 2, 3, 2, 1],
        colTargets: [1, 2, 3, 2, 1],
        pieces: [
          {
            id: 'p-a',
            name: 'Piece A',
            color: '#9ddb22',
            cells: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
            count: 1,
          },
        ],
      };

      const encoded = encodeLevelForUrl(level);
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');
      expect(encoded.startsWith('v1')).toBe(true);
    });

    it('should encode level with blocked cells', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-2',
        name: 'Test with blocked',
        rows: 3,
        cols: 3,
        blocked: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        hintCells: [],
        rowTargets: [1, 1, 1],
        colTargets: [1, 1, 1],
        pieces: [],
      };

      const encoded = encodeLevelForUrl(level);
      expect(encoded).toContain('b');
    });

    it('should encode level with hint cells', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-3',
        name: 'Test with hints',
        rows: 3,
        cols: 3,
        blocked: [],
        hintCells: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        hintColors: {
          '0,0': '#9ddb22',
          '1,1': '#9ddb22',
        },
        rowTargets: [1, 1, 1],
        colTargets: [1, 1, 1],
        pieces: [],
      };

      const encoded = encodeLevelForUrl(level);
      expect(encoded).toContain('h');
    });

    it('should encode predefined colors correctly', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-4',
        name: 'Test predefined colors',
        rows: 3,
        cols: 3,
        blocked: [],
        hintCells: [],
        rowTargets: [0, 0, 0],
        colTargets: [0, 0, 0],
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
            cells: [{ x: 0, y: 0 }],
            count: 1,
          },
        ],
      };

      const encoded = encodeLevelForUrl(level);
      // Red is index 2, White is index 3
      expect(encoded).toBeTruthy();
    });

    it('should encode custom colors', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-5',
        name: 'Test custom colors',
        rows: 3,
        cols: 3,
        blocked: [],
        hintCells: [],
        rowTargets: [0, 0, 0],
        colTargets: [0, 0, 0],
        pieces: [
          {
            id: 'p-a',
            name: 'Custom Color Piece',
            color: '#123456',
            cells: [{ x: 0, y: 0 }],
            count: 1,
          },
        ],
      };

      const encoded = encodeLevelForUrl(level);
      expect(encoded).toContain('c');
    });

    it('should use URL-safe characters only', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-6',
        name: 'URL Safe Test',
        rows: 5,
        cols: 6,
        blocked: [
          { x: 0, y: 0 },
          { x: 2, y: 3 },
        ],
        hintCells: [{ x: 1, y: 1 }],
        hintColors: {
          '1,1': '#9ddb22',
        },
        rowTargets: [1, 2, 3, 2, 1],
        colTargets: [1, 2, 2, 2, 2, 1],
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

      const encoded = encodeLevelForUrl(level);
      // Check that only URL-safe characters are used
      const urlSafePattern = /^[0-9a-zA-Zvhbpbc]+$/;
      expect(encoded).toMatch(urlSafePattern);
    });

    it('should handle piece count > 1', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-7',
        name: 'Multiple pieces',
        rows: 3,
        cols: 3,
        blocked: [],
        hintCells: [],
        rowTargets: [0, 0, 0],
        colTargets: [0, 0, 0],
        pieces: [
          {
            id: 'p-a',
            name: 'Multi Piece',
            color: '#9ddb22',
            cells: [{ x: 0, y: 0 }],
            count: 5,
          },
        ],
      };

      const encoded = encodeLevelForUrl(level);
      expect(encoded).toBeTruthy();
    });

    it('should respect compression option', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-8',
        name: 'Compression Test',
        rows: 5,
        cols: 5,
        blocked: [],
        hintCells: [],
        rowTargets: [1, 1, 1, 1, 1],
        colTargets: [1, 1, 1, 1, 1],
        pieces: [
          {
            id: 'p-a',
            name: 'Piece',
            color: '#9ddb22',
            cells: [{ x: 0, y: 0 }],
            count: 1,
          },
        ],
      };

      const encoded1 = encodeLevelForUrl(level, { compression: 1 });
      const encoded2 = encodeLevelForUrl(level, { compression: 2 });

      expect(encoded1).toContain('v1');
      expect(encoded2).toContain('v2');
    });
  });

  describe('decodeLevelFromUrl', () => {
    it('should decode a simple level', () => {
      const encoded = encodeLevelForUrl({
        id: 'decode-simple',
        name: 'Decode Simple',
        rows: 1,
        cols: 1,
        blocked: [],
        hintCells: [],
        rowTargets: [1],
        colTargets: [1],
        pieces: [
          {
            id: 'p-a',
            name: 'Piece A',
            color: '#9ddb22',
            cells: [{ x: 0, y: 0 }],
            count: 1,
          },
        ],
      });
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.id).toBe('circuit-url');
      expect(decoded.name).toBe('URL Shared Level');
      expect(decoded.rows).toBe(1);
      expect(decoded.cols).toBe(1);
      expect(decoded.pieces).toHaveLength(1);
      expect(decoded.pieces[0]!.color).toBe('#9ddb22');
    });

    it('should decode level with blocked cells', () => {
      const encoded = encodeLevelForUrl({
        id: 'decode-blocked',
        name: 'Decode Blocked',
        rows: 1,
        cols: 1,
        blocked: [{ x: 0, y: 0 }],
        hintCells: [],
        rowTargets: [0],
        colTargets: [0],
        pieces: [],
      });
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.blocked).toHaveLength(1);
      expect(decoded.blocked[0]).toEqual({ x: 0, y: 0 });
    });

    it('should decode level with hint cells', () => {
      const encoded = encodeLevelForUrl({
        id: 'decode-hints',
        name: 'Decode Hints',
        rows: 1,
        cols: 1,
        blocked: [],
        hintCells: [{ x: 0, y: 0 }],
        hintColors: {
          '0,0': '#9ddb22',
        },
        rowTargets: [0],
        colTargets: [0],
        pieces: [],
      });
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.hintCells).toHaveLength(1);
      expect(decoded.hintCells[0]).toEqual({ x: 0, y: 0 });
    });

    it('should decode predefined colors', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-colors',
        name: 'Color Test',
        rows: 3,
        cols: 3,
        blocked: [],
        hintCells: [],
        rowTargets: [0, 0, 0],
        colTargets: [0, 0, 0],
        pieces: [
          {
            id: 'p-a',
            name: 'Red',
            color: '#ff6f6f', // predefined index 2
            cells: [{ x: 0, y: 0 }],
            count: 1,
          },
          {
            id: 'p-b',
            name: 'White',
            color: '#ffffff', // predefined index 3
            cells: [{ x: 0, y: 0 }],
            count: 1,
          },
        ],
      };

      const encoded = encodeLevelForUrl(level);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.pieces[0]!.color).toBe('#ff6f6f');
      expect(decoded.pieces[1]!.color).toBe('#ffffff');
    });

    it('should decode custom colors', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-custom-color',
        name: 'Custom Color Test',
        rows: 3,
        cols: 3,
        blocked: [],
        hintCells: [],
        rowTargets: [0, 0, 0],
        colTargets: [0, 0, 0],
        pieces: [
          {
            id: 'p-a',
            name: 'Custom',
            color: '#1a2b3c',
            cells: [{ x: 0, y: 0 }],
            count: 1,
          },
        ],
      };

      const encoded = encodeLevelForUrl(level);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.pieces[0]!.color).toBe('#112233');
    });

    it('should decode piece count correctly', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-count',
        name: 'Count Test',
        rows: 3,
        cols: 3,
        blocked: [],
        hintCells: [],
        rowTargets: [0, 0, 0],
        colTargets: [0, 0, 0],
        pieces: [
          {
            id: 'p-a',
            name: 'Multi',
            color: '#9ddb22',
            cells: [{ x: 0, y: 0 }],
            count: 5,
          },
        ],
      };

      const encoded = encodeLevelForUrl(level);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.pieces[0]!.count).toBe(5);
    });

    it('should decode fixed placements from extension segment', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-fixed',
        name: 'Fixed Test',
        rows: 4,
        cols: 4,
        blocked: [],
        hintCells: [],
        rowTargets: [0, 0, 0, 0],
        colTargets: [0, 0, 0, 0],
        pieces: [],
        fixedPlacements: [
          {
            id: 'fx-a',
            color: '#9ddb22',
            anchor: { x: 1, y: 1 },
            rotation: 1,
            cells: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
          },
        ],
      };

      const encoded = encodeLevelForUrl(level);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.fixedPlacements).toHaveLength(1);
      expect(decoded.fixedPlacements?.[0]).toEqual({
        id: 'fx-1',
        color: '#9ddb22',
        anchor: { x: 1, y: 1 },
        rotation: 1,
        cells: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      });
    });

    it('should decode row and col targets correctly', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-targets',
        name: 'Targets Test',
        rows: 3,
        cols: 4,
        blocked: [],
        hintCells: [],
        rowTargets: [1, 2, 3],
        colTargets: [4, 3, 2, 1],
        pieces: [],
      };

      const encoded = encodeLevelForUrl(level);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.rowTargets).toEqual([1, 2, 3]);
      expect(decoded.colTargets).toEqual([4, 3, 2, 1]);
    });

    it('should throw error for invalid format', () => {
      expect(() => decodeLevelFromUrl('invalid')).toThrow(
        'Invalid URL format: missing version prefix',
      );
    });

    it('should handle multiple pieces', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-multi',
        name: 'Multi Piece Test',
        rows: 5,
        cols: 5,
        blocked: [],
        hintCells: [],
        rowTargets: [1, 1, 1, 1, 1],
        colTargets: [1, 1, 1, 1, 1],
        pieces: [
          {
            id: 'p-a',
            name: 'Piece A',
            color: '#9ddb22',
            cells: [{ x: 0, y: 0 }],
            count: 1,
          },
          {
            id: 'p-b',
            name: 'Piece B',
            color: '#ff6f6f',
            cells: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
            count: 1,
          },
          {
            id: 'p-c',
            name: 'Piece C',
            color: '#ffffff',
            cells: [
              { x: 0, y: 0 },
              { x: 0, y: 1 },
              { x: 1, y: 1 },
            ],
            count: 1,
          },
        ],
      };

      const encoded = encodeLevelForUrl(level);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.pieces).toHaveLength(3);
      expect(decoded.pieces[0]!.color).toBe('#9ddb22');
      expect(decoded.pieces[1]!.color).toBe('#ff6f6f');
      expect(decoded.pieces[2]!.color).toBe('#ffffff');
    });

    it('should handle large boards', () => {
      const level: PuzzleLevelDefinition = {
        id: 'test-large',
        name: 'Large Board',
        rows: 10,
        cols: 10,
        blocked: [],
        hintCells: [],
        rowTargets: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        colTargets: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        pieces: [],
      };

      const encoded = encodeLevelForUrl(level);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.rows).toBe(10);
      expect(decoded.cols).toBe(10);
    });
  });

  describe('encode/decode round-trip', () => {
    it('should preserve data integrity through encode/decode cycle', () => {
      const originalLevel: PuzzleLevelDefinition = {
        id: 'test-roundtrip',
        name: 'Roundtrip Test',
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
        fixedPlacements: [
          {
            id: 'fx-r',
            color: '#ff6f6f',
            anchor: { x: 2, y: 2 },
            rotation: 0,
            cells: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
          },
        ],
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
          {
            id: 'p-c',
            name: 'Piece C',
            color: '#ffcc00',
            cells: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 1, y: 1 },
            ],
            count: 1,
          },
        ],
      };

      const encoded = encodeLevelForUrl(originalLevel);
      const decodedLevel = decodeLevelFromUrl(encoded);

      expect(decodedLevel.rows).toBe(originalLevel.rows);
      expect(decodedLevel.cols).toBe(originalLevel.cols);
      expect(decodedLevel.blocked).toEqual(originalLevel.blocked);
      expect(decodedLevel.hintCells).toEqual(originalLevel.hintCells);
      expect(decodedLevel.hintColors).toEqual(originalLevel.hintColors);
      expect(decodedLevel.rowTargets).toEqual(originalLevel.rowTargets);
      expect(decodedLevel.colTargets).toEqual(originalLevel.colTargets);
      expect(
        (decodedLevel.fixedPlacements ?? []).map((fixed) => ({
          color: fixed.color,
          anchor: fixed.anchor,
          rotation: fixed.rotation ?? 0,
          cells: fixed.cells,
        })),
      ).toEqual(
        (originalLevel.fixedPlacements ?? []).map((fixed) => ({
          color: fixed.color,
          anchor: fixed.anchor,
          rotation: fixed.rotation ?? 0,
          cells: fixed.cells,
        })),
      );
      expect(decodedLevel.pieces).toHaveLength(originalLevel.pieces.length);

      for (let i = 0; i < decodedLevel.pieces.length; i++) {
        const decodedPiece = decodedLevel.pieces[i]!;
        const originalPiece = originalLevel.pieces[i]!;
        expect(decodedPiece.cells).toEqual(originalPiece.cells);
        expect(decodedPiece.color).toBe(originalPiece.color);
        expect(decodedPiece.count).toBe(originalPiece.count);
      }
    });

    it('should handle edge case: empty board', () => {
      const emptyLevel: PuzzleLevelDefinition = {
        id: 'empty',
        name: 'Empty Board',
        rows: 1,
        cols: 1,
        blocked: [],
        hintCells: [],
        rowTargets: [0],
        colTargets: [0],
        pieces: [],
      };

      const encoded = encodeLevelForUrl(emptyLevel);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.rows).toBe(1);
      expect(decoded.cols).toBe(1);
      expect(decoded.pieces).toHaveLength(0);
    });

    it('should handle edge case: all cells blocked', () => {
      const allBlockedLevel: PuzzleLevelDefinition = {
        id: 'all-blocked',
        name: 'All Blocked',
        rows: 2,
        cols: 2,
        blocked: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
        hintCells: [],
        rowTargets: [0, 0],
        colTargets: [0, 0],
        pieces: [],
      };

      const encoded = encodeLevelForUrl(allBlockedLevel);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.blocked).toHaveLength(4);
    });

    it('should handle all predefined colors', () => {
      const predefinedColors = ['#9ddb22', '#89d817', '#ff6f6f', '#ffffff', '#ffcc00', '#00ccff', '#cc66ff', '#ff6600'];

      const level: PuzzleLevelDefinition = {
        id: 'all-colors',
        name: 'All Colors',
        rows: 4,
        cols: 4,
        blocked: [],
        hintCells: [],
        rowTargets: [0, 0, 0, 0],
        colTargets: [0, 0, 0, 0],
        pieces: predefinedColors.map((color, i) => ({
          id: `p-${String.fromCharCode(0x61 + i)}`,
          name: `Piece ${i}`,
          color,
          cells: [{ x: 0, y: 0 }],
          count: 1,
        })),
      };

      const encoded = encodeLevelForUrl(level);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.pieces).toHaveLength(8);
      for (let i = 0; i < 8; i++) {
        expect(decoded.pieces[i]!.color).toBe(predefinedColors[i]!);
      }
    });

    it('should preserve default level data through url encode/decode', () => {
      const original = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
      const encoded = encodeLevelForUrl(original);
      const decoded = decodeLevelFromUrl(encoded);

      expect(decoded.rows).toBe(original.rows);
      expect(decoded.cols).toBe(original.cols);
      expect(decoded.blocked).toEqual(original.blocked);
      expect(decoded.hintCells).toEqual(original.hintCells);
      expect(decoded.hintColors).toEqual(original.hintColors);
      expect(decoded.rowTargets).toEqual(original.rowTargets);
      expect(decoded.colTargets).toEqual(original.colTargets);
      expect(decoded.pieces).toHaveLength(original.pieces.length);

      for (let i = 0; i < original.pieces.length; i++) {
        const originalPiece = original.pieces[i]!;
        const decodedPiece = decoded.pieces[i]!;
        expect(decodedPiece.color).toBe(originalPiece.color);
        expect(decodedPiece.cells).toEqual(originalPiece.cells);
        expect(decodedPiece.count).toBe(originalPiece.count);
      }
    });
  });

  describe('getDefaultCompression', () => {
    it('should return 1 by default', () => {
      const compression = getDefaultCompression();
      expect(compression).toBe(1);
    });
  });
});
