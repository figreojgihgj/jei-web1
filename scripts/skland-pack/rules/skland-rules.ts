export const TYPE_PREFIX = {
  industrial: 'industrial',
  simple: 'simple',
  source: 'wiki/source',
  usage: 'wiki/usage',
} as const;

export const PLANNER_PRIORITY = {
  machine: 600,
  simple: 500,
  sourceFallback: -500,
  usageFallback: -550,
} as const;

export const HEADER_RULES = {
  machineHeaders: ['合成设备', '制作设备', '制造设备'],
  simpleTypeHeaders: ['制作类型'],
  inputHeaders: ['原料需求', '需求原料'],
  outputHeaders: ['合成产物', '制作产物'],
  timeHeaders: ['消耗时长', '耗时', '时长', '时间'],
} as const;

export const SOURCE_KEYWORDS = [
  '来源',
  '获取',
  '掉落',
  '采集',
  '获得',
  '配方来源',
  '蓝图来源',
  '设备来源',
  '所属区域',
  '野外采集',
  '收集奖励',
  '任务奖励',
] as const;

export const SOURCE_PATTERN_DISPLAY_NAMES = {
  table_entry: '来源/表格(条目)',
  table_text: '来源/表格(文本)',
  list_entry: '来源/列表(条目)',
  list_text: '来源/列表(文本)',
  text_entry: '来源/文本(条目)',
  text_only: '来源/文本',
} as const;

export const SOURCE_PATTERN_PLANNER_PRIORITY = {
  table_entry: -120,
  list_entry: -140,
  text_entry: -160,
  table_text: -220,
  list_text: -260,
  text_only: -320,
} as const;

export const USAGE_KEYWORDS = [
  '用途',
  '使用',
  '消耗',
  '作用',
  '相关用途',
  '物品用途',
  '使用方式',
  '相关信息',
  '面积需求',
  '任务规则',
] as const;

export const USAGE_EXCLUDE_WIDGET_TITLES = ['相关配方', '工业合成', '简易制作'] as const;

export const USAGE_PATTERN_DISPLAY_NAMES = {
  table_entry: '用途/表格(条目)',
  table_text: '用途/表格(文本)',
  list_entry: '用途/列表(条目)',
  list_text: '用途/列表(文本)',
  text_entry: '用途/文本(条目)',
  text_only: '用途/文本',
} as const;

export const USAGE_PATTERN_PLANNER_PRIORITY = {
  table_entry: -340,
  list_entry: -360,
  text_entry: -380,
  table_text: -420,
  list_text: -460,
  text_only: -520,
} as const;

export function includesAny(value: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => value.includes(kw));
}

export function headerIncludesAny(header: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => header.includes(kw));
}

export type SourcePattern = keyof typeof SOURCE_PATTERN_DISPLAY_NAMES;
export type UsagePattern = keyof typeof USAGE_PATTERN_DISPLAY_NAMES;
