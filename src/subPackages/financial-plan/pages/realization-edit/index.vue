<template>
  <view class="financial-plan-page">
    <view class="page-header">
      <view>
        <text class="page-title">兑现批次编辑</text>
        <text class="page-subtitle">创建批次、登记买入与卖出，完整还原兑现过程</text>
      </view>
      <view class="header-actions">
        <button class="secondary-button" @click="handleGoAnalysis">收益分析</button>
      </view>
    </view>

    <profit-summary-card
      :summary="summary"
      :progress="progress"
      @viewDetail="handleGoAnalysis"
    />

    <view class="plan-info-card">
      <view class="plan-info-row">
        <text class="plan-info-label">计划名称</text>
        <text class="plan-info-value">{{ currentPlan?.planName || '未加载' }}</text>
      </view>
      <view class="plan-info-row">
        <text class="plan-info-label">计划类型</text>
        <text class="plan-info-value">{{ resolvePlanTypeLabel(currentPlan?.planType) }}</text>
      </view>
      <view class="plan-info-row">
        <text class="plan-info-label">状态</text>
        <text class="plan-info-value" :class="currentPlan?.status === 'ARCHIVED' ? 'status-muted' : 'status-active'">
          {{ resolvePlanStatusLabel(currentPlan?.status) }}
        </text>
      </view>
    </view>

    <view id="create-batch-section" class="section-card">
      <view class="section-card__header">
        <text class="section-card__title">新建兑现批次</text>
        <text class="section-card__subtitle">批次数量不得超过标的剩余可兑现数量</text>
      </view>

      <view class="field-group">
        <text class="field-label">选择标的</text>
        <picker :range="assetPickerOptions" :value="assetPickerIndex" @change="handleAssetPickerChange">
          <view class="picker-box">
            {{ selectedAssetLabel || '请选择标的' }}
          </view>
        </picker>
        <text class="helper-text">剩余可兑现：{{ selectedAssetRemainingQuantity }}</text>
      </view>

      <view class="field-group">
        <text class="field-label">批次名称</text>
        <input v-model="createForm.batchName" class="input-box" placeholder="例如：第一次部分兑现" />
      </view>

      <view class="field-row">
        <view class="field-group field-group--flex">
          <text class="field-label">兑现数量</text>
          <input v-model="createForm.quantity" class="input-box" type="number" placeholder="请输入数量" />
        </view>
        <view class="field-group field-group--flex">
          <text class="field-label">备注</text>
          <input v-model="createForm.note" class="input-box" placeholder="批次备注" />
        </view>
      </view>

      <button class="primary-button" :disabled="!canMutatePlan" @click="handleCreateBatch">创建批次</button>
    </view>

    <view class="section-card">
      <view class="section-card__header">
        <text class="section-card__title">兑现批次列表</text>
        <text class="section-card__subtitle">点击买入/卖出按钮可切换当前编辑批次</text>
      </view>

      <realization-batch-list
        :batches="batchList"
        :asset-map="assetMap"
        :readonly="false"
        @createBatch="scrollToCreateSection"
        @editBuy="handleSelectBatchForBuy"
        @editSell="handleSelectBatchForSell"
        @viewHistory="handleSelectBatch"
      />
    </view>

    <view class="section-card">
      <view class="section-card__header">
        <text class="section-card__title">当前编辑批次</text>
        <text class="section-card__subtitle">待买入 / 已买入 / 已完成状态会影响可编辑项</text>
      </view>

      <view v-if="selectedBatch" class="selected-batch-card">
        <view class="plan-info-row">
          <text class="plan-info-label">批次</text>
          <text class="plan-info-value">{{ selectedBatch.batchName }}</text>
        </view>
        <view class="plan-info-row">
          <text class="plan-info-label">标的</text>
          <text class="plan-info-value">{{ resolveAssetName(selectedBatch.assetId) }}</text>
        </view>
        <view class="plan-info-row">
          <text class="plan-info-label">状态</text>
          <text class="plan-info-value" :class="resolveStageToneClass(selectedBatch.stageStatus)">{{ resolveStageLabel(selectedBatch.stageStatus) }}</text>
        </view>
      </view>

      <view v-else class="empty-state">请选择一个批次后登记买入或卖出</view>

      <view class="trade-grid">
        <view class="trade-card">
          <view class="trade-card__header">
            <text class="trade-card__title">登记买入</text>
            <text class="trade-card__subtitle">满足 INV-3：买入不得早于批次创建</text>
          </view>

          <view class="field-group">
            <text class="field-label">交易日期</text>
            <input v-model="buyForm.tradeDate" class="input-box" type="text" placeholder="YYYY-MM-DD" />
          </view>
          <view class="field-row">
            <view class="field-group field-group--flex">
              <text class="field-label">实际买入价格</text>
              <input v-model="buyForm.actualBuyPrice" class="input-box" type="number" placeholder="买入价格" />
            </view>
            <view class="field-group field-group--flex">
              <text class="field-label">数量</text>
              <input v-model="buyForm.quantity" class="input-box" type="number" placeholder="数量" />
            </view>
          </view>
          <view class="field-row">
            <view class="field-group field-group--flex">
              <text class="field-label">手续费</text>
              <input v-model="buyForm.fee" class="input-box" type="number" placeholder="手续费" />
            </view>
            <view class="field-group field-group--flex">
              <text class="field-label">备注</text>
              <input v-model="buyForm.note" class="input-box" placeholder="买入备注" />
            </view>
          </view>
          <button class="primary-button" :disabled="!canRecordBuy" @click="handleRecordBuy">登记买入</button>
        </view>

        <view class="trade-card">
          <view class="trade-card__header">
            <text class="trade-card__title">登记卖出</text>
            <text class="trade-card__subtitle">满足 INV-4：仅完整批次参与实际盈利统计</text>
          </view>

          <view class="field-group">
            <text class="field-label">交易日期</text>
            <input v-model="sellForm.tradeDate" class="input-box" type="text" placeholder="YYYY-MM-DD" />
          </view>
          <view class="field-row">
            <view class="field-group field-group--flex">
              <text class="field-label">实际卖出价格</text>
              <input v-model="sellForm.actualSellPrice" class="input-box" type="number" placeholder="卖出价格" />
            </view>
            <view class="field-group field-group--flex">
              <text class="field-label">数量</text>
              <input v-model="sellForm.quantity" class="input-box" type="number" placeholder="数量" />
            </view>
          </view>
          <view class="field-row">
            <view class="field-group field-group--flex">
              <text class="field-label">手续费</text>
              <input v-model="sellForm.fee" class="input-box" type="number" placeholder="手续费" />
            </view>
            <view class="field-group field-group--flex">
              <text class="field-label">备注</text>
              <input v-model="sellForm.note" class="input-box" placeholder="卖出备注" />
            </view>
          </view>
          <button class="primary-button" :disabled="!canRecordSell" @click="handleRecordSell">登记卖出</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'

