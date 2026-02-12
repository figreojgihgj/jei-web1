/**
 * 最短 URL 编码格式
 * 目标：用最少的字符编码完整关卡数据，便于URL分享
 *
 * 格式规则：
 * - 使用 URL 安全字符集：0-9a-zA-Z (62种字符)
 * - 版本标识：v + 压缩级别(1-2)
 * - 行列数：各1位 (0-9, a-z 表示更大尺寸)
 * - 阻塞格子：b + 数量(1位) + 坐标对(每格2位)
 * - 提示格子：h + 数量(1位) + 颜色数(1位) + 坐标数据 + 颜色映射
 * - 图块：p + 数量(1位) + [颜色索引(1位) + 格子数(1位) + 坐标对 + 数量(1位，可选)]
 * - 自定义颜色：c + 数量(1位) + RGB压缩值
 * - 行目标：每行1位
 * - 列目标：每列1位
 *
 * 颜色编码：
 * - 预定义颜色映射表（索引0-7对应8种常见颜色）
 * - 自定义颜色：RGB各4位压缩为12位
 *
 * 示例 URL：
 *   v100b321000201p123456...
 */

import type { GridCell, PuzzleLevelDefinition, PuzzlePieceDefinition } from './types';

export type UrlFormatOptions = {
  /** 压缩系数：默认1=1，2=2压缩 */
  compression?: 1 | 2;

  /** 是否省略可省略的部分 */
  compact?: boolean;
};

/**
 * URL 安全字符集 (62字符: 0-9a-zA-Z)
 */
const URL_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * 预定义颜色映射表 (颜色 -> 索引)
 */
const PREDEFINED_COLORS: Record<string, number> = {
  '#9ddb22': 0, // 默认绿色
  '#89d817': 1, // 浅绿色
  '#ff6f6f': 2, // 红色
  '#ffffff': 3, // 白色
  '#ffcc00': 4, // 黄色
  '#00ccff': 5, // 蓝色
  '#cc66ff': 6, // 紫色
  '#ff6600': 7, // 橙色
};

const PREDEFINED_COLOR_COUNT = Object.keys(PREDEFINED_COLORS).length;

/**
 * 索引到颜色的映射
 */
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

/**
 * 将颜色值编码为1位索引字符
 */
function encodeColor(color: string, customColors: Map<string, number>): string {
  const normalizedColor = color.toLowerCase().trim();

  // 检查预定义颜色
  const predefinedIdx = PREDEFINED_COLORS[normalizedColor];
  if (predefinedIdx !== undefined) {
    return URL_CHARS[predefinedIdx] ?? '0';
  }

  // 检查是否已注册的自定义颜色
  const existingIdx = customColors.get(normalizedColor);
  if (existingIdx !== undefined) {
    return URL_CHARS[existingIdx] ?? '0';
  }

  // 注册新的自定义颜色 (从预定义颜色之后开始)
  const predefinedCount = Object.keys(PREDEFINED_COLORS).length;
  const newIdx = predefinedCount + customColors.size;
  customColors.set(normalizedColor, newIdx);
  return URL_CHARS[newIdx] ?? '0';
}

function colorIndexFromChar(char: string): number {
  const idx = URL_CHARS.indexOf(char);
  return idx >= 0 ? idx : 0;
}

function decodeColorFromIndex(idx: number, customColors: Map<number, string>): string {
  const predefinedColor = INDEX_TO_COLOR[idx];
  if (predefinedColor) return predefinedColor;
  return customColors.get(idx) ?? '#9ddb22';
}

/**
 * 将数字编码为单个字符 (0-9, a-z, A-Z)
 */
function encodeNumber(num: number): string {
  const clamped = Math.max(0, Math.min(61, Math.floor(num)));
  return URL_CHARS[clamped] ?? '0';
}

/**
 * 将单个字符解码为数字
 */
