<template>
  <q-card
    v-show="!isMobile || mobileTab === 'panel'"
    flat
    bordered
    :class="['jei-panel column no-wrap', { 'jei-panel--collapsed': collapsed }]"
  >
    <!-- 折叠状态下的展开按钮 -->
    <div
      v-if="collapsed"
      class="jei-collapsed-trigger jei-collapsed-trigger--right"
      @click="$emit('update:collapsed', false)"
    >
      <q-icon name="chevron_left" size="16px" />
    </div>

    <!-- 展开状态下的内容 -->
    <template v-if="!collapsed && recipeViewMode === 'panel'">
      <!-- 顶部标题栏 -->
      <div class="jei-panel__head row items-center q-gutter-sm col-auto">
        <div class="text-subtitle2">{{ currentViewTitle }}</div>
        <q-space />
        <q-btn
          v-if="centerTab === 'recipe' && navStackLength > 1"
          flat
          round
          dense
          icon="arrow_back"
          @click="$emit('go-back')"
        />
        <q-btn
          v-if="centerTab === 'recipe' && navStackLength"
          flat
          round
          dense
          icon="close"
          @click="$emit('close')"
        />
        <q-btn
          flat
          dense
          round
          icon="chevron_right"
          size="sm"
          @click="$emit('update:collapsed', true)"
        >
          <q-tooltip>{{ t('collapse') }}</q-tooltip>
        </q-btn>
      </div>

      <!-- 主 Tabs -->
      <q-tabs
        :model-value="centerTab"
        @update:model-value="$emit('update:center-tab', $event)"
        dense
        class="q-px-sm"
      >
        <q-tab name="recipe" :label="t('recipeViewer')" />
        <q-tab name="advanced" :label="t('advancedPlanner')" />
      </q-tabs>

      <q-separator />

      <!-- 内容区域 - 使用 keep-alive 保持组件状态 -->
      <div class="col jei-panel__body">
        <q-tab-panels :model-value="centerTab" animated keep-alive class="jei-panel__tab-panels">
          <!-- 资料查看器面板 -->
          <q-tab-panel name="recipe" class="q-pa-none jei-panel__tab-panel">
            <div v-if="navStackLength" class="jei-panel__tabs col-auto">
              <q-tabs
                :model-value="activeTab"
                @update:model-value="$emit('update:active-tab', $event)"
                dense
                outside-arrows
                mobile-arrows
                inline-label
                class="q-px-sm q-pt-sm"
              >
                <q-tab name="recipes" :label="t('tabsRecipesWithLabel')" />
                <q-tab name="uses" :label="t('tabsUsesWithLabel')" />
                <q-tab name="wiki" :label="t('tabsWikiWithLabel')" />
                <q-tab name="planner" :label="t('tabsPlannerWithLabel')" />
              </q-tabs>
            </div>
            <q-separator v-if="navStackLength" />
            <div v-show="navStackLength" class="jei-panel__content">
              <recipe-content-view
                v-if="navStackLength"
                :pack="pack ?? null"
                :index="index ?? null"
                :current-item-key="currentItemKey ?? null"
                :current-item-def="currentItemDef ?? null"
                :item-defs-by-key-hash="itemDefsByKeyHash ?? {}"
                :rendered-description="renderedDescription ?? ''"
                :active-tab="activeTab"
                :active-type-key="activeTypeKey ?? ''"
                @update:active-type-key="$emit('update:active-type-key', $event)"
                :active-recipe-groups="activeRecipeGroups ?? []"
                :all-recipe-groups="allRecipeGroups ?? []"
                :type-machine-icons="typeMachineIcons ?? []"
                :recipes-by-id="recipesById ?? new Map()"
                :recipe-types-by-key="recipeTypesByKey ?? new Map()"
                :planner-initial-state="plannerInitialState ?? null"
                :planner-tab="plannerTab ?? 'tree'"
                panel-class="jei-panel__panels"
                @item-click="$emit('item-click', $event)"
                @wiki-item-click="$emit('wiki-item-click', $event)"
                @machine-item-click="$emit('machine-item-click', $event)"
                @save-plan="$emit('save-plan', $event)"
                @state-change="$emit('state-change', $event)"
                @item-mouseenter="$emit('item-mouseenter', $event)"
                @item-mouseleave="$emit('item-mouseleave')"
                @item-context-menu="(...args) => $emit('item-context-menu', ...args)"
                @item-touch-hold="(...args) => $emit('item-touch-hold', ...args)"
              />
            </div>
            <div v-show="!navStackLength" class="q-pa-md text-caption text-grey-7">
              {{ t('selectItem') }}
            </div>
          </q-tab-panel>

          <!-- 高级计划器面板 -->
          <q-tab-panel name="advanced" class="q-pa-none jei-panel__tab-panel">
            <advanced-planner
              ref="advancedPlannerRef"
              :pack="pack ?? null"
              :index="index ?? null"
              :item-defs-by-key-hash="itemDefsByKeyHash ?? {}"
              @save-plan="$emit('save-plan', $event)"
            />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </template>
    <template v-else-if="!collapsed">
      <div class="text-subtitle2">{{ t('middleArea') }}</div>
      <div class="text-caption">{{ t('middleAreaDesc') }}</div>
    </template>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PackData, ItemDef, ItemKey } from 'src/jei/types';
