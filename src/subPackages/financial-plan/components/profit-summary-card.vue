<template>
  <view class="profit-summary-card">
    <view class="header">
      <view>
        <text class="title">收益统计</text>
        <text class="subtitle">目标收益、实际收益和完成度一目了然</text>
      </view>
      <button class="btn btn-secondary" @click="handleViewDetail">查看详情</button>
    </view>

    <view v-if="summary" class="summary-grid">
      <view class="summary-item">
        <text class="summary-label">目标收益</text>
        <text class="summary-value">{{ summary.targetProfit }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">实际收益</text>
        <text class="summary-value">{{ summary.actualProfit }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">完成度</text>
        <text class="summary-value">{{ summary.completionRate }}%</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">已兑现数量</text>
        <text class="summary-value">{{ summary.realizedQuantity }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">计划数量</text>
        <text class="summary-value">{{ summary.plannedQuantity }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">完成批次</text>
        <text class="summary-value">{{ summary.completedBatchCount }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">未完成批次</text>
        <text class="summary-value">{{ summary.incompleteBatchCount }}</text>
      </view>
    </view>

    <view v-if="progress" class="progress-area">
      <view class="progress-item">
        <text class="progress-label">时间进度</text>
        <view class="progress-track"><view class="progress-fill" :style="{ width: `${progress.timeProgressRate}%` }" /></view>
      </view>
      <view class="progress-item">
        <text class="progress-label">数量进度</text>
        <view class="progress-track"><view class="progress-fill" :style="{ width: `${progress.quantityProgressRate}%` }" /></view>
      </view>
      <view class="progress-item">
        <text class="progress-label">收益进度</text>
        <view class="progress-track"><view class="progress-fill" :style="{ width: `${progress.profitProgressRate}%` }" /></view>
      </view>
    </view>

    <view v-if="progress?.warningFlags?.length" class="warning-area">
      <text v-for="flag in progress.warningFlags" :key="flag" class="warning-chip">{{ resolveWarningLabel(flag) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ProfitSummary, ProgressSnapshot, WarningFlag } from '../../../../../api/financial-plan-types'

const props = defineProps<{
  summary: ProfitSummary | null
  progress: ProgressSnapshot | null
}>()

const emit = defineEmits<{
  (event: 'viewDetail'): void
}>()

/** 处理查看详情。 */
function handleViewDetail(): void {
  emit('viewDetail')
}

/** 解析告警标签。 */
function resolveWarningLabel(flag: WarningFlag): string {
  if (flag === 'OVER_WINDOW') {
    return '已超出时间窗口'
  }
  if (flag === 'INCOMPLETE_BATCH') {
    return '存在未完成批次'
  }
  return '已达到数量上限'
}
</script>

<style scoped>
.profit-summary-card {
  padding: 28rpx;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
  color: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 44rpx rgba(15, 23, 42, 0.24);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
}

.subtitle {
  display: block;
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.72);
  font-size: 24rpx;
}

.btn {
  min-width: 150rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.summary-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.summary-item {
  flex: 1 1 190rpx;
  min-width: 190rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.08);
}

.summary-label,
.progress-label {
  display: block;
  color: rgba(255, 255, 255, 0.72);
  font-size: 22rpx;
}

.summary-value {
  display: block;
  margin-top: 10rpx;
  font-size: 32rpx;
  font-weight: 600;
}

.progress-area {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.progress-track {
  width: 100%;
  height: 14rpx;
  margin-top: 10rpx;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 999rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.warning-area {
  margin-top: 24rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.warning-chip {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(248, 113, 113, 0.16);
  color: #fecaca;
  font-size: 22rpx;
}
</style>