import ProfitSummaryCard from '../../components/profit-summary-card.vue'
import RealizationBatchList from '../../components/realization-batch-list.vue'
import { useFinancialPlanStore } from '../../stores/useFinancialPlanStore'
import { usePlanAssetStore } from '../../stores/usePlanAssetStore'
import { useRealizationStore } from '../../stores/useRealizationStore'
import { useFinancialPlanStatsStore } from '../../stores/useFinancialPlanStatsStore'
import { planStatus, stageStatus } from '../../../../../../api/financial-plan-types'
import type {
  Api6CreateRealizationBatchRequest,
  Api7RecordRealizationBuyRequest,
  Api8RecordRealizationSellRequest,
  FinancialPlan,
  FinancialPlanAsset,
  RealizationBatch,
} from '../../../../../../api/financial-plan-types'

const planStore = useFinancialPlanStore()
const assetStore = usePlanAssetStore()
const realizationStore = useRealizationStore()
const statsStore = useFinancialPlanStatsStore()

const planId = ref('')
const selectedBatchId = ref('')

const createForm = reactive({
  assetId: '',
  batchName: '',
  quantity: '',
  note: '',
})

/** 取今天的 YYYY-MM-DD（按本地时区，避免 toISOString 的 UTC 偏差）。 */
function todayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buyForm = reactive({
  tradeDate: todayDateString(),
  actualBuyPrice: '',
  quantity: '',
  fee: '0',
  note: '',
})

const sellForm = reactive({
  tradeDate: todayDateString(),
  actualSellPrice: '',
  quantity: '',
  fee: '0',
  note: '',
})

