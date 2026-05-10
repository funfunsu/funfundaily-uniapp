<template>
  <view class="asset-profit-table">
    <view class="header">
      <view>
        <text class="title">标的收益明细</text>
        <text class="subtitle">支持按计划标的维度查看收益统计</text>
      </view>
      <view v-if="loading" class="loading-text">加载中...</view>
    </view>

    <view class="table">
      <view class="table-head">
        <text class="th th-wide" @click="handleSort('assetName')">标的名称</text>
        <text class="th" @click="handleSort('targetProfit')">目标收益</text>
        <text class="th" @click="handleSort('actualProfit')">实际收益</text>
        <text class="th" @click="handleSort('realizedQuantity')">已兑现</text>
        <text class="th" @click="handleSort('plannedQuantity')">计划数量</text>
        <text class="th" @click="handleSort('completionRate')">完成度</text>
      </view>

      <view v-if="rows.length === 0" class="empty-state">暂无标的收益数据</view>

      <view v-for="row in rows" :key="row.assetId" class="table-row" @click="handleRowClick(row)">
        <text class="td td-wide">{{ row.assetName }}<text class="sub-text">{{ row.assetCode }}</text></text>
        <text class="td">{{ row.targetProfit }}</text>
        <text class="td">{{ row.actualProfit }}</text>
        <text class="td">{{ row.realizedQuantity }}</text>
        <text class="td">{{ row.plannedQuantity }}</text>
        <text class="td">{{ row.completionRate }}%</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import type { AssetProfitSummary } from '../../../../../api/financial-plan-types'

const props = defineProps<{
  rows: AssetProfitSummary[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'rowClick', value: AssetProfitSummary): void
  (event: 'sortChange', value: { field: string; order: 'asc' | 'desc' }): void
}>()

const sortOrder = ref<'asc' | 'desc'>('asc')

/** 触发行点击。 */
function handleRowClick(row: AssetProfitSummary): void {
  emit('rowClick', row)
}

/** 触发排序变更。 */
function handleSort(field: string): void {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  emit('sortChange', { field, order: sortOrder.value })
}
</script>

<style scoped>
.asset-profit-table {
  padding: 28rpx;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 18rpx 40rpx rgba(30, 41, 59, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
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

.loading-text {
  color: #2563eb;
  font-size: 24rpx;
}

.table {
  display: flex;
  flex-direction: column;
}

.table-head,
.table-row {
  display: flex;
  align-items: stretch;
}

.table-head {
  background: #eff6ff;
  border-radius: 18rpx;
  overflow: hidden;
}

.table-row {
  margin-top: 12rpx;
  border: 1rpx solid #e2e8f0;
  border-radius: 18rpx;
  background: #f8fbff;
}

.th,
.td {
  flex: 1;
  padding: 18rpx 14rpx;
  color: #0f172a;
  font-size: 24rpx;
  text-align: center;
}

.th {
  color: #2563eb;
  font-weight: 600;
}

.th-wide,
.td-wide {
  flex: 1.5;
  text-align: left;
}

.sub-text {
  display: block;
  margin-top: 6rpx;
  color: #64748b;
  font-size: 20rpx;
}

.empty-state {
  padding: 36rpx 20rpx;
  color: #64748b;
  text-align: center;
}
</style>