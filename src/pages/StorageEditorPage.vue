<template>
  <q-page class="storage-editor-page">
    <q-card class="storage-card">
      <q-card-section class="q-pa-md">
        <div class="text-h4 q-mb-md">
          <q-icon name="storage" class="q-mr-sm" />
          Storage 编辑器
        </div>
      </q-card-section>

      <q-tabs v-model="tab" class="text-grey" active-color="primary" indicator-color="primary">
        <q-tab name="localStorage" label="LocalStorage" />
        <q-tab name="sessionStorage" label="SessionStorage" />
        <q-tab name="iconCache" label="物品图标缓存" />
        <q-tab name="indexedDb" label="IndexedDB" />
      </q-tabs>

      <q-separator />

      <q-card-section class="q-pa-md column" style="flex: 1; min-height: 0">
        <div v-if="tab === 'indexedDb'" class="column" style="flex: 1; min-height: 0">
          <div class="row q-gutter-md q-mb-md">
            <q-input
              v-model="idbSearch"
              outlined
              dense
              placeholder="搜索键名..."
              class="col"
              clearable
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
            <q-btn
              color="negative"
              icon="delete"
              label="删除选中"
              :disable="!selectedIndexedDbEntry"
              @click="confirmDeleteSelectedEntry"
            />
            <q-btn
              color="negative"
              icon="delete_sweep"
              label="清空选中存储"
              :disable="!selectedIndexedDbStore"
              @click="confirmClearIndexedDb"
            />
            <q-btn color="secondary" icon="refresh" label="刷新" @click="loadIndexedDb" />
          </div>

          <div class="text-caption text-grey-7 q-mb-sm">
            条目数量：{{ idbEntryCount }}，总大小：{{ formatBytes(idbTotalSize) }}
          </div>

          <div style="flex: 1; overflow: hidden">
            <q-tree
              class="idb-tree"
              node-key="id"
              :nodes="idbTreeNodes"
              :filter="idbSearch"
              v-model:selected="idbSelected"
              default-expand-all
            >
              <template #default-header="prop">
                <div class="row items-center no-wrap idb-tree-node">
                  <div class="idb-node-label">{{ prop.node.label }}</div>
                  <div v-if="prop.node.caption" class="idb-node-caption">
                    {{ prop.node.caption }}
                  </div>
                </div>
              </template>
            </q-tree>
          </div>
        </div>

        <div v-else-if="tab === 'iconCache'" class="column" style="flex: 1; min-height: 0">
          <div class="row q-gutter-md q-mb-md">
            <q-input
              v-model="iconCacheSearch"
              outlined
              dense
              placeholder="搜索 URL..."
              class="col"
              clearable
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
            <q-btn
              color="negative"
              icon="delete_sweep"
              label="清空缓存"
              @click="confirmClearIconCache"
            />
            <q-btn color="secondary" icon="refresh" label="刷新" @click="loadIconCache" />
          </div>

          <div class="text-caption text-grey-7 q-mb-sm">
            缓存数量：{{ iconCacheCount }}，总大小：{{ formatBytes(iconCacheTotalSize) }}
          </div>

          <div style="flex: 1; overflow: hidden">
            <q-table
              :rows="iconCacheFiltered"
              :columns="iconCacheColumns"
              row-key="key"
              flat
              bordered
              :pagination="{ rowsPerPage: 20 }"
              :filter="iconCacheSearch"
              class="storage-table"
              virtual-scroll
            >
              <template #body-cell-icon="props">
                <q-td :props="props" class="text-center">
                  <q-img
                    :src="props.row.previewUrl || props.row.url"
                    :alt="props.row.url"
                    width="32px"
                    height="32px"
                    fit="contain"
                    class="icon-cache-thumb"
                    @click="openImageViewer(props.row.previewUrl || props.row.url, props.row.url)"
                  />
                </q-td>
              </template>
              <template #body-cell-url="props">
                <q-td :props="props">
                  <div class="storage-value">{{ props.row.url }}</div>
                </q-td>
              </template>
              <template #body-cell-size="props">
                <q-td :props="props">{{ formatBytes(props.row.size) }}</q-td>
              </template>
              <template #body-cell-updatedAt="props">
                <q-td :props="props">{{ formatTime(props.row.updatedAt) }}</q-td>
              </template>
              <template #body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    flat
                    dense
                    round
                    icon="content_copy"
                    color="secondary"
                    @click="copyValue(props.row.url)"
                  />
                  <q-btn
                    flat
                    dense
                    round
                    icon="delete"
                    color="negative"
                    @click="deleteIconCacheItem(props.row.key)"
                  />
                </q-td>
              </template>
            </q-table>
          </div>
        </div>

        <div v-else class="column" style="flex: 1; min-height: 0">
          <div class="row q-gutter-md q-mb-md">
            <q-input
              v-model="searchQuery"
              outlined
              dense
              placeholder="搜索键名..."
              class="col"
              clearable
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
            <q-btn color="primary" icon="add" label="添加项" @click="showAddDialog = true" />
            <q-btn color="negative" icon="delete_sweep" label="清空全部" @click="confirmClearAll" />
            <q-btn color="secondary" icon="refresh" label="刷新" @click="loadStorage" />
          </div>

          <div style="flex: 1; overflow: hidden">
            <q-table
              :rows="filteredItems"
              :columns="columns"
              row-key="key"
              flat
              bordered
              :pagination="{ rowsPerPage: 20 }"
              :filter="searchQuery"
              class="storage-table"
              virtual-scroll
            >
              <template #body-cell-value="props">
                <q-td :props="props">
                  <div class="storage-value">{{ props.row.value }}</div>
                </q-td>
              </template>
              <template #body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    flat
                    dense
                    round
                    icon="edit"
                    color="primary"
                    @click="editItem(props.row)"
                  />
                  <q-btn
                    flat
                    dense
                    round
                    icon="content_copy"
                    color="secondary"
                    @click="copyValue(props.row.value)"
                  />
                  <q-btn
                    flat
                    dense
                    round
                    icon="delete"
                    color="negative"
                    @click="deleteItem(props.row.key)"
                  />
                </q-td>
              </template>
            </q-table>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- 添加/编辑对话框 -->
    <q-dialog v-model="showEditDialog" persistent>
      <q-card style="min-width: 600px; max-width: 900px">
        <q-card-section>
          <div class="text-h6">{{ editingKey ? '编辑项' : '添加项' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none column">
          <q-input
            v-model="editForm.key"
            outlined
            label="键名"
            :disable="!!editingKey"
            class="q-mb-md"
          />

          <div class="row items-center q-mb-md">
            <span class="col">值</span>
            <q-btn
              v-if="isJsonValue"
              flat
              dense
              size="sm"
              color="primary"
              icon="auto_awesome"
              label="格式化 JSON"
              @click="formatJson"
            />
            <q-badge
              v-if="isJsonValue"
              outline
              :color="jsonValid ? 'positive' : 'negative'"
              class="q-ml-sm"
              align="middle"
            >
              <q-icon :name="jsonValid ? 'check_circle' : 'error'" size="16px" class="q-mr-xs" />
              {{ jsonValid ? 'JSON 有效' : 'JSON 无效' }}
            </q-badge>
            <q-btn
              flat
              dense
              size="sm"
              color="secondary"
              icon="swap_horiz"
              :label="jsonPreview ? '编辑' : '预览'"
              @click="jsonPreview = !jsonPreview"
            />
          </div>

          <div v-if="!jsonPreview" class="q-gutter-md column" style="flex: 1">
            <q-input
              v-model="editForm.value"
              outlined
              label="值内容"
              type="textarea"
              rows="8"
              autogrow
              @update:model-value="validateJson"
              style="flex: 1"
            />
            <div class="text-caption text-grey-7">
              提示：可以输入 JSON 字符串，系统会自动检测并提供格式化功能
            </div>
          </div>

          <div v-else class="column q-gutter-md" style="flex: 1">
            <div class="text-subtitle2">JSON 预览</div>
            <pre
              v-if="jsonValid"
              class="json-preview q-pa-md rounded-borders"
              style="overflow-x: auto; flex: 1; margin: 0"
            ><code>{{ JSON.stringify(JSON.parse(editForm.value), null, 2) }}</code></pre>
            <div v-else class="json-preview-error q-pa-md rounded-borders text-negative">
              <q-icon name="error" class="q-mr-sm" />
              无效的 JSON 格式
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" @click="closeEditDialog" />
          <q-btn
            flat
            label="保存"
            color="primary"
            @click="saveItem"
            :disable="isJsonValue && !jsonValid"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="imageViewerOpen" maximized>
      <q-card class="full-width full-height image-viewer-card">
        <q-card-section class="row items-center">
          <div class="text-subtitle1">{{ imageViewerName }}</div>
          <q-space />
          <q-btn flat round icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-none image-viewer-content">
          <InlineImageViewer :src="imageViewerSrc" :name="imageViewerName" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import {
  IDB_STORE_NAMES,
  idbClearIconCache,
  idbClearStore,
  idbDeleteIconCache,
  idbDeleteStoreEntry,
  idbListIconCache,
  idbListStoreEntries,
  type IdbStoreName,
} from 'src/jei/utils/idb';
import InlineImageViewer from 'src/components/InlineImageViewer.vue';

const $q = useQuasar();

interface StorageItem {
  key: string;
  value: string;
  size: number;
}

interface IconCacheItem {
  key: string;
  url: string;
  size: number;
  updatedAt: number;
  previewUrl: string;
}

interface IndexedDbNode {
  id: string;
  label: string;
  caption?: string;
  type: 'db' | 'store' | 'entry';
  storeName?: IdbStoreName;
  entryKey?: string;
  entrySize?: number;
  entryUpdatedAt?: number;
  children?: IndexedDbNode[];
}

const tab = ref('localStorage');
const searchQuery = ref('');
const items = ref<StorageItem[]>([]);
const idbSearch = ref('');
const idbTreeNodes = ref<IndexedDbNode[]>([]);
const idbSelected = ref<string | null>(null);
const idbNodeMap = ref<Record<string, IndexedDbNode>>({});
const iconCacheSearch = ref('');
const iconCacheItems = ref<IconCacheItem[]>([]);
const showEditDialog = ref(false);
const showAddDialog = ref(false);
const editingKey = ref('');
const editForm = ref({
  key: '',
  value: '',
});
const jsonPreview = ref(false);
const jsonValid = ref(false);
const imageViewerOpen = ref(false);
const imageViewerSrc = ref('');
const imageViewerName = ref('');

const isJsonValue = computed(() => {
  const trimmed = editForm.value.value.trim();
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  );
});

function validateJson() {
  if (!isJsonValue.value) {
    jsonValid.value = false;
    return;
  }

  try {
    JSON.parse(editForm.value.value);
    jsonValid.value = true;
  } catch {
    // 尝试格式化看是否能有效
    try {
      const trimmed = editForm.value.value.trim();
      JSON.parse(trimmed);
      jsonValid.value = true;
    } catch {
      jsonValid.value = false;
    }
  }
}

function formatJson() {
  try {
    const parsed = JSON.parse(editForm.value.value);
    editForm.value.value = JSON.stringify(parsed, null, 2);
    jsonValid.value = true;
    $q.notify({
      type: 'positive',
      message: 'JSON 已格式化',
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '无法格式化：' + (error as Error).message,
    });
    jsonValid.value = false;
  }
}

const columns = [
  {
    name: 'key',
    label: '键名',
    field: 'key',
    align: 'left' as const,
    sortable: true,
  },
  {
    name: 'value',
    label: '值',
    field: 'value',
    align: 'left' as const,
    sortable: false,
  },
  {
    name: 'size',
    label: '大小 (bytes)',
    field: 'size',
    align: 'right' as const,
    sortable: true,
  },
  {
    name: 'actions',
    label: '操作',
    field: 'actions',
    align: 'center' as const,
  },
];

const iconCacheColumns = [
  {
    name: 'icon',
    label: '图标',
    field: 'previewUrl',
    align: 'center' as const,
    sortable: false,
  },
  {
    name: 'url',
    label: 'URL',
    field: 'url',
    align: 'left' as const,
    sortable: false,
  },
  {
    name: 'size',
    label: '大小',
    field: 'size',
    align: 'right' as const,
    sortable: true,
  },
  {
    name: 'updatedAt',
    label: '更新时间',
    field: 'updatedAt',
    align: 'left' as const,
    sortable: true,
  },
  {
    name: 'actions',
    label: '操作',
    field: 'actions',
    align: 'center' as const,
  },
];

const idbStoreLabels: Record<IdbStoreName, string> = {
  editor_assets: '编辑器资源',
  editor_packs: 'Pack 压缩包',
  item_icon_cache: '物品图标缓存',
};

const currentStorage = computed(() => {
  return tab.value === 'localStorage' ? localStorage : sessionStorage;
});

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value;
  const query = searchQuery.value.toLowerCase();
  return items.value.filter((item) => item.key.toLowerCase().includes(query));
});

