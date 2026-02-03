<template>
  <div class="jei-bottombar">
    <div class="row items-center q-gutter-sm">
      <q-select
        :model-value="activePackId"
        @update:model-value="$emit('update:active-pack-id', $event)"
        :options="packOptions"
        dense
        outlined
        emit-value
        map-options
        :disable="loading"
        style="min-width: 220px"
      />
      <q-input
        :model-value="filterText"
        @update:model-value="$emit('update:filter-text', String($event ?? ''))"
        dense
        outlined
        clearable
        :disable="filterDisabled"
        placeholder="{{ t('filterPlaceholder') }}"
        class="col"
      >
        <template #append>
          <q-icon
            v-if="filterText"
            name="filter_list"
            class="cursor-pointer"
            color="primary"
            @click="filterDialogOpen = true"
          />
          <q-btn
            v-else
            flat
            round
            dense
            icon="tune"
            color="grey-7"
            @click="filterDialogOpen = true"
          />
        </template>
      </q-input>
      <q-btn flat round icon="settings" @click="$emit('open-settings')" />
    </div>

    <!-- 过滤器对话框 -->
    <q-dialog v-model="filterDialogOpen" @show="populateFilterFormFromText">
      <q-card style="min-width: 400px; max-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ t('advancedFilter') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none column q-gutter-sm">
          <q-input
            v-model="filterForm.text"
            dense
            outlined
            clearable
            :label="t('itemName')"
            :placeholder="t('itemNamePlaceholder')"
          />
          <q-select
            v-model="filterForm.itemId"
            :options="
              availableItemIdsFiltered.length > 0
                ? availableItemIdsFiltered
                : availableItemIds.slice(0, 50)
            "
            dense
            outlined
            clearable
            :label="t('itemId')"
            :placeholder="t('itemIdPlaceholder')"
            use-input
            input-debounce="0"
            :input-value="filterForm.itemId"
            @input-value="filterForm.itemId = $event"
            @filter="filterItemIds"
          />
          <q-select
            v-model="filterForm.gameId"
            :options="
              availableGameIdsFiltered.length > 0 ? availableGameIdsFiltered : availableGameIds
            "
            dense
            outlined
            clearable
            :label="t('namespace')"
            :placeholder="t('namespacePlaceholder')"
            use-input
            input-debounce="0"
            :input-value="filterForm.gameId"
            @input-value="filterForm.gameId = $event"
            @filter="filterGameIds"
          />
          <div class="column q-gutter-xs">
            <div class="text-subtitle2">{{ t('tags') }}</div>
            <div class="row q-gutter-sm items-center">
              <q-select
                v-for="(tag, idx) in filterForm.tags"
                :key="idx"
                :model-value="tag"
                :options="filteredTagsOptions"
                dense
                outlined
                clearable
                :label="t('tags')"
                :placeholder="t('tagPlaceholder')"
                class="col"
                use-input
                input-debounce="0"
                @input-value="filterForm.tags[idx] = $event"
                @filter="(val, upd) => filterTags(val, upd, idx)"
                @update:model-value="filterForm.tags[idx] = $event || ''"
              >
                <template #append>
                  <q-icon
                    name="close"
                    class="cursor-pointer"
                    @click="filterForm.tags.splice(idx, 1)"
                  />
                </template>
              </q-select>
              <q-btn
                flat
                round
                dense
                icon="add"
                color="primary"
                @click="filterForm.tags.push('')"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="t('clear')" color="grey-7" @click="resetFilterForm" />
          <q-btn flat :label="t('cancel')" color="grey-7" v-close-popup />
          <q-btn flat :label="t('apply')" color="primary" @click="applyFilter" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

type PackOption = { label: string; value: string };

type ParsedSearch = {
  text: string[];
  itemId: string[];
  gameId: string[];
  tag: string[];
};

const props = defineProps<{
  activePackId: string;
  packOptions: PackOption[];
  filterText: string;
  filterDisabled: boolean;
  loading: boolean;
  availableItemIds: string[];
  availableGameIds: string[];
  availableTags: string[];
}>();

const emit = defineEmits<{
  'update:active-pack-id': [value: string];
  'update:filter-text': [value: string];
  'open-settings': [];
}>();

