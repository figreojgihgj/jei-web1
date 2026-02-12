import { describe, expect, it } from 'vitest';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from './defaultLevel';
import {
  decodeMultiLevelFromUrlV3,
  encodeMultiLevelForUrlV3,
  encodeSingleLevelForUrlV3,
} from './url-format-v3';
import { singleLevelToMultiPuzzle } from './multi-level-format';

describe('url-format-v3', () => {
  it('encodes with v3 prefix and decodes back multi-level payload', () => {
    const levelA = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    levelA.id = 'l-1';
    levelA.name = 'L1';
    const levelB = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    levelB.id = 'l-2';
    levelB.name = 'L2';
    levelB.rowTargets = [...levelA.rowTargets].reverse();

    const encoded = encodeMultiLevelForUrlV3({
      id: 'pack-url',
      name: 'Pack URL',
      mode: 'sequential',
      levels: [levelA, levelB],
    });
    const decoded = decodeMultiLevelFromUrlV3(encoded);

    expect(encoded.startsWith('v3-')).toBe(true);
    expect(decoded.id).toBe('pack-url');
    expect(decoded.name).toBe('Pack URL');
    expect(decoded.levels).toHaveLength(2);
    expect(decoded.levels[1]?.id).toBe('l-2');
    expect(decoded.levels[1]?.rowTargets).toEqual(levelB.rowTargets);
  });

  it('encodes a single level by wrapping to one stage', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const encoded = encodeSingleLevelForUrlV3(level, {
      rootId: 'root-v3',
      rootName: 'Root V3',
      mode: 'independent',
    });

    const decoded = decodeMultiLevelFromUrlV3(encoded);
    expect(decoded.id).toBe('root-v3');
    expect(decoded.mode).toBe('independent');
    expect(decoded.levels).toHaveLength(1);
  });

  it('keeps fixed placements when encoding/decoding v3', () => {
    const level = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    level.fixedPlacements = [
      {
        id: 'fx-1',
        name: 'Locked L',
        color: '#9ddb22',
        cells: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 0, y: 1 },
        ],
        anchor: { x: 2, y: 1 },
        rotation: 1,
      },
    ];
    const encoded = encodeMultiLevelForUrlV3({
      id: 'pack-fixed',
      name: 'Pack Fixed',
      mode: 'sequential',
      levels: [level],
    });
    const decoded = decodeMultiLevelFromUrlV3(encoded);
    expect(decoded.levels[0]?.fixedPlacements).toHaveLength(1);
    expect(decoded.levels[0]?.fixedPlacements?.[0]).toEqual(level.fixedPlacements[0]);
  });

  it('throws on missing prefix', () => {
    const single = singleLevelToMultiPuzzle(cloneLevel(DEFAULT_CIRCUIT_LEVEL));
    const encoded = encodeMultiLevelForUrlV3(single);
    const noPrefix = encoded.slice(3);

    expect(() => decodeMultiLevelFromUrlV3(noPrefix)).toThrow('Invalid v3 URL format: missing v3- prefix');
  });

  it('throws on empty stages payload', () => {
    const payload = Buffer.from(JSON.stringify({ i: 'x', n: 'x', s: [] }), 'utf8').toString('base64url');
    expect(() => decodeMultiLevelFromUrlV3(`v3-${payload}`)).toThrow(
      'Invalid v3 URL format payload: stages list is empty',
    );
  });
});