const iconCacheFiltered = computed(() => {
  if (!iconCacheSearch.value) return iconCacheItems.value;
  const query = iconCacheSearch.value.toLowerCase();
  return iconCacheItems.value.filter((item) => item.url.toLowerCase().includes(query));
});

const iconCacheTotalSize = computed(() =>
  iconCacheItems.value.reduce((sum, item) => sum + item.size, 0),
);

const iconCacheCount = computed(() => iconCacheItems.value.length);

const idbEntryCount = computed(() => {
  let total = 0;
  idbTreeNodes.value.forEach((dbNode) => {
    dbNode.children?.forEach((storeNode) => {
      total += storeNode.children?.length ?? 0;
    });
  });
  return total;
});

const idbTotalSize = computed(() => {
  let total = 0;
  idbTreeNodes.value.forEach((dbNode) => {
    dbNode.children?.forEach((storeNode) => {
      storeNode.children?.forEach((entry) => {
        total += entry.entrySize ?? 0;
      });
    });
  });
  return total;
});

const selectedIndexedDbNode = computed(() =>
  idbSelected.value ? idbNodeMap.value[idbSelected.value] : undefined,
);

const selectedIndexedDbStore = computed(() =>
  selectedIndexedDbNode.value?.type === 'store' ? selectedIndexedDbNode.value : undefined,
);