const filterDialogOpen = ref(false);
const filterForm = ref({
  text: '',
  itemId: '',
  gameId: '',
  tags: [] as string[],
});

const availableItemIdsFiltered = ref<string[]>([]);
const availableGameIdsFiltered = ref<string[]>([]);
const availableTagsFiltered = ref<string[]>([]);

const filteredTagsOptions = computed(() => {
  return availableTagsFiltered.value.length > 0
    ? availableTagsFiltered.value
    : props.availableTags.slice(0, 50);
});

function filterItemIds(val: string, update: (callback: () => void) => void) {
  if (val === '') {
    update(() => {
      availableItemIdsFiltered.value = props.availableItemIds.slice(0, 50);
    });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    availableItemIdsFiltered.value = props.availableItemIds
      .filter((v) => v.toLowerCase().includes(needle))
      .slice(0, 50);
  });
}

function filterGameIds(val: string, update: (callback: () => void) => void) {
  if (val === '') {
    update(() => {
      availableGameIdsFiltered.value = props.availableGameIds;
    });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    availableGameIdsFiltered.value = props.availableGameIds.filter((v) =>
      v.toLowerCase().includes(needle),
    );
  });
}

function filterTags(val: string, update: (callback: () => void) => void, idx: number) {
  if (val === '') {
    update(() => {
      const selected = new Set(filterForm.value.tags.filter((_, i) => i !== idx));
      availableTagsFiltered.value = props.availableTags
        .filter((t) => !selected.has(t))
        .slice(0, 50);
    });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    const selected = new Set(filterForm.value.tags.filter((_, i) => i !== idx));
    availableTagsFiltered.value = props.availableTags
      .filter((v) => v.toLowerCase().includes(needle) && !selected.has(v))
      .slice(0, 50);
  });
}

function parseSearch(input: string): ParsedSearch {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const out: ParsedSearch = { text: [], itemId: [], gameId: [], tag: [] };

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (!t) continue;
    if (!t.startsWith('@')) {
      out.text.push(t.toLowerCase());
      continue;
    }

    const raw = t.slice(1);
    const [nameRaw, valueInline] = splitDirective(raw);
    const name = nameRaw.toLowerCase();
    let value: string | undefined = valueInline || undefined;

    const next = tokens[i + 1];
    if (!value && next && !next.startsWith('@')) {
      value = next;
      i += 1;
    }

    const v = (value ?? '').trim();

    if (name === 'itemid' || name === 'id') {
      if (!v) continue;
      out.itemId.push(v.toLowerCase());
    } else if (name === 'gameid' || name === 'game') {
      if (!v) continue;
      out.gameId.push(v.toLowerCase());
    } else if (name === 'tag' || name === 't') {
      if (!v) continue;
      out.tag.push(v.toLowerCase());
    } else {
      out.tag.push(raw.toLowerCase());
    }
  }

  return out;
}

function splitDirective(raw: string): [string, string] {
  const idx = raw.search(/[:=]/);
  if (idx < 0) return [raw, ''];
  return [raw.slice(0, idx), raw.slice(idx + 1)];
}

function populateFilterFormFromText() {
  const search = parseSearch(props.filterText);
  filterForm.value = {
    text: search.text.join(' ') || '',
    itemId: search.itemId.join(' ') || '',
    gameId: search.gameId.join(' ') || '',
    tags: [...search.tag],
  };
}

function applyFilter() {
  const parts: string[] = [];
  const f = filterForm.value;

  if (f.text) parts.push(f.text);
  if (f.itemId) parts.push(`@id:${f.itemId}`);
  if (f.gameId) parts.push(`@game:${f.gameId}`);
  for (const tag of f.tags) {
    const t = tag.trim();
    if (t) parts.push(`@tag:${t}`);
  }

  emit('update:filter-text', parts.join(' '));
}

function resetFilterForm() {
  filterForm.value = {
    text: '',
    itemId: '',
    gameId: '',
    tags: [],
  };
}
</script>

<style scoped>
.jei-bottombar {
  flex: 0 0 auto;
  z-index: 10;
  padding: 12px 16px;
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

@media (max-width: 599px) {
  .jei-bottombar .row {
    flex-wrap: wrap;
  }
  .jei-bottombar .q-select {
    width: 100%;
    min-width: 0 !important;
    margin-bottom: 8px;
  }
}
</style>