const currentPlan = computed<FinancialPlan | null>(() => planStore.planDetails[planId.value]?.plan || null)
const summary = computed(() => statsStore.summary)
const progress = computed(() => statsStore.progress)
const batchList = computed(() => realizationStore.batchList)
const assetList = computed(() => assetStore.assetList)
const selectedBatch = computed<RealizationBatch | null>(() => {
  if (selectedBatchId.value) {
    return batchList.value.find((batch) => batch.batchId === selectedBatchId.value) || null
  }

  return realizationStore.selectedBatch
})
const canMutatePlan = computed(() => currentPlan.value?.status !== planStatus.archived)
const canRecordBuy = computed(() => Boolean(canMutatePlan.value && selectedBatch.value && selectedBatch.value.stageStatus === stageStatus.pendingBuy))
const canRecordSell = computed(() => Boolean(canMutatePlan.value && selectedBatch.value && selectedBatch.value.stageStatus !== stageStatus.pendingBuy))
const assetMap = computed<Record<string, string>>(() =>
  assetList.value.reduce((map, asset) => {
    map[asset.assetId] = resolveAssetName(asset)
    return map
  }, {} as Record<string, string>),
)
const assetPickerOptions = computed(() =>
  assetList.value.map((asset) => `${resolveAssetName(asset)} · 剩余 ${resolveAssetRemainingQuantity(asset)}`),
)
const assetPickerIndex = computed(() => Math.max(0, assetList.value.findIndex((asset) => asset.assetId === createForm.assetId)))
const selectedAsset = computed<FinancialPlanAsset | null>(() =>
  assetList.value.find((asset) => asset.assetId === createForm.assetId) || assetList.value[0] || null,
)
const selectedAssetLabel = computed(() => selectedAsset.value ? resolveAssetName(selectedAsset.value) : '')
const selectedAssetRemainingQuantity = computed(() => selectedAsset.value ? resolveAssetRemainingQuantity(selectedAsset.value) : 0)

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
  if (status === planStatus.archived) {
    return '已归档'
  }

  if (status === planStatus.active) {
    return '已启用'
  }

  return '草稿'
}

/** 解析资产展示名称。 */
function resolveAssetName(asset: FinancialPlanAsset | string): string {
  if (typeof asset === 'string') {
    return assetMap.value[asset] || asset
  }

  return asset.assetName || asset.assetCode || asset.assetId
}

/** 计算单个标的剩余可兑现数量。 */
function resolveAssetRemainingQuantity(asset: FinancialPlanAsset): number {
  return Math.max(0, Number(asset.planQuantity || 0) - Number(asset.realizedQuantity || 0))
}

/** 解析批次阶段标签。 */
function resolveStageLabel(currentStage: RealizationBatch['stageStatus']): string {
  if (currentStage === stageStatus.completed) {
    return '已完成'
  }

  if (currentStage === stageStatus.pendingSell) {
    return '待卖出'
  }

  if (currentStage === stageStatus.partialBought) {
    return '已买入'
  }

  return '待买入'
}

/** 解析批次阶段颜色。 */
function resolveStageToneClass(currentStage: RealizationBatch['stageStatus']): string {
  if (currentStage === stageStatus.completed) {
    return 'status-completed'
  }

  if (currentStage === stageStatus.pendingSell) {
    return 'status-pending-sell'
  }

  if (currentStage === stageStatus.partialBought) {
    return 'status-partial'
  }

  return 'status-pending-buy'
}

/** 转换为正数。 */
function toNumber(value: string): number {
  return Number(value || 0)
}

/** 选中创建批次的资产。 */
function handleAssetPickerChange(event: { detail: { value: number } }): void {
  const nextAsset = assetList.value[event.detail.value]
  if (!nextAsset) {
    return
  }

  createForm.assetId = nextAsset.assetId
}

/** 选中批次并同步编辑表单。 */
function syncBatchForms(batch: RealizationBatch): void {
  selectedBatchId.value = batch.batchId
  realizationStore.setSelectedBatch(batch.batchId)

  // 已登记日期回显批次记录值；尚未登记时落到「今天」作为默认值。
  buyForm.tradeDate = batch.buyTradeDate || todayDateString()
  buyForm.actualBuyPrice = batch.actualBuyPrice !== undefined ? String(batch.actualBuyPrice) : buyForm.actualBuyPrice
  buyForm.quantity = String(batch.quantity || buyForm.quantity || 0)
  buyForm.fee = String(batch.feeTotal || 0)

  sellForm.tradeDate = batch.sellTradeDate || todayDateString()
  sellForm.actualSellPrice = batch.actualSellPrice !== undefined ? String(batch.actualSellPrice) : sellForm.actualSellPrice
  sellForm.quantity = String(batch.quantity || sellForm.quantity || 0)
  sellForm.fee = String(batch.feeTotal || 0)
}

