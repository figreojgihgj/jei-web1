<template>
  <span :class="textClasses" :style="textStyle">{{ element.text.text }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import type { TextInline } from '../../../types/wiki';
import { COLOR_MAP, DARK_COLOR_MAP } from '../../../types/wiki';

const props = defineProps<{
  element: TextInline;
}>();
const $q = useQuasar();

type RgbColor = [number, number, number];
const DARK_BG: RgbColor = [18, 18, 18];
const LIGHT_BG: RgbColor = [255, 255, 255];
const DARK_TEXT_FALLBACK: RgbColor = [230, 230, 230];
const LIGHT_TEXT_FALLBACK: RgbColor = [31, 31, 31];
const DEFAULT_PRIMARY: RgbColor = [25, 118, 210];
const MIN_CONTRAST_RATIO = 4.5;
const PRIMARY_DISTANCE_THRESHOLD = 42;

const textClasses = computed(() => ({
  'text-bold': props.element.bold,
  'text-italic': props.element.italic,
  'text-underline': props.element.underline,
  'text-strikethrough': props.element.strikethrough,
  'text-code': props.element.code,
}));

const textStyle = computed(() => {
  const style: Record<string, string> = {};

  if (props.element.color) {
    const isDark = $q.dark.isActive;
    const resolved = resolveRawColor(props.element.color, isDark);
    const parsed = parseColor(resolved);

    if (!parsed) {
      style.color = resolved;
      return style;
    }

    const background = isDark ? DARK_BG : LIGHT_BG;
    const themePrimary = getThemePrimaryColor();
    const contrastSafe = ensureReadableColor(parsed, background, isDark);
    const primarySafe = avoidPrimaryConflict(contrastSafe, themePrimary, background, isDark);

    style.color = toRgbString(primarySafe);
  }

  return style;
});

function resolveRawColor(color: string, isDark: boolean): string {
  if (isDark && DARK_COLOR_MAP[color]) {
    return DARK_COLOR_MAP[color];
  }
  return COLOR_MAP[color] || color;
}

function parseColor(input: string): RgbColor | null {
  const color = input.trim().toLowerCase();
  if (!color) return null;

  if (color === 'black') return [0, 0, 0];
  if (color === 'white') return [255, 255, 255];

  const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (!hex) return null;
    if (hex.length === 3) {
      const r = Number.parseInt(hex.charAt(0).repeat(2), 16);
      const g = Number.parseInt(hex.charAt(1).repeat(2), 16);
      const b = Number.parseInt(hex.charAt(2).repeat(2), 16);
      return [r, g, b];
    }
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return [r, g, b];
  }

  const rgbMatch = color.match(
    /^rgba?\(\s*([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)/,
  );
  if (rgbMatch) {
    const r = clampRgb(rgbMatch[1] ?? '0');
    const g = clampRgb(rgbMatch[2] ?? '0');
    const b = clampRgb(rgbMatch[3] ?? '0');
    return [r, g, b];
  }

  return null;
}

function clampRgb(value: string): number {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(255, Math.max(0, Math.round(number)));
}

function toRgbString([r, g, b]: RgbColor): string {
  return `rgb(${r}, ${g}, ${b})`;
}

function ensureReadableColor(color: RgbColor, background: RgbColor, isDark: boolean): RgbColor {
  if (getContrastRatio(color, background) >= MIN_CONTRAST_RATIO) {
    return color;
  }
  return isDark ? DARK_TEXT_FALLBACK : LIGHT_TEXT_FALLBACK;
}

function avoidPrimaryConflict(
  color: RgbColor,
  primary: RgbColor,
  background: RgbColor,
  isDark: boolean,
): RgbColor {
  if (getColorDistance(color, primary) >= PRIMARY_DISTANCE_THRESHOLD) {
    return color;
  }

  const [h, s, l] = rgbToHsl(color);
  const shiftedHue = normalizeHue(h + (isDark ? 32 : -28));
  const adjusted = hslToRgb(
    shiftedHue,
    Math.max(s, 0.25),
    isDark ? Math.max(l, 0.62) : Math.min(l, 0.42),
  );

  if (getColorDistance(adjusted, primary) < PRIMARY_DISTANCE_THRESHOLD) {
    return isDark ? DARK_TEXT_FALLBACK : LIGHT_TEXT_FALLBACK;
  }

  if (getContrastRatio(adjusted, background) < MIN_CONTRAST_RATIO) {
    return isDark ? DARK_TEXT_FALLBACK : LIGHT_TEXT_FALLBACK;
  }

  return adjusted;
}

function getThemePrimaryColor(): RgbColor {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_PRIMARY;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--q-primary').trim();
  return parseColor(raw) || DEFAULT_PRIMARY;
}

function getColorDistance([r1, g1, b1]: RgbColor, [r2, g2, b2]: RgbColor): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getContrastRatio(foreground: RgbColor, background: RgbColor): number {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance([r, g, b]: RgbColor): number {
  const normalize = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
}

function rgbToHsl([r, g, b]: RgbColor): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === rn) hue = ((gn - bn) / delta) % 6;
    else if (max === gn) hue = (bn - rn) / delta + 2;
    else hue = (rn - gn) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return [hue, saturation, lightness];
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - chroma / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (h < 60) {
    r1 = chroma;
    g1 = x;
  } else if (h < 120) {
    r1 = x;
    g1 = chroma;
  } else if (h < 180) {
    g1 = chroma;
    b1 = x;
  } else if (h < 240) {
    g1 = x;
    b1 = chroma;
  } else if (h < 300) {
    r1 = x;
    b1 = chroma;
  } else {
    r1 = chroma;
    b1 = x;
  }

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

function normalizeHue(hue: number): number {
  let normalized = hue % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}
</script>

<style scoped lang="scss">
.text-bold {
  font-weight: bold;
}

.text-italic {
  font-style: italic;
}

.text-underline {
  text-decoration: underline;
}

.text-strikethrough {
  text-decoration: line-through;
}

.text-code {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}
</style>
