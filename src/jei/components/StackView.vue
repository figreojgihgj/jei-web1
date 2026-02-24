<template>
  <div
    ref="stackViewEl"
    class="stack-view"
    :class="{
      'stack-view--clickable': clickable,
      'stack-view--slot': props.variant === 'slot',
    }"
    @click="onClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @contextmenu.prevent="onContextMenu"
    v-touch-hold:600="onTouchHold"
  >
    <div class="stack-view__main">
      <q-img
        v-if="showIconSrc"
        :src="iconSrc"
        :ratio="1"
        fit="contain"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        class="stack-view__icon"
      />
      <div
        v-else-if="showIconSprite"
        class="stack-view__icon stack-view__icon-sprite"
        :style="spriteWrapperStyle"
      >
        <div class="stack-view__icon-sprite-image" :style="spriteImageStyle"></div>
      </div>
      <div
        v-else-if="showIconPlaceholder"
        class="stack-view__icon stack-view__icon-placeholder"
      ></div>
      <q-icon v-else :name="fallbackIcon" size="22px" class="stack-view__icon-fallback" />
      <div class="stack-view__text">
        <div v-if="props.showName" class="stack-view__name">{{ displayName }}</div>
        <div v-if="props.showSubtitle" class="stack-view__subline">
          <span v-if="rarityLabel" class="stack-view__rarity" :style="rarityStyle">
            {{ rarityLabel }}
          </span>
          <span v-if="subtitle" class="stack-view__sub">{{ subtitle }}</span>
          <span
            v-if="!rarityLabel && !subtitle"
            class="stack-view__sub stack-view__sub-placeholder"
          >
            -
          </span>
        </div>
      </div>
    </div>
    <q-badge v-if="badgeText" color="primary" class="stack-view__badge">{{ badgeText }}</q-badge>
    <q-tooltip v-if="tooltipEnabled" ref="tooltipRef" max-width="420px">
      <div class="stack-tooltip">
        <div class="stack-tooltip__title">{{ tooltipTitle }}</div>
        <div class="stack-tooltip__line">{{ tooltipIdLine }}</div>
        <div v-if="tooltipMetaLine" class="stack-tooltip__line">{{ tooltipMetaLine }}</div>
        <div v-if="tooltipNbtLine" class="stack-tooltip__line">{{ tooltipNbtLine }}</div>
        <div v-if="tooltipTagsLine" class="stack-tooltip__line">{{ tooltipTagsLine }}</div>
        <div v-if="tooltipRarityLine" class="stack-tooltip__line">{{ tooltipRarityLine }}</div>
        <div v-if="tooltipSourceLine" class="stack-tooltip__line">{{ tooltipSourceLine }}</div>
        <div v-if="tooltipDescription" class="stack-tooltip__desc">{{ tooltipDescription }}</div>
        <div class="stack-tooltip__ns">{{ tooltipNamespace }}</div>
      </div>
    </q-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { ItemDef, ItemKey, SlotContent, Stack } from 'src/jei/types';
import { itemKeyHash } from 'src/jei/indexing/key';
import { isProxyImageUrl, useCachedImageUrl, useRuntimeImageUrl } from 'src/jei/pack/runtimeImage';

const props = withDefaults(
  defineProps<{
    content: SlotContent | undefined;
    itemDefsByKeyHash: Record<string, ItemDef>;
    variant?: 'list' | 'slot';
    showName?: boolean;
    showSubtitle?: boolean;
    showAmount?: boolean;
    lazyVisual?: boolean;
  }>(),
  {
    variant: 'list',
    showName: true,
    showSubtitle: true,
    showAmount: true,
    lazyVisual: false,
  },
);

const emit = defineEmits<{
  (e: 'item-click', itemKey: ItemKey): void;
  (e: 'item-mouseenter', keyHash: string): void;
  (e: 'item-mouseleave'): void;
  (e: 'item-context-menu', evt: Event, keyHash: string): void;
  (e: 'item-touch-hold', evt: unknown, keyHash: string): void;
}>();

