<template>
  <BottomSheet
    :visible="visible"
    title="想创建什么？"
    accent="primary"
    :show-footer="false"
    @close="emit('close')"
  >
    <view class="tcc-list">
      <view class="tcc-item" @click="choose('Habit')">
        <text class="tcc-item__icon">🔁</text>
        <view class="tcc-item__text">
          <text class="tcc-item__title">习惯任务</text>
          <text class="tcc-item__desc">每天 / 每周重复打卡，养成习惯</text>
        </view>
        <text class="tcc-item__chev">›</text>
      </view>
      <view class="tcc-item" @click="choose('Todo')">
        <text class="tcc-item__icon">✅</text>
        <view class="tcc-item__text">
          <text class="tcc-item__title">待办任务</text>
          <text class="tcc-item__desc">一次性待办，完成即可</text>
        </view>
        <text class="tcc-item__chev">›</text>
      </view>
    </view>
  </BottomSheet>
</template>

<script setup>
import BottomSheet from '../fun-components/bottom-sheet.vue'

defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'select'])

function choose(taskType) {
  emit('select', taskType)
}
</script>

<style scoped>
.tcc-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 8rpx 0 16rpx;
}
.tcc-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  border-radius: 18rpx;
  background: #f7f9fc;
}
.tcc-item:active {
  background: #eef2f8;
}
.tcc-item__icon {
  font-size: 44rpx;
  line-height: 1;
  flex-shrink: 0;
}
.tcc-item__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.tcc-item__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}
.tcc-item__desc {
  font-size: 24rpx;
  color: #94a3b8;
}
.tcc-item__chev {
  font-size: 40rpx;
  color: #cbd5e1;
  flex-shrink: 0;
}
</style>