/** 选择批次用于查看历史。 */
function handleSelectBatch(batch: RealizationBatch): void {
  syncBatchForms(batch)
}

/** 选择批次并定位到买入表单。 */
function handleSelectBatchForBuy(batch: RealizationBatch): void {
  syncBatchForms(batch)
  if (!batch.buyTradeDate) {
    buyForm.quantity = String(batch.quantity)
  }
}

/** 选择批次并定位到卖出表单。 */
function handleSelectBatchForSell(batch: RealizationBatch): void {
  syncBatchForms(batch)
  if (!batch.sellTradeDate) {
    sellForm.quantity = String(batch.quantity)
  }
}

/** 滚动到创建批次区域。 */
function scrollToCreateSection(): void {
  uni.pageScrollTo({ selector: '#create-batch-section', duration: 200 })
}

/** 生成默认批次名称。 */
function resolveDefaultBatchName(): string {
  const assetName = selectedAsset.value ? resolveAssetName(selectedAsset.value) : '标的'
  return `${assetName}兑现批次`
}

/** 同步页面数据。 */
async function loadPageData(): Promise<void> {
  if (!planId.value) {
    return
  }

  const detail = await planStore.loadPlanDetail(planId.value)
  if (detail) {
    assetStore.assetList = detail.assets.map((asset) => ({ ...asset }))
    realizationStore.batchList = detail.realizationBatches.map((batch) => ({ ...batch }))

    const nextBatch = selectedBatchId.value
      ? realizationStore.batchList.find((item) => item.batchId === selectedBatchId.value)
      : realizationStore.batchList.find((item) => item.stageStatus !== stageStatus.completed) || realizationStore.batchList[0] || null

    realizationStore.selectedBatch = nextBatch ? { ...nextBatch } : null
    if (nextBatch) {
      syncBatchForms(nextBatch)
    }

    if (!createForm.assetId) {
      createForm.assetId = assetStore.assetList[0]?.assetId || ''
      createForm.batchName = resolveDefaultBatchName()
      createForm.quantity = String(resolveAssetRemainingQuantity(assetStore.assetList[0] || ({} as FinancialPlanAsset)))
    }

    await statsStore.loadDashboard(planId.value)
  }
}

/** 创建兑现批次。 */
async function handleCreateBatch(): Promise<void> {
  if (!canMutatePlan.value) {
    await uni.showToast({ title: '已归档计划不可新增兑现批次', icon: 'none' })
    return
  }

  const selected = selectedAsset.value
  if (!selected) {
    await uni.showToast({ title: '请选择标的', icon: 'none' })
    return
  }

  const quantity = toNumber(createForm.quantity)
  const remainingQuantity = resolveAssetRemainingQuantity(selected)
  if (!createForm.batchName.trim()) {
    await uni.showToast({ title: '请填写批次名称', icon: 'none' })
    return
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    await uni.showToast({ title: '请填写有效的兑现数量', icon: 'none' })
    return
  }
  if (quantity > remainingQuantity) {
    await uni.showToast({ title: '兑现数量不能超过剩余可兑现数量', icon: 'none' })
    return
  }

  const request: Api6CreateRealizationBatchRequest = {
    assetId: selected.assetId,
    batchName: createForm.batchName.trim(),
    quantity,
    note: createForm.note.trim(),
  }

  const result = await realizationStore.createBatch(planId.value, request)
  if (result) {
    selectedBatchId.value = result.batchId
    await loadPageData()
    await uni.showToast({ title: '批次已创建', icon: 'success' })
  }
}

