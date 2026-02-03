<template>
  <div>
    <!-- Planner 标签页 -->
    <crafting-planner-view
      v-if="pack && index && currentItemKey"
      v-show="activeTab === 'planner'"
      class="q-pa-md"
      :pack="pack"
      :index="index"
      :root-item-key="currentItemKey"
      :item-defs-by-key-hash="itemDefsByKeyHash"
      :initial-state="plannerInitialState"
      :initial-tab="plannerTab"
      @item-click="$emit('item-click', $event)"
      @save-plan="$emit('save-plan', $event)"
      @state-change="$emit('state-change', $event)"
      @item-mouseenter="$emit('item-mouseenter', $event)"
      @item-mouseleave="$emit('item-mouseleave')"
    />

    <!-- Wiki 标签页内容 -->
    <div v-if="activeTab === 'wiki'" class="q-pa-md">
      <div v-if="currentItemDef" class="column q-gutter-md">
        <div class="text-h5">{{ currentItemDef.name }}</div>
        <q-separator />
        <div class="row q-gutter-md">
          <div class="col-auto">
            <stack-view
              :content="{
                kind: 'item',
                id: currentItemDef.key.id,
                amount: 1,
                ...(currentItemDef.key.meta !== undefined ? { meta: currentItemDef.key.meta } : {}),
                ...(currentItemDef.key.nbt !== undefined ? { nbt: currentItemDef.key.nbt } : {}),
              }"
              :item-defs-by-key-hash="itemDefsByKeyHash"
            />
          </div>
          <div class="col column q-gutter-sm">
            <div class="text-caption text-grey-8">{{ t('itemId') }}</div>
            <div class="text-body2">{{ currentItemDef.key.id }}</div>
            <div
              v-if="currentItemDef.key.meta !== undefined"
              class="text-caption text-grey-8 q-mt-sm"
            >
              Meta
            </div>
            <div v-if="currentItemDef.key.meta !== undefined" class="text-body2">
              {{ currentItemDef.key.meta }}
            </div>
          </div>
        </div>
        <q-separator />
        <div v-if="currentItemDef.description">
          <div class="text-subtitle2 q-mb-sm">{{ t('description') }}</div>
          <div class="wiki-description" v-html="renderedDescription"></div>
        </div>
        <q-separator v-if="currentItemDef.description" />
        <div>
          <div class="text-subtitle2 q-mb-sm">{{ t('tags') }}</div>
          <div v-if="currentItemDef.tags?.length" class="row q-gutter-xs">
            <q-badge v-for="tag in currentItemDef.tags" :key="tag" color="grey-7">
              {{ tag }}
            </q-badge>
          </div>
          <div v-else class="text-caption text-grey-7">{{ t('noTags') }}</div>
        </div>
      </div>
    </div>

    <!-- Recipes/Uses 标签页 -->
    <div v-show="activeTab === 'recipes' || activeTab === 'uses'" :class="containerClass">
      <div v-if="activeRecipeGroups.length" class="jei-type-layout">
        <div v-if="typeMachineIcons.length" class="jei-type-sidebar">
          <q-btn
            v-for="m in typeMachineIcons"
            :key="m.typeKey"
            flat
            dense
            class="jei-type-sidebar__btn"
            :color="m.typeKey === activeTypeKey ? 'primary' : 'grey-7'"
            :class="{ 'jei-type-sidebar__btn--active': m.typeKey === activeTypeKey }"
            @click="$emit('machine-item-click', m.machineItemId)"
          >
            <stack-view
              :content="{ kind: 'item', id: m.machineItemId, amount: 1 }"
              :item-defs-by-key-hash="itemDefsByKeyHash"
              variant="slot"
              :show-name="false"
              :show-subtitle="false"
            />
          </q-btn>
        </div>

        <div class="jei-type-main">
          <q-tabs
            :model-value="activeTypeKey"
            @update:model-value="$emit('update:active-type-key', $event)"
            dense
            outside-arrows
            mobile-arrows
            inline-label
            class="q-px-sm q-pt-sm"
          >
            <q-tab
              v-for="g in activeRecipeGroups"
              :key="g.typeKey"
              :name="g.typeKey"
              :label="`${g.label} (${g.recipeIds.length})`"
            />
          </q-tabs>
          <q-separator />

          <q-tab-panels
            :model-value="activeTypeKey"
            @update:model-value="$emit('update:active-type-key', String($event))"
            animated
            :class="panelClass"
          >
            <q-tab-panel
              v-for="g in activeRecipeGroups"
              :key="g.typeKey"
              :name="g.typeKey"
              class="q-pa-md"
            >
              <!-- "全部"分组：按配方类型分组显示 -->
              <template v-if="g.isAll">
                <div class="column q-gutter-lg">
                  <div
                    v-for="subGroup in allRecipeGroups"
                    :key="subGroup.typeKey"
                    class="column q-gutter-md"
                  >
                    <div class="row items-center q-gutter-sm text-subtitle2">
                      <span>{{ subGroup.label }}</span>
                      <div v-if="subGroup.machines.length" class="row items-center q-gutter-xs">
                        <q-icon name="precision_manufacturing" size="16px" color="grey-7" />
                        <stack-view
                          v-for="m in subGroup.machines"
                          :key="m.machineItemId"
                          :content="{ kind: 'item', id: m.machineItemId, amount: 1 }"
                          :item-defs-by-key-hash="itemDefsByKeyHash"
                          variant="slot"
                          :show-name="false"
                          :show-subtitle="false"
                          class="cursor-pointer"
                          @item-click="$emit('machine-item-click', m.machineItemId)"
                        />
                      </div>
                    </div>
                    <q-separator />
                    <div class="column q-gutter-md">
                      <q-card
                        v-for="rid in subGroup.recipeIds"
                        :key="rid"
                        flat
                        bordered
                        class="q-pa-md"
                      >
                        <recipe-viewer
                          v-if="recipesById.get(rid)"
                          :recipe="recipesById.get(rid)"
                          :recipe-type="recipeTypesByKey.get(recipesById.get(rid)?.type || '')"
                          :item-defs-by-key-hash="itemDefsByKeyHash"
                          @item-click="$emit('item-click', $event)"
                          @item-mouseenter="$emit('item-mouseenter', $event)"
                          @item-mouseleave="$emit('item-mouseleave')"
                          @item-context-menu="(...args) => $emit('item-context-menu', ...args)"
                          @item-touch-hold="(...args) => $emit('item-touch-hold', ...args)"
                        />
                      </q-card>
                    </div>
                  </div>
                </div>
              </template>
              <!-- 普通分组：直接显示配方列表 -->
              <template v-else>
                <div class="column q-gutter-md">
                  <q-card v-for="rid in g.recipeIds" :key="rid" flat bordered class="q-pa-md">
                    <recipe-viewer
                      v-if="recipesById.get(rid)"
                      :recipe="recipesById.get(rid)"
                      :recipe-type="recipeTypesByKey.get(recipesById.get(rid)?.type || '')"
                      :item-defs-by-key-hash="itemDefsByKeyHash"
                      @item-click="$emit('item-click', $event)"
                      @item-mouseenter="$emit('item-mouseenter', $event)"
                      @item-mouseleave="$emit('item-mouseleave')"
                      @item-context-menu="(...args) => $emit('item-context-menu', ...args)"
                      @item-touch-hold="(...args) => $emit('item-touch-hold', ...args)"
                    />
                  </q-card>
                </div>
              </template>
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </div>
      <div v-else class="q-pa-md text-caption">{{ t('noRecipesFound') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { PackData, ItemDef, ItemKey } from 'src/jei/types';
import type { JeiIndex } from 'src/jei/indexing/buildIndex';
import type { PlannerInitialState, PlannerLiveState } from 'src/jei/planner/plannerUi';
import StackView from 'src/jei/components/StackView.vue';
import RecipeViewer from 'src/jei/components/RecipeViewer.vue';
import CraftingPlannerView from 'src/jei/components/CraftingPlannerView.vue';

const { t } = useI18n();

interface RecipeGroup {
  typeKey: string;
  label: string;
  recipeIds: string[];
  isAll?: boolean;
  machines: Array<{ typeKey: string; machineItemId: string }>;
}

interface MachineIcon {
  typeKey: string;
  machineItemId: string;
}

defineProps<{
  pack: PackData | null;
  index: JeiIndex | null;
  currentItemKey: ItemKey | null;
  currentItemDef: ItemDef | null;
  itemDefsByKeyHash: Record<string, ItemDef>;
  renderedDescription: string;
  activeTab: 'recipes' | 'uses' | 'wiki' | 'planner';
  activeTypeKey: string;
  activeRecipeGroups: RecipeGroup[];
  allRecipeGroups: RecipeGroup[];
  typeMachineIcons: MachineIcon[];
  recipesById: Map<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  recipeTypesByKey: Map<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  plannerInitialState: PlannerInitialState | null;
  plannerTab: 'tree' | 'graph' | 'line' | 'calc';
  containerClass?: string;
  panelClass?: string;
}>();

defineEmits<{
  'item-click': [keyHash: ItemKey];
  'machine-item-click': [itemId: string];
  'save-plan': [payload: any]; // eslint-disable-line @typescript-eslint/no-explicit-any
  'state-change': [state: PlannerLiveState];
  'item-mouseenter': [keyHash: string];
  'item-mouseleave': [];
  'item-context-menu': [evt: Event, keyHash: string];
  'item-touch-hold': [evt: unknown, keyHash: string];
  'update:active-type-key': [typeKey: string];
}>();
</script>

<style scoped>
.wiki-description {
  line-height: 1.6;
}

.wiki-description :deep(h1),
.wiki-description :deep(h2),
.wiki-description :deep(h3),
.wiki-description :deep(h4),
.wiki-description :deep(h5),
.wiki-description :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.wiki-description :deep(h1) {
  font-size: 1.5em;
}

.wiki-description :deep(h2) {
  font-size: 1.3em;
}

.wiki-description :deep(h3) {
  font-size: 1.1em;
}

.wiki-description :deep(p) {
  margin-bottom: 0.75em;
}

.wiki-description :deep(ul),
.wiki-description :deep(ol) {
  margin-left: 1.5em;
  margin-bottom: 0.75em;
}

.wiki-description :deep(li) {
  margin-bottom: 0.25em;
}

.wiki-description :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.125em 0.25em;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.wiki-description :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.75em;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 0.75em;
}

.wiki-description :deep(pre code) {
  background: none;
  padding: 0;
}

.wiki-description :deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.wiki-description :deep(a:hover) {
  text-decoration: underline;
}

.wiki-description :deep(blockquote) {
  border-left: 4px solid rgba(0, 0, 0, 0.12);
  padding-left: 1em;
  margin-left: 0;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 0.75em;
}

.wiki-description :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 0.75em;
}

.wiki-description :deep(th),
.wiki-description :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 0.5em;
}

.wiki-description :deep(th) {
  background: rgba(0, 0, 0, 0.03);
  font-weight: 600;
}

.wiki-description :deep(img) {
  max-width: 100%;
  height: auto;
}

.jei-type-layout {
  display: flex;
  min-height: 0;
}

.jei-type-sidebar {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 6px 8px 10px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.jei-type-sidebar__btn {
  padding: 0;
  min-height: 0;
  border-radius: 8px;
}

.jei-type-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
