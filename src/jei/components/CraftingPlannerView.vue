<template>
  <div class="planner">
    <q-card flat bordered class="q-pa-md">
      <div class="row items-center q-gutter-sm">
        <div class="text-subtitle2">线路选择</div>
        <q-btn dense outline icon="restart_alt" label="重新设计" @click="resetPlanner" />
        <q-btn
          dense
          outline
          icon="save"
          label="保存线路"
          :disable="!!decisions.length"
          @click="openSaveDialog"
        />
        <q-space />
        <q-badge v-if="decisions.length" color="warning">待选择：{{ decisions.length }}</q-badge>
        <q-badge v-else color="positive">已完成</q-badge>
      </div>

      <div v-if="decisions.length" class="column q-gutter-md q-mt-md">
        <div v-for="d in decisions" :key="decisionKey(d)" class="planner__decision">
          <div v-if="d.kind === 'item_recipe'" class="column q-gutter-sm">
            <div class="text-caption text-grey-8">{{ itemName(d.itemKey) }}：选择合成方式</div>
            <q-select
              dense
              filled
              emit-value
              map-options
              :options="recipeOptionsForDecision(d)"
              :model-value="selectedRecipeIdByItemKeyHash.get(d.itemKeyHash) ?? null"
              @update:model-value="(v) => setRecipeChoice(d.itemKeyHash, v as string)"
            >
              <template #option="scope">
                <q-item v-bind="scope.itemProps" class="planner__recipe-option">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <div v-if="scope.opt.inputs?.length" class="planner__recipe-option-inputs">
                      <stack-view
                        v-for="(s, i) in scope.opt.inputs.slice(0, 8)"
                        :key="`${scope.opt.value}:${i}`"
                        :content="s"
                        :item-defs-by-key-hash="itemDefsByKeyHash"
                        variant="slot"
                        :show-name="false"
                        :show-subtitle="false"
                      />
                      <div
                        v-if="scope.opt.inputs.length > 8"
                        class="planner__recipe-option-more text-caption text-grey-6"
                      >
                        +{{ scope.opt.inputs.length - 8 }}
                      </div>
                    </div>
                  </q-item-section>
                  <q-item-section side>
                    <div class="text-caption text-grey-6">{{ scope.opt.value }}</div>
                  </q-item-section>

                  <q-tooltip max-width="720px">
                    <q-card
                      v-if="scope.opt.recipe && scope.opt.recipeType"
                      flat
                      bordered
                      class="q-pa-sm"
                    >
                      <recipe-viewer
                        :recipe="scope.opt.recipe"
                        :recipe-type="scope.opt.recipeType"
                        :item-defs-by-key-hash="itemDefsByKeyHash"
                        @item-click="emit('item-click', $event)"
                      />
                    </q-card>
                    <div v-else class="text-caption">没有找到该配方的详情。</div>
                  </q-tooltip>
                </q-item>
              </template>
            </q-select>
            <q-card
              v-if="selectedRecipeIdByItemKeyHash.get(d.itemKeyHash)"
              flat
              bordered
              class="q-pa-md"
            >
              <recipe-viewer
                :recipe="index.recipesById.get(selectedRecipeIdByItemKeyHash.get(d.itemKeyHash)!)!"
                :recipe-type="
                  index.recipeTypesByKey.get(
                    index.recipesById.get(selectedRecipeIdByItemKeyHash.get(d.itemKeyHash)!)!.type,
                  )!
                "
                :item-defs-by-key-hash="itemDefsByKeyHash"
                @item-click="emit('item-click', $event)"
              />
            </q-card>
          </div>

          <div v-else class="column q-gutter-sm">
            <div class="row items-center q-gutter-sm">
              <div class="text-caption text-grey-8">tag {{ d.tagId }}：选择具体物品</div>
              <q-badge v-if="!d.candidateItemIds.length" color="negative">无可选</q-badge>
            </div>
            <q-select
              dense
              filled
              emit-value
              map-options
              :options="tagItemOptions(d)"
              :model-value="selectedItemIdByTagId.get(d.tagId) ?? null"
              @update:model-value="(v) => setTagChoice(d.tagId, v as string)"
            />
          </div>
        </div>
      </div>

      <div v-else class="q-mt-md">
        <q-tabs v-model="activeTab" dense outside-arrows mobile-arrows inline-label>
          <q-tab name="tree" label="合成树" />
          <q-tab name="graph" label="节点图" />
          <q-tab name="calc" label="计算器" />
        </q-tabs>
        <q-separator />

        <div v-if="activeTab === 'tree'" class="q-mt-md">
          <div class="row items-center q-gutter-sm">
            <div class="text-caption text-grey-8">目标产出</div>
            <q-input
              dense
              filled
              type="number"
              style="width: 120px"
              :model-value="targetAmount"
              @update:model-value="(v) => (targetAmount = Number(v))"
            />
            <q-select
              dense
              filled
              emit-value
              map-options
              style="min-width: 100px"
              :options="unitOptions"
              :model-value="targetUnit"
              @update:model-value="(v) => (targetUnit = v as (typeof unitOptions)[number]['value'])"
            />
            <q-space />
            <q-btn-toggle
              v-model="treeDisplayMode"
              dense
              outline
              toggle-color="primary"
              :options="[
                { label: '列表', value: 'list' },
                { label: '紧凑', value: 'compact' },
              ]"
            />
          </div>
          <div v-if="treeResult" class="q-mt-md">
            <div v-if="treeDisplayMode === 'list'" class="planner__tree-table">
              <div class="planner__tree-table-header">
                <div class="planner__tree-col planner__tree-col--tree">树结构</div>
                <div class="planner__tree-col planner__tree-col--rate text-right">
                  {{ rateColumnLabel }}
                </div>
                <div class="planner__tree-col planner__tree-col--belts text-right">传送带</div>
                <div class="planner__tree-col planner__tree-col--machines text-right">设备</div>
                <div class="planner__tree-col planner__tree-col--power text-right">电量</div>
              </div>
              <div
                v-for="row in treeListRows"
                :key="row.node.nodeId"
                class="planner__tree-table-row"
              >
                <div class="planner__tree-col planner__tree-col--tree">
                  <div class="planner__links">
                    <template v-if="row.connect.length">
                      <div
                        v-for="(trail, i) in row.connect"
                        :key="i"
                        class="planner__connect"
                        :class="{
                          'planner__connect--trail': trail,
                          'planner__connect--last': i === row.connect.length - 1,
                        }"
                      ></div>
                    </template>
                    <div class="planner__tree-toggle">
                      <q-btn
                        v-if="row.node.kind === 'item' && row.node.children.length"
                        flat
                        dense
                        round
                        size="sm"
                        :icon="collapsed.has(row.node.nodeId) ? 'chevron_right' : 'expand_more'"
                        @click="toggleCollapsed(row.node.nodeId)"
                      />
                      <div v-else style="width: 28px"></div>
                    </div>
                    <div class="planner__tree-icon">
                      <stack-view
                        v-if="row.node.kind === 'item'"
                        :content="{ kind: 'item', id: row.node.itemKey.id, amount: 1 }"
                        :item-defs-by-key-hash="itemDefsByKeyHash"
                        variant="slot"
                        :show-name="false"
                        :show-subtitle="false"
                        @item-click="emit('item-click', $event)"
                      />
                      <stack-view
                        v-else
                        :content="
                          row.node.unit
                            ? { kind: 'fluid', id: row.node.id, amount: 1, unit: row.node.unit }
                            : { kind: 'fluid', id: row.node.id, amount: 1 }
                        "
                        :item-defs-by-key-hash="itemDefsByKeyHash"
                        variant="slot"
                        :show-name="false"
                        :show-subtitle="false"
                      />
                    </div>
                    <div class="planner__tree-name">
                      <div class="planner__tree-name-main">
                        {{ row.node.kind === 'item' ? itemName(row.node.itemKey) : row.node.id }}
                      </div>
                      <div class="planner__tree-name-sub text-caption text-grey-7">
                        {{ formatAmount(nodeDisplayAmount(row.node)) }}
                      </div>
                    </div>
                    <q-badge
                      v-if="row.node.kind === 'item' && row.node.cycle"
                      :color="row.node.cycleSeed ? 'positive' : 'negative'"
                      class="q-ml-sm"
                    >
                      {{ row.node.cycleSeed ? 'cycle seed' : 'cycle' }}
                    </q-badge>
                  </div>
                </div>
                <div class="planner__tree-col planner__tree-col--rate text-right monospace">
                  {{ formatAmount(nodeDisplayRate(row.node)) }}
                </div>
                <div class="planner__tree-col planner__tree-col--belts text-right monospace">
                  {{ nodeBeltsText(row.node) }}
                </div>
                <div class="planner__tree-col planner__tree-col--machines text-right">
                  <div class="planner__machines-cell">
                    <template v-if="row.node.kind === 'item' && row.node.machineItemId">
                      <stack-view
                        :content="{ kind: 'item', id: row.node.machineItemId, amount: 1 }"
                        :item-defs-by-key-hash="itemDefsByKeyHash"
                        variant="slot"
                        :show-name="false"
                        :show-subtitle="false"
                      />
                      <div class="planner__machines-text monospace">
                        {{ nodeMachinesText(row.node) }}
                      </div>
                    </template>
                  </div>
                </div>
                <div class="planner__tree-col planner__tree-col--power text-right monospace">
                  {{ nodePowerText(row.node) }}
                </div>
              </div>
              <div v-if="enhancedTreeResult?.totals" class="planner__tree-table-footer">
                <div class="planner__tree-footer-row">
                  <div class="planner__tree-footer-label">总计</div>
                  <div class="planner__tree-footer-values">
                    <span class="monospace">电力 {{ totalPower }} kW</span>
                    <span class="monospace">污染 {{ totalPollution }}/分</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="column q-gutter-xs">
              <div v-for="row in treeRows" :key="row.node.nodeId" class="planner__tree-row">
                <div class="planner__tree-indent" :style="{ width: `${row.depth * 18}px` }"></div>
                <q-btn
                  v-if="row.node.kind === 'item' && row.node.children.length"
                  flat
                  dense
                  round
                  size="sm"
                  :icon="collapsed.has(row.node.nodeId) ? 'chevron_right' : 'expand_more'"
                  @click="toggleCollapsed(row.node.nodeId)"
                />
                <div v-else style="width: 28px"></div>
                <div class="planner__tree-content">
                  <stack-view
                    v-if="row.node.kind === 'item'"
                    :content="{
                      kind: 'item',
                      id: row.node.itemKey.id,
                      amount: formatAmount(row.node.amount),
                    }"
                    :item-defs-by-key-hash="itemDefsByKeyHash"
                    :show-subtitle="true"
                    @item-click="emit('item-click', $event)"
                  />
                  <q-btn
                    v-if="row.node.kind === 'item' && row.node.machineItemId"
                    flat
                    dense
                    class="q-ml-xs"
                    style="padding: 0"
                  >
                    <stack-view
                      :content="{ kind: 'item', id: row.node.machineItemId, amount: 1 }"
                      :item-defs-by-key-hash="itemDefsByKeyHash"
                      variant="slot"
                      :show-name="false"
                      :show-subtitle="false"
                    />
                    <q-tooltip>{{
                      row.node.machineName ?? row.node.recipeTypeKeyUsed ?? row.node.machineItemId
                    }}</q-tooltip>
                  </q-btn>
                  <stack-view
                    v-else-if="row.node.kind === 'fluid'"
                    :content="
                      row.node.unit
                        ? {
                            kind: 'fluid',
                            id: row.node.id,
                            amount: formatAmount(row.node.amount),
                            unit: row.node.unit,
                          }
                        : {
                            kind: 'fluid',
                            id: row.node.id,
                            amount: formatAmount(row.node.amount),
                          }
                    "
                    :item-defs-by-key-hash="itemDefsByKeyHash"
                    :show-subtitle="true"
                  />
                  <q-badge
                    v-if="row.node.kind === 'item' && row.node.cycle"
                    :color="row.node.cycleSeed ? 'positive' : 'negative'"
                    class="q-ml-sm"
                  >
                    {{ row.node.cycleSeed ? 'cycle seed' : 'cycle' }}
                  </q-badge>
                  <template
                    v-if="
                      row.node.kind === 'item' && enhancedTreeResult && enhancedTreeResult.totals
                    "
                  >
                    <template v-if="'perMinute' in row.node && row.node.perMinute !== undefined">
                      <q-badge v-if="row.node.perMinute > 0" color="primary" class="q-ml-sm">
                        {{ formatAmount(row.node.perMinute) }}/min
                      </q-badge>
                    </template>
                    <template
                      v-if="
                        'machines' in row.node &&
                        row.node.machines !== undefined &&
                        row.node.machines > 0
                      "
                    >
                      <q-badge color="accent" class="q-ml-sm">
                        {{ formatAmount(row.node.machines) }} 机器
                      </q-badge>
                    </template>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'graph'" class="q-mt-md">
          <div class="row items-center q-gutter-sm">
            <div class="text-caption text-grey-8">目标产出</div>
            <q-input
              dense
              filled
              type="number"
              style="width: 160px"
              :model-value="targetAmount"
              @update:model-value="(v) => (targetAmount = Number(v))"
            />
            <q-select
              dense
              filled
              emit-value
              map-options
              style="min-width: 100px"
              :options="unitOptions"
              :model-value="targetUnit"
              @update:model-value="(v) => (targetUnit = v as (typeof unitOptions)[number]['value'])"
            />
          </div>
          <div v-if="treeResult" class="q-mt-md planner__flow">
            <VueFlow
              id="planner-flow"
              :nodes="flowNodes"
              :edges="flowEdges"
              :nodes-draggable="false"
              :nodes-connectable="false"
              :elements-selectable="false"
              :zoom-on-double-click="false"
              :min-zoom="0.2"
              :max-zoom="2"
              :pan-on-drag="true"
              no-pan-class-name="nopan"
              no-drag-class-name="nodrag"
            >
              <Background :gap="20" pattern-color="rgba(0,0,0,0.12)" />
              <Controls />
              <MiniMap />
              <template #node-itemNode="p">
                <div class="planner__flow-node nodrag nopan">
                  <div
                    class="planner__flow-node-icon cursor-pointer"
                    @click="emit('item-click', p.data.itemKey)"
                  >
                    <stack-view
                      :content="{
                        kind: 'item',
                        id: p.data.itemKey.id,
                        amount: 1,
                        ...(p.data.itemKey.meta !== undefined ? { meta: p.data.itemKey.meta } : {}),
                        ...(p.data.itemKey.nbt !== undefined ? { nbt: p.data.itemKey.nbt } : {}),
                      }"
                      :item-defs-by-key-hash="itemDefsByKeyHash"
                      variant="slot"
                      :show-name="false"
                      :show-subtitle="false"
                    />
                  </div>
                  <div class="planner__flow-node-text" @click.stop @mousedown.stop @dblclick.stop>
                    <div class="planner__flow-node-title">{{ p.data.title }}</div>
                    <div class="planner__flow-node-sub">
                      {{ p.data.subtitle }}
                      <q-badge v-if="p.data.machineCount" color="accent" class="q-ml-xs">
                        x{{ p.data.machineCount }}
                      </q-badge>
                      <q-badge
                        v-if="p.data.cycle"
                        :color="p.data.cycleSeed ? 'positive' : 'negative'"
                        class="q-ml-xs"
                      >
                        {{ p.data.cycleSeed ? 'cycle seed' : 'cycle' }}
                      </q-badge>
                    </div>
                  </div>
                  <div v-if="p.data.machineItemId" class="planner__flow-node-machine">
                    <stack-view
                      :content="{ kind: 'item', id: p.data.machineItemId, amount: 1 }"
                      :item-defs-by-key-hash="itemDefsByKeyHash"
                      variant="slot"
                      :show-name="false"
                      :show-subtitle="false"
                    />
                    <q-tooltip>{{ p.data.machineName ?? p.data.machineItemId }}</q-tooltip>
                  </div>
                </div>
              </template>
              <template #node-fluidNode="p">
                <div class="planner__flow-node planner__flow-node--fluid nodrag nopan">
                  <div class="planner__flow-node-text" @mousedown.stop @dblclick.stop>
                    <div class="planner__flow-node-title">{{ p.data.title }}</div>
                    <div class="planner__flow-node-sub">{{ p.data.subtitle }}</div>
                  </div>
                </div>
              </template>
            </VueFlow>
          </div>
        </div>

        <div v-else class="q-mt-md">
          <div class="row items-center q-gutter-sm">
            <div class="text-caption text-grey-8">目标产出</div>
            <q-input
              dense
              filled
              type="number"
              style="width: 120px"
              :model-value="targetAmount"
              @update:model-value="(v) => (targetAmount = Number(v))"
            />
            <q-select
              dense
              filled
              emit-value
              map-options
              style="min-width: 100px"
              :options="unitOptions"
              :model-value="targetUnit"
              @update:model-value="(v) => (targetUnit = v as (typeof unitOptions)[number]['value'])"
            />
          </div>
          <div v-if="treeResult" class="q-mt-md">
            <div class="text-caption text-grey-8 q-mb-sm">所需原料</div>
            <q-table
              flat
              bordered
              dense
              row-key="id"
              :rows="leafRowsWithRates"
              :columns="leafColumnsWithRates"
              :pagination="{ rowsPerPage: 0 }"
              hide-bottom
            >
              <template #body-cell-name="props">
                <q-td :props="props">
                  <div class="row items-center q-gutter-sm">
                    <stack-view
                      v-if="props.row.itemId"
                      :content="{ kind: 'item', id: props.row.itemId, amount: 1 }"
                      :item-defs-by-key-hash="itemDefsByKeyHash"
                      variant="slot"
                      :show-name="false"
                      :show-subtitle="false"
                      @item-click="emit('item-click', $event)"
                    />
                    <span>{{ props.row.name }}</span>
                  </div>
                </q-td>
              </template>
            </q-table>
            <div v-if="machineRows.length" class="q-mt-md">
              <div class="text-caption text-grey-8 q-mb-sm">所需机器</div>
              <q-table
                flat
                bordered
                dense
                row-key="id"
                :rows="machineRows"
                :columns="machineColumns"
                :pagination="{ rowsPerPage: 0 }"
                hide-bottom
              >
                <template #body-cell-name="props">
                  <q-td :props="props">
                    <div class="row items-center q-gutter-sm">
                      <stack-view
                        :content="{ kind: 'item', id: props.row.id, amount: 1 }"
                        :item-defs-by-key-hash="itemDefsByKeyHash"
                        variant="slot"
                        :show-name="false"
                        :show-subtitle="false"
                        @item-click="emit('item-click', $event)"
                      />
                      <span>{{ props.row.name }}</span>
                    </div>
                  </q-td>
                </template>
              </q-table>
            </div>
            <div v-if="catalystRows.length" class="q-mt-md">
              <div class="text-caption text-grey-8 q-mb-sm">
                催化剂（不计入消耗，总需求取最大值）
              </div>
              <q-table
                flat
                bordered
                dense
                row-key="id"
                :rows="catalystRows"
                :columns="leafColumns"
                :pagination="{ rowsPerPage: 0 }"
                hide-bottom
              >
                <template #body-cell-name="props">
                  <q-td :props="props">
                    <div class="row items-center q-gutter-sm">
                      <stack-view
                        v-if="props.row.itemId"
                        :content="{ kind: 'item', id: props.row.itemId, amount: 1 }"
                        :item-defs-by-key-hash="itemDefsByKeyHash"
                        variant="slot"
                        :show-name="false"
                        :show-subtitle="false"
                        @item-click="emit('item-click', $event)"
                      />
                      <span>{{ props.row.name }}</span>
                    </div>
                  </q-td>
                </template>
              </q-table>
            </div>
            <div v-if="enhancedTreeResult?.totals" class="q-mt-md">
              <div class="text-caption text-grey-8 q-mb-sm">总消耗</div>
              <div class="row q-gutter-md">
                <div class="col">
                  <div class="text-caption text-grey-7">电力</div>
                  <div class="text-body2">{{ totalPower }} kW</div>
                </div>
                <div class="col">
                  <div class="text-caption text-grey-7">污染</div>
                  <div class="text-body2">{{ totalPollution }}/分</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <q-dialog v-model="saveDialogOpen">
        <q-card style="min-width: 420px">
          <q-card-section class="row items-center q-gutter-sm">
            <div class="text-subtitle2">保存合成线路</div>
            <q-space />
            <q-btn flat round icon="close" v-close-popup />
          </q-card-section>
          <q-card-section>
            <q-input
              dense
              filled
              label="线路名称"
              :model-value="saveName"
              @update:model-value="(v) => (saveName = String(v ?? ''))"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="取消" color="grey-7" v-close-popup />
            <q-btn
              unelevated
              label="保存"
              color="primary"
              :disable="!saveName.trim()"
              @click="confirmSave"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ItemDef, ItemId, ItemKey, PackData, Stack } from 'src/jei/types';
