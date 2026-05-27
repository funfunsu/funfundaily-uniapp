<template>
  <view class="aec-card">
    <!-- 标题行：点标题进统计日历 -->
    <view class="aec-head">
      <view class="aec-title-wrap" @click="$emit('open-calendar', event)">
        <text class="aec-title">{{ event.itemTitle || '未命名' }}</text>
        <text class="aec-title-arrow">›</text>
      </view>
      <view class="aec-ops">
        <text class="aec-op" @click.stop="$emit('edit', event)">修改</text>
        <text class="aec-op aec-op--danger" @click.stop="$emit('delete', event)">删除</text>
      </view>
    </view>

    <!-- 连续坚持天数 -->
    <view class="aec-streak">
      <text class="aec-streak-num">{{ streakDays }}</text>
      <text class="aec-streak-unit">天</text>
      <text class="aec-streak-label">连续坚持</text>
    </view>

    <!-- 描述 -->
    <text v-if="event.itemDesc" class="aec-desc">{{ event.itemDesc }}</text>

    <!-- 起止信息 -->
    <view class="aec-meta">
      <text class="aec-meta-text">目标坚持至 {{ endDateText }}</text>
      <text v-if="remainText" class="aec-meta-tag">{{ remainText }}</text>
    </view>

    <!-- 今日反馈 -->
    <view class="aec-feedback">
      <text class="aec-feedback-label">今日反馈：<text :class="todayClass">{{ todayText }}</text></text>
      <view class="aec-feedback-btns">
        <button
          class="aec-fb-btn aec-fb-btn--persist"
          :class="{ 'aec-fb-btn--active': todayFeedback === 'persist' }"
          @click="$emit('feedback', { event, feedback: 'persist' })"
        ><text class="aec-fb-text">达成</text></button>
        <button
          class="aec-fb-btn aec-fb-btn--relapse"
          :class="{ 'aec-fb-btn--active': todayFeedback === 'relapse' }"
          @click="$emit('feedback', { event, feedback: 'relapse' })"
        ><text class="aec-fb-text">破戒</text></button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { toDateKey, diffDays } from '../../utils/abstainUtil'

const props = defineProps({
  event: { type: Object, required: true },
  streakDays: { type: Number, default: 0 },
  // 今天的反馈类型：'persist' | 'relapse' | ''（未反馈）
  todayFeedback: { type: String, default: '' }
})

defineEmits(['open-calendar', 'edit', 'delete', 'feedback'])

const endDateText = computed(() => toDateKey(props.event.endTime) || '—')

const remainText = computed(() => {
  const endKey = toDateKey(props.event.endTime)
  if (!endKey) return ''
  const days = diffDays(toDateKey(new Date()), endKey)
  if (days > 0) return `还剩 ${days} 天`
  if (days === 0) return '今天到期'
  return '已达目标'
})

const todayText = computed(() => {
  if (props.todayFeedback === 'persist') return '已坚持'
  if (props.todayFeedback === 'relapse') return '破戒了'
  return '未反馈'
})
const todayClass = computed(() => ({
  'aec-today--persist': props.todayFeedback === 'persist',
  'aec-today--relapse': props.todayFeedback === 'relapse',
  'aec-today--none': !props.todayFeedback
}))
</script>

<style scoped>
.aec-card {
  background: #fff; border-radius: 20rpx; padding: 28rpx 28rpx 24rpx;
  margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
}
.aec-head { display: flex; align-items: center; justify-content: space-between; }
.aec-title-wrap { display: flex; align-items: center; min-width: 0; flex: 1; }
.aec-title { font-size: 32rpx; font-weight: 700; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aec-title-arrow { font-size: 32rpx; color: #94a3b8; margin-left: 6rpx; }
.aec-ops { display: flex; gap: 20rpx; flex-shrink: 0; margin-left: 16rpx; }
.aec-op { font-size: 24rpx; color: #2196f3; }
.aec-op--danger { color: #ef4444; }
.aec-streak { display: flex; align-items: baseline; gap: 8rpx; margin: 18rpx 0 6rpx; }
.aec-streak-num { font-size: 64rpx; font-weight: 800; color: #10b981; line-height: 1; }
.aec-streak-unit { font-size: 28rpx; color: #10b981; font-weight: 600; }
.aec-streak-label { font-size: 24rpx; color: #94a3b8; margin-left: 8rpx; }
.aec-desc { font-size: 26rpx; color: #64748b; display: block; margin: 6rpx 0 12rpx; }
.aec-meta { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.aec-meta-text { font-size: 24rpx; color: #94a3b8; }
.aec-meta-tag { font-size: 22rpx; color: #2196f3; background: #e8f1ff; border-radius: 20rpx; padding: 4rpx 16rpx; }
.aec-feedback { display: flex; align-items: center; justify-content: space-between; border-top: 1rpx solid #f1f5f9; padding-top: 18rpx; }
.aec-feedback-label { font-size: 24rpx; color: #64748b; }
.aec-today--persist { color: #10b981; font-weight: 600; }
.aec-today--relapse { color: #ef4444; font-weight: 600; }
.aec-today--none { color: #94a3b8; }
.aec-feedback-btns { display: flex; gap: 16rpx; }
.aec-fb-btn { height: 64rpx; border-radius: 32rpx; padding: 0 30rpx; border: none; display: flex; align-items: center; justify-content: center; }
.aec-fb-btn::after { border: none; }
.aec-fb-text { font-size: 26rpx; font-weight: 600; }
.aec-fb-btn--persist { background: #f1f5f9; }
.aec-fb-btn--persist .aec-fb-text { color: #10b981; }
.aec-fb-btn--persist.aec-fb-btn--active { background: #10b981; }
.aec-fb-btn--persist.aec-fb-btn--active .aec-fb-text { color: #fff; }
.aec-fb-btn--relapse { background: #f1f5f9; }
.aec-fb-btn--relapse .aec-fb-text { color: #ef4444; }
.aec-fb-btn--relapse.aec-fb-btn--active { background: #ef4444; }
.aec-fb-btn--relapse.aec-fb-btn--active .aec-fb-text { color: #fff; }
</style>
