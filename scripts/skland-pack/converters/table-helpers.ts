import { parseDurationSeconds } from '../helpers.ts';
import type { RecipeStack, EntryRef, CellData } from './types.ts';
import { normalizeHeaderLabel } from './wiki-parse.ts';
import type { ConverterContext } from './context.ts';

export function findColumnIndexes(
  headers: string[],
  matcher: (header: string) => boolean,
): number[] {
  const out: number[] = [];
  headers.forEach((header, idx) => {
    if (matcher(normalizeHeaderLabel(header))) out.push(idx);
  });
  return out;
}

export function firstColumnIndex(headers: string[], matcher: (header: string) => boolean): number {
  return findColumnIndexes(headers, matcher)[0] ?? -1;
}

function compactStacks(stacks: RecipeStack[]): RecipeStack[] {
  const map = new Map<string, RecipeStack>();
  for (const stack of stacks) {
    const existing = map.get(stack.id);
    if (existing) {
      existing.amount += stack.amount;
    } else {
      map.set(stack.id, { ...stack });
    }
  }
  return Array.from(map.values());
}

function stackFromEntry(
  ctx: ConverterContext,
  entry: EntryRef,
  options: { allowZeroCount: boolean },
): RecipeStack | null {
  if (!options.allowZeroCount && entry.count <= 0) return null;
  const amount = entry.count > 0 ? entry.count : 1;
  const nameHint = ctx.getItemNameByWikiId(entry.id);
  const stack = ctx.createStackFromEntry({ id: entry.id, count: amount }, nameHint);
  return stack;
}

export function collectStacksFromColumns(
  ctx: ConverterContext,
  row: CellData[],
  indexes: number[],
  options: { allowZeroCount: boolean },
): RecipeStack[] {
  const stacks: RecipeStack[] = [];
  for (const idx of indexes) {
    const cell = row[idx];
    if (!cell) continue;
    for (const entry of cell.entries) {
      const stack = stackFromEntry(ctx, entry, options);
      if (stack) stacks.push(stack);
    }
  }
  return compactStacks(stacks);
}

export function parseDurationFromColumns(
  row: CellData[],
  indexes: number[],
): { time?: number; timeText?: string } {
  for (const idx of indexes) {
    const cell = row[idx];
    if (!cell) continue;
    const text = cell.text.trim();
    if (!text) continue;
    const time = parseDurationSeconds(text);
    if (time != null) return { time };
    return { timeText: text };
  }
  return {};
}
