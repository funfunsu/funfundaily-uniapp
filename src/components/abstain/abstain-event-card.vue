<template>
  <view class="aec-card" :class="{ 'aec-card--relapsed': todayFeedback === 'relapse' }">
    <!-- 装饰光晕 -->
    <view class="aec-glow"></view>

    <!-- 标题行：点标题进统计日历 -->
    <view class="aec-head">
      <view class="aec-title-wrap" @click="$emit('open-calendar', event)">
        <text class="aec-title">{{ event.itemTitle || '未命名' }}</text>
        <text class="aec-title-hint">查看日历 ›</text>
      </view>
      <view class="aec-ops">
        <view class="aec-op" @click.stop="$emit('edit', event)"><text class="aec-op__icon">✏️</text></view>
        <view class="aec-op" @click.stop="$emit('delete', event)"><text class="aec-op__icon">🗑</text></view>
      </view>
    </view>

    <!-- 坚持天数 hero -->
    <view class="aec-hero">
      <view class="aec-flame">
        <text class="aec-flame__emoji">{{ flameEmoji }}</text>
      </view>
      <view class="aec-streak">
        <view class="aec-streak-row">
          <text class="aec-streak-num">{{ streakDays }}</text>
          <text class="aec-streak-unit">天</text>
        </view>
        <text class="aec-streak-label">连续坚持 · 加油保持 🌱</text>
      </view>
    </view>

    <!-- 目标进度 -->
    <view class="aec-progress">
      <view class="aec-progress-track">
        <view class="aec-progress-fill" :style="{ width: progressPercent + '%' }"></view>
      </view>
      <view class="aec-progress-meta">
        <text class="aec-progress-text">目标 {{ endDateText }}</text>
        <text class="aec-progress-tag" :class="{ 'aec-progress-tag--done': reachedGoal }">{{ remainText }}</text>
      </view>
    </view>

    <!-- 描述 -->
    <text v-if="event.itemDesc" class="aec-desc">{{ event.itemDesc }}</text>

    <!-- 今日反馈操作区 -->
    <view class="aec-feedback">
      <view class="aec-feedback-status">
        <text class="aec-feedback-label">今日</text>
        <text class="aec-feedback-chip" :class="chipClass">{{ todayText }}</text>
      </view>
      <view class="aec-feedback-btns">
        <view
          class="aec-fb-btn aec-fb-btn--persist"
          :class="{ 'aec-fb-btn--active': todayFeedback === 'persist' }"
          hover-class="aec-fb-btn--hover"
          :hover-stay-time="60"
          @click="$emit('feedback', { event, feedback: 'persist' })"
        >
          <text class="aec-fb-emoji">💪</text>
          <text class="aec-fb-text">达成</text>
        </view>
        <view
          class="aec-fb-btn aec-fb-btn--relapse"
          :class="{ 'aec-fb-btn--active': todayFeedback === 'relapse' }"
          hover-class="aec-fb-btn--hover"
          :hover-stay-time="60"
          @click="$emit('feedback', { event, feedback: 'relapse' })"
        >
          <text class="aec-fb-emoji">🍂</text>
          <text class="aec-fb-text">破戒</text>
        </view>
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

// 火苗随坚持天数升级，给一点成长仪式感
const flameEmoji = computed(() => {
  const d = props.streakDays
  if (props.todayFeedback === 'relapse') return '🌧'
  if (d >= 100) return '🏆'
  if (d >= 30) return '🔥'
  if (d >= 7) return '✨'
  return '🌱'
})

const reachedGoal = computed(() => {
  const endKey = toDateKey(props.event.endTime)
  if (!endKey) return false
  return diffDays(toDateKey(new Date()), endKey) <= 0
})

const remainText = computed(() => {
  const endKey = toDateKey(props.event.endTime)
  if (!endKey) return ''
  const days = diffDays(toDateKey(new Date()), endKey)
  if (days > 0) return `还剩 ${days} 天`
  if (days === 0) return '今天到期 🎉'
  return '已达目标 🏆'
})

// 进度：从开始到目标日，已过去比例
const progressPercent = computed(() => {
  const startKey = toDateKey(props.event.startTime)
  const endKey = toDateKey(props.event.endTime)
  if (!startKey || !endKey) return 0
  const total = diffDays(startKey, endKey)
  if (total <= 0) return 100
  const passed = diffDays(startKey, toDateKey(new Date()))
  return Math.max(0, Math.min(100, Math.round((passed / total) * 100)))
})

const todayText = computed(() => {
  if (props.todayFeedback === 'persist') return '已坚持'
  if (props.todayFeedback === 'relapse') return '破戒了'
  return '待反馈'
})
const chipClass = computed(() => ({
  'aec-feedback-chip--persist': props.todayFeedback === 'persist',
  'aec-feedback-chip--relapse': props.todayFeedback === 'relapse',
  'aec-feedback-chip--none': !props.todayFeedback
}))
</script>

<style scoped>
.aec-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #ffffff 0%, #f3fbf7 100%);
  border-radius: 28rpx;
  padding: 30rpx 30rpx 26rpx;
  margin-bottom: 22rpx;
  box-shadow: 0 10rpx 30rpx rgba(16, 185, 129, 0.10);
  border: 1rpx solid rgba(16, 185, 129, 0.10);
}
.aec-card--relapsed {
  background: linear-gradient(160deg, #ffffff 0%, #fdf3f3 100%);
  box-shadow: 0 10rpx 30rpx rgba(239, 68, 68, 0.10);
  border-color: rgba(239, 68, 68, 0.12);
}
/* 右上角装饰光晕 */
.aec-glow {
  position: absolute;
  top: -90rpx;
  right: -70rpx;
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0) 70%);
  pointer-events: none;
}
.aec-card--relapsed .aec-glow {
  background: radial-gradient(circle, rgba(239, 68, 68, 0.16) 0%, rgba(239, 68, 68, 0) 70%);
}