import type { JeiIndex } from 'src/jei/indexing/buildIndex';
import { itemKeyHash } from 'src/jei/indexing/key';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { VueFlow, type Edge, type Node } from '@vue-flow/core';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import RecipeViewer from './RecipeViewer.vue';
import StackView from './StackView.vue';
import type {
  PlannerInitialState,
  PlannerLiveState,
  PlannerSavePayload,
} from 'src/jei/planner/plannerUi';
import { DEFAULT_BELT_SPEED } from 'src/jei/planner/units';
import {
  buildRequirementTree,
  buildEnhancedRequirementTree,
  computePlannerDecisions,
  extractRecipeStacks,
  type PlannerDecision,
  type RequirementNode,
  type EnhancedRequirementNode,
} from 'src/jei/planner/planner';

const props = defineProps<{
  pack: PackData;
  index: JeiIndex;
  rootItemKey: ItemKey;
  itemDefsByKeyHash: Record<string, ItemDef>;
  initialState?: PlannerInitialState | null;
}>();

const emit = defineEmits<{
  (e: 'item-click', itemKey: ItemKey): void;
  (e: 'save-plan', payload: PlannerSavePayload): void;
  (e: 'state-change', payload: PlannerLiveState): void;
}>();

const selectedRecipeIdByItemKeyHash = ref<Map<string, string>>(new Map());
const selectedItemIdByTagId = ref<Map<string, ItemId>>(new Map());

