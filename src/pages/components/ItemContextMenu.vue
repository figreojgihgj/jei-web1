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
        <q-item-section>{{ t('recipes') }}</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('action', 'uses')">
        <q-item-section avatar>
          <q-icon name="input" size="xs" />
        </q-item-section>
        <q-item-section>{{ t('uses') }}</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('action', 'wiki')">
        <q-item-section avatar>
          <q-icon name="menu_book" size="xs" />
        </q-item-section>
        <q-item-section>{{ t('wiki') }}</q-item-section>
      </q-item>
      <q-item clickable v-close-popup @click="$emit('action', 'planner')">
        <q-item-section avatar>
          <q-icon name="calculate" size="xs" />
        </q-item-section>
        <q-item-section>{{ t('planner') }}</q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable v-close-popup @click="$emit('action', 'advanced')">
        <q-item-section avatar>
          <q-icon name="add_chart" size="xs" color="primary" />
        </q-item-section>
        <q-item-section>{{ t('addToAdvanced') }}</q-item-section>
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
        <q-item-section>{{ isFavorite ? t('unfavorite') : t('favorite') }}</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{
  open: boolean;
  // Accept null/undefined explicitly to match callers that pass null or undefined
  target?: HTMLElement | null | undefined;
  isFavorite: boolean;
}>();

defineEmits<{
  'update:open': [value: boolean];
  hide: [];
  action: [action: 'recipes' | 'uses' | 'wiki' | 'planner' | 'fav' | 'advanced'];
}>();

const menuRef = ref();

defineExpose({
  show() {
    menuRef.value?.show();
  },
});
</script>
