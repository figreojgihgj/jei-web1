<template>
  <q-page padding class="doc-page">
    <q-card flat bordered>
      <q-card-section>
        <div class="doc-md" v-html="html"></div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';
import readmeMd from 'src/assets/readme.generated.md?raw';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const html = computed(() => md.render(readmeMd));
</script>

<style scoped>
.doc-page {
  overflow: auto;
}

.doc-md :deep(pre) {
  white-space: pre-wrap;
  word-break: break-word;
}

.doc-md :deep(h1) {
  font-size: 22px;
  line-height: 30px;
  margin: 0 0 12px;
}

.doc-md :deep(h2) {
  font-size: 18px;
  line-height: 26px;
  margin: 18px 0 10px;
}

.doc-md :deep(h3) {
  font-size: 16px;
  line-height: 24px;
  margin: 16px 0 8px;
}

.doc-md :deep(p),
.doc-md :deep(ul),
.doc-md :deep(ol) {
  margin: 8px 0;
}
</style>
