<template>
  <q-card
    v-show="!isMobile || mobileTab === 'fav'"
    flat
    bordered
    :class="['jei-fav column no-wrap', { 'jei-fav--collapsed': collapsed }]"
  >
    <!-- 折叠状态下的展开按钮 -->
    <div
      v-if="collapsed"
      class="jei-collapsed-trigger jei-collapsed-trigger--left"
      @click="$emit('update:collapsed', false)"
    >
      <q-icon name="chevron_right" size="16px" />
    </div>

    <!-- 展开状态下的内容 -->
    <template v-if="!collapsed">
      <div class="jei-list__head col-auto row items-center q-gutter-sm">
        <div class="text-subtitle2">收藏夹</div>
        <q-space />
        <q-btn
          flat
          dense
          round
          icon="chevron_left"
          size="sm"
          @click="$emit('update:collapsed', true)"
        >
          <q-tooltip>收起</q-tooltip>
        </q-btn>
      </div>

      <div class="jei-list__scroll col">
        <div v-if="savedPlans.length" class="jei-plans">
          <div class="jei-plans__head text-caption text-grey-8">已保存线路</div>
          <q-list dense class="jei-plans__list">
            <q-item
              v-for="p in savedPlans"
              :key="p.id"
              clickable
              class="jei-plans__item"
              @click="$emit('open-plan', p)"
            >
              <q-item-section avatar>
                <stack-view
                  :content="{
                    kind: 'item',
                    id: p.rootItemKey.id,
                    amount: 1,
                    ...(p.rootItemKey.meta !== undefined ? { meta: p.rootItemKey.meta } : {}),
                    ...(p.rootItemKey.nbt !== undefined ? { nbt: p.rootItemKey.nbt } : {}),
                  }"
                  :item-defs-by-key-hash="itemDefsByKeyHash"
                  variant="slot"
                  :show-name="false"
                  :show-subtitle="false"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label lines="1">{{ p.name }}</q-item-label>
                <q-item-label caption lines="1">{{ p.rootItemKey.id }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  round
                  dense
                  icon="delete"
                  color="grey-7"
                  @click.stop="$emit('delete-plan', p.id)"
                />
              </q-item-section>
            </q-item>
          </q-list>
          <q-separator class="q-my-sm" />
        </div>
        <div v-if="favoriteItems.length" class="jei-grid">
          <q-card
            v-for="it in favoriteItems"
            :key="it.keyHash"
            flat
            bordered
            class="jei-grid__cell cursor-pointer"
            v-touch-hold:600="(evt: unknown) => $emit('touch-hold', evt, it.keyHash)"
            @contextmenu.prevent="$emit('context-menu', $event, it.keyHash)"
            @mouseenter="$emit('update:hovered-key-hash', it.keyHash)"
            @mouseleave="$emit('update:hovered-key-hash', null)"
            @click="$emit('item-click', it.keyHash)"
          >
            <q-btn
              flat
              round
              :dense="!isMobile"
              :size="isMobile ? 'md' : 'sm'"
              icon="star"
              color="amber"
              class="jei-grid__fav"
              @click.stop="$emit('toggle-favorite', it.keyHash)"
              @mousedown.stop
              @touchstart.stop
              style="z-index: 1"
            />
            <div class="jei-grid__cell-body">
              <stack-view
                :content="{
                  kind: 'item',
                  id: it.def.key.id,
                  amount: 1,
                  ...(it.def.key.meta !== undefined ? { meta: it.def.key.meta } : {}),
                  ...(it.def.key.nbt !== undefined ? { nbt: it.def.key.nbt } : {}),
                }"
                :item-defs-by-key-hash="itemDefsByKeyHash"
              />
            </div>
          </q-card>
        </div>
        <div v-else class="text-caption text-grey-7">暂无收藏（悬停物品按 A 收藏）</div>
      </div>
    </template>
  </q-card>
</template>

<script setup lang="ts">
import type { ItemDef, ItemKey } from 'src/jei/types';
import StackView from 'src/jei/components/StackView.vue';

type SavedPlan = {
  id: string;
  name: string;
  rootItemKey: ItemKey;
  rootKeyHash: string;
  targetAmount: number;
  selectedRecipeIdByItemKeyHash: Record<string, string>;
  selectedItemIdByTagId: Record<string, string>;
  createdAt: number;
};

defineProps<{
  isMobile: boolean;
  mobileTab: string;
  collapsed: boolean;
  savedPlans: SavedPlan[];
  favoriteItems: Array<{ keyHash: string; def: ItemDef }>;
  itemDefsByKeyHash: Record<string, ItemDef>;
}>();

defineEmits<{
  'update:collapsed': [value: boolean];
  'update:hovered-key-hash': [value: string | null];
  'open-plan': [plan: SavedPlan];
  'delete-plan': [id: string];
  'item-click': [keyHash: string];
  'toggle-favorite': [keyHash: string];
  'context-menu': [evt: Event, keyHash: string];
  'touch-hold': [evt: unknown, keyHash: string];
}>();
</script>

<style scoped>
.jei-panel {
  flex: 0 0 auto;
  box-sizing: border-box;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  padding: 12px;
  height: 100%;
  min-height: 0;
  transition: width 0.3s ease;
}

.jei-panel--collapsed {
  width: 20px !important;
  min-width: 20px !important;
  padding: 0;
}

.jei-collapsed-trigger {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--q-primary);
  color: white;
  opacity: 0.6;
  transition: all 0.2s;
  z-index: 10;
}

.jei-collapsed-trigger:hover {
  opacity: 1;
  width: 24px;
}

.jei-collapsed-trigger--left {
  left: 0;
  border-radius: 0 4px 4px 0;
}

.jei-plans__head {
  padding: 2px 2px 6px 2px;
  font-weight: 600;
}

.jei-plans__list {
  padding: 0;
}

.jei-plans__item :deep(.q-item__section--avatar) {
  min-width: 38px;
}

.jei-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.jei-grid__cell {
  box-sizing: border-box;
  padding: 8px;
  position: relative;
}

.jei-grid__fav {
  position: absolute;
  top: 4px;
  right: 4px;
}

.jei-grid__cell-body {
  min-width: 0;
}

.jei-grid__cell.placeholder {
  border: 1px dashed rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
}

.jei-fav {
  width: 320px;
  min-width: 320px;
  flex: 0 0 auto;
  height: 100%;
  min-height: 0;
  transition: width 0.3s ease;
}

.jei-fav--collapsed {
  width: 20px !important;
  min-width: 20px !important;
}

.jei-collapsed-trigger {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--q-primary);
  color: white;
  opacity: 0.6;
  transition: all 0.2s;
  z-index: 10;
}

.jei-collapsed-trigger:hover {
  opacity: 1;
  width: 24px;
}

.jei-collapsed-trigger--left {
  left: 0;
  border-radius: 0 4px 4px 0;
}

.jei-list__head {
  padding: 12px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.jei-list__scroll {
  padding: 10px;
  overflow: hidden;
  min-height: 0;
}

.jei-plans__head {
  padding: 2px 2px 6px 2px;
  font-weight: 600;
}

.jei-plans__list {
  padding: 0;
}

.jei-plans__item :deep(.q-item__section--avatar) {
  min-width: 38px;
}
</style>
