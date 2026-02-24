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
        <q-item-section>{{ recipesLabel }}</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('action', 'uses')">
        <q-item-section avatar>
          <q-icon name="input" size="xs" />
        </q-item-section>
        <q-item-section>{{ usesLabel }}</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('action', 'wiki')">
        <q-item-section avatar>
          <q-icon name="menu_book" size="xs" />
        </q-item-section>
        <q-item-section>{{ wikiLabel }}</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('action', 'icon')">
        <q-item-section avatar>
          <q-icon name="image" size="xs" />
        </q-item-section>
        <q-item-section>{{ iconLabel }}</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('action', 'planner')">
        <q-item-section avatar>
          <q-icon name="calculate" size="xs" />
        </q-item-section>
        <q-item-section>{{ plannerLabel }}</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="$emit('action', 'advanced')">
        <q-item-section avatar>
          <q-icon name="add_chart" size="xs" color="primary" />
        </q-item-section>
        <q-item-section>{{ addToAdvancedLabel }}</q-item-section>
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
        <q-item-section>{{ isFavorite ? unfavoriteLabel : favoriteLabel }}</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  useKeyBindingsStore,
  keyBindingToString,
  type KeyAction,
} from 'src/stores/keybindings';

const { t } = useI18n();
const keyBindingsStore = useKeyBindingsStore();

defineProps<{
  open: boolean;
  // Accept null/undefined explicitly to match callers that pass null or undefined
  target?: HTMLElement | null | undefined;
  isFavorite: boolean;
}>();

defineEmits<{
  'update:open': [value: boolean];
  hide: [];
  action: [action: 'recipes' | 'uses' | 'wiki' | 'icon' | 'planner' | 'fav' | 'advanced'];
}>();

const menuRef = ref();

function labelWithShortcut(label: string, action: KeyAction) {
  return `${label} (${keyBindingToString(keyBindingsStore.getBinding(action))})`;
}

const recipesLabel = computed(() => labelWithShortcut(t('recipes'), 'viewRecipes'));
const usesLabel = computed(() => labelWithShortcut(t('uses'), 'viewUses'));
const wikiLabel = computed(() => labelWithShortcut(t('wiki'), 'viewWiki'));
const iconLabel = computed(() => labelWithShortcut(t('viewIcon'), 'viewIcon'));
const plannerLabel = computed(() => labelWithShortcut(t('planner'), 'viewPlanner'));
const addToAdvancedLabel = computed(() => labelWithShortcut(t('addToAdvanced'), 'addToAdvanced'));
const favoriteLabel = computed(() => labelWithShortcut(t('favorite'), 'toggleFavorite'));
const unfavoriteLabel = computed(() => labelWithShortcut(t('unfavorite'), 'toggleFavorite'));

defineExpose({
  show() {
    menuRef.value?.show();
  },
});
</script>