const activeTab = ref<'tree' | 'graph' | 'calc'>('tree');
const targetAmount = ref(1);
const targetUnit = ref<'items' | 'per_second' | 'per_minute' | 'per_hour'>('items');
const treeDisplayMode = ref<'list' | 'compact'>('list');
const collapsed = ref<Set<string>>(new Set());

// Unit options for the dropdown
const unitOptions = [
  { label: '个', value: 'items' },
  { label: '个/秒', value: 'per_second' },
  { label: '个/分', value: 'per_minute' },
  { label: '个/时', value: 'per_hour' },
] as const;

function mapToRecord<V extends string>(m: Map<string, V>): Record<string, V> {
  return Object.fromEntries(m.entries()) as Record<string, V>;
}

function emitLiveState() {
  emit('state-change', {
    targetAmount: targetAmount.value,
    selectedRecipeIdByItemKeyHash: mapToRecord(selectedRecipeIdByItemKeyHash.value),
    selectedItemIdByTagId: mapToRecord(selectedItemIdByTagId.value as Map<string, ItemId>),
  });
}

function applyInitialState() {
  const st = props.initialState;
  if (st) {
    selectedRecipeIdByItemKeyHash.value = new Map(
      Object.entries(st.selectedRecipeIdByItemKeyHash ?? {}),
    );
    selectedItemIdByTagId.value = new Map(Object.entries(st.selectedItemIdByTagId ?? {}));
    targetAmount.value = Number(st.targetAmount) || 1;
    activeTab.value = 'tree';
    treeDisplayMode.value = 'list';
    collapsed.value = new Set();
    emitLiveState();
    return;
  }
  selectedRecipeIdByItemKeyHash.value = new Map();
  selectedItemIdByTagId.value = new Map();
  targetAmount.value = 1;
  activeTab.value = 'tree';
  treeDisplayMode.value = 'list';
  collapsed.value = new Set();
  emitLiveState();
}

