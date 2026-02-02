<template>
  <div
    class="debug-panel"
    :style="{ top: pos.y + 'px', left: pos.x + 'px' }"
    @mousedown="onMouseDown"
  >
    <div class="debug-panel__header">导航栈调试 (拖动我)</div>
    <div class="debug-panel__content">
      <div>navStack.length: {{ navStack.length }}</div>
      <div>dialogOpen: {{ dialogOpen }}</div>
      <div class="debug-panel__stack">
        <div v-for="(item, index) in navStack" :key="index" class="debug-panel__item">
          [{{ index }}] {{ item.id }}
        </div>
      </div>
      <div class="debug-panel__log">
        <div v-for="(log, index) in navChangeLog" :key="index" class="debug-panel__log-item">
          {{ log }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { ItemKey } from 'src/jei/types';
import { useSettingsStore } from 'src/stores/settings';

const props = defineProps<{
  navStack: ItemKey[];
  dialogOpen: boolean;
}>();

const settingsStore = useSettingsStore();

// use position from settings
const pos = ref({ ...settingsStore.debugPanelPos });

// save position to settings when changed
watch(
  pos,
  (newPos) => {
    settingsStore.setDebugPanelPos(newPos);
  },
  { deep: true },
);

// navChangeLog logic moved here
const navChangeLog = ref<string[]>([]);

function addNavChangeLog(msg: string) {
  const time = new Date().toLocaleTimeString();
  navChangeLog.value.unshift(`[${time}] ${msg}`);
  if (navChangeLog.value.length > 20) navChangeLog.value.pop();
}

// track navStack changes
watch(
  () => props.navStack,
  (newStack, oldStack) => {
    const prevLen = oldStack?.length ?? 0;
    const newLen = newStack.length;
    if (newLen === 0 && prevLen > 0) {
      addNavChangeLog(`❌ navStack 被清空！之前长度: ${prevLen}`);
      console.trace('navStack 被清空！');
    } else if (newLen < prevLen) {
      addNavChangeLog(`⬅️ navStack 减少: ${prevLen} -> ${newLen}`);
    } else if (newLen > prevLen) {
      const newItem = newStack[newStack.length - 1];
      if (newItem) {
        addNavChangeLog(`➡️ navStack 增加: ${prevLen} -> ${newLen} (${newItem.id})`);
      }
    }
  },
  { deep: true },
);
const isDragging = ref(false);
const offset = ref({ x: 0, y: 0 });

function onMouseDown(evt: MouseEvent) {
  const target = evt.target as HTMLElement;
  if (!target.closest('.debug-panel__header')) return;
  isDragging.value = true;
  offset.value = { x: evt.clientX - pos.value.x, y: evt.clientY - pos.value.y };
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(evt: MouseEvent) {
  if (!isDragging.value) return;
  pos.value = { x: evt.clientX - offset.value.x, y: evt.clientY - offset.value.y };
}

function onMouseUp() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
});
</script>

<style scoped>
.debug-panel {
  width: 280px;
  position: fixed;
  z-index: 9999;
  background: var(--q-surface);
  color: var(--q-color-primary);
  border-radius: 6px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  font-size: 12px;
}
.debug-panel__header {
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.04);
  cursor: move;
  font-weight: 600;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.debug-panel__content {
  padding: 10px;
  max-height: 400px;
  overflow-y: auto;
}
.debug-panel__stack {
  max-height: 100px;
  overflow: auto;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.debug-panel__log {
  max-height: 120px;
  overflow: auto;
  border-top: 1px dashed rgba(0, 0, 0, 0.06);
  margin-top: 8px;
  padding-top: 8px;
}
.debug-panel__item,
.debug-panel__log-item {
  font-family: monospace;
  font-size: 11px;
  padding: 2px 0;
  word-break: break-all;
}
.debug-panel__item:hover {
  background: rgba(0, 0, 0, 0.05);
}
</style>
