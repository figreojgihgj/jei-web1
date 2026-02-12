import type { GridCell, PuzzleLevelDefinition, PuzzlePieceDefinition } from './types';

const URL_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const HEX_CHARS = '0123456789abcdef';

const PREDEFINED_COLORS: Record<string, number> = {
  '#9ddb22': 0,
  '#89d817': 1,
  '#ff6f6f': 2,
  '#ffffff': 3,
  '#ffcc00': 4,
  '#00ccff': 5,
  '#cc66ff': 6,
  '#ff6600': 7,
};

const INDEX_TO_COLOR: Record<number, string> = {
  0: '#9ddb22',
  1: '#89d817',
  2: '#ff6f6f',
  3: '#ffffff',
  4: '#ffcc00',
  5: '#00ccff',
  6: '#cc66ff',
  7: '#ff6600',
};

const PREDEFINED_COLOR_COUNT = Object.keys(PREDEFINED_COLORS).length;

function encodeNumber(num: number): string {
  const clamped = Math.max(0, Math.min(61, Math.floor(num)));
  return URL_CHARS[clamped] ?? '0';
}

function decodeNumber(char: string | undefined): number {
  if (!char) return 0;
  const idx = URL_CHARS.indexOf(char);
  return idx >= 0 ? idx : 0;
}

function encodeBase62Fixed(value: number, length: number): string {
  let current = Math.max(0, Math.floor(value));
  let out = '';
  for (let i = 0; i < length; i++) {
    out = encodeNumber(current % 62) + out;
    current = Math.floor(current / 62);
  }
  return out;
}

function decodeBase62(str: string): number {
  let value = 0;
  for (const ch of str) {
    value = value * 62 + decodeNumber(ch);
  }
  return value;
}

function encodeFixed2(value: number): string {
  return encodeBase62Fixed(value, 2);
}

function decodeFixed2(str: string, pos: number): { value: number; nextPos: number } {
  const chunk = (str.slice(pos, pos + 2) + '00').slice(0, 2);
  return { value: decodeBase62(chunk), nextPos: pos + 2 };
}

function encodeRgbColor(color: string): number {
  const safe = color.startsWith('#') ? color.slice(1) : color;
  const r = Math.min(15, parseInt(safe.slice(0, 2), 16) >> 4);
  const g = Math.min(15, parseInt(safe.slice(2, 4), 16) >> 4);
  const b = Math.min(15, parseInt(safe.slice(4, 6), 16) >> 4);
  return (r << 8) | (g << 4) | b;
}

function decodeRgbColor(compressed: number): string {
  const r = (compressed >> 8) & 0x0f;
  const g = (compressed >> 4) & 0x0f;
  const b = compressed & 0x0f;
  const r8 = (r << 4) | r;
  const g8 = (g << 4) | g;
  const b8 = (b << 4) | b;
  return `#${r8.toString(16).padStart(2, '0')}${g8.toString(16).padStart(2, '0')}${b8.toString(16).padStart(2, '0')}`;
}

function toIndex(cell: GridCell, cols: number): number {
  return cell.y * cols + cell.x;
}

function fromIndex(index: number, cols: number): GridCell {
  if (cols <= 0) return { x: 0, y: 0 };
  return {
    x: index % cols,
    y: Math.floor(index / cols),
  };
}

function encodeColorIndex(color: string, customColors: Map<string, number>): number {
  const normalizedColor = color.toLowerCase().trim();
  const predefined = PREDEFINED_COLORS[normalizedColor];
  if (predefined !== undefined) return predefined;

  const existing = customColors.get(normalizedColor);
  if (existing !== undefined) return existing;

  const next = PREDEFINED_COLOR_COUNT + customColors.size;
  customColors.set(normalizedColor, next);
  return next;
}

function decodeColorFromIndex(idx: number, customColors: Map<number, string>): string {
  const predefined = INDEX_TO_COLOR[idx];
  if (predefined) return predefined;
  return customColors.get(idx) ?? '#9ddb22';
}

