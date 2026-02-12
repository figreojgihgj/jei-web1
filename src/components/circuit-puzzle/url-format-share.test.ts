import { describe, expect, it } from 'vitest';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from './defaultLevel';
import { decodeLevelFromUrl, encodeLevelForUrl } from './url-format';
import { decodeLevelFromUrlV2, encodeLevelForUrlV2 } from './url-format-v2';
import { encodeMultiLevelForUrlV3 } from './url-format-v3';
import {
  decodeLevelFromSharedUrl,
  decodeMultiLevelFromSharedUrl,
  encodeLevelForShortestUrl,
} from './url-format-share';
import type { PuzzleLevelDefinition } from './types';

describe('url-format-share', () => {
  it('should choose shortest result between v1 and v2', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const v1 = encodeLevelForUrl(level);
    const v2 = encodeLevelForUrlV2(level);
    const chosen = encodeLevelForShortestUrl(level);

    expect(chosen.lengths.v1).toBe(v1.length);
    expect(chosen.lengths.v2).toBe(v2.length);
    expect(chosen.encoded.length).toBe(Math.min(v1.length, v2.length));
  });

  it('should decode v1 encoded string', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const encoded = encodeLevelForUrl(level);
    const expected = decodeLevelFromUrl(encoded);
    const decoded = decodeLevelFromSharedUrl(encoded);

    expect(decoded).toEqual(expected);
  });

  it('should decode v2 encoded string', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const encoded = encodeLevelForUrlV2(level);
    const expected = decodeLevelFromUrlV2(encoded);
    const decoded = decodeLevelFromSharedUrl(encoded);

    expect(decoded).toEqual(expected);
  });

  it('should keep compatibility with tiny levels', () => {
    const level: PuzzleLevelDefinition = {
      id: 'tiny',
      name: 'Tiny',
      rows: 1,
      cols: 1,
      blocked: [],
      hintCells: [],
      rowTargets: [0],
      colTargets: [0],
      pieces: [],
    };

    const chosen = encodeLevelForShortestUrl(level);
    const decoded = decodeLevelFromSharedUrl(chosen.encoded);

    expect(decoded.rows).toBe(1);
    expect(decoded.cols).toBe(1);
    expect(decoded.pieces).toHaveLength(0);
  });

  it('should decode v3 encoded string to first level for compatibility', () => {
    const levelA = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    levelA.id = 'first';
    const levelB = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    levelB.id = 'second';

    const encoded = encodeMultiLevelForUrlV3({
      id: 'pack-share',
      name: 'Pack Share',
      mode: 'sequential',
      levels: [levelA, levelB],
    });

    const decoded = decodeLevelFromSharedUrl(encoded);
    expect(decoded.id).toBe('first');
  });

  it('should decode v1 and v2 as single-level multi payload when requested', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const encodedV2 = encodeLevelForUrlV2(level);
    const decodedV2 = decodeMultiLevelFromSharedUrl(encodedV2);

    expect(decodedV2.levels).toHaveLength(1);
    expect(decodedV2.levels[0]?.rows).toBe(level.rows);
    expect(decodedV2.mode).toBe('sequential');
  });
});