function decodeNumber(char: string): number {
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

/**
 * 将RGB颜色压缩为12位值
 */
function encodeRgbColor(color: string): number {
  const hex = color.replace('#', '');
  const r = Math.min(15, parseInt(hex.slice(0, 2), 16) >> 4);
  const g = Math.min(15, parseInt(hex.slice(2, 4), 16) >> 4);
  const b = Math.min(15, parseInt(hex.slice(4, 6), 16) >> 4);
  return (r << 8) | (g << 4) | b;
}

/**
 * 解析RGB压缩值转为十六进制颜色
 */
function decodeRgbColor(compressed: number): string {
  const r = (compressed >> 8) & 0x0f;
  const g = (compressed >> 4) & 0x0f;
  const b = compressed & 0x0f;
  const r8 = (r << 4) | r;
  const g8 = (g << 4) | g;
  const b8 = (b << 4) | b;
  return `#${r8.toString(16).padStart(2, '0')}${g8.toString(16).padStart(2, '0')}${b8.toString(16).padStart(2, '0')}`;
}

/**
 * 将 PuzzleLevelDefinition 编码为最短 URL 格式
 */
export function encodeLevelForUrl(level: PuzzleLevelDefinition, options: UrlFormatOptions = {}): string {
  const { compression = 1 } = options;

  // 自定义颜色注册表
  const customColors = new Map<string, number>();

  // 版本标识 + 压缩级别
  const header = `v${compression}`;

  // 行列数编码 (各1位)
  const sizeStr = encodeNumber(level.rows) + encodeNumber(level.cols);

  // 编码阻塞格子
  let blockedStr = '';
  if (level.blocked.length > 0) {
    blockedStr = 'b' + encodeNumber(level.blocked.length);
    for (const cell of level.blocked) {
      blockedStr += encodeNumber(cell.x) + encodeNumber(cell.y);
    }
  }

  // 编码提示格子和颜色
  let hintsStr = '';
  if (level.hintCells.length > 0) {
    const hintColorEntries = Object.entries(level.hintColors ?? {});

    hintsStr = 'h' + encodeNumber(level.hintCells.length);
    hintsStr += encodeNumber(hintColorEntries.length);

    // 提示格子坐标
    for (const cell of level.hintCells) {
      hintsStr += encodeNumber(cell.x) + encodeNumber(cell.y);
    }

    // 提示颜色映射 (格子索引 + 颜色索引)
    const cellIndexMap = new Map<string, number>();
    level.hintCells.forEach((cell, idx) => {
      cellIndexMap.set(`${cell.x},${cell.y}`, idx);
    });

    for (const [cellKey, color] of hintColorEntries) {
      const cellIdx = cellIndexMap.get(cellKey) ?? 0;
      hintsStr += encodeNumber(cellIdx) + encodeColor(color, customColors);
    }
  }

  // 编码图块
  let piecesStr = 'p' + encodeNumber(level.pieces.length);
  for (const piece of level.pieces) {
    // 图块颜色索引
    const colorChar = encodeColor(piece.color, customColors);

    // 格子数量
    const cellCount = encodeNumber(piece.cells.length);

    // 格子坐标
    let cellsStr = '';
    for (const cell of piece.cells) {
      cellsStr += encodeNumber(cell.x) + encodeNumber(cell.y);
    }

    // 数量 (统一编码，避免解码歧义)
    const count = piece.count ?? 1;
    const countStr = encodeNumber(Math.max(0, count - 1));

    piecesStr += colorChar + cellCount + cellsStr + countStr;
  }

  const fixedEntries = (level.fixedPlacements ?? [])
    .map((fixed) => {
      const colorChar = encodeColor(fixed.color, customColors);
      const rotation = encodeNumber(((fixed.rotation ?? 0) % 4 + 4) % 4);
      const anchorX = encodeNumber(fixed.anchor.x);
      const anchorY = encodeNumber(fixed.anchor.y);
      const cells = fixed.cells ?? [];
      const cellCount = encodeNumber(cells.length);
      const cellsStr = cells.map((cell) => `${encodeNumber(cell.x)}${encodeNumber(cell.y)}`).join('');
      return `${colorChar}${rotation}${anchorX}${anchorY}${cellCount}${cellsStr}`;
    })
    .filter((entry) => entry.length > 0);

  // 编码自定义颜色表
  let customColorsStr = '';
  if (customColors.size > 0) {
    customColorsStr = 'c' + encodeNumber(customColors.size);
    const sortedColors = Array.from(customColors.entries()).sort((a, b) => a[1] - b[1]);
    for (const [color] of sortedColors) {
      const rgb = encodeRgbColor(color);
      customColorsStr += encodeBase62Fixed(rgb, 3);
    }
  }

  // 编码行目标和列目标
  let targetsStr = '';
  for (const t of level.rowTargets) {
    targetsStr += encodeNumber(t);
  }
  for (const t of level.colTargets) {
    targetsStr += encodeNumber(t);
  }

  const extensionStr =
    fixedEntries.length > 0
      ? `xf${encodeNumber(fixedEntries.length)}${fixedEntries.join('')}`
      : '';

  return `${header}${sizeStr}${blockedStr}${hintsStr}${piecesStr}${customColorsStr}${targetsStr}${extensionStr}`;
}

/**
 * 将最短 URL 格式解析为 PuzzleLevelDefinition
 */
export function decodeLevelFromUrl(encoded: string): PuzzleLevelDefinition {
  const customColors = new Map<number, string>();

  if (!encoded.startsWith('v')) {
    throw new Error('Invalid URL format: missing version prefix');
  }

  let pos = 1;
  // 解析版本压缩位；当前仅用于向前兼容，暂不参与后续逻辑
  pos++;

  const rows = decodeNumber(encoded[pos] ?? '0');
  pos++;
  const cols = decodeNumber(encoded[pos] ?? '0');
  pos++;

  const blocked: GridCell[] = [];
  if (encoded[pos] === 'b') {
    pos++;
    const blockedCount = decodeNumber(encoded[pos] ?? '0');
    pos++;

    for (let i = 0; i < blockedCount; i++) {
      const x = decodeNumber(encoded[pos] ?? '0');
      pos++;
      const y = decodeNumber(encoded[pos] ?? '0');
      pos++;
      blocked.push({ x, y });
    }
  }

  const hintCells: GridCell[] = [];
  const hintColorRefs: Array<{ cellIdx: number; colorIdx: number }> = [];

  if (encoded[pos] === 'h') {
    pos++;
    const hintCount = decodeNumber(encoded[pos] ?? '0');
    pos++;
    const colorCount = decodeNumber(encoded[pos] ?? '0');
    pos++;

    for (let i = 0; i < hintCount; i++) {
      const x = decodeNumber(encoded[pos] ?? '0');
      pos++;
      const y = decodeNumber(encoded[pos] ?? '0');
      pos++;
      hintCells.push({ x, y });
    }

    for (let i = 0; i < colorCount; i++) {
      const cellIdx = decodeNumber(encoded[pos] ?? '0');
      pos++;
      const colorChar = encoded[pos] ?? '0';
      pos++;

      if (cellIdx < hintCells.length) {
        hintColorRefs.push({
          cellIdx,
          colorIdx: colorIndexFromChar(colorChar),
        });
      }
    }
  }

  const piecesRaw: Array<{ cells: GridCell[]; colorIdx: number; count: number }> = [];

  if (encoded[pos] === 'p') {
    pos++;
    const pieceCount = decodeNumber(encoded[pos] ?? '0');
    pos++;

    for (let i = 0; i < pieceCount; i++) {
      const colorChar = encoded[pos] ?? '0';
      pos++;

      const cellCount = decodeNumber(encoded[pos] ?? '0');
      pos++;

      const cells: GridCell[] = [];
      for (let j = 0; j < cellCount; j++) {
        const x = decodeNumber(encoded[pos] ?? '0');
        pos++;
        const y = decodeNumber(encoded[pos] ?? '0');
        pos++;
        cells.push({ x, y });
      }

      const countChar = encoded[pos];
      const count = countChar ? decodeNumber(countChar) + 1 : 1;
      if (countChar) pos++;

      piecesRaw.push({
        colorIdx: colorIndexFromChar(colorChar),
        cells,
        count,
      });
    }
  }

  if (encoded[pos] === 'c') {
    pos++;
    const colorCount = decodeNumber(encoded[pos] ?? '0');
    pos++;

    for (let i = 0; i < colorCount; i++) {
      const chunk = (encoded.slice(pos, pos + 3) + '000').slice(0, 3);
      const compressed = decodeBase62(chunk);
      pos += 3;
      const color = decodeRgbColor(compressed);
      const idx = PREDEFINED_COLOR_COUNT + i;
      customColors.set(idx, color);
    }
  }

  const rowTargets: number[] = [];
  const colTargets: number[] = [];

  for (let i = 0; i < rows; i++) {
    rowTargets.push(decodeNumber(encoded[pos] ?? '0'));
    pos++;
  }

  for (let i = 0; i < cols; i++) {
    colTargets.push(decodeNumber(encoded[pos] ?? '0'));
    pos++;
  }

  const fixedPlacements: NonNullable<PuzzleLevelDefinition['fixedPlacements']> = [];
  if (encoded[pos] === 'x') {
    pos++;
    while (pos < encoded.length) {
      const section = encoded[pos] ?? '';
      pos++;
      if (section !== 'f') break;
      const fixedCount = decodeNumber(encoded[pos] ?? '0');
      pos++;
      for (let i = 0; i < fixedCount; i++) {
        const colorIdx = colorIndexFromChar(encoded[pos] ?? '0');
        pos++;
        const rotation = decodeNumber(encoded[pos] ?? '0') % 4;
        pos++;
        const anchorX = decodeNumber(encoded[pos] ?? '0');
        pos++;
        const anchorY = decodeNumber(encoded[pos] ?? '0');
        pos++;
        const cellCount = decodeNumber(encoded[pos] ?? '0');
        pos++;
        const cells: GridCell[] = [];
        for (let j = 0; j < cellCount; j++) {
          const x = decodeNumber(encoded[pos] ?? '0');
          pos++;
          const y = decodeNumber(encoded[pos] ?? '0');
          pos++;
          cells.push({ x, y });
        }
        fixedPlacements.push({
          id: `fx-${i + 1}`,
          color: decodeColorFromIndex(colorIdx, customColors),
          anchor: { x: anchorX, y: anchorY },
          rotation,
          cells,
        });
      }
    }
  }

  const hintColors: Record<string, string> = {};
  for (const entry of hintColorRefs) {
    const cell = hintCells[entry.cellIdx];
    if (!cell) continue;
    hintColors[`${cell.x},${cell.y}`] = decodeColorFromIndex(entry.colorIdx, customColors);
  }

  const pieces: PuzzlePieceDefinition[] = piecesRaw.map((piece, i) => ({
    id: `p-${String.fromCharCode(0x61 + i)}`,
    name: `Piece ${String.fromCharCode(0x41 + i)}`,
    color: decodeColorFromIndex(piece.colorIdx, customColors),
    cells: piece.cells,
    count: piece.count,
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

/**
 * 获取默认压缩等级 (1或2)
 */
export function getDefaultCompression(): 1 | 2 {
  try {
    const hash = window.location.hash.slice(1);
    if (hash === '2') return 2;
    if (hash === '1') return 1;
  } catch {
    return 1;
  }
  return 1;
}