/** 登记买入信息。 */
async function handleRecordBuy(): Promise<void> {
  if (!canRecordBuy.value || !selectedBatch.value) {
    await uni.showToast({ title: '请选择待买入批次', icon: 'none' })
    return
  }

  const quantity = toNumber(buyForm.quantity)
  if (!buyForm.tradeDate.trim()) {
    await uni.showToast({ title: '请填写买入日期', icon: 'none' })
    return
  }
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity !== Number(selectedBatch.value.quantity || 0)) {
    await uni.showToast({ title: '买入数量需与批次数量一致且大于 0', icon: 'none' })
    return
  }

  const request: Api7RecordRealizationBuyRequest = {
    tradeDate: buyForm.tradeDate.trim(),
    actualBuyPrice: toNumber(buyForm.actualBuyPrice),
    quantity,
    fee: toNumber(buyForm.fee),
    note: buyForm.note.trim(),
    version: selectedBatch.value.version,
  }

  const result = await realizationStore.recordBuy(planId.value, selectedBatch.value.batchId, request)
  if (result) {
    await loadPageData()
    await uni.showToast({ title: '买入已登记', icon: 'success' })
  }
}

/** 登记卖出信息。 */
async function handleRecordSell(): Promise<void> {
  if (!canRecordSell.value || !selectedBatch.value) {
    await uni.showToast({ title: '请选择已买入批次', icon: 'none' })
    return
  }

  const quantity = toNumber(sellForm.quantity)
  if (!sellForm.tradeDate.trim()) {
    await uni.showToast({ title: '请填写卖出日期', icon: 'none' })
    return
  }
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity !== Number(selectedBatch.value.quantity || 0)) {
    await uni.showToast({ title: '卖出数量需与批次数量一致且大于 0', icon: 'none' })
    return
  }

  const request: Api8RecordRealizationSellRequest = {
    tradeDate: sellForm.tradeDate.trim(),
    actualSellPrice: toNumber(sellForm.actualSellPrice),
    quantity,
    fee: toNumber(sellForm.fee),
    note: sellForm.note.trim(),
    version: selectedBatch.value.version,
  }

  const result = await realizationStore.recordSell(planId.value, selectedBatch.value.batchId, request)
  if (result) {
    await loadPageData()
    await uni.showToast({ title: '卖出已登记', icon: 'success' })
  }
}

/** 跳转到收益分析页。 */
function handleGoAnalysis(): void {
  if (!planId.value) {
    return
  }

  uni.navigateTo({ url: `/subPackages/financial-plan/pages/analysis/index?planId=${encodeURIComponent(planId.value)}` })
}

onLoad((query) => {
  planId.value = String(query?.planId || '')
  selectedBatchId.value = String(query?.batchId || '')
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
  min-width: 150rpx;
  border-radius: 999rpx;
  background: #eef2ff;
  color: #334155;
}

.plan-info-card,
.section-card,
.selected-batch-card,
.trade-card {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 16rpx 36rpx rgba(15, 23, 42, 0.08);
}

.plan-info-row {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  padding: 10rpx 0;
}

.plan-info-label {
  color: #64748b;
  font-size: 24rpx;
}

.plan-info-value {
  color: #0f172a;
  font-size: 24rpx;
  text-align: right;
}

.status-active {
  color: #2563eb;
}

.status-muted {
  color: #64748b;
}

.section-card__header,
.trade-card__header {
  margin-bottom: 18rpx;
}

.section-card__title,
.trade-card__title {
  display: block;
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 600;
}

.section-card__subtitle,
.trade-card__subtitle {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}

.field-group {
  margin-top: 16rpx;
}

.field-group--flex {
  flex: 1;
}

.field-row {
  display: flex;
  gap: 18rpx;
  margin-top: 8rpx;
}

.field-label {
  display: block;
  margin-bottom: 10rpx;
  color: #334155;
  font-size: 24rpx;
  font-weight: 600;
}

.input-box,
.picker-box {
  min-height: 84rpx;
  padding: 20rpx;
  border: 1rpx solid #dbe4f0;
  border-radius: 20rpx;
  background: #f8fbff;
  color: #0f172a;
  font-size: 26rpx;
  box-sizing: border-box;
}

.helper-text {
  display: block;
  margin-top: 10rpx;
  color: #64748b;
  font-size: 22rpx;
}

.primary-button {
  margin-top: 22rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #ffffff;
  font-size: 26rpx;
}

.primary-button[disabled] {
  opacity: 0.5;
}

.empty-state {
  padding: 40rpx 24rpx;
  text-align: center;
  color: #64748b;
  background: #f8fbff;
  border-radius: 20rpx;
}

.trade-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20rpx;
}

.status-completed {
  color: #166534;
}

.status-pending-sell {
  color: #92400e;
}

.status-partial {
  color: #1d4ed8;
}

.status-pending-buy {
  color: #64748b;
}
</style>