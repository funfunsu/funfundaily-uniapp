<template>
  <view class="financial-plan-page">
    <view class="page-header">
      <view>
        <text class="page-title">收益分析</text>
        <text class="page-subtitle">按计划或标的维度查看统计、进度与告警</text>
      </view>
      <view class="header-actions">
        <button class="secondary-button" :class="viewMode === 'PLAN' ? 'secondary-button--active' : ''" @click="setViewMode('PLAN')">计划维度</button>
        <button class="secondary-button" :class="viewMode === 'ASSET' ? 'secondary-button--active' : ''" @click="setViewMode('ASSET')">标的维度</button>
      </view>
    </view>

    <view class="plan-title-card">
      <text class="plan-title">{{ currentPlan?.planName || '理财计划' }}</text>
      <text class="plan-subtitle">{{ resolvePlanTypeLabel(currentPlan?.planType) }} · {{ resolvePlanStatusLabel(currentPlan?.status) }}</text>
    </view>

    <profit-summary-card
      :summary="summary"
      :progress="progress"
      @viewDetail="handleViewDetail"
    />

    <view v-if="viewMode === 'PLAN'" class="section-card">
      <view class="section-card__header">
        <text class="section-card__title">计划概览</text>
        <text class="section-card__subtitle">汇总目标收益、实际收益与告警</text>
      </view>

      <view class="metric-grid">
        <view class="metric-item">
          <text class="metric-label">目标收益</text>
          <text class="metric-value">{{ summary?.targetProfit ?? 0 }}</text>
        </view>
        <view class="metric-item">
          <text class="metric-label">实际收益</text>
          <text class="metric-value">{{ summary?.actualProfit ?? 0 }}</text>
        </view>
        <view class="metric-item">
          <text class="metric-label">已兑现数量</text>
          <text class="metric-value">{{ summary?.realizedQuantity ?? 0 }}</text>
        </view>
        <view class="metric-item">
          <text class="metric-label">计划数量</text>
          <text class="metric-value">{{ summary?.plannedQuantity ?? 0 }}</text>
        </view>
      </view>

      <view class="progress-card">
        <view class="progress-row" v-for="progressItem in progressItems" :key="progressItem.label">
          <text class="progress-label">{{ progressItem.label }}</text>
          <text class="progress-value">{{ progressItem.value }}%</text>
        </view>
      </view>

      <view class="warning-card">
        <text class="warning-card__title">告警标记</text>
        <view class="warning-tags" v-if="warningFlags.length > 0">
          <text v-for="flag in warningFlags" :key="flag" class="warning-tag">{{ resolveWarningLabel(flag) }}</text>
        </view>
        <text v-else class="warning-empty">当前无告警</text>
      </view>
    </view>

    <view v-else class="section-card">
      <view class="section-card__header">
        <text class="section-card__title">标的收益明细</text>
        <text class="section-card__subtitle">支持按标的观察目标收益与实际收益的差异</text>
      </view>

      <asset-profit-table
        :rows="assetSummaries"
        :loading="statsLoading"
        @rowClick="handleAssetClick"
        @sortChange="handleSortChange"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'

import AssetProfitTable from '../../components/asset-profit-table.vue'
import ProfitSummaryCard from '../../components/profit-summary-card.vue'
import { useFinancialPlanStore } from '../../stores/useFinancialPlanStore'
import { useFinancialPlanStatsStore } from '../../stores/useFinancialPlanStatsStore'
import type {
  AssetProfitSummary,
  FinancialPlan,
  ProgressSnapshot,
  WarningFlag,
} from '../../../../../../api/financial-plan-types'

const planStore = useFinancialPlanStore()
const statsStore = useFinancialPlanStatsStore()

const planId = ref('')
const viewMode = ref<'PLAN' | 'ASSET'>('PLAN')

