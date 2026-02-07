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
      </q-tabs>

      <q-separator />

      <q-card-section class="q-pa-md column" style="flex: 1; min-height: 0">
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
                <q-btn flat dense round icon="edit" color="primary" @click="editItem(props.row)" />
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
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

interface StorageItem {
  key: string;
  value: string;
  size: number;
}

const tab = ref('localStorage');
const searchQuery = ref('');
const items = ref<StorageItem[]>([]);
const showEditDialog = ref(false);
const showAddDialog = ref(false);
const editingKey = ref('');
const editForm = ref({
  key: '',
  value: '',
});
const jsonPreview = ref(false);
const jsonValid = ref(false);

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

const currentStorage = computed(() => {
  return tab.value === 'localStorage' ? localStorage : sessionStorage;
});

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value;
  const query = searchQuery.value.toLowerCase();
  return items.value.filter((item) => item.key.toLowerCase().includes(query));
});

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

// 监听 tab 变化重新加载
watch(tab, () => {
  loadStorage();
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

.json-preview {
  background: #f5f5f5;
  color: #1f1f1f;
}

.json-preview-error {
  background: #ffecec;
}
</style>
