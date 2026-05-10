<template>
  <view class="financial-plan-page">
    <view class="page-header">
      <view>
        <text class="page-title">理财计划</text>
        <text class="page-subtitle">按计划、状态、时间范围快速筛选并查看详情</text>
      </view>
      <button class="primary-button" @click="handleCreatePlan">新建计划</button>
    </view>

    <financial-plan-filter-bar
      :keyword="query.keyword || ''"
      :plan-type="query.planType || ''"
      :execution-status="query.executionStatus || ''"
      :time-range-type="query.timeRangeType || ''"
      :selected-year="query.fiscalYear || ''"
      :start-date="query.startDate || ''"
      :end-date="query.endDate || ''"
      @update:keyword="handleKeywordUpdate"
      @update:planType="handlePlanTypeUpdate"
      @update:executionStatus="handleExecutionStatusUpdate"
      @update:timeRangeType="handleTimeRangeTypeUpdate"
      @update:selectedYear="handleSelectedYearUpdate"
      @update:startDate="handleStartDateUpdate"
      @update:endDate="handleEndDateUpdate"
      @timeRangeChange="handleTimeRangeChange"
      @search="handleSearch"
      @reset="handleReset"
    />

    <view class="list-summary">
      <text class="list-summary__count">共 {{ total }} 个计划</text>
      <text class="list-summary__hint" v-if="loading">正在加载...</text>
    </view>

    <view v-if="loading && planList.length === 0" class="empty-state">加载中...</view>

    <view v-else-if="planList.length > 0" class="plan-list">
      <view
        v-for="plan in planList"
        :key="plan.planId"
        class="plan-card"
        :class="getStatusClass(plan.status)"
        @click="openDetail(plan.planId)"
      >
        <view class="plan-card__top">
          <view>
            <text class="plan-card__name">{{ plan.planName }}</text>
            <text class="plan-card__meta">{{ resolvePlanTypeLabel(plan.planType) }} · {{ resolveTimeRangeLabel(plan.timeRangeType, plan.fiscalYear) }}</text>
          </view>
          <text class="plan-card__status">{{ resolveStatusLabel(plan.status) }}</text>
        </view>

        <view class="plan-card__body">
          <view class="metric">
            <text class="metric__label">目标收益</text>
            <text class="metric__value">{{ plan.targetProfit }}</text>
          </view>
          <view class="metric">
            <text class="metric__label">实际收益</text>
            <text class="metric__value">{{ plan.actualProfit }}</text>
          </view>
          <view class="metric">
            <text class="metric__label">完成度</text>
            <text class="metric__value">{{ plan.completionRate }}%</text>
          </view>
        </view>

        <view class="plan-card__footer">
          <text class="plan-card__date">{{ plan.startDate }} ~ {{ plan.endDate }}</text>
          <view class="plan-card__actions">
            <text class="action-link" @click.stop="handleEditPlan(plan.planId)">编辑</text>
            <text class="action-link" @click.stop="handleOpenRealization(plan.planId)">批次</text>
            <text class="action-link" @click.stop="handleOpenAnalysis(plan.planId)">分析</text>
            <text class="action-link" v-if="plan.status !== 'ARCHIVED'" @click.stop="handleArchivePlan(plan)">归档</text>
            <text class="action-link" v-else @click.stop="handleArchivePlan(plan)">恢复</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <text>暂无理财计划，点击右上角新建</text>
    </view>

    <view class="pagination">
      <button class="pager-button" :disabled="pageNo <= 1" @click="handlePrevPage">上一页</button>
      <text class="pager-text">{{ pageNo }} / {{ totalPages }}</text>
      <button class="pager-button" :disabled="pageNo >= totalPages" @click="handleNextPage">下一页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'

import FinancialPlanFilterBar from '../../components/financial-plan-filter-bar.vue'
import { useFinancialPlanStore } from '../../stores/useFinancialPlanStore'
import type { FinancialPlanListItem, PlanStatus, PlanType, TimeRangeType } from '../../../../../../api/financial-plan-types'

const planStore = useFinancialPlanStore()