.aec-head { position: relative; display: flex; align-items: center; justify-content: space-between; }
.aec-title-wrap { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.aec-title { font-size: 34rpx; font-weight: 800; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aec-title-hint { font-size: 22rpx; color: #10b981; margin-top: 4rpx; }
.aec-ops { display: flex; gap: 12rpx; flex-shrink: 0; margin-left: 16rpx; }
.aec-op {
  width: 56rpx; height: 56rpx; border-radius: 18rpx;
  background: rgba(148, 163, 184, 0.12);
  display: flex; align-items: center; justify-content: center;
}
.aec-op:active { background: rgba(148, 163, 184, 0.24); }
.aec-op__icon { font-size: 26rpx; }

/* 坚持天数 hero */
.aec-hero { position: relative; display: flex; align-items: center; gap: 22rpx; margin: 22rpx 0 18rpx; }
.aec-flame {
  width: 104rpx; height: 104rpx; border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(16, 185, 129, 0.35);
  flex-shrink: 0;
}
.aec-card--relapsed .aec-flame {
  background: linear-gradient(135deg, #f87171 0%, #fca5a5 100%);
  box-shadow: 0 8rpx 20rpx rgba(239, 68, 68, 0.32);
}
.aec-flame__emoji { font-size: 52rpx; line-height: 1; }
.aec-streak { display: flex; flex-direction: column; }
.aec-streak-row { display: flex; align-items: baseline; gap: 8rpx; }
.aec-streak-num { font-size: 76rpx; font-weight: 900; color: #059669; line-height: 1; letter-spacing: -1rpx; }
.aec-card--relapsed .aec-streak-num { color: #dc2626; }
.aec-streak-unit { font-size: 30rpx; font-weight: 700; color: #10b981; }
.aec-card--relapsed .aec-streak-unit { color: #ef4444; }
.aec-streak-label { font-size: 24rpx; color: #94a3b8; margin-top: 6rpx; }

/* 进度条 */
.aec-progress { position: relative; margin-bottom: 14rpx; }
.aec-progress-track { height: 14rpx; border-radius: 8rpx; background: rgba(16, 185, 129, 0.12); overflow: hidden; }
.aec-progress-fill {
  height: 100%; border-radius: 8rpx;
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  transition: width 0.4s ease;
}
.aec-progress-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 10rpx; }
.aec-progress-text { font-size: 22rpx; color: #94a3b8; }
.aec-progress-tag { font-size: 22rpx; color: #10b981; font-weight: 600; }
.aec-progress-tag--done { color: #f59e0b; }

.aec-desc { font-size: 26rpx; color: #64748b; display: block; margin: 4rpx 0 14rpx; line-height: 1.5; }

/* 今日反馈操作区 */
.aec-feedback {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 8rpx; padding-top: 20rpx;
  border-top: 1rpx dashed rgba(148, 163, 184, 0.3);
}
.aec-feedback-status { display: flex; align-items: center; gap: 12rpx; }
.aec-feedback-label { font-size: 24rpx; color: #94a3b8; }
.aec-feedback-chip { font-size: 22rpx; font-weight: 600; padding: 6rpx 18rpx; border-radius: 22rpx; }
.aec-feedback-chip--persist { color: #059669; background: rgba(16, 185, 129, 0.14); }
.aec-feedback-chip--relapse { color: #dc2626; background: rgba(239, 68, 68, 0.14); }
.aec-feedback-chip--none { color: #94a3b8; background: rgba(148, 163, 184, 0.14); }

.aec-feedback-btns { display: flex; gap: 16rpx; }
.aec-fb-btn {
  display: flex; align-items: center; gap: 8rpx;
  height: 70rpx; padding: 0 28rpx; border-radius: 35rpx;
  border: 2rpx solid transparent;
  transition: transform 0.12s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.aec-fb-btn--hover { transform: scale(0.94); }
.aec-fb-emoji { font-size: 28rpx; line-height: 1; }
.aec-fb-text { font-size: 27rpx; font-weight: 700; }
/* 达成 */
.aec-fb-btn--persist { background: rgba(16, 185, 129, 0.10); border-color: rgba(16, 185, 129, 0.25); }
.aec-fb-btn--persist .aec-fb-text { color: #059669; }
.aec-fb-btn--persist.aec-fb-btn--active {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  border-color: transparent;
  box-shadow: 0 8rpx 18rpx rgba(16, 185, 129, 0.35);
}
.aec-fb-btn--persist.aec-fb-btn--active .aec-fb-text { color: #ffffff; }
/* 破戒 */
.aec-fb-btn--relapse { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.22); }
.aec-fb-btn--relapse .aec-fb-text { color: #dc2626; }
.aec-fb-btn--relapse.aec-fb-btn--active {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  border-color: transparent;
  box-shadow: 0 8rpx 18rpx rgba(239, 68, 68, 0.32);
}
.aec-fb-btn--relapse.aec-fb-btn--active .aec-fb-text { color: #ffffff; }
</style>
