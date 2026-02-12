import { decodeLevelFromUrlV2 } from './url-format-v2';
import {
  singleLevelToMultiPuzzle,
  type PuzzleMultiLevelDefinition,
  type PuzzleMultiStageMode,
} from './multi-level-format';
import { levelToJson, parseLevelJson } from './levelFormat';
import { jsonToLevel, type FullPuzzleLevelJson, type PuzzleLevelDefinition } from './types';

type V3ModeCode = 's' | 'i';

type V3StagePayload = {
  i?: string;
  n?: string;
  e?: string;
  j?: unknown;
};

type V3Payload = {
  i?: string;
  n?: string;
  m?: V3ModeCode;
  s: V3StagePayload[];
};

function modeToCode(mode: PuzzleMultiStageMode): V3ModeCode {
  return mode === 'independent' ? 'i' : 's';
}

function codeToMode(code: unknown): PuzzleMultiStageMode {
  return code === 'i' ? 'independent' : 'sequential';
}

function encodeBase64UrlUtf8(text: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf8').toString('base64url');
  }

  if (typeof btoa !== 'undefined') {
    const utf8 = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_m, p1: string) =>
      String.fromCharCode(parseInt(p1, 16)),
    );
    return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  throw new Error('No base64 encoder available for v3 URL format');
}

function decodeBase64UrlUtf8(base64Url: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64Url, 'base64url').toString('utf8');
  }

  if (typeof atob !== 'undefined') {
    const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded);
    const percentEncoded = Array.from(decoded)
      .map((ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('');
    return decodeURIComponent(percentEncoded);
  }

  throw new Error('No base64 decoder available for v3 URL format');
}

export function encodeMultiLevelForUrlV3(puzzle: PuzzleMultiLevelDefinition): string {
  const levels = puzzle.levels ?? [];
  if (!levels.length) {
    throw new Error('Cannot encode v3 URL: multi puzzle has no levels');
  }

  const payload: V3Payload = {
    i: puzzle.id,
    n: puzzle.name,
    m: modeToCode(puzzle.mode),
    s: levels.map((level) => ({
      i: level.id,
      n: level.name,
      j: levelToJson(level),
    })),
  };

  const compact = JSON.stringify(payload);
  return `v3-${encodeBase64UrlUtf8(compact)}`;
}

export function encodeSingleLevelForUrlV3(
  level: PuzzleLevelDefinition,
  options?: { rootId?: string; rootName?: string; mode?: PuzzleMultiStageMode },
): string {
  const multi = singleLevelToMultiPuzzle(level, {
    ...(options?.rootId !== undefined ? { id: options.rootId } : {}),
    ...(options?.rootName !== undefined ? { name: options.rootName } : {}),
    ...(options?.mode !== undefined ? { mode: options.mode } : {}),
  });
  return encodeMultiLevelForUrlV3(multi);
}

export function decodeMultiLevelFromUrlV3(encoded: string): PuzzleMultiLevelDefinition {
  if (!encoded.startsWith('v3-')) {
    throw new Error('Invalid v3 URL format: missing v3- prefix');
  }

  const rawPayload = encoded.slice(3);
  let payload: unknown;
  try {
    payload = JSON.parse(decodeBase64UrlUtf8(rawPayload));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid v3 URL format payload: ${message}`);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid v3 URL format payload: expected object');
  }

  const data = payload as Partial<V3Payload>;
  const stagesRaw = Array.isArray(data.s) ? data.s : [];
  if (!stagesRaw.length) {
    throw new Error('Invalid v3 URL format payload: stages list is empty');
  }

  const levels: PuzzleLevelDefinition[] = [];
  for (let i = 0; i < stagesRaw.length; i += 1) {
    const rawStage = stagesRaw[i];
    if (!rawStage || typeof rawStage !== 'object') {
      throw new Error(`Invalid v3 URL format payload: stages[${i}] must be object`);
    }
    const stage = rawStage as Partial<V3StagePayload>;
    let decoded: PuzzleLevelDefinition | null = null;
    if (stage.j !== undefined) {
      const parsed = parseLevelJson(stage.j);
      if (parsed.level) {
        decoded = parsed.level;
      } else {
        try {
          decoded = jsonToLevel(stage.j as FullPuzzleLevelJson);
        } catch {
          throw new Error(`Invalid v3 URL format payload: stages[${i}].j invalid: ${parsed.errors.join('; ')}`);
        }
      }
    } else if (typeof stage.e === 'string' && stage.e.trim()) {
      decoded = decodeLevelFromUrlV2(stage.e);
    } else {
      throw new Error(`Invalid v3 URL format payload: stages[${i}] must provide j or e`);
    }
    levels.push({
      ...decoded,
      id: typeof stage.i === 'string' && stage.i.trim() ? stage.i.trim() : decoded.id,
      name: typeof stage.n === 'string' && stage.n.trim() ? stage.n.trim() : decoded.name,
    });
  }

  return {
    id: typeof data.i === 'string' && data.i.trim() ? data.i.trim() : 'circuit-url-multi',
    name: typeof data.n === 'string' && data.n.trim() ? data.n.trim() : 'URL Shared Multi Puzzle',
    mode: codeToMode(data.m),
    levels,
  };
}