const currentPlan = computed<FinancialPlan | null>(() => planStore.planDetails[planId.value]?.plan || null)
const summary = computed(() => statsStore.summary)
const assetSummaries = computed(() => statsStore.assetSummaries)
const progress = computed(() => statsStore.progress)
const statsLoading = computed(() => statsStore.statsLoading)
const warningFlags = computed(() => statsStore.warningFlags)
const progressItems = computed(() => [
  { label: '时间进度', value: Number(progress.value?.timeProgressRate || 0).toFixed(2) },
  { label: '数量进度', value: Number(progress.value?.quantityProgressRate || 0).toFixed(2) },
  { label: '收益进度', value: Number(progress.value?.profitProgressRate || 0).toFixed(2) },
])

/** 解析计划类型标签。 */
function resolvePlanTypeLabel(planType?: FinancialPlan['planType']): string {
  if (planType === 'STOCK') {
    return '股票'
  }

  if (planType === 'SAVINGS') {
    return '储蓄'
  }

  return '未知类型'
}

/** 解析计划状态标签。 */
function resolvePlanStatusLabel(status?: FinancialPlan['status']): string {
  if (status === 'ARCHIVED') {
    return '已归档'
  }

  if (status === 'ACTIVE') {
    return '已启用'
  }

  return '草稿'
}

/** 解析告警标签。 */
function resolveWarningLabel(flag: WarningFlag): string {
  if (flag === 'OVER_WINDOW') {
    return '超出时间窗口'
  }

  if (flag === 'INCOMPLETE_BATCH') {
    return '存在未完成批次'
  }

  if (flag === 'QUANTITY_REACHED') {
    return '已达数量上限'
  }

  return flag
}

/** 切换分析维度。 */
function setViewMode(mode: 'PLAN' | 'ASSET'): void {
  viewMode.value = mode
}

/** 加载页面数据。 */
async function loadPageData(): Promise<void> {
  if (!planId.value) {
    return
  }

  await planStore.loadPlanDetail(planId.value)
  await statsStore.loadDashboard(planId.value)
}

/** 查看总览详情。 */
function handleViewDetail(): void {
  setViewMode('PLAN')
}

/** 点击标的明细。 */
function handleAssetClick(asset: AssetProfitSummary): void {
  viewMode.value = 'ASSET'
  uni.showToast({ title: asset.assetName, icon: 'none' })
}

/** 标的表格排序变更。 */
function handleSortChange(_sortInfo: { field: string; order: 'asc' | 'desc' }): void {
  // 当前页只展示后端统计结果，排序由表格内部或后续分析页扩展处理。
}

onLoad((query) => {
  planId.value = String(query?.planId || '')
})

onMounted(async () => {
  await loadPageData()
})

onShow(async () => {
  await loadPageData()
})
</script>

<style scoped>
.financial-plan-page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 160rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx;
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 16rpx 40rpx rgba(30, 41, 59, 0.08);
}

.page-title,
.plan-title {
  display: block;
  color: #0f172a;
  font-size: 36rpx;
  font-weight: 700;
}

.page-subtitle,
.plan-subtitle {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}

.header-actions {
  display: flex;
  gap: 12rpx;
}

.secondary-button {
  min-width: 150rpx;
  border-radius: 999rpx;
  background: #eef2ff;
  color: #334155;
}

.secondary-button--active {
  background: #1d4ed8;
  color: #ffffff;
}

.plan-title-card,
.section-card,
.warning-card,
.progress-card {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 16rpx 36rpx rgba(15, 23, 42, 0.08);
}

.section-card__header {
  margin-bottom: 18rpx;
}

.section-card__title,
.warning-card__title {
  display: block;
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 600;
}

.section-card__subtitle {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.metric-item {
  padding: 18rpx;
  border-radius: 20rpx;
  background: #f8fbff;
}

.metric-label,
.progress-label {
  display: block;
  color: #64748b;
  font-size: 22rpx;
}

.metric-value,
.progress-value {
  display: block;
  margin-top: 8rpx;
  color: #0f172a;
  font-size: 28rpx;
  font-weight: 600;
}

.progress-card {
  margin-top: 20rpx;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
}

.warning-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.warning-tag {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #fef3c7;
  color: #92400e;
  font-size: 22rpx;
}

.warning-empty {
  display: block;
  margin-top: 12rpx;
  color: #64748b;
  font-size: 24rpx;
}
</style>