const query = reactive({ ...planStore.query })

const planList = computed(() => planStore.planList)
const total = computed(() => planStore.total)
const loading = computed(() => planStore.loading)
const pageNo = computed(() => Number(planStore.query.pageNo || 1))
const pageSize = computed(() => Number(planStore.query.pageSize || 10))
const totalPages = computed(() => Math.max(1, Math.ceil((total.value || 0) / pageSize.value)))

/** 解析计划类型标签。 */
function resolvePlanTypeLabel(planType?: PlanType): string {
  if (planType === 'STOCK') {
    return '股票'
  }
  if (planType === 'SAVINGS') {
    return '储蓄'
  }
  return '全部类型'
}

/** 解析时间范围标签。 */
function resolveTimeRangeLabel(timeRangeType?: TimeRangeType, fiscalYear?: number): string {
  if (timeRangeType === 'YEAR') {
    return `年度 ${fiscalYear || ''}`.trim()
  }
  if (timeRangeType === 'CUSTOM') {
    return '自定义周期'
  }
  return '全部时间'
}

/** 解析状态标签。 */
function resolveStatusLabel(status: PlanStatus): string {
  if (status === 'ACTIVE') {
    return '启用'
  }
  if (status === 'ARCHIVED') {
    return '归档'
  }
  return '草稿'
}

/** 返回状态样式。 */
function getStatusClass(status: PlanStatus): string {
  if (status === 'ARCHIVED') {
    return 'plan-card--archived'
  }
  if (status === 'ACTIVE') {
    return 'plan-card--active'
  }
  return 'plan-card--draft'
}

/** 同步查询对象并刷新列表。 */
async function syncAndSearch(): Promise<void> {
  planStore.setQuery({ ...query })
  await planStore.queryPlans()
  Object.assign(query, planStore.query)
}

/** 处理关键词更新。 */
function handleKeywordUpdate(value: string): void {
  query.keyword = value
}

/** 处理计划类型更新。 */
function handlePlanTypeUpdate(value: string): void {
  query.planType = value as PlanType
}

/** 处理执行状态更新。 */
function handleExecutionStatusUpdate(value: string): void {
  query.executionStatus = value as PlanStatus
}

/** 处理时间范围更新。 */
function handleTimeRangeTypeUpdate(value: string): void {
  query.timeRangeType = value as TimeRangeType
  if (value !== 'YEAR') {
    query.fiscalYear = ''
  }
}

/** 处理年度更新。 */
function handleSelectedYearUpdate(value: number | string): void {
  query.fiscalYear = value
}

/** 处理开始日期更新。 */
function handleStartDateUpdate(value: string): void {
  query.startDate = value
}

/** 处理结束日期更新。 */
function handleEndDateUpdate(value: string): void {
  query.endDate = value
}

/** 时间范围模式变更时，清理不适配的筛选字段。 */
function handleTimeRangeChange(value: string): void {
  if (value === 'YEAR') {
    query.startDate = ''
    query.endDate = ''
  } else {
    query.fiscalYear = ''
  }
}

/** 触发筛选查询。 */
async function handleSearch(): Promise<void> {
  query.pageNo = 1
  await syncAndSearch()
}

/** 重置筛选条件。 */
async function handleReset(): Promise<void> {
  Object.assign(query, {
    groupId: query.groupId || '',
    ownerUserId: '',
    keyword: '',
    planType: '',
    executionStatus: '',
    timeRangeType: 'CUSTOM',
    fiscalYear: '',
    startDate: '',
    endDate: '',
    pageNo: 1,
    pageSize: 10,
  })
  await syncAndSearch()
}

/** 打开新建页面。 */
function handleCreatePlan(): void {
  uni.navigateTo({ url: '/subPackages/financial-plan/pages/edit/index' })
}

/** 打开编辑页面。 */
function handleEditPlan(planId: string): void {
  uni.navigateTo({ url: `/subPackages/financial-plan/pages/edit/index?planId=${encodeURIComponent(planId)}` })
}

