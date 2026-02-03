<template>
  <q-dialog :model-value="open" @update:model-value="$emit('update:open', $event)">
    <q-card style="min-width: 300px">
      <q-card-section>
        <div class="text-h6">{{ t('settings') }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input
          type="number"
          :label="t('historyLimit')"
          dense
          outlined
          :model-value="historyLimit"
          @update:model-value="$emit('update:history-limit', Number($event) || 0)"
        />
        <q-toggle
          :label="t('debugScroll')"
          :model-value="debugLayout"
          @update:model-value="$emit('update:debug-layout', !!$event)"
        />
        <q-toggle
          :label="t('debugNavPanel')"
          :model-value="debugNavPanel"
          @update:model-value="$emit('update:debug-nav-panel', !!$event)"
        />
        <q-select
          dense
          outlined
          :label="t('recipeViewMode')"
          :options="[
            { label: t('recipeViewDialog'), value: 'dialog' },
            { label: t('recipeViewPanel'), value: 'panel' },
          ]"
          emit-value
          map-options
          :model-value="recipeViewMode"
          @update:model-value="$emit('update:recipe-view-mode', $event as 'dialog' | 'panel')"
        />
        <q-toggle
          :label="t('recipeSlotShowName')"
          :model-value="recipeSlotShowName"
          @update:model-value="$emit('update:recipe-slot-show-name', !!$event)"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat :label="t('close')" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{
  open: boolean;
  historyLimit: number;
  debugLayout: boolean;
  debugNavPanel: boolean;
  recipeViewMode: 'dialog' | 'panel';
  recipeSlotShowName: boolean;
}>();

defineEmits<{
  'update:open': [value: boolean];
  'update:history-limit': [value: number];
  'update:debug-layout': [value: boolean];
  'update:debug-nav-panel': [value: boolean];
  'update:recipe-view-mode': [value: 'dialog' | 'panel'];
  'update:recipe-slot-show-name': [value: boolean];
}>();
</script>