const stacks = computed<Stack[]>(() => {
  if (!props.content) return [];
  return Array.isArray(props.content) ? props.content : [props.content];
});

const stack = computed<Stack | undefined>(() => stacks.value[0]);

const clickable = computed(() => stack.value?.kind === 'item');

const badgeText = computed(() => {
  if (stacks.value.length > 1) return `+${stacks.value.length - 1}`;
  return '';
});

const iconSrcRaw = computed(() => {
  const s = stack.value;
  if (!s || s.kind !== 'item') return '';
  const def = props.itemDefsByKeyHash[stackItemKeyHash(s)];
  return def?.icon ?? '';
});
const iconSrc = useCachedImageUrl(useRuntimeImageUrl(iconSrcRaw));

const iconSprite = computed(() => {
  const s = stack.value;
  if (!s || s.kind !== 'item') return undefined;
  const def = props.itemDefsByKeyHash[stackItemKeyHash(s)];
  return def?.iconSprite;
});
const iconSpriteUrlRaw = computed(() => iconSprite.value?.url ?? '');
const iconSpriteUrl = useCachedImageUrl(useRuntimeImageUrl(iconSpriteUrlRaw));

const itemDef = computed<ItemDef | undefined>(() => {
  const s = stack.value;
  if (!s || s.kind !== 'item') return undefined;
  return props.itemDefsByKeyHash[stackItemKeyHash(s)];
});

const rarity = computed(() => itemDef.value?.rarity);
const rarityColor = computed(() => rarity.value?.color || '');
const rarityLabel = computed(() => {
  const stars = rarity.value?.stars;
  if (!stars) return '';
  return `${stars}★`;
});

const rarityStyle = computed(() => {
  const color = rarityColor.value;
  if (!color) return {};
  return { color };
});

const stackViewEl = ref<HTMLElement | null>(null);
const tooltipRef = ref<{ hide?: () => void } | null>(null);
const shouldRenderVisual = ref(!props.lazyVisual);

const hasImageVisual = computed(() => !!iconSrc.value || !!iconSprite.value);
const showIconSrc = computed(() => shouldRenderVisual.value && !!iconSrc.value);
const showIconSprite = computed(
  () =>
    shouldRenderVisual.value &&
    !iconSrc.value &&
    !!iconSprite.value &&
    (!!iconSpriteUrl.value || !isProxyImageUrl(iconSprite.value.url)),
);
const showIconPlaceholder = computed(
  () =>
    (props.lazyVisual && hasImageVisual.value && !shouldRenderVisual.value) ||
    (shouldRenderVisual.value &&
      ((!!iconSrcRaw.value && !iconSrc.value) ||
        (!!iconSprite.value && !iconSpriteUrl.value && isProxyImageUrl(iconSprite.value.url)))),
);

let visibilityObserver: IntersectionObserver | null = null;

function stopVisualObserver() {
  if (!visibilityObserver) return;
  visibilityObserver.disconnect();
  visibilityObserver = null;
}

function enableVisualRender() {
  if (shouldRenderVisual.value) return;
  shouldRenderVisual.value = true;
  stopVisualObserver();
}

function setupVisualObserver() {
  stopVisualObserver();
  if (!props.lazyVisual || shouldRenderVisual.value || !hasImageVisual.value) return;
  const target = stackViewEl.value;
  if (!target) return;
  if (typeof IntersectionObserver === 'undefined') {
    enableVisualRender();
    return;
  }
  visibilityObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0);
      if (visible) enableVisualRender();
    },
    { rootMargin: '200px' },
  );
  visibilityObserver.observe(target);
}

watch(
  () => props.lazyVisual,
  (lazyVisual) => {
    if (!lazyVisual) {
      shouldRenderVisual.value = true;
      stopVisualObserver();
      return;
    }
    if (!hasImageVisual.value) return;
    if (!shouldRenderVisual.value) setupVisualObserver();
  },
  { immediate: true },
);

watch(
  hasImageVisual,
  (hasVisual) => {
    if (!props.lazyVisual) return;
    if (!hasVisual) return;
    if (!shouldRenderVisual.value) setupVisualObserver();
  },
  { immediate: true },
);