watch(
  () => [itemKeyHash(props.rootItemKey), props.initialState?.loadKey ?? ''] as const,
  () => applyInitialState(),
  { immediate: true },
);

watch(targetAmount, () => emitLiveState());
watch(targetUnit, () => emitLiveState());

const decisions = computed(() =>
  computePlannerDecisions({
    pack: props.pack,
    index: props.index,
    rootItemKey: props.rootItemKey,
    selectedRecipeIdByItemKeyHash: selectedRecipeIdByItemKeyHash.value,
    selectedItemIdByTagId: selectedItemIdByTagId.value,
  }),
);

const treeResult = computed(() => {
  if (decisions.value.length) return null;
  return buildRequirementTree({
    pack: props.pack,
    index: props.index,
    rootItemKey: props.rootItemKey,
    targetAmount: targetAmount.value,
    targetUnit: targetUnit.value,
    selectedRecipeIdByItemKeyHash: selectedRecipeIdByItemKeyHash.value,
    selectedItemIdByTagId: selectedItemIdByTagId.value,
  });
});

// Enhanced tree result with rate information
const enhancedTreeResult = computed(() => {
  if (decisions.value.length) return null;
  return buildEnhancedRequirementTree({
    pack: props.pack,
    index: props.index,
    rootItemKey: props.rootItemKey,
    targetAmount: targetAmount.value,
    selectedRecipeIdByItemKeyHash: selectedRecipeIdByItemKeyHash.value,
    selectedItemIdByTagId: selectedItemIdByTagId.value,
    targetUnit: targetUnit.value,
  });
});

