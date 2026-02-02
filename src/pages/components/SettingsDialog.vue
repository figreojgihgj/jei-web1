<template>
  <q-dialog :model-value="open" @update:model-value="$emit('update:open', $event)">
    <q-card style="min-width: 300px">
      <q-card-section>
        <div class="text-h6">设置</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input
          type="number"
          label="历史记录显示数量"
          dense
          outlined
          :model-value="historyLimit"
          @update:model-value="$emit('update:history-limit', Number($event) || 0)"
        />
        <q-toggle
          label="开启调试滚动"
          :model-value="debugLayout"
          @update:model-value="$emit('update:debug-layout', !!$event)"
        />
        <q-toggle
          label="导航栈调试面板"
          :model-value="debugNavPanel"
          @update:model-value="$emit('update:debug-nav-panel', !!$event)"
        />
        <q-select
          dense
          outlined
          label="合成表显示方式"
          :options="[
            { label: '弹窗', value: 'dialog' },
            { label: '中间区域', value: 'panel' },
          ]"
          emit-value
          map-options
          :model-value="recipeViewMode"
          @update:model-value="$emit('update:recipe-view-mode', $event as 'dialog' | 'panel')"
        />
        <q-toggle
          label="合成表物品显示名字"
          :model-value="recipeSlotShowName"
          @update:model-value="$emit('update:recipe-slot-show-name', !!$event)"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="关闭" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
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
