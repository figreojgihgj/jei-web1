<template>
  <worldgen-recipe-view
    v-if="recipeType.renderer === 'worldgen_panel'"
    :recipe="recipe"
    :recipe-type="recipeType"
    :item-defs-by-key-hash="itemDefsByKeyHash"
    @item-click="emit('item-click', $event)"
  />
  <slot-layout-recipe-view
    v-else
    :recipe="recipe"
    :recipe-type="recipeType"
    :item-defs-by-key-hash="itemDefsByKeyHash"
    @item-click="emit('item-click', $event)"
    @item-mouseenter="emit('item-mouseenter', $event)"
    @item-mouseleave="emit('item-mouseleave')"
  />
</template>

<script setup lang="ts">
import type { ItemDef, ItemKey, Recipe, RecipeTypeDef } from 'src/jei/types';
import SlotLayoutRecipeView from './SlotLayoutRecipeView.vue';
import WorldgenRecipeView from './WorldgenRecipeView.vue';

const emit = defineEmits<{
  (e: 'item-click', itemKey: ItemKey): void;
  (e: 'item-mouseenter', keyHash: string): void;
  (e: 'item-mouseleave'): void;
}>();

defineProps<{
  recipe: Recipe;
  recipeType: RecipeTypeDef;
  itemDefsByKeyHash: Record<string, ItemDef>;
}>();
</script>