function decisionKey(d: PlannerDecision) {
  if (d.kind === 'item_recipe') return `item:${d.itemKeyHash}`;
  return `tag:${d.tagId}`;
}

function itemName(key: ItemKey) {
  const def = props.itemDefsByKeyHash[itemKeyHash(key)];
  return def?.name ?? key.id;
}

function recipeOptionsForDecision(d: Extract<PlannerDecision, { kind: 'item_recipe' }>) {
  return d.recipeOptions
    .map((recipeId) => {
      const r = props.index.recipesById.get(recipeId);
      const recipeType = r ? props.index.recipeTypesByKey.get(r.type) : undefined;
      const label = r ? `${recipeType?.displayName ?? r.type}` : recipeId;
      const inputs: Stack[] = r ? extractRecipeStacks(r, recipeType).inputs : [];
      return { label, value: recipeId, inputs, recipe: r, recipeType };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function tagItemOptions(d: Extract<PlannerDecision, { kind: 'tag_item' }>) {
  return d.candidateItemIds
    .map((itemId) => {
      const keyHashes = props.index.itemKeyHashesByItemId.get(itemId) ?? [];
      const keyHash = keyHashes[0];
      const def = keyHash ? props.itemDefsByKeyHash[keyHash] : undefined;
      const label = def?.name ? `${def.name} (${itemId})` : itemId;
      return { label, value: itemId };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function setRecipeChoice(itemKeyHash: string, recipeId: string) {
  const next = new Map(selectedRecipeIdByItemKeyHash.value);
  next.set(itemKeyHash, recipeId);
  selectedRecipeIdByItemKeyHash.value = next;
  emitLiveState();
}

function setTagChoice(tagId: string, itemId: ItemId) {
  const next = new Map(selectedItemIdByTagId.value);
  next.set(tagId, itemId);
  selectedItemIdByTagId.value = next;
  emitLiveState();
}

function resetPlanner() {
  selectedRecipeIdByItemKeyHash.value = new Map();
  selectedItemIdByTagId.value = new Map();
  targetAmount.value = 1;
  activeTab.value = 'tree';
  treeDisplayMode.value = 'list';
  collapsed.value = new Set();
  emitLiveState();
}

const saveDialogOpen = ref(false);
const saveName = ref('');

function openSaveDialog() {
  const base = itemName(props.rootItemKey);
  saveName.value = `${base} 线路`;
  saveDialogOpen.value = true;
}

function confirmSave() {
  const payload: PlannerSavePayload = {
    name: saveName.value.trim(),
    rootItemKey: props.rootItemKey,
    targetAmount: targetAmount.value,
    selectedRecipeIdByItemKeyHash: mapToRecord(selectedRecipeIdByItemKeyHash.value),
    selectedItemIdByTagId: mapToRecord(selectedItemIdByTagId.value as Map<string, ItemId>),
  };
  emit('save-plan', payload);
  saveDialogOpen.value = false;
}

function toggleCollapsed(nodeId: string) {
  const next = new Set(collapsed.value);
  if (next.has(nodeId)) next.delete(nodeId);
  else next.add(nodeId);
  collapsed.value = next;
}

type TreeRow = { node: RequirementNode | EnhancedRequirementNode; depth: number };

const treeRows = computed<TreeRow[]>(() => {
  const result = enhancedTreeResult.value || treeResult.value;
  if (!result) return [];
  const rows: TreeRow[] = [];

  const walk = (node: RequirementNode, depth: number) => {
    rows.push({ node, depth });
    if (node.kind !== 'item') return;
    if (collapsed.value.has(node.nodeId)) return;
    node.children.forEach((c) => walk(c, depth + 1));
  };

  walk(result.root as unknown as RequirementNode, 0);
  return rows;
});

type TreeListRow = {
  node: RequirementNode | EnhancedRequirementNode;
  connect: boolean[];
};

const treeListRows = computed<TreeListRow[]>(() => {
  const result = enhancedTreeResult.value || treeResult.value;
  if (!result) return [];
  const rows: TreeListRow[] = [];

  const walk = (node: RequirementNode, connect: boolean[]) => {
    rows.push({ node, connect });
    if (node.kind !== 'item') return;
    if (collapsed.value.has(node.nodeId)) return;
    node.children.forEach((c, idx) => walk(c, [...connect, idx !== node.children.length - 1]));
  };

  walk(result.root as unknown as RequirementNode, []);
  return rows;
});

const rateColumnLabel = computed(() => {
  if (targetUnit.value === 'items') return '数量';
  if (targetUnit.value === 'per_second') return '物品/秒';
  if (targetUnit.value === 'per_hour') return '物品/时';
  return '物品/分';
});

function finiteOr(n: unknown, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function nodeDisplayAmount(node: RequirementNode | EnhancedRequirementNode): number {
  return finiteOr(node.amount, 0);
}

function nodeDisplayRate(node: RequirementNode | EnhancedRequirementNode): number {
  const amount = nodeDisplayAmount(node);
  if (targetUnit.value === 'items') return amount;
  if (targetUnit.value === 'per_second') return amount / 60;
  if (targetUnit.value === 'per_hour') return amount * 60;
  return amount;
}

function nodeBeltsText(node: RequirementNode | EnhancedRequirementNode): string {
  if (targetUnit.value === 'items') return '';
  if (node.kind !== 'item') return '';
  const perSecond = nodeDisplayAmount(node) / 60;
  const belts = perSecond / DEFAULT_BELT_SPEED;
  if (!Number.isFinite(belts) || belts <= 0) return '';
  if (belts < 0.1) return '<0.1';
  return String(formatAmount(belts));
}

function nodeMachinesText(node: RequirementNode | EnhancedRequirementNode): string {
  if (node.kind !== 'item') return '';
  const meta = node as unknown as { machineCount?: unknown; machines?: unknown };
  const machineCount = finiteOr(meta.machineCount, 0);
  if (Number.isFinite(machineCount) && machineCount > 0) return String(Math.round(machineCount));
  const machines = finiteOr(meta.machines, 0);
  if (!Number.isFinite(machines) || machines <= 0) return '';
  return String(Math.ceil(machines - 1e-9));
}

function nodePowerText(node: RequirementNode | EnhancedRequirementNode): string {
  if (node.kind !== 'item') return '';
  const power = finiteOr((node as EnhancedRequirementNode & { kind: 'item' }).power, 0);
  if (!Number.isFinite(power) || power <= 0) return '';
  return `${formatAmount(power)} kW`;
}

function formatAmount(n: number) {
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n * 1000) / 1000;
  return rounded;
}

type FlowItemData = {
  itemKey: ItemKey;
  title: string;
  subtitle: string;
  cycle: boolean;
  cycleSeed: boolean;
  machineItemId?: string;
  machineName?: string;
  machineCount?: number;
};
type FlowFluidData = {
  title: string;
  subtitle: string;
};

type FlowItemNode = Omit<Extract<RequirementNode, { kind: 'item' }>, 'children'> & {
  children: FlowNode[];
} & Partial<Extract<EnhancedRequirementNode, { kind: 'item' }>>;

type FlowFluidNode = Extract<RequirementNode, { kind: 'fluid' }> &
  Partial<Extract<EnhancedRequirementNode, { kind: 'fluid' }>>;

type FlowNode = FlowItemNode | FlowFluidNode;

const flow = computed(() => {
  const result = enhancedTreeResult.value || treeResult.value;
  if (!result) return { nodes: [] as Node[], edges: [] as Edge[] };

  const root = result.root as unknown as FlowNode;

  const nodeW = 260;
  const nodeH = 56;
  const gapX = 28;
  const gapY = 40;
  const pad = 18;

  const nodes: Node[] = [];
  const layouts: Array<{ node: FlowNode; depth: number; x: number }> = [];
  const xById = new Map<string, number>();
  let nextX = 0;

  const layout = (node: FlowNode, depth: number): number => {
    if (xById.has(node.nodeId)) return xById.get(node.nodeId)!;

    let x: number;
    if (node.kind !== 'item' || node.children.length === 0) {
      x = nextX;
      nextX += 1;
    } else if (node.children.length === 1) {
      x = layout(node.children[0]!, depth + 1);
    } else {
      const childXs = node.children
        .map((c: FlowNode) => layout(c, depth + 1))
        .sort((a: number, b: number) => a - b);
      x = (childXs[0]! + childXs[childXs.length - 1]!) / 2;
    }

    xById.set(node.nodeId, x);
    layouts.push({ node, depth, x });
    return x;
  };

  layout(root, 0);
  layouts.sort((a, b) => a.depth - b.depth || a.x - b.x);

  layouts.forEach(({ node, depth, x }) => {
    const px = pad + x * (nodeW + gapX);
    const py = pad + depth * (nodeH + gapY);
    if (node.kind === 'item') {
      const machineCount = finiteOr(node.machineCount, 0);
      const unitSuffix =
        targetUnit.value === 'per_second'
          ? '/s'
          : targetUnit.value === 'per_hour'
            ? '/h'
            : targetUnit.value === 'per_minute'
              ? '/min'
              : '';
      const subtitle = unitSuffix
        ? `${formatAmount(nodeDisplayRate(node))}${unitSuffix}`
        : `${formatAmount(nodeDisplayAmount(node))}`;
      nodes.push({
        id: node.nodeId,
        type: 'itemNode',
        position: { x: px, y: py },
        draggable: false,
        selectable: false,
        data: {
          itemKey: node.itemKey,
          title: itemName(node.itemKey),
          subtitle,
          cycle: node.cycle,
          cycleSeed: !!node.cycleSeed,
          ...(node.machineItemId ? { machineItemId: node.machineItemId } : {}),
          ...(node.machineName ? { machineName: node.machineName } : {}),
          ...(machineCount > 0 ? { machineCount } : {}),
        } satisfies FlowItemData,
      });
    } else {
      nodes.push({
        id: node.nodeId,
        type: 'fluidNode',
        position: { x: px, y: py },
        draggable: false,
        selectable: false,
        data: {
          title: node.id,
          subtitle: `${formatAmount(node.amount)}${node.unit ?? ''}`,
        } satisfies FlowFluidData,
      });
    }
  });

  const edges: Edge[] = [];
  const walkEdges = (node: FlowNode) => {
    if (node.kind !== 'item') return;
    node.children.forEach((c: FlowNode, idx: number) => {
      edges.push({
        id: `${node.nodeId}->${c.nodeId}:${idx}`,
        source: node.nodeId,
        target: c.nodeId,
        type: 'smoothstep',
      });
      walkEdges(c);
    });
  };
  walkEdges(root);

  return { nodes, edges };
});

const flowNodes = computed(() => flow.value.nodes);
const flowEdges = computed(() => flow.value.edges);

const leafColumns = [
  { name: 'name', label: '物品', field: 'name', align: 'left' as const },
  { name: 'amount', label: '数量', field: 'amount', align: 'right' as const },
  { name: 'id', label: 'ID', field: 'id', align: 'left' as const },
];

type LeafRow = { id: string; itemId?: string; name: string; amount: number };

const catalystRows = computed<LeafRow[]>(() => {
  const result = treeResult.value;
  if (!result) return [];
  const rows: LeafRow[] = [];
  result.catalysts.forEach((amount, itemId) => {
    const keyHashes = props.index.itemKeyHashesByItemId.get(itemId) ?? [];
    const keyHash = keyHashes[0];
    const def = keyHash ? props.itemDefsByKeyHash[keyHash] : undefined;
    rows.push({
      id: itemId,
      itemId: itemId,
      name: def?.name ?? itemId,
      amount: formatAmount(amount)
    });
  });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
});

// Enhanced columns with rate information
const leafColumnsWithRates = [
  { name: 'name', label: '物品', field: 'name', align: 'left' as const },
  { name: 'amount', label: '数量', field: 'amount', align: 'right' as const },
  { name: 'rate', label: '速率/分', field: 'rate', align: 'right' as const },
  { name: 'id', label: 'ID', field: 'id', align: 'left' as const },
];

type LeafRowWithRate = { id: string; itemId?: string; name: string; amount: number; rate: number };

const leafRowsWithRates = computed<LeafRowWithRate[]>(() => {
  const result = enhancedTreeResult.value || treeResult.value;
  if (!result) return [];
  const rows: LeafRowWithRate[] = [];
  const leafAmounts = new Map<string, number>();
  const leafRates = new Map<string, number>();

  // Walk the tree and collect leaf nodes (items with no children)
  const walkLeaves = (node: RequirementNode | EnhancedRequirementNode) => {
    if (node.kind === 'item') {
      if (node.children.length === 0) {
        // This is a leaf item
        const itemId = node.itemKey.id;
        const amount = nodeDisplayAmount(node);
        const prevAmount = leafAmounts.get(itemId) ?? 0;
        leafAmounts.set(itemId, prevAmount + amount);

        if ('perMinute' in node && node.perMinute !== undefined) {
          const prevRate = leafRates.get(itemId) ?? 0;
          leafRates.set(itemId, prevRate + node.perMinute);
        }
      } else {
        // Recurse into children
        node.children.forEach((c) => walkLeaves(c));
      }
    }
  };
  walkLeaves(result.root);

  // Convert to rows
  leafAmounts.forEach((amount, itemId) => {
    const keyHashes = props.index.itemKeyHashesByItemId.get(itemId) ?? [];
    const keyHash = keyHashes[0];
    const def = keyHash ? props.itemDefsByKeyHash[keyHash] : undefined;

    let rate = 0;
    if (targetUnit.value === 'items') {
      rate = leafRates.get(itemId) ?? 0;
    } else {
      rate = amount;
    }

    rows.push({
      id: itemId,
      itemId: itemId,
      name: def?.name ?? itemId,
      amount: formatAmount(amount),
      rate: rate > 0 ? formatAmount(rate) : 0,
    });
  });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
});

// Machine columns and rows
const machineColumns = [
  { name: 'name', label: '机器', field: 'name', align: 'left' as const },
  { name: 'count', label: '数量', field: 'count', align: 'right' as const },
];

type MachineRow = { id: string; name: string; count: number };

const machineRows = computed<MachineRow[]>(() => {
  const enhanced = enhancedTreeResult.value;
  if (!enhanced?.totals?.machines) return [];
  const rows: MachineRow[] = [];
  enhanced.totals.machines.forEach((count, machineId) => {
    const keyHashes = props.index.itemKeyHashesByItemId.get(machineId) ?? [];
    const keyHash = keyHashes[0];
    const def = keyHash ? props.itemDefsByKeyHash[keyHash] : undefined;
    rows.push({
      id: machineId,
      name: def?.name ?? machineId,
      count: count > 0 ? formatAmount(count) : 0,
    });
  });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
});

// Power and pollution totals
const totalPower = computed(() => {
  const enhanced = enhancedTreeResult.value;
  if (!enhanced?.totals?.power) return '0';
  return formatAmount(enhanced.totals.power);
});

const totalPollution = computed(() => {
  const enhanced = enhancedTreeResult.value;
  if (!enhanced?.totals?.pollution) return '0';
  return formatAmount(enhanced.totals.pollution);
});
</script>

<style scoped>
.planner {
  width: 100%;
}

.planner__decision {
  border-left: 4px solid rgba(0, 0, 0, 0.08);
  padding-left: 10px;
}

.planner__recipe-option-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 6px;
}

.planner__recipe-option-more {
  align-self: center;
}

.monospace {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-variant-numeric: tabular-nums;
}

.planner__tree-table {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
}

.planner__tree-table-header,
.planner__tree-table-row {
  display: flex;
  align-items: center;
}

.planner__tree-table-header {
  background: rgba(0, 0, 0, 0.04);
  font-size: 12px;
  font-weight: 600;
}

.planner__tree-table-row {
  min-height: 46px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.planner__tree-col {
  padding: 8px 10px;
  min-width: 0;
}

.planner__tree-col--tree {
  flex: 1 1 auto;
  overflow: hidden;
}

.planner__tree-col--rate {
  flex: 0 0 110px;
}

.planner__tree-col--belts {
  flex: 0 0 90px;
}

.planner__tree-col--machines {
  flex: 0 0 140px;
}

.planner__tree-col--power {
  flex: 0 0 110px;
}

.planner__links {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 46px;
  overflow: hidden;
}

.planner__connect {
  position: relative;
  margin-left: 12px;
  height: 100vh;
}

.planner__connect--last,
.planner__connect--trail {
  border-left: 2px dotted rgba(0, 0, 0, 0.35);
}

.planner__connect--last:not(.planner__connect--trail) {
  margin-bottom: 50vh;
  height: 50vh;
}

.planner__connect + .planner__connect {
  margin-left: 18px;
}

.planner__tree-toggle {
  display: flex;
  align-items: center;
  width: 28px;
}

.planner__tree-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
}

.planner__tree-name {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
  padding-left: 8px;
}

.planner__tree-name-main {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.planner__tree-name-sub {
  line-height: 1.1;
}

.planner__machines-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.planner__machines-text {
  min-width: 0;
}

.planner__tree-table-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(0, 0, 0, 0.02);
}

.planner__tree-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
}

.planner__tree-footer-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.72);
}

.planner__tree-footer-values {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.72);
}

.planner__tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.planner__tree-indent {
  flex: 0 0 auto;
}

.planner__tree-content {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
  flex: 1 1 auto;
}

.planner__flow {
  width: 100%;
  height: 640px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: #fff;
}

.planner__flow-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.18);
  background: white;
  min-width: 220px;
  max-width: 320px;
}

.planner__flow-node--fluid {
  min-width: 180px;
}

.planner__flow-node-text {
  min-width: 0;
  flex: 1 1 auto;
  user-select: text;
  -webkit-user-select: text;
}

.planner__flow-node-title {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: text;
  -webkit-user-select: text;
}

.planner__flow-node-sub {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 4px;
  user-select: text;
  -webkit-user-select: text;
}

.planner__flow-node-machine {
  flex: 0 0 auto;
}
</style>