function encodeCountMaskHex(mask: boolean[]): string {
  let out = '';
  for (let i = 0; i < mask.length; i += 4) {
    let value = 0;
    if (mask[i]) value |= 1;
    if (mask[i + 1]) value |= 2;
    if (mask[i + 2]) value |= 4;
    if (mask[i + 3]) value |= 8;
    out += HEX_CHARS[value] ?? '0';
  }
  return out;
}

function decodeCountMaskHex(maskHex: string, pieceCount: number): boolean[] {
  const out = Array.from({ length: pieceCount }, () => false);
  for (let i = 0; i < maskHex.length; i++) {
    const ch = maskHex[i];
    const nibble = ch ? HEX_CHARS.indexOf(ch.toLowerCase()) : 0;
    const safeNibble = nibble >= 0 ? nibble : 0;
    const offset = i * 4;
    if (offset < pieceCount) out[offset] = (safeNibble & 1) !== 0;
    if (offset + 1 < pieceCount) out[offset + 1] = (safeNibble & 2) !== 0;
    if (offset + 2 < pieceCount) out[offset + 2] = (safeNibble & 4) !== 0;
    if (offset + 3 < pieceCount) out[offset + 3] = (safeNibble & 8) !== 0;
  }
  return out;
}

export function encodeLevelForUrlV2(level: PuzzleLevelDefinition): string {
  const rowsChar = encodeNumber(level.rows);
  const colsChar = encodeNumber(level.cols);
  const customColors = new Map<string, number>();

  const blockedIndices = level.blocked.map((cell) => toIndex(cell, level.cols));
  const blockedStr = encodeFixed2(blockedIndices.length)
    + blockedIndices.map((index) => encodeFixed2(index)).join('');

  const hintCells = level.hintCells ?? [];
  const hintIndices = hintCells.map((cell) => toIndex(cell, level.cols));
  const hintColorIndexList = hintCells.map((cell) => {
    const key = `${cell.x},${cell.y}`;
    const color = level.hintColors?.[key] ?? '#9ddb22';
    return encodeColorIndex(color, customColors);
  });

  const hintPalette: number[] = [];
  const hintPaletteMap = new Map<number, number>();
  const hintRefs: number[] = [];
  for (const colorIdx of hintColorIndexList) {
    const existing = hintPaletteMap.get(colorIdx);
    if (existing !== undefined) {
      hintRefs.push(existing);
      continue;
    }
    const nextIdx = hintPalette.length;
    hintPalette.push(colorIdx);
    hintPaletteMap.set(colorIdx, nextIdx);
    hintRefs.push(nextIdx);
  }

  const hintStr =
    encodeFixed2(hintIndices.length)
    + hintIndices.map((index) => encodeFixed2(index)).join('')
    + encodeNumber(hintPalette.length)
    + hintPalette.map((colorIdx) => encodeNumber(colorIdx)).join('')
    + (hintPalette.length > 1 ? hintRefs.map((idx) => encodeNumber(idx)).join('') : '');

  const pieces = level.pieces ?? [];
  const countMask = pieces.map((piece) => (piece.count ?? 1) !== 1);
  const countMaskHex = encodeCountMaskHex(countMask);
  const pieceBodies = pieces
    .map((piece) => {
      const colorIdx = encodeColorIndex(piece.color, customColors);
      const cells = piece.cells ?? [];
      return (
        encodeNumber(colorIdx)
        + encodeNumber(cells.length)
        + cells.map((cell) => encodeFixed2(toIndex(cell, level.cols))).join('')
      );
    })
    .join('');
  const extraCounts = pieces
    .filter((_, i) => countMask[i])
    .map((piece) => encodeNumber(Math.max(0, (piece.count ?? 1) - 1)))
    .join('');
  const piecesStr =
    encodeFixed2(pieces.length)
    + encodeNumber(countMaskHex.length)
    + countMaskHex
    + pieceBodies
    + extraCounts;

  const fixedPlacements = level.fixedPlacements ?? [];
  const fixedExtEntries = fixedPlacements
    .map((fixed) => {
      const colorIdx = encodeColorIndex(fixed.color, customColors);
      const rotation = encodeNumber(((fixed.rotation ?? 0) % 4 + 4) % 4);
      const anchorIndex = encodeFixed2(toIndex(fixed.anchor, level.cols));
      const cells = fixed.cells ?? [];
      const cellCount = encodeNumber(cells.length);
      const cellsStr = cells.map((cell) => encodeFixed2(toIndex(cell, level.cols))).join('');
      return `${encodeNumber(colorIdx)}${rotation}${anchorIndex}${cellCount}${cellsStr}`;
    })
    .filter((entry) => entry.length > 0);

  let customColorsStr = encodeNumber(customColors.size);
  const sortedCustomColors = Array.from(customColors.entries()).sort((a, b) => a[1] - b[1]);
  for (const [color] of sortedCustomColors) {
    const rgb = encodeRgbColor(color);
    customColorsStr += encodeBase62Fixed(rgb, 3);
  }

  const rowTargetsStr = (level.rowTargets ?? []).map((value) => encodeNumber(value)).join('');
  const colTargetsStr = (level.colTargets ?? []).map((value) => encodeNumber(value)).join('');
  const extensionStr =
    fixedExtEntries.length > 0
      ? `xf${encodeFixed2(fixedExtEntries.length)}${fixedExtEntries.join('')}`
      : '';

  return `v2-${rowsChar}${colsChar}${blockedStr}${hintStr}${piecesStr}${customColorsStr}${rowTargetsStr}${colTargetsStr}${extensionStr}`;
}

