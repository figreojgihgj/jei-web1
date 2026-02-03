<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>JEI-web</q-toolbar-title>

        <q-btn
          flat
          dense
          round
          :icon="isPageFullscreen ? 'fullscreen_exit' : 'fullscreen'"
          aria-label="Fullscreen"
          @click="togglePageFullscreen"
        >
          <q-tooltip>{{ isPageFullscreen ? '退出网页全屏' : '网页全屏' }}</q-tooltip>
        </q-btn>

        <q-btn flat dense round aria-label="Language">
          <q-icon name="translate" />

          <q-menu>
            <q-list style="min-width: 120px">
              <q-item
                v-for="lang in languageList"
                :key="lang.code"
                clickable
                :active="settingsStore.language === lang.code"
                @click="setLanguage(lang.code)"
              >
                <q-item-section avatar>
                  <q-icon name="translate" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ lang.label }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <q-btn flat dense round aria-label="Theme">
          <q-icon :name="themeIcon" />

          <q-menu>
            <q-list style="min-width: 120px">
              <q-item
                clickable
                :active="settingsStore.darkMode === 'auto'"
                @click="setTheme('auto')"
              >
                <q-item-section avatar>
                  <q-icon name="brightness_4" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>自动</q-item-label>
                </q-item-section>
              </q-item>
              <q-item
                clickable
                :active="settingsStore.darkMode === 'light'"
                @click="setTheme('light')"
              >
                <q-item-section avatar>
                  <q-icon name="light_mode" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>亮色</q-item-label>
                </q-item-section>
              </q-item>
              <q-item
                clickable
                :active="settingsStore.darkMode === 'dark'"
                @click="setTheme('dark')"
              >
                <q-item-section avatar>
                  <q-icon name="dark_mode" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>暗色</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <div>v{{ appVersion }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" bordered>
      <q-list>
        <q-item-label header> Essential Links </q-item-label>

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container :class="settingsStore.debugLayout ? 'debug-scroll' : 'no-scroll'">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Dark, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import EssentialLink, { type EssentialLinkProps } from 'components/EssentialLink.vue';
import { useSettingsStore, type DarkMode, type Language } from 'src/stores/settings';

const settingsStore = useSettingsStore();
const $q = useQuasar();
const { locale } = useI18n();
// 开发环境使用 package.json 版本，生产环境使用 git commit hash
const appVersion = import.meta.env.DEV ? '0.0.1-dev' : (__APP_VERSION__ ?? 'unknown');

// 语言相关
const languageList = [
  { code: 'zh-CN' as Language, label: '简体中文', icon: 'translate' },
  { code: 'en-US' as Language, label: 'English', icon: 'translate' },
  { code: 'ja-JP' as Language, label: '日本語', icon: 'translate' },
];

const themeIcon = computed(() => {
  if (settingsStore.darkMode === 'auto') {
    return Dark.isActive ? 'dark_mode' : 'light_mode';
  }
  return settingsStore.darkMode === 'dark' ? 'dark_mode' : 'light_mode';
});

function setTheme(mode: DarkMode) {
  settingsStore.setDarkMode(mode);
}

function setLanguage(lang: Language) {
  settingsStore.setLanguage(lang);
  locale.value = lang;
}

const isPageFullscreen = ref($q.fullscreen.isActive);

function handleFullscreenChange() {
  isPageFullscreen.value = $q.fullscreen.isActive;
}

function togglePageFullscreen() {
  if (!$q.fullscreen.isCapable) return;
  $q.fullscreen.toggle().catch(() => undefined);
}

const linksList: EssentialLinkProps[] = [
  {
    title: 'Home',
    icon: 'home',
    link: '/',
  },
  {
    title: 'Editor',
    icon: 'edit',
    link: '/editor',
  },
  {
    title: 'README',
    icon: 'description',
    link: '/readme',
  },
  {
    title: 'About',
    icon: 'info',
    link: '/about',
  },
  {
    title: 'GitHub',
    caption: 'github.com/AndreaFrederica',
    icon: 'code',
    link: 'https://github.com/AndreaFrederica/jei-web',
  },
  {
    title: 'Blog',
    caption: 'blog.sirrus.cc',
    icon: 'article',
    link: 'https://blog.sirrus.cc',
  },
  {
    title: 'Wiki',
    caption: 'wiki.sirrus.cc',
    icon: 'menu_book',
    link: 'https://wiki.sirrus.cc',
  },
  {
    title: '小说助手',
    caption: 'anh.sirrus.cc',
    icon: 'auto_stories',
    link: 'https://anh.sirrus.cc',
  },
  {
    title: 'License',
    caption: 'Mozilla Public License 2.0',
    icon: 'gavel',
    link: '/license',
  },
  {
    title: 'Third-Party Licenses',
    caption: 'factoriolab-zmd (MIT)',
    icon: 'assignment',
    link: '/third-party-licenses',
  },
];

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  handleFullscreenChange();
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});
</script>

<style>
.no-scroll {
  height: 100vh;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.debug-scroll {
  overflow: auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.no-scroll > .q-page,
.debug-scroll > .q-page {
  flex: 1 1 auto;
  min-height: 0;
}

/* 顶栏样式：颜色与页面背景一致，去除光晕效果 */
.q-header {
  background-color: var(--q-page-background);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

body.body--dark .q-header {
  background-color: var(--q-page-background);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
