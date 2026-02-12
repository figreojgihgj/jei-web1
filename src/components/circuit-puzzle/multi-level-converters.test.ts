import { describe, expect, it } from 'vitest';
import { cloneLevel, DEFAULT_CIRCUIT_LEVEL } from './defaultLevel';
import { levelToJson } from './levelFormat';
import {
  convertPuzzleJsonToV3Url,
  convertV3UrlToMultiPuzzleJson,
  convertV3UrlToSingleLevel,
} from './multi-level-converters';

describe('multi-level-converters', () => {
  it('converts single level json to v3 and back to single level', () => {
    const source = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    const result = convertPuzzleJsonToV3Url(levelToJson(source));

    expect(result.errors).toEqual([]);
    expect(result.encoded?.startsWith('v3-')).toBe(true);

    const restored = convertV3UrlToSingleLevel(result.encoded ?? '');
    expect(restored.rows).toBe(source.rows);
    expect(restored.cols).toBe(source.cols);
    expect(restored.pieces.length).toBe(source.pieces.length);
  });

  it('converts multi json to v3 and restores version 2 json', () => {
    const levelA = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    levelA.id = 'a';
    const levelB = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    levelB.id = 'b';
    levelB.name = 'B';

    const multiJson = {
      version: 2 as const,
      id: 'pack-cvt',
      name: 'Pack Cvt',
      mode: 'sequential' as const,
      levels: [levelToJson(levelA), levelToJson(levelB)],
    };

    const encoded = convertPuzzleJsonToV3Url(multiJson);
    expect(encoded.errors).toEqual([]);
    expect(encoded.encoded).not.toBeNull();

    const restored = convertV3UrlToMultiPuzzleJson(encoded.encoded ?? '');
    expect(restored.version).toBe(2);
    expect(restored.id).toBe('pack-cvt');
    expect(restored.levels).toHaveLength(2);
  });

  it('returns parse errors on invalid json input', () => {
    const result = convertPuzzleJsonToV3Url({ version: 2, id: '', name: '', levels: [] });

    expect(result.encoded).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('supports selecting level index from v3', () => {
    const levelA = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    levelA.id = 'stage-a';
    const levelB = cloneLevel(DEFAULT_CIRCUIT_LEVEL);
    levelB.id = 'stage-b';
    levelB.name = 'Stage B';

    const encoded = convertPuzzleJsonToV3Url({
      version: 2,
      id: 'index-pack',
      name: 'Index Pack',
      levels: [levelToJson(levelA), levelToJson(levelB)],
    }).encoded;

    const selected = convertV3UrlToSingleLevel(encoded ?? '', 1);
    expect(selected.id).toBe('stage-b');
  });
});