export function decodeLevelFromUrlV2(encoded: string): PuzzleLevelDefinition {
  if (!encoded.startsWith('v2-')) {
    throw new Error('Invalid v2 URL format: missing v2- prefix');
  }

  const customColors = new Map<number, string>();
  let pos = 3;
  const rows = decodeNumber(encoded[pos]);
  pos++;
  const cols = decodeNumber(encoded[pos]);
  pos++;

  const blockedCountParsed = decodeFixed2(encoded, pos);
  const blockedCount = blockedCountParsed.value;
  pos = blockedCountParsed.nextPos;
  const blocked: GridCell[] = [];
  for (let i = 0; i < blockedCount; i++) {
    const parsed = decodeFixed2(encoded, pos);
    pos = parsed.nextPos;
    blocked.push(fromIndex(parsed.value, cols));
  }

  const hintCountParsed = decodeFixed2(encoded, pos);
  const hintCount = hintCountParsed.value;
  pos = hintCountParsed.nextPos;
  const hintCells: GridCell[] = [];
  for (let i = 0; i < hintCount; i++) {
    const parsed = decodeFixed2(encoded, pos);
    pos = parsed.nextPos;
    hintCells.push(fromIndex(parsed.value, cols));
  }

  const hintPaletteCount = decodeNumber(encoded[pos]);
  pos++;
  const hintPaletteIndices: number[] = [];
  for (let i = 0; i < hintPaletteCount; i++) {
    hintPaletteIndices.push(decodeNumber(encoded[pos]));
    pos++;
  }

  const hintRefs: number[] = [];
  if (hintPaletteCount > 1) {
    for (let i = 0; i < hintCount; i++) {
      hintRefs.push(decodeNumber(encoded[pos]));
      pos++;
    }
  } else {
    for (let i = 0; i < hintCount; i++) {
      hintRefs.push(0);
    }
  }

  const pieceCountParsed = decodeFixed2(encoded, pos);
  const pieceCount = pieceCountParsed.value;
  pos = pieceCountParsed.nextPos;

  const countMaskLen = decodeNumber(encoded[pos]);
  pos++;
  const countMaskHex = encoded.slice(pos, pos + countMaskLen);
  pos += countMaskLen;
  const countMask = decodeCountMaskHex(countMaskHex, pieceCount);

  const piecesRaw: Array<{ colorIdx: number; cells: GridCell[] }> = [];
  for (let i = 0; i < pieceCount; i++) {
    const colorIdx = decodeNumber(encoded[pos]);
    pos++;
    const cellCount = decodeNumber(encoded[pos]);
    pos++;
    const cells: GridCell[] = [];
    for (let j = 0; j < cellCount; j++) {
      const parsed = decodeFixed2(encoded, pos);
      pos = parsed.nextPos;
      cells.push(fromIndex(parsed.value, cols));
    }
    piecesRaw.push({ colorIdx, cells });
  }

  const pieceCounts: number[] = [];
  for (let i = 0; i < pieceCount; i++) {
    if (countMask[i]) {
      pieceCounts.push(decodeNumber(encoded[pos]) + 1);
      pos++;
    } else {
      pieceCounts.push(1);
    }
  }

  const customColorCount = decodeNumber(encoded[pos]);
  pos++;
  for (let i = 0; i < customColorCount; i++) {
    const chunk = (encoded.slice(pos, pos + 3) + '000').slice(0, 3);
    pos += 3;
    const color = decodeRgbColor(decodeBase62(chunk));
    customColors.set(PREDEFINED_COLOR_COUNT + i, color);
  }

  const rowTargets: number[] = [];
  for (let i = 0; i < rows; i++) {
    rowTargets.push(decodeNumber(encoded[pos]));
    pos++;
  }

  const colTargets: number[] = [];
  for (let i = 0; i < cols; i++) {
    colTargets.push(decodeNumber(encoded[pos]));
    pos++;
  }

  const fixedPlacements: NonNullable<PuzzleLevelDefinition['fixedPlacements']> = [];
  if (encoded[pos] === 'x') {
    pos++;
    while (pos < encoded.length) {
      const section = encoded[pos] ?? '';
      pos++;
      if (section !== 'f') break;
      const fixedCountParsed = decodeFixed2(encoded, pos);
      const fixedCount = fixedCountParsed.value;
      pos = fixedCountParsed.nextPos;

      for (let i = 0; i < fixedCount; i++) {
        const colorIdx = decodeNumber(encoded[pos]);
        pos++;
        const rotation = decodeNumber(encoded[pos]) % 4;
        pos++;
        const anchorParsed = decodeFixed2(encoded, pos);
        pos = anchorParsed.nextPos;
        const anchor = fromIndex(anchorParsed.value, cols);
        const cellCount = decodeNumber(encoded[pos]);
        pos++;
        const cells: GridCell[] = [];
        for (let j = 0; j < cellCount; j++) {
          const cellParsed = decodeFixed2(encoded, pos);
          pos = cellParsed.nextPos;
          cells.push(fromIndex(cellParsed.value, cols));
        }
        fixedPlacements.push({
          id: `fx-${i + 1}`,
          color: decodeColorFromIndex(colorIdx, customColors),
          anchor,
          rotation,
          cells,
        });
      }
    }
  }

  const hintColors: Record<string, string> = {};
  for (let i = 0; i < hintCells.length; i++) {
    const cell = hintCells[i];
    if (!cell) continue;
    const paletteIdx = hintRefs[i] ?? 0;
    const colorIdx = hintPaletteIndices[paletteIdx] ?? 0;
    hintColors[`${cell.x},${cell.y}`] = decodeColorFromIndex(colorIdx, customColors);
  }

  const pieces: PuzzlePieceDefinition[] = piecesRaw.map((raw, idx) => ({
    id: `p-${String.fromCharCode(0x61 + idx)}`,
    name: `Piece ${String.fromCharCode(0x41 + idx)}`,
    color: decodeColorFromIndex(raw.colorIdx, customColors),
    cells: raw.cells,
    count: pieceCounts[idx] ?? 1,
  }));

  const level: PuzzleLevelDefinition = {
    id: 'circuit-url',
    name: 'URL Shared Level',
    rows,
    cols,
    blocked,
    hintCells,
    rowTargets,
    colTargets,
    pieces,
  };

  if (Object.keys(hintColors).length > 0) {
    level.hintColors = hintColors;
  }
  if (fixedPlacements.length > 0) {
    level.fixedPlacements = fixedPlacements;
  }

  return level;
}
