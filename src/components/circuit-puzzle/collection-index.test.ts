import { describe, expect, it } from 'vitest';
import { parseCollectionIndex, resolveCollectionAssetPath } from './collection-index';

describe('collection index', () => {
  it('parses a valid index', () => {
    const raw = {
      version: 1,
      title: 'My Levels',
      basePath: '/circuit-puzzle-levels',
      entries: [
        {
          id: 'lv-1',
          title: 'Level 1',
          json: 'level-1.json',
          markdown: 'level-1.md',
          tags: ['easy', 'demo'],
        },
      ],
    };
    const parsed = parseCollectionIndex(raw);
    expect(parsed.errors).toEqual([]);
    expect(parsed.index?.title).toBe('My Levels');
    expect(parsed.index?.entries[0]?.id).toBe('lv-1');
    expect(parsed.index?.entries[0]?.tags).toEqual(['easy', 'demo']);
  });

  it('rejects malformed entries', () => {
    const parsed = parseCollectionIndex({
      version: 1,
      entries: [{ id: '', title: 'x', json: '' }],
    });
    expect(parsed.index).toBeNull();
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  it('accepts directory-only entries', () => {
    const parsed = parseCollectionIndex({
      version: 1,
      entries: [{ id: 'dir-all', title: 'Dir All', directory: 'file_type2', tags: ['batch'] }],
    });
    expect(parsed.errors).toEqual([]);
    expect(parsed.index?.entries[0]?.json).toBe('file_type2');
    expect(parsed.index?.entries[0]?.directory).toBe('file_type2');
  });

  it('resolves relative and absolute asset paths', () => {
    expect(resolveCollectionAssetPath('/circuit-puzzle-levels', 'a/b.json')).toBe('/circuit-puzzle-levels/a/b.json');
    expect(resolveCollectionAssetPath('/circuit-puzzle-levels/', '/static/x.md')).toBe('/static/x.md');
  });
});