/** 打开详情页。 */
function openDetail(planId: string): void {
  uni.navigateTo({ url: `/subPackages/financial-plan/pages/detail/index?planId=${encodeURIComponent(planId)}` })
}

/** 打开批次编辑页。 */
function handleOpenRealization(planId: string): void {
  uni.navigateTo({ url: `/subPackages/financial-plan/pages/realization-edit/index?planId=${encodeURIComponent(planId)}` })
}

/** 打开收益分析页。 */
function handleOpenAnalysis(planId: string): void {
  uni.navigateTo({ url: `/subPackages/financial-plan/pages/analysis/index?planId=${encodeURIComponent(planId)}` })
}

/** 切换到上一页。 */
async function handlePrevPage(): Promise<void> {
  if (pageNo.value <= 1) {
    return
  }

  query.pageNo = pageNo.value - 1
  await syncAndSearch()
}

/** 切换到下一页。 */
async function handleNextPage(): Promise<void> {
  if (pageNo.value >= totalPages.value) {
    return
  }

  query.pageNo = pageNo.value + 1
  await syncAndSearch()
}

/** 归档或恢复计划。 */
async function handleArchivePlan(plan: FinancialPlanListItem): Promise<void> {
  if (!plan.planId) {
    return
  }

  const actionLabel = plan.status === 'ARCHIVED' ? '恢复' : '归档'
  const result = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: `${actionLabel}计划`,
      content: `确认${actionLabel}「${plan.planName}」吗？`,
      success: (modalResult) => resolve(Boolean(modalResult.confirm)),
      fail: () => resolve(false),
    })
  })

  if (!result) {
    return
  }

  const resolvedVersion = planStore.planDetails[plan.planId]?.plan.version || 1
  await planStore.archivePlan(plan.planId, resolvedVersion)
  await syncAndSearch()
}

onMounted(async () => {
  await syncAndSearch()
})

onShow(async () => {
  await syncAndSearch()
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

.primary-button {
  min-width: 150rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #ffffff;
  font-size: 26rpx;
}

.list-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 18rpx 4rpx;
}

.list-summary__count {
  color: #0f172a;
  font-size: 28rpx;
  font-weight: 600;
}

.list-summary__hint {
  color: #2563eb;
  font-size: 24rpx;
}

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.plan-card {
  padding: 26rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 16rpx 36rpx rgba(15, 23, 42, 0.08);
}

.plan-card--archived {
  border-left: 8rpx solid #94a3b8;
}

.plan-card--active {
  border-left: 8rpx solid #2563eb;
}

.plan-card--draft {
  border-left: 8rpx solid #f59e0b;
}

.plan-card__top,
.plan-card__footer,
.plan-card__body {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
}

.plan-card__top {
  align-items: flex-start;
}

.plan-card__name {
  display: block;
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 700;
}

.plan-card__meta,
.plan-card__date {
  display: block;
  margin-top: 6rpx;
  color: #64748b;
  font-size: 22rpx;
}

.plan-card__status {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #eff6ff;
  color: #2563eb;
  font-size: 22rpx;
}

.plan-card__body {
  margin: 18rpx 0;
}

.metric {
  flex: 1;
  padding: 18rpx;
  border-radius: 20rpx;
  background: #f8fbff;
}

.metric__label {
  display: block;
  color: #64748b;
  font-size: 22rpx;
}

.metric__value {
  display: block;
  margin-top: 8rpx;
  color: #0f172a;
  font-size: 28rpx;
  font-weight: 600;
}

.plan-card__actions {
  display: flex;
  gap: 16rpx;
}

.action-link {
  color: #2563eb;
  font-size: 24rpx;
}

.empty-state {
  margin-top: 24rpx;
  padding: 56rpx 24rpx;
  text-align: center;
  color: #64748b;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 16rpx 36rpx rgba(15, 23, 42, 0.08);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20rpx;
  margin-top: 28rpx;
}

.pager-button {
  min-width: 140rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #334155;
}

.pager-button:disabled {
  color: #94a3b8;
}

.pager-text {
  color: #475569;
  font-size: 24rpx;
}
</style>