const selectedIndexedDbEntry = computed(() =>
  selectedIndexedDbNode.value?.type === 'entry' ? selectedIndexedDbNode.value : undefined,
);

function loadStorage() {
  const storage = currentStorage.value;
  const result: StorageItem[] = [];

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) {
      const value = storage.getItem(key) || '';
      result.push({
        key,
        value,
        size: new Blob([value]).size,
      });
    }
  }

  items.value = result.sort((a, b) => a.key.localeCompare(b.key));
}

function getJsonSize(value: unknown) {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

function getValuePreview(value: unknown) {
  if (value instanceof Blob) {
    const type = value.type || 'blob';
    return `Blob(${type}, ${value.size} bytes)`;
  }

  if (value && typeof value === 'object' && 'blob' in value) {
    const record = value as { blob?: unknown; url?: unknown };
    if (record.blob instanceof Blob) {
      const url = typeof record.url === 'string' ? record.url : '';
      return url ? `icon_cache: ${url}` : 'icon_cache';
    }
  }

  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (value && typeof value === 'object') {
    try {
      const record = value as Record<string, unknown>;
      if ('blob' in record && record.blob instanceof Blob) {
        const { blob, ...rest } = record as { blob: Blob } & Record<string, unknown>;
        return JSON.stringify({
          ...rest,
          blob: { type: blob.type || 'blob', size: blob.size },
        });
      }
      return JSON.stringify(value);
    } catch {
      return '[object]';
    }
  }

  return '';
}

function getIndexedDbMeta(value: unknown) {
  if (value instanceof Blob) {
    return {
      type: value.type || 'blob',
      size: value.size,
      updatedAt: 0,
      preview: getValuePreview(value),
    };
  }

  if (value && typeof value === 'object' && 'blob' in value) {
    const record = value as { blob?: unknown; size?: unknown; updatedAt?: unknown };
    if (record.blob instanceof Blob) {
      return {
        type: 'icon_cache',
        size: typeof record.size === 'number' ? record.size : record.blob.size,
        updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : 0,
        preview: getValuePreview(value),
      };
    }
  }

  if (typeof value === 'string') {
    return {
      type: 'string',
      size: new Blob([value]).size,
      updatedAt: 0,
      preview: getValuePreview(value),
    };
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return {
      type: typeof value,
      size: new Blob([String(value)]).size,
      updatedAt: 0,
      preview: getValuePreview(value),
    };
  }

  if (Array.isArray(value)) {
    return {
      type: 'array',
      size: getJsonSize(value),
      updatedAt: 0,
      preview: getValuePreview(value),
    };
  }

  if (value && typeof value === 'object') {
    return {
      type: 'object',
      size: getJsonSize(value),
      updatedAt: 0,
      preview: getValuePreview(value),
    };
  }

  return {
    type: 'unknown',
    size: 0,
    updatedAt: 0,
    preview: '',
  };
}

async function loadIndexedDb() {
  const entriesByStore = await Promise.all(
    IDB_STORE_NAMES.map(async (storeName) => {
      const list = await idbListStoreEntries(storeName);
      return { storeName, list };
    }),
  );

  const nodeMap: Record<string, IndexedDbNode> = {};
  const storeNodes: IndexedDbNode[] = entriesByStore.map(({ storeName, list }) => {
    const entryNodes = list
      .map(({ key, value }) => {
        const meta = getIndexedDbMeta(value);
        const node: IndexedDbNode = {
          id: `entry:${storeName}:${key}`,
          type: 'entry',
          storeName,
          entryKey: key,
          entrySize: meta.size,
          entryUpdatedAt: meta.updatedAt,
          label: key,
          caption: meta.preview,
        };
        nodeMap[node.id] = node;
        return node;
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    const totalSize = entryNodes.reduce((sum, node) => sum + (node.entrySize ?? 0), 0);
    const storeNode: IndexedDbNode = {
      id: `store:${storeName}`,
      type: 'store',
      storeName,
      label: idbStoreLabels[storeName],
      caption: `条目 ${entryNodes.length} · ${formatBytes(totalSize)}`,
      children: entryNodes,
    };
    nodeMap[storeNode.id] = storeNode;
    return storeNode;
  });

  const dbNode: IndexedDbNode = {
    id: 'db:jei-web',
    type: 'db',
    label: 'jei-web',
    children: storeNodes,
  };
  nodeMap[dbNode.id] = dbNode;
  idbTreeNodes.value = [dbNode];
  idbNodeMap.value = nodeMap;
}

async function loadIconCache() {
  iconCacheItems.value.forEach((item) => {
    if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
  const list = await idbListIconCache();
  iconCacheItems.value = list
    .map(({ key, entry }) => ({
      key,
      url: entry.url,
      size: entry.size,
      updatedAt: entry.updatedAt,
      previewUrl: entry.blob ? URL.createObjectURL(entry.blob) : entry.url,
    }))
    .sort((a, b) => a.url.localeCompare(b.url));
}

function editItem(item: StorageItem) {
  editingKey.value = item.key;
  editForm.value = {
    key: item.key,
    value: item.value,
  };
  showEditDialog.value = true;
}

function deleteItem(key: string) {
  $q.dialog({
    title: '确认删除',
    message: `确定要删除键名为 "${key}" 的项吗？`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    currentStorage.value.removeItem(key);
    loadStorage();
    $q.notify({
      type: 'positive',
      message: '删除成功',
    });
  });
}

function confirmClearAll() {
  $q.dialog({
    title: '确认清空',
    message: `确定要清空所有 ${tab.value} 项吗？此操作不可恢复！`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    currentStorage.value.clear();
    loadStorage();
    $q.notify({
      type: 'positive',
      message: '清空成功',
    });
  });
}

function confirmClearIconCache() {
  $q.dialog({
    title: '确认清空',
    message: '确定要清空所有物品图标缓存吗？此操作不可恢复！',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void clearIconCache();
  });
}

function deleteIconCacheItem(key: string) {
  $q.dialog({
    title: '确认删除',
    message: '确定要删除该缓存项吗？',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void removeIconCacheItem(key);
  });
}

function confirmClearIndexedDb() {
  const store = selectedIndexedDbStore.value?.storeName;
  if (!store) return;
  $q.dialog({
    title: '确认清空',
    message: '确定要清空选中的 IndexedDB 存储吗？此操作不可恢复！',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void clearIndexedDb(store);
  });
}

function confirmDeleteSelectedEntry() {
  const entry = selectedIndexedDbEntry.value;
  if (!entry?.storeName || !entry.entryKey) return;
  const storeName = entry.storeName;
  const entryKey = entry.entryKey;
  $q.dialog({
    title: '确认删除',
    message: `确定要删除键名为 "${entryKey}" 的项吗？`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void removeIndexedDbEntry(storeName, entryKey);
  });
}

function saveItem() {
  if (!editForm.value.key) {
    $q.notify({
      type: 'negative',
      message: '键名不能为空',
    });
    return;
  }

  try {
    currentStorage.value.setItem(editForm.value.key, editForm.value.value);
    loadStorage();
    closeEditDialog();
    $q.notify({
      type: 'positive',
      message: '保存成功',
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '保存失败: ' + (error as Error).message,
    });
  }
}

function closeEditDialog() {
  showEditDialog.value = false;
  showAddDialog.value = false;
  editingKey.value = '';
  editForm.value = {
    key: '',
    value: '',
  };
  jsonPreview.value = false;
  jsonValid.value = false;
}

function copyValue(value: string) {
  navigator.clipboard
    .writeText(value)
    .then(() => {
      $q.notify({
        type: 'positive',
        message: '已复制到剪贴板',
      });
    })
    .catch(() => {
      $q.notify({
        type: 'negative',
        message: '复制失败',
      });
    });
}

function formatBytes(value: number) {
  if (!Number.isFinite(value)) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '-';
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function openImageViewer(src: string, name?: string) {
  if (!src) return;
  imageViewerSrc.value = src;
  imageViewerName.value = name || '';
  imageViewerOpen.value = true;
}

async function clearIconCache() {
  iconCacheItems.value.forEach((item) => {
    if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
  await idbClearIconCache();
  await loadIconCache();
  $q.notify({
    type: 'positive',
    message: '清空成功',
  });
}

async function removeIconCacheItem(key: string) {
  const item = iconCacheItems.value.find((entry) => entry.key === key);
  if (item?.previewUrl && item.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(item.previewUrl);
  }
  await idbDeleteIconCache(key);
  await loadIconCache();
  $q.notify({
    type: 'positive',
    message: '删除成功',
  });
}

async function clearIndexedDb(storeName: IdbStoreName) {
  await idbClearStore(storeName);
  await loadIndexedDb();
  $q.notify({
    type: 'positive',
    message: '清空成功',
  });
}

async function removeIndexedDbEntry(storeName: IdbStoreName, key: string) {
  await idbDeleteStoreEntry(storeName, key);
  await loadIndexedDb();
  $q.notify({
    type: 'positive',
    message: '删除成功',
  });
}

// 监听 tab 变化重新加载
watch(tab, () => {
  if (tab.value === 'iconCache') {
    void loadIconCache();
  } else if (tab.value === 'indexedDb') {
    void loadIndexedDb();
  } else {
    loadStorage();
  }
});

watch(showAddDialog, (value) => {
  if (value) {
    showEditDialog.value = true;
  }
});

watch(
  () => editForm.value.value,
  () => {
    validateJson();
  },
  { immediate: true },
);

watch(showEditDialog, (value) => {
  if (value) {
    validateJson();
  }
});

onMounted(() => {
  loadStorage();
});
</script>

<style scoped>
.storage-editor-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.storage-card {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.storage-card :deep(.q-card__section:first-of-type) {
  flex-shrink: 0;
}

.storage-card :deep(.q-card__section:last-of-type) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.storage-table {
  height: 100%;
}

.storage-value {
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-cache-thumb {
  border-radius: 6px;
  cursor: pointer;
}

.idb-tree {
  height: 100%;
  overflow: auto;
}

.idb-tree-node {
  gap: 12px;
  min-width: 0;
}

.idb-node-label {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}

.idb-node-caption {
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 520px;
  font-size: 12px;
}

.image-viewer-card {
  display: flex;
  flex-direction: column;
}

.image-viewer-content {
  flex: 1;
  min-height: 0;
}

.json-preview {
  background: #f5f5f5;
  color: #1f1f1f;
}

.json-preview-error {
  background: #ffecec;
}
</style>
