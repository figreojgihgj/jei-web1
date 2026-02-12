<template>
  <q-dialog :model-value="visible" @update:model-value="onClose">
    <q-card>
      <q-card-section>
        <div class="text-h6">{{ title }}</div>
      </q-card-section>

      <q-card-section>
        <p>这是 JEI Web 的官方 QQ 群：1080814651</p>
        <p>
          有任何反馈和希望参与开发都可以加入，也支持明日方舟:终末地（还有任何我们支持的游戏和Minecraft）的游戏讨论。
        </p>
        <p>
          页面由 Mic 提供国内加速镜像，网页内信息与其没有任何关联，官网：jeiweb.sirrus.cc
        </p>
        <p class="text-grey text-caption q-mt-md">
          免责声明：JEI-Web 和 Minecraft Mod JEI 没有任何隶属和其他关系，仅仅是灵感来源于 JEI Mod。
        </p>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          v-if="showDontShowAgain"
          flat
          label="不再提示"
          color="grey"
          @click="handleDontShowAgain"
        />
        <q-btn flat label="关闭" color="primary" @click="handleClose" />
        <q-btn flat label="加入群聊" color="primary" @click="handleJoin" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
const QQ_GROUP_JOIN_URL =
  'https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=zqJY9RCCW3Hs2dH_745AoKSGkd6ME0qM&authKey=f5TTWw4D3XWrz%2B3y%2FB%2BDntQY4gRUOgNz9fsIQ5umYUzXZdAyg7rqIm2z%2B2tU39RB&noverify=0&group_code=1080814651';

interface Props {
  visible?: boolean;
  title?: string;
  showDontShowAgain?: boolean;
  managed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: 'JEI Web 官方 QQ 群',
  showDontShowAgain: false,
  managed: false,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  close: [dontShowAgain: boolean];
  join: [];
}>();

function handleClose() {
  emit('close', false);
  if (!props.managed) {
    emit('update:visible', false);
  }
}

function handleDontShowAgain() {
  emit('close', true);
  if (!props.managed) {
    emit('update:visible', false);
  }
}

function handleJoin() {
  window.open(QQ_GROUP_JOIN_URL, '_blank');
  emit('close', false);
  emit('join');
  if (!props.managed) {
    emit('update:visible', false);
  }
}

function onClose(value: boolean) {
  if (!value) {
    emit('close', false);
    if (!props.managed) {
      emit('update:visible', false);
    }
  }
}
</script>