import type { JeiIndex } from 'src/jei/indexing/buildIndex';
import type {
  PlannerInitialState,
  PlannerLiveState,
  PlannerSavePayload,
} from 'src/jei/planner/plannerUi';
import RecipeContentView from './RecipeContentView.vue';
import AdvancedPlanner from './AdvancedPlanner.vue';

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

const props = defineProps<{
  isMobile: boolean;
  mobileTab: string;
  collapsed: boolean;
  recipeViewMode: 'dialog' | 'panel';
  centerTab?: 'recipe' | 'advanced';
  navStackLength: number;
  currentItemTitle: string;
  activeTab: 'recipes' | 'uses' | 'wiki' | 'planner';
  pack?: PackData | null;
  index?: JeiIndex | null;
  currentItemKey?: ItemKey | null;
  currentItemDef?: ItemDef | null;
  itemDefsByKeyHash?: Record<string, ItemDef>;
  renderedDescription?: string;
  activeTypeKey?: string;
  activeRecipeGroups?: RecipeGroup[];
  allRecipeGroups?: RecipeGroup[];
  typeMachineIcons?: MachineIcon[];
  recipesById?: Map<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  recipeTypesByKey?: Map<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  plannerInitialState?: PlannerInitialState | null;
  plannerTab?: 'tree' | 'graph' | 'line' | 'calc';
}>();

defineEmits<{
  'update:collapsed': [value: boolean];
  'update:center-tab': [value: 'recipe' | 'advanced'];
  'update:active-tab': [value: 'recipes' | 'uses' | 'wiki' | 'planner'];
  'update:active-type-key': [typeKey: string];
  'go-back': [];
  close: [];
  'item-click': [keyHash: ItemKey];
  'wiki-item-click': [keyHash: ItemKey];
  'machine-item-click': [itemId: string];
  'save-plan': [payload: any]; // eslint-disable-line @typescript-eslint/no-explicit-any
  'state-change': [state: PlannerLiveState];
  'item-mouseenter': [keyHash: string];
  'item-mouseleave': [];
  'item-context-menu': [evt: Event, keyHash: string];
  'item-touch-hold': [evt: unknown, keyHash: string];
}>();

const advancedPlannerRef = ref<InstanceType<typeof AdvancedPlanner>>();

const currentViewTitle = computed(() => {
  if (props.centerTab === 'advanced') {
    return '高级计划器';
  }
  return props.navStackLength ? props.currentItemTitle : '中间区域';
});

const addToAdvancedPlanner = (itemKey: ItemKey, itemName: string) => {
  advancedPlannerRef.value?.addTarget(itemKey, itemName);
};

const loadAdvancedPlan = (plan: PlannerSavePayload) => {
  advancedPlannerRef.value?.loadSavedPlan(plan);
};

defineExpose({
  addToAdvancedPlanner,
  loadAdvancedPlan,
});
</script>

<style scoped>
.jei-panel {
  flex: 1 1 auto;
  min-width: 0;
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

.jei-collapsed-trigger--right {
  right: 0;
  border-radius: 4px 0 0 4px;
}

.jei-panel__head {
  padding-bottom: 8px;
}

.jei-panel__tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
}

.jei-panel__body {
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.jei-panel__tab-panels {
  flex: 1 1 auto;
  min-height: 0;
}

.jei-panel__tab-panel {
  min-height: 0;
}

.jei-panel__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.jei-panel__panels {
  min-height: 0;
}
</style>