onMounted(() => {
  setupVisualObserver();
});

onUnmounted(() => {
  stopVisualObserver();
});

const spriteWrapperStyle = computed(() => {
  const sprite = iconSprite.value;
  if (!sprite) return {};
  return {
    backgroundColor: sprite.color ?? 'transparent',
  };
});

const spriteImageStyle = computed(() => {
  const sprite = iconSprite.value;
  if (!sprite) return {};
  const size = sprite.size ?? 64;
  const scale = 28 / size;
  const spriteImageUrl = iconSpriteUrl.value || (isProxyImageUrl(sprite.url) ? '' : sprite.url);
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: spriteImageUrl ? `url(${spriteImageUrl})` : 'none',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: sprite.position,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  };
});

const displayName = computed(() => {
  const s = stack.value;
  if (!s) return '';
  if (s.kind === 'item') {
    const def = props.itemDefsByKeyHash[stackItemKeyHash(s)];
    return def?.name ?? s.id;
  }
  if (s.kind === 'fluid') return s.id;
  return s.id;
});

const subtitle = computed(() => {
  if (!props.showAmount) return '';
  const s = stack.value;
  if (!s) return '';
  const unit = s.unit ?? (s.kind === 'fluid' ? 'mB' : '');
  const amountText = unit ? `${s.amount}${unit}` : `${s.amount}`;
  if (s.kind === 'tag') return `${amountText} · tag`;
  if (s.kind === 'fluid') return `${amountText} · fluid`;
  return amountText;
});

const fallbackIcon = computed(() => {
  const s = stack.value;
  if (!s) return 'help';
  if (s.kind === 'fluid') return 'water_drop';
  if (s.kind === 'tag') return 'sell';
  return 'inventory_2';
});

const tooltipEnabled = computed(() => !!stack.value);

const tooltipTitle = computed(() => displayName.value);

const tooltipIdLine = computed(() => {
  const s = stack.value;
  if (!s) return '';
  if (s.kind === 'item') return `id: ${s.id}`;
  if (s.kind === 'fluid') return `fluid: ${s.id}`;
  return `tag: ${s.id}`;
});

const tooltipMetaLine = computed(() => {
  const s = stack.value;
  if (!s || s.kind !== 'item') return '';
  if (s.meta === undefined) return '';
  return `meta: ${String(s.meta)}`;
});

function nbtToInlineText(nbt: unknown) {
  try {
    const text = JSON.stringify(nbt);
    if (!text) return '';
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  } catch {
    return '[unserializable]';
  }
}

const tooltipNbtLine = computed(() => {
  const s = stack.value;
  if (!s || s.kind !== 'item') return '';
  if (s.nbt === undefined) return '';
  const text = nbtToInlineText(s.nbt);
  return text ? `nbt: ${text}` : '';
});

const tooltipTagsLine = computed(() => {
  const s = stack.value;
  if (!s || s.kind !== 'item') return '';
  const def = props.itemDefsByKeyHash[stackItemKeyHash(s)];
  const tags = def?.tags ?? [];
  if (!tags.length) return '';
  const shown = tags.slice(0, 8);
  const more = tags.length > shown.length ? ` …(+${tags.length - shown.length})` : '';
  return `tags: ${shown.join(', ')}${more}`;
});

const tooltipRarityLine = computed(() => {
  const r = rarity.value;
  if (!r?.stars) return '';
  const colorText = r.color ? ` (${r.color})` : '';
  return `rarity: ${r.stars}★${colorText}`;
});

const tooltipSourceLine = computed(() => {
  const s = stack.value;
  if (!s || s.kind !== 'item') return '';
  const def = props.itemDefsByKeyHash[stackItemKeyHash(s)];
  return def?.source ? `source: ${def.source}` : '';
});

const tooltipDescription = computed(() => {
  const s = stack.value;
  if (!s || s.kind !== 'item') return '';
  const def = props.itemDefsByKeyHash[stackItemKeyHash(s)];
  return def?.description ?? '';
});

