import { describe, expect, it } from 'vitest';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from './defaultLevel';
import { encodeLevelForUrl } from './url-format';
import { decodeLevelFromUrlV2, encodeLevelForUrlV2 } from './url-format-v2';
import type { PuzzleLevelDefinition } from './types';

describe('url-format-v2', () => {
  it('should encode with v2 prefix', () => {
    const encoded = encodeLevelForUrlV2(cloneLevel(DEFAULT_CIRCUIT_LEVEL));
    expect(encoded.startsWith('v2-')).toBe(true);
  });

  it('should decode simple level', () => {
    const level: PuzzleLevelDefinition = {
      id: 'simple',
      name: 'Simple',
      rows: 1,
      cols: 1,
      blocked: [],
      hintCells: [{ x: 0, y: 0 }],
      hintColors: { '0,0': '#9ddb22' },
      rowTargets: [1],
      colTargets: [1],
      pieces: [
        {
          id: 'p-a',
          name: 'A',
          color: '#9ddb22',
          cells: [{ x: 0, y: 0 }],
          count: 1,
        },
      ],
    };

    const encoded = encodeLevelForUrlV2(level);
    const decoded = decodeLevelFromUrlV2(encoded);

    expect(decoded.rows).toBe(1);
    expect(decoded.cols).toBe(1);
    expect(decoded.hintCells).toEqual([{ x: 0, y: 0 }]);
    expect(decoded.hintColors).toEqual({ '0,0': '#9ddb22' });
    expect(decoded.pieces[0]!.cells).toEqual([{ x: 0, y: 0 }]);
    expect(decoded.pieces[0]!.count).toBe(1);
  });

  it('should decode custom piece colors', () => {
    const level: PuzzleLevelDefinition = {
      id: 'custom-color',
      name: 'Custom Color',
      rows: 3,
      cols: 3,
      blocked: [],
      hintCells: [],
      rowTargets: [0, 0, 0],
      colTargets: [0, 0, 0],
      pieces: [
        {
          id: 'p-a',
          name: 'A',
          color: '#1a2b3c',
          cells: [{ x: 0, y: 0 }],
          count: 1,
        },
      ],
    };

    const encoded = encodeLevelForUrlV2(level);
    const decoded = decodeLevelFromUrlV2(encoded);

    expect(decoded.pieces[0]!.color).toBe('#112233');
  });

  it('should decode fixed placements from extension segment', () => {
    const level: PuzzleLevelDefinition = {
      id: 'fixed-v2',
      name: 'Fixed V2',
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
          anchor: { x: 1, y: 2 },
          rotation: 2,
          cells: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
        },
      ],
    };

    const encoded = encodeLevelForUrlV2(level);
    const decoded = decodeLevelFromUrlV2(encoded);

    expect(decoded.fixedPlacements).toEqual([
      {
        id: 'fx-1',
        color: '#9ddb22',
        anchor: { x: 1, y: 2 },
        rotation: 2,
        cells: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      },
    ]);
  });

  it('should support boards larger than 62 cells', () => {
    const level: PuzzleLevelDefinition = {
      id: 'large',
      name: 'Large',
      rows: 10,
      cols: 10,
      blocked: [{ x: 9, y: 9 }, { x: 0, y: 9 }],
      hintCells: [{ x: 8, y: 8 }],
      hintColors: { '8,8': '#ff6f6f' },
      rowTargets: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      colTargets: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      pieces: [
        {
          id: 'p-a',
          name: 'A',
          color: '#9ddb22',
          cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
          count: 2,
        },
      ],
    };

    const encoded = encodeLevelForUrlV2(level);
    const decoded = decodeLevelFromUrlV2(encoded);

    expect(decoded.blocked).toEqual(level.blocked);
    expect(decoded.hintCells).toEqual(level.hintCells);
    expect(decoded.pieces[0]!.count).toBe(2);
  });

  it('should preserve default level data through v2 encode/decode', () => {
    const original = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const encoded = encodeLevelForUrlV2(original);
    const decoded = decodeLevelFromUrlV2(encoded);

    expect(decoded.rows).toBe(original.rows);
    expect(decoded.cols).toBe(original.cols);
    expect(decoded.blocked).toEqual(original.blocked);
    expect(decoded.hintCells).toEqual(original.hintCells);
    expect(decoded.hintColors).toEqual(original.hintColors);
    expect(decoded.rowTargets).toEqual(original.rowTargets);
    expect(decoded.colTargets).toEqual(original.colTargets);
    expect(decoded.pieces).toHaveLength(original.pieces.length);

    for (let i = 0; i < original.pieces.length; i++) {
      const source = original.pieces[i]!;
      const restored = decoded.pieces[i]!;
      expect(restored.color).toBe(source.color);
      expect(restored.cells).toEqual(source.cells);
      expect(restored.count).toBe(source.count);
    }
  });

  it('should be shorter than v1 for default level', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const v1 = encodeLevelForUrl(level);
    const v2 = encodeLevelForUrlV2(level);

    expect(v2.length).toBeLessThan(v1.length);
  });

  it('should throw when decoding non-v2 input', () => {
    const v1 = encodeLevelForUrl(cloneLevel(DEFAULT_CIRCUIT_LEVEL));
    expect(() => decodeLevelFromUrlV2(v1)).toThrow('Invalid v2 URL format: missing v2- prefix');
  });
});
