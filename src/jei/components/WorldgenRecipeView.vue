<template>
  <div class="worldgen-view">
    <div v-if="outputSlotIds.length" class="worldgen-view__outputs">
      <q-card flat bordered class="worldgen-view__outputs-card">
        <div class="worldgen-view__outputs-title">产出</div>
        <div class="worldgen-view__outputs-list">
          <div v-for="slotId in outputSlotIds" :key="slotId" class="worldgen-view__output">
            <stack-view
              :content="recipe.slotContents[slotId]"
              :item-defs-by-key-hash="itemDefsByKeyHash"
              variant="slot"
              :show-name="settingsStore.recipeSlotShowName"
              @item-click="emit('item-click', $event)"
              @item-mouseenter="emit('item-mouseenter', $event)"
              @item-mouseleave="emit('item-mouseleave')"
            />
          </div>
        </div>
      </q-card>
    </div>

    <q-card flat bordered class="worldgen-view__params">
      <div class="worldgen-view__params-title">世界生成参数</div>
      <recipe-params-view :recipe="recipe" :recipe-type="recipeType" />
      <div v-if="extraParamsText" class="worldgen-view__extra">
        <div class="worldgen-view__extra-title">其他</div>
        <pre class="worldgen-view__extra-pre">{{ extraParamsText }}</pre>
      </div>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ItemDef, ItemKey, Recipe, RecipeTypeDef } from 'src/jei/types';
import { useSettingsStore } from 'src/stores/settings';
import StackView from './StackView.vue';
import RecipeParamsView from './RecipeParamsView.vue';

const props = defineProps<{
  recipe: Recipe;
  recipeType: RecipeTypeDef;
  itemDefsByKeyHash: Record<string, ItemDef>;
}>();

const emit = defineEmits<{
  (e: 'item-click', itemKey: ItemKey): void;
  (e: 'item-mouseenter', keyHash: string): void;
  (e: 'item-mouseleave'): void;
}>();

const settingsStore = useSettingsStore();

const outputSlotIds = computed(() => {
  const defs = props.recipeType.slots ?? [];
  const ids = defs.filter((d) => d.io === 'output').map((d) => d.slotId);
  if (ids.length) return ids;
  return Object.keys(props.recipe.slotContents);
});

const extraParamsText = computed(() => {
  const params = props.recipe.params ?? {};
  const schemaKeys = new Set(Object.keys(props.recipeType.paramSchema ?? {}));
  const extra: Record<string, unknown> = {};
  Object.keys(params).forEach((k) => {
    if (!schemaKeys.has(k)) extra[k] = params[k];
  });
  const keys = Object.keys(extra);
  if (!keys.length) return '';
  return JSON.stringify(extra, null, 2);
});
</script>

<style scoped>
.worldgen-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.worldgen-view__outputs-card,
.worldgen-view__params {
  padding: 12px;
}

.worldgen-view__outputs-title,
.worldgen-view__params-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}

.worldgen-view__outputs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.worldgen-view__extra {
  margin-top: 10px;
}

.worldgen-view__extra-title {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 6px;
}

.worldgen-view__extra-pre {
  margin: 0;
  padding: 10px;
  border-radius: 6px;
  background: #f5f5f5;
  overflow: auto;
  font-size: 12px;
}
</style>
