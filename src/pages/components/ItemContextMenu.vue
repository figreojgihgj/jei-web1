<template>
  <q-menu
    v-if="target"
    ref="menuRef"
    :model-value="open"
    @update:model-value="$emit('update:open', $event)"
    :target="target"
    @hide="$emit('hide')"
    content-style="z-index: 9999"
  >
    <q-list dense style="min-width: 150px">
      <q-item clickable v-close-popup @click="$emit('action', 'recipes')">
        <q-item-section avatar>
          <q-icon name="handyman" size="xs" />
        </q-item-section>
        <q-item-section>Recipes (R)</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('action', 'uses')">
        <q-item-section avatar>
          <q-icon name="input" size="xs" />
        </q-item-section>
        <q-item-section>Uses (U)</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('action', 'wiki')">
        <q-item-section avatar>
          <q-icon name="menu_book" size="xs" />
        </q-item-section>
        <q-item-section>Wiki (W)</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('action', 'planner')">
        <q-item-section avatar>
          <q-icon name="calculate" size="xs" />
        </q-item-section>
        <q-item-section>Planner (P)</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="$emit('action', 'fav')">
        <q-item-section avatar>
          <q-icon
            :name="isFavorite ? 'star' : 'star_outline'"
            :color="isFavorite ? 'amber' : undefined"
            size="xs"
          />
        </q-item-section>
        <q-item-section>收藏 (A)</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  open: boolean;
  // Accept null/undefined explicitly to match callers that pass null or undefined
  target?: HTMLElement | null | undefined;
  isFavorite: boolean;
}>();

defineEmits<{
  'update:open': [value: boolean];
  hide: [];
  action: [action: 'recipes' | 'uses' | 'wiki' | 'planner' | 'fav'];
}>();

const menuRef = ref();

defineExpose({
  show() {
    menuRef.value?.show();
  },
});
</script>
