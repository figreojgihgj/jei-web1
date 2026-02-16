<template>
  <div v-if="intro" class="widget-intro">
    <div v-if="intro.imgUrl" class="intro-media" @click="handleIntroImageClick">
      <ImageLoader
        :url="intro.imgUrl"
        :alt="intro.name"
        :max-width="96"
        :use-proxy="useProxy"
        :proxy-url="proxyUrl"
        variant="inline"
      />
    </div>
    <div class="intro-content">
      <div class="intro-title">
        <span class="intro-name">{{ intro.name }}</span>
        <span v-if="intro.type" class="intro-type">{{ intro.type }}</span>
      </div>

      <div v-if="introDescriptionDocument" class="intro-description">
        <WikiDocument :document="introDescriptionDocument" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue';
import type { WidgetIntro, Document } from '../../../types/wiki';
import WikiDocument from '../WikiDocument.vue';
import ImageLoader from '../ImageLoader.vue';

const props = defineProps<{
  intro: WidgetIntro;
  documentMap: Record<string, Document>;
}>();

const useProxyRef = inject<Ref<boolean>>('wikiImageUseProxy', ref(false));
const proxyUrlRef = inject<Ref<string>>('wikiImageProxyUrl', ref(''));
const openImageViewer = inject<(src: string, name?: string) => void>(
  'wikiImageOpen',
  () => undefined,
);

const useProxy = computed(() => useProxyRef.value);
const proxyUrl = computed(() => proxyUrlRef.value);

const introDescriptionDocument = computed(() => {
  if (!props.intro?.description) return null;
  return props.documentMap[props.intro.description] || null;
});

function handleIntroImageClick() {
  if (!props.intro?.imgUrl) return;
  openImageViewer(props.intro.imgUrl, props.intro.name || '');
}
</script>

<style scoped lang="scss">
.widget-intro {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0 1rem 0;
  border-bottom: 1px dashed #e0e0e0;
  margin-bottom: 1rem;
}

.intro-media {
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  // background: #f5f5f5;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.intro-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.intro-name {
  font-weight: 600;
  color: #333;
}

.intro-type {
  font-size: 0.85rem;
  color: #1976d2;
  background: #e3f2fd;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
