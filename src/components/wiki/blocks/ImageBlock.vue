<template>
  <div
    class="wiki-image-block"
    :class="{ 'wiki-image-block--clickable': canOpen }"
    @click="handleOpen"
  >
    <ImageLoader v-bind="imageLoaderProps" />
    <div v-if="block.image.description" class="image-description">
      {{ block.image.description }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue';
import type { ImageBlock } from '../../../types/wiki';
import ImageLoader from '../ImageLoader.vue';

const { block } = defineProps<{
  block: ImageBlock;
}>();

// 从父组件注入代理配置
const useProxyRef = inject<Ref<boolean>>('wikiImageUseProxy', ref(false));
const proxyUrlRef = inject<Ref<string>>('wikiImageProxyUrl', ref(''));
const openImageViewer = inject<(src: string, name?: string) => void>(
  'wikiImageOpen',
  () => undefined,
);

const imageLoaderProps = computed(() => {
  const base = {
    url: block.image.url,
    alt: block.image.description || '',
    useProxy: useProxyRef.value,
    proxyUrl: proxyUrlRef.value,
    variant: 'block' as const,
  };

  if (block.image.clientWidth) {
    return {
      ...base,
      maxWidth: block.image.clientWidth,
    };
  }

  return base;
});

const canOpen = computed(() => Boolean(block.image.url));

function handleOpen() {
  if (!block.image.url) return;
  openImageViewer(block.image.url, block.image.description || '');
}
</script>

<style scoped lang="scss">
.wiki-image-block {
  margin: 1.5em 0;
  text-align: center;
}

.wiki-image-block--clickable {
  cursor: pointer;
}

.wiki-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-description {
  margin-top: 0.5em;
  font-size: 0.9em;
  color: #666;
  font-style: italic;
}
</style>
