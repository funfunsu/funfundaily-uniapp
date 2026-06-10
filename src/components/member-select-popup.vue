<template>
  <view v-if="visible" class="msp-overlay" @tap.self="handleClose">
    <view class="msp-shell" @tap.stop>
      <view class="msp-header">
        <text class="msp-title">{{ title }}</text>
        <text class="msp-subtitle">{{ subtitle }}</text>
      </view>

      <scroll-view scroll-y class="msp-list">
        <view v-if="loading" class="msp-empty"><text>加载成员中...</text></view>
        <view
          v-for="m in members"
          :key="m.userId"
          class="msp-item"
          @click="handleSelect(m)"
        >
          <view class="msp-avatar"><text>{{ avatarText(m) }}</text></view>
          <view class="msp-item__main">
            <text class="msp-item__name">{{ memberName(m) }}</text>
            <text class="msp-item__role">{{ roleText(m) }}</text>
          </view>
          <text class="msp-item__arrow">{{ actionVerb }} ›</text>
        </view>
        <view v-if="!loading && members.length === 0" class="msp-empty"><text>该小队暂无成员</text></view>
      </scroll-view>

      <!-- 新建成员 -->
      <view class="msp-create">
        <input
          v-model="newName"
          class="field__input msp-create__input"
          placeholder="新成员昵称（如：宝宝）"
          placeholder-class="msp-ph"
          :maxlength="20"
        />
        <button class="msp-create__btn" :disabled="!newName.trim() || creating" @click="handleCreate">
          <text class="msp-create__btn-text">{{ creating ? '创建中' : `新建并${actionVerb}` }}</text>
        </button>
      </view>

      <button class="msp-cancel" @click="handleClose"><text>取消</text></button>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import apiTs from '../utils/apiTs'

const props = defineProps({
  visible: { type: Boolean, default: false },
  groupId: { type: [String, Number], default: '' },
  title: { type: String, default: '收下给谁？' },
  subtitle: { type: String, default: '选择一个成员，或新建一个（如给小朋友）' },
  actionVerb: { type: String, default: '收下' }
})

const emit = defineEmits(['close', 'select', 'create'])

const members = ref([])
const loading = ref(false)
const newName = ref('')
const creating = ref(false)

watch(
  () => [props.visible, props.groupId],
  () => {
    if (props.visible && props.groupId) {
      fetchMembers()
      newName.value = ''
    }
  },
  { immediate: true }
)

async function fetchMembers() {
  loading.value = true
  try {
    const res = await apiTs.group.user.list({ groupId: props.groupId })
    members.value = Array.isArray(res) ? res : []
  } catch (e) {
    console.error('加载群组成员失败:', e)
    members.value = []
  } finally {
    loading.value = false
  }
}

function memberName(m) {
  return m?.userInfo?.nickname || '未命名成员'
}
function avatarText(m) {
  const n = memberName(m)
  return n ? n.slice(0, 1) : '?'
}
function roleText(m) {
  const map = { Creator: '创建者', Admin: '管理员', Member: '成员' }
  return map[m?.role] || '成员'
}

function handleSelect(m) {
  emit('select', m)
}

async function handleCreate() {
  const name = newName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    emit('create', name)
  } finally {
    // 由父组件完成创建+收下后关闭；这里仅解锁按钮
    creating.value = false
  }
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.msp-overlay {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.55); z-index: 9999;
  display: flex; align-items: flex-end; justify-content: center;
}
.msp-shell {
  width: 100%; max-width: 760rpx; background: #fff;
  border-top-left-radius: 28rpx; border-top-right-radius: 28rpx;
  display: flex; flex-direction: column; max-height: 84vh;
  padding: 32rpx 32rpx env(safe-area-inset-bottom);
}
.msp-header { padding-bottom: 16rpx; }
.msp-title { font-size: 34rpx; font-weight: 700; color: #1f2937; display: block; }
.msp-subtitle { font-size: 24rpx; color: #94a3b8; margin-top: 8rpx; display: block; }
.msp-list { max-height: 44vh; margin: 12rpx 0; }
.msp-item {
  display: flex; align-items: center; gap: 20rpx;
  padding: 22rpx 16rpx; border-radius: 18rpx; background: #f8fafc; margin-bottom: 14rpx;
}
.msp-item:active { background: #eef2f7; }
.msp-avatar {
  width: 72rpx; height: 72rpx; border-radius: 50%;
  background: #e8f1ff; display: flex; align-items: center; justify-content: center;
  color: #2196f3; font-size: 32rpx; font-weight: 700; flex-shrink: 0;
}
.msp-item__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.msp-item__name { font-size: 30rpx; color: #1f2937; font-weight: 600; }
.msp-item__role { font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; }
.msp-item__arrow { font-size: 26rpx; color: #2196f3; font-weight: 600; }
.msp-empty { text-align: center; color: #94a3b8; font-size: 26rpx; padding: 40rpx 0; }
.msp-create { display: flex; gap: 16rpx; align-items: center; padding: 12rpx 0 8rpx; }
.msp-create__input { flex: 1; }
.msp-ph { color: #b8c2cf; }
.msp-create__btn {
  background: #2196f3; border: none; border-radius: 40rpx; height: 76rpx;
  padding: 0 28rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.msp-create__btn::after { border: none; }
.msp-create__btn[disabled] { opacity: 0.45; }
.msp-create__btn-text { color: #fff; font-size: 26rpx; font-weight: 600; }
.msp-cancel {
  margin-top: 18rpx; background: #f1f5f9; border: none; border-radius: 40rpx; height: 84rpx;
  display: flex; align-items: center; justify-content: center;
}
.msp-cancel::after { border: none; }
.msp-cancel text { color: #475569; font-size: 28rpx; font-weight: 600; }
</style>
