<template>
  <view class="realization-batch-list">
    <view class="header">
      <view>
        <text class="title">兑现批次</text>
        <text class="subtitle">展示批次状态、买卖时间线与完成情况</text>
      </view>
      <button v-if="!readonly" class="btn btn-primary" @click="handleCreateBatch">新增批次</button>
    </view>

    <view v-if="batchItems.length === 0" class="empty-state">暂无兑现批次</view>

    <view
      v-for="batch in batchItems"
      :key="batch.batchId"
      class="batch-card"
      :class="{ 'batch-card-incomplete': batch.stageStatus !== 'COMPLETED' }"
    >
      <view class="batch-top">
        <view>
          <text class="batch-name">{{ batch.batchName }}</text>
          <text class="batch-meta">{{ resolveAssetName(batch.assetId) }} · 数量 {{ batch.quantity }}</text>
        </view>
        <text class="status-badge" :class="resolveStageToneClass(batch.stageStatus)">{{ resolveStageLabel(batch.stageStatus) }}</text>
      </view>

      <view class="timeline">
        <view class="timeline-item">
          <text class="timeline-label">买入</text>
          <text class="timeline-value">{{ resolveBuyLine(batch) }}</text>
        </view>
        <view class="timeline-item">
          <text class="timeline-label">卖出</text>
          <text class="timeline-value">{{ resolveSellLine(batch) }}</text>
        </view>
        <view class="timeline-item">
          <text class="timeline-label">盈亏</text>
          <text class="timeline-value">{{ resolveProfitLine(batch) }}</text>
        </view>
      </view>

      <view class="action-row" v-if="!readonly">
        <button class="btn btn-secondary" @click="handleEditBuy(batch)">登记买入</button>
        <button class="btn btn-secondary" @click="handleEditSell(batch)">登记卖出</button>
        <button class="btn btn-ghost" @click="handleViewHistory(batch)">查看历史</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { RealizationBatch } from '../../../../../api/financial-plan-types'

interface AssetMap {
  [assetId: string]: string
}

const props = withDefaults(
  defineProps<{
    batches: RealizationBatch[]
    assetMap?: AssetMap
    readonly?: boolean
  }>(),
  {
    batches: () => [],
    assetMap: () => ({}),
    readonly: false,
  },
)

const emit = defineEmits<{
  (event: 'createBatch'): void
  (event: 'editBuy', value: RealizationBatch): void
  (event: 'editSell', value: RealizationBatch): void
  (event: 'viewHistory', value: RealizationBatch): void
}>()

const batchItems = computed(() => props.batches)

/** 根据资产 ID 返回展示名称。 */
function resolveAssetName(assetId: string): string {
  return props.assetMap?.[assetId] || assetId || '未知标的'
}

/** 返回阶段状态标签。 */
function resolveStageLabel(stageStatus: RealizationBatch['stageStatus']): string {
  if (stageStatus === 'COMPLETED') {
    return '已完成'
  }
  if (stageStatus === 'PENDING_SELL') {
    return '待卖出'
  }
  if (stageStatus === 'PARTIAL_BOUGHT') {
    return '已买入'
  }
  return '待买入'
}

/** 返回阶段状态徽标样式。 */
function resolveStageToneClass(stageStatus: RealizationBatch['stageStatus']): string {
  if (stageStatus === 'COMPLETED') {
    return 'badge-success'
  }
  if (stageStatus === 'PENDING_SELL') {
    return 'badge-warning'
  }
  return 'badge-neutral'
}

/** 生成买入时间线文本。 */
function resolveBuyLine(batch: RealizationBatch): string {
  if (!batch.buyTradeDate) {
    return batch.stageStatus === 'PENDING_BUY' ? '等待买入登记' : '买入已完成'
  }

  return `${batch.buyTradeDate} · 均价 ${batch.actualBuyPrice ?? '-'} · 金额 ${batch.actualBuyAmount ?? '-'}`
}

/** 生成卖出时间线文本。 */
function resolveSellLine(batch: RealizationBatch): string {
  if (!batch.sellTradeDate) {
    return batch.stageStatus === 'COMPLETED' ? '卖出记录缺失' : '等待卖出登记'
  }

  return `${batch.sellTradeDate} · 均价 ${batch.actualSellPrice ?? '-'} · 金额 ${batch.actualSellAmount ?? '-'}`
}

/** 生成盈亏时间线文本。 */
function resolveProfitLine(batch: RealizationBatch): string {
  if (batch.actualProfit === undefined || batch.actualProfit === null) {
    return batch.stageStatus === 'COMPLETED' ? '等待刷新统计' : '未完成，暂不结算'
  }

  return `实际盈亏 ${batch.actualProfit}`
}

/** 触发新增批次。 */
function handleCreateBatch(): void {
  emit('createBatch')
}

/** 触发编辑买入。 */
function handleEditBuy(batch: RealizationBatch): void {
  emit('editBuy', batch)
}

/** 触发编辑卖出。 */
function handleEditSell(batch: RealizationBatch): void {
  emit('editSell', batch)
}

/** 触发查看历史。 */
function handleViewHistory(batch: RealizationBatch): void {
  emit('viewHistory', batch)
}
</script>

<style scoped>
.realization-batch-list {
  padding: 28rpx;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 40rpx rgba(30, 41, 59, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.title {
  display: block;
  color: #0f172a;
  font-size: 32rpx;
  font-weight: 600;
}

.subtitle {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}

.empty-state {
  padding: 40rpx 24rpx;
  text-align: center;
  color: #64748b;
  background: #f8fbff;
  border-radius: 20rpx;
}

.batch-card {
  margin-top: 20rpx;
  padding: 24rpx;
  border: 1rpx solid #e2e8f0;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.batch-card-incomplete {
  border-color: #f59e0b;
  box-shadow: inset 0 0 0 1rpx rgba(245, 158, 11, 0.16);
}

.batch-top {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 18rpx;
}

.batch-name {
  display: block;
  color: #0f172a;
  font-size: 28rpx;
  font-weight: 600;
}

.batch-meta {
  display: block;
  margin-top: 6rpx;
  color: #64748b;
  font-size: 22rpx;
}

.status-badge {
  height: fit-content;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.badge-success {
  background: #dcfce7;
  color: #166534;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-neutral {
  background: #e2e8f0;
  color: #334155;
}

.timeline {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.timeline-item {
  flex: 1 1 240rpx;
  min-width: 240rpx;
  padding: 16rpx 18rpx;
  border-radius: 18rpx;
  background: #f8fbff;
}

.timeline-label {
  display: block;
  color: #475569;
  font-size: 22rpx;
}

.timeline-value {
  display: block;
  margin-top: 8rpx;
  color: #0f172a;
  font-size: 24rpx;
  line-height: 1.6;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 20rpx;
}

.btn {
  min-width: 150rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
}

.btn-primary {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #ffffff;
}

.btn-secondary {
  background: #eef2ff;
  color: #334155;
}

.btn-ghost {
  background: #ffffff;
  color: #2563eb;
  border: 1rpx solid #bfdbfe;
}
</style>