function namespaceOf(id: string) {
  if (id.includes(':')) return id.split(':')[0] || '';
  if (id.includes('.')) return id.split('.')[0] || '';
  return '';
}

const tooltipNamespace = computed(() => {
  const s = stack.value;
  if (!s) return '';
  const id = s.id;
  const ns = namespaceOf(id);
  return ns ? `namespace: ${ns}` : 'namespace: (none)';
});

function stackItemKeyHash(s: { id: string; meta?: number | string; nbt?: unknown }): string {
  const key: ItemKey = { id: s.id };
  if (s.meta !== undefined) key.meta = s.meta;
  if (s.nbt !== undefined) key.nbt = s.nbt;
  return itemKeyHash(key);
}

function onClick() {
  const s = stack.value;
  if (!s || s.kind !== 'item') return;
  const key: ItemKey = { id: s.id };
  if (s.meta !== undefined) key.meta = s.meta;
  if (s.nbt !== undefined) key.nbt = s.nbt;
  emit('item-click', key);
}

function onMouseEnter() {
  const s = stack.value;
  if (!s || s.kind !== 'item') return;
  const keyHash = stackItemKeyHash(s);
  emit('item-mouseenter', keyHash);
}

function onMouseLeave() {
  emit('item-mouseleave');
}

function onContextMenu(evt: Event) {
  tooltipRef.value?.hide?.();
  const s = stack.value;
  if (!s || s.kind !== 'item') return;
  const keyHash = stackItemKeyHash(s);
  emit('item-context-menu', evt, keyHash);
}

function onTouchHold(evt: unknown) {
  tooltipRef.value?.hide?.();
  const s = stack.value;
  if (!s || s.kind !== 'item') return;
  const keyHash = stackItemKeyHash(s);
  emit('item-touch-hold', evt, keyHash);
}
</script>

<style scoped>
.stack-view {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  position: relative;
}

.stack-view--clickable {
  cursor: pointer;
}

.stack-view--clickable:hover .stack-view__name {
  text-decoration: underline;
}

.stack-view__main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
}

.stack-view__icon {
  width: 28px;
  height: 28px;
  border-radius: 4px;
}

.stack-view__icon-placeholder {
  background: rgba(0, 0, 0, 0.08);
}

.stack-view__icon-sprite {
  overflow: hidden;
}

.stack-view__icon-sprite-image {
  border-radius: 0;
}

.stack-view__icon-fallback {
  width: 28px;
  height: 28px;
}

.stack-view__text {
  min-width: 0;
  flex: 1 1 auto;
}

.stack-view__name {
  font-size: 12px;
  line-height: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

.stack-view__sub {
  font-size: 11px;
  opacity: 0.7;
  line-height: 13px;
}

.stack-view__subline {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-height: 13px;
}

.stack-view__rarity {
  font-size: 10px;
  line-height: 12px;
  font-weight: 600;
}

.stack-view__sub-placeholder {
  visibility: hidden;
}

.stack-view__badge {
  flex: 0 0 auto;
}

.stack-view--slot {
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.stack-view--slot .stack-view__main {
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.stack-view--slot .stack-view__text {
  text-align: center;
}

.stack-view--slot .stack-view__name {
  max-width: 92px;
  white-space: normal;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 13px;
}

.stack-view--slot .stack-view__sub {
  font-size: 10px;
  line-height: 12px;
  opacity: 0.7;
}

.stack-view--slot .stack-view__subline {
  justify-content: center;
  min-height: 12px;
}

.stack-view--slot .stack-view__rarity {
  font-size: 10px;
  line-height: 12px;
}

.stack-view--slot .stack-view__badge {
  position: absolute;
  top: -6px;
  right: -6px;
}

.stack-tooltip {
  max-width: 420px;
}

.stack-tooltip__title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.stack-tooltip__line {
  font-size: 12px;
  opacity: 0.9;
  line-height: 1.35;
}

.stack-tooltip__desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.95;
  white-space: pre-wrap;
}

.stack-tooltip__ns {
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.7;
}
</style>
