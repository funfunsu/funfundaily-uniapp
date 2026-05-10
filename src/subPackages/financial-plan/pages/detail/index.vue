<template>
  <view class="financial-plan-page">
    <view class="page-header">
      <view>
        <text class="page-title">计划详情</text>
        <text class="page-subtitle">查看计划、标的、批次与统计概览</text>
      </view>
      <view class="header-actions">
        <button class="secondary-button" @click="handleEdit">编辑</button>
        <button class="secondary-button" @click="handleOpenRealization">批次</button>
        <button class="secondary-button" @click="handleOpenAnalysis">分析</button>
      </view>
    </view>

    <profit-summary-card
      :summary="summary"
      :progress="progress"
      @viewDetail="handleViewStats"
    />

    <view class="section-block">
      <view class="section-block__header">
        <text class="section-block__title">计划基本信息</text>
      </view>
      <view v-if="currentPlan" class="info-card">
        <view class="info-row">
          <text class="info-label">计划名称</text>
          <text class="info-value">{{ currentPlan.planName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">计划类型</text>
          <text class="info-value">{{ resolvePlanTypeLabel(currentPlan.planType) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">时间范围</text>
          <text class="info-value">{{ resolveTimeRangeLabel(currentPlan.timeRangeType, currentPlan.fiscalYear) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">起止日期</text>
          <text class="info-value">{{ currentPlan.startDate }} ~ {{ currentPlan.endDate }}</text>
        </view>
      </view>
    </view>

    <view class="section-block">
      <view class="section-block__header">
        <text class="section-block__title">计划标的</text>
      </view>
      <plan-asset-editor
        :items="assetItems"
        :plan-type="currentPlan?.planType || 'SAVINGS'"
        :stock-sub-type="currentPlan?.stockSubType"
        :editable="false"
      />
    </view>

    <view class="section-block">
      <view class="section-block__header">
        <text class="section-block__title">兑现批次</text>
      </view>
      <realization-batch-list
        :batches="batchItems"
        :asset-map="assetMap"
        :readonly="true"
      />
    </view>

    <view class="section-block">
      <view class="section-block__header">
        <text class="section-block__title">标的收益明细</text>
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
import { onLoad } from '@dcloudio/uni-app'

import AssetProfitTable from '../../components/asset-profit-table.vue'
import PlanAssetEditor from '../../components/plan-asset-editor.vue'
import ProfitSummaryCard from '../../components/profit-summary-card.vue'
import RealizationBatchList from '../../components/realization-batch-list.vue'
import { useFinancialPlanStore } from '../../stores/useFinancialPlanStore'
import { usePlanAssetStore } from '../../stores/usePlanAssetStore'
import { useRealizationStore } from '../../stores/useRealizationStore'
import { useFinancialPlanStatsStore } from '../../stores/useFinancialPlanStatsStore'
import type { AssetProfitSummary, FinancialPlan, FinancialPlanAsset, ProgressSnapshot } from '../../../../../../api/financial-plan-types'

const planStore = useFinancialPlanStore()
const assetStore = usePlanAssetStore()
const realizationStore = useRealizationStore()
const statsStore = useFinancialPlanStatsStore()

const planId = ref('')

const currentPlan = computed<FinancialPlan | null>(() => {
  const selectedPlan = planStore.selectedPlan
  if (selectedPlan && 'planId' in selectedPlan && 'targetProfit' in selectedPlan) {
    return selectedPlan as FinancialPlan
  }

  return planStore.planDetails[planId.value]?.plan || null
})

const summary = computed(() => statsStore.summary)
const progress = computed(() => statsStore.progress)
const assetSummaries = computed(() => statsStore.assetSummaries)
const statsLoading = computed(() => statsStore.statsLoading)
const assetItems = computed(() => assetStore.assetList)
const batchItems = computed(() => realizationStore.batchList)
const assetMap = computed<Record<string, string>>(() =>
  assetStore.assetList.reduce((map, asset) => {
    map[asset.assetId] = asset.assetName || asset.assetCode || asset.assetId
    return map
  }, {} as Record<string, string>),
)

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

/** 解析时间范围标签。 */
function resolveTimeRangeLabel(timeRangeType?: FinancialPlan['timeRangeType'], fiscalYear?: number): string {
  if (timeRangeType === 'YEAR') {
    return `年度 ${fiscalYear || ''}`.trim()
  }
  if (timeRangeType === 'CUSTOM') {
    return '自定义周期'
  }
  return '未知时间范围'
}

/** 加载详情。 */
async function loadPageData(): Promise<void> {
  if (!planId.value) {
    return
  }

  const detail = await planStore.loadPlanDetail(planId.value)
  if (detail) {
    assetStore.assetList = detail.assets.map((asset) => ({ ...asset }))
    realizationStore.batchList = detail.realizationBatches.map((batch) => ({ ...batch }))
    realizationStore.selectedBatch = realizationStore.batchList[0] || null
    await statsStore.loadDashboard(planId.value)
  }
}

/** 跳转到编辑页。 */
function handleEdit(): void {
  if (!planId.value) {
    return
  }

  uni.navigateTo({ url: `/subPackages/financial-plan/pages/edit/index?planId=${encodeURIComponent(planId.value)}` })
}

/** 查看统计详情。 */
function handleViewStats(): void {
  handleOpenAnalysis()
}

/** 跳转到批次编辑页。 */
function handleOpenRealization(): void {
  if (!planId.value) {
    return
  }

  uni.navigateTo({ url: `/subPackages/financial-plan/pages/realization-edit/index?planId=${encodeURIComponent(planId.value)}` })
}

/** 跳转到收益分析页。 */
function handleOpenAnalysis(): void {
  if (!planId.value) {
    return
  }

  uni.navigateTo({ url: `/subPackages/financial-plan/pages/analysis/index?planId=${encodeURIComponent(planId.value)}` })
}

/** 标的点击。 */
function handleAssetClick(asset: AssetProfitSummary): void {
  uni.showToast({ title: `${asset.assetName}：${asset.actualProfit}`, icon: 'none' })
}

/** 统计排序变更。 */
function handleSortChange(_sortInfo: { field: string; order: 'asc' | 'desc' }): void {
  // 详情页仅展示数据，排序交由表格自身/后续页面处理。
}

onLoad((query) => {
  planId.value = String(query?.planId || '')
})

onMounted(async () => {
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

.page-title {
  display: block;
  color: #0f172a;
  font-size: 36rpx;
  font-weight: 700;
}

.page-subtitle {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}

.secondary-button {
  min-width: 140rpx;
  border-radius: 999rpx;
  background: #eef2ff;
  color: #334155;
}

.section-block {
  margin-top: 24rpx;
}

.section-block__header {
  margin-bottom: 16rpx;
}

.section-block__title {
  display: block;
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 600;
}

.info-card {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 16rpx 36rpx rgba(15, 23, 42, 0.08);
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #e2e8f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #64748b;
  font-size: 24rpx;
}

.info-value {
  color: #0f172a;
  font-size: 24rpx;
  text-align: right;
}
</style>