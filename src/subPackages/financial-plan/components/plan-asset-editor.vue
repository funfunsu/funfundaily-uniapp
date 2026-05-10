<template>
  <view class="plan-asset-editor">
    <view class="header">
      <view>
        <text class="title">计划标的</text>
        <text class="subtitle">支持在同一计划下维护多个标的及目标参数</text>
      </view>
      <button v-if="editable" class="btn btn-primary" @click="handleAdd">新增标的</button>
    </view>

    <view v-if="localItems.length === 0" class="empty-state">
      <text>暂无计划标的，请先新增</text>
    </view>

    <view v-for="(asset, index) in localItems" :key="asset.assetId || `${asset.assetCode}-${index}`" class="asset-card">
      <view class="asset-card-top">
        <view>
          <text class="asset-name">{{ asset.assetName || '未命名标的' }}</text>
          <text class="asset-meta">{{ asset.assetCode || '未填写代码' }} · {{ resolveAssetTypeLabel(asset.assetType) }}</text>
        </view>
        <view class="asset-actions" v-if="editable">
          <text class="action-link" @click="handleMoveUp(index)">上移</text>
          <text class="action-link" @click="handleMoveDown(index)">下移</text>
          <text class="action-link danger" @click="handleRemove(index)">删除</text>
        </view>
      </view>

      <view class="grid">
        <view class="field">
          <text class="label">资产代码</text>
          <input class="input" v-model="asset.assetCode" :disabled="!editable" placeholder="请输入资产代码" />
        </view>
        <view class="field">
          <text class="label">资产名称</text>
          <input class="input" v-model="asset.assetName" :disabled="!editable" placeholder="请输入资产名称" />
        </view>
        <view class="field">
          <text class="label">资产类型</text>
          <picker :range="assetTypeOptions" range-key="label" :disabled="!editable" @change="(event) => handleAssetTypeChange(index, event)">
            <view class="picker-value">{{ resolveAssetTypeLabel(asset.assetType) }}</view>
          </picker>
        </view>
        <view class="field" v-if="asset.assetType === planTypeEnum.stock">
          <text class="label">股票子类型</text>
          <picker :range="stockSubTypeOptions" range-key="label" :disabled="!editable" @change="(event) => handleStockSubTypeChange(index, event)">
            <view class="picker-value">{{ resolveStockSubTypeLabel(asset.stockSubType) }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">
            计划买入价
            <text v-if="allowsNegativePrice(asset)" class="label-hint">（期权卖空可填负值）</text>
          </text>
          <input
            class="input"
            v-model="asset.planBuyPrice"
            :disabled="!editable"
            :type="allowsNegativePrice(asset) ? 'number' : 'digit'"
            placeholder="0.00"
          />
        </view>
        <view class="field">
          <text class="label">
            计划卖出价
            <text v-if="allowsNegativePrice(asset)" class="label-hint">（期权卖空可填负值）</text>
          </text>
          <input
            class="input"
            v-model="asset.planSellPrice"
            :disabled="!editable"
            :type="allowsNegativePrice(asset) ? 'number' : 'digit'"
            placeholder="0.00"
          />
        </view>
        <view class="field">
          <text class="label">计划数量</text>
          <input class="input" v-model="asset.planQuantity" :disabled="!editable" type="digit" placeholder="0" />
        </view>
        <view class="field">
          <text class="label">目标盈利</text>
          <view class="readonly-value">{{ formatComputedTargetProfit(asset) }}</view>
        </view>
      </view>

      <view class="footer" v-if="editable">
        <button class="btn btn-secondary" @click="handleSaveSingle(index)">保存标的</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import { planType, stockSubType } from '../../../../../api/financial-plan-types'
import type { FinancialPlanAsset } from '../../../../../api/financial-plan-types'

interface SelectOption {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    items: FinancialPlanAsset[]
    editable?: boolean
  }>(),
  {
    items: () => [],
    editable: false,
  },
)

const emit = defineEmits<{
  (event: 'add', value: FinancialPlanAsset): void
  (event: 'remove', value: FinancialPlanAsset, index: number): void
  (event: 'reorder', value: FinancialPlanAsset[]): void
  (event: 'save', value: FinancialPlanAsset, index: number): void
}>()

const planTypeEnum = planType

const assetTypeOptions: SelectOption[] = [
  { label: '储蓄', value: planType.savings },
  { label: '股票', value: planType.stock },
]

const stockSubTypeOptions: SelectOption[] = [
  { label: '正股', value: stockSubType.equity },
  { label: '期权', value: stockSubType.option },
]

const localItems = ref<FinancialPlanAsset[]>([])

/** 克隆输入项，避免直接修改父组件数组。 */
function cloneItems(items: FinancialPlanAsset[]): FinancialPlanAsset[] {
  return items.map((item) => ({ ...item }))
}

/** 生成一个默认标的。 */
function createDefaultAsset(): FinancialPlanAsset {
  return {
    assetId: `temp-${Date.now()}`,
    planId: '',
    // 默认类型为储蓄；用户可在新行内切换为股票，并按需指定子类型。
    assetType: planType.savings,
    assetCode: '',
    assetName: '',
    stockSubType: undefined,
    planBuyPrice: 0,
    planSellPrice: 0,
    planQuantity: 0,
    realizedQuantity: 0,
    openQuantity: 0,
    targetProfit: 0,
    actualProfit: 0,
    completionRate: 0,
    currency: 'CNY',
    sequenceNo: localItems.value.length + 1,
    version: 1,
  }
}

/** 根据资产类型返回标签。 */
function resolveAssetTypeLabel(assetType: string): string {
  return assetType === planType.stock ? '股票' : '储蓄'
}

/** 根据股票子类型返回标签。 */
function resolveStockSubTypeLabel(subType?: string): string {
  if (subType === stockSubType.option) {
    return '期权'
  }

  return '正股'
}

/**
 * 当前标的是否允许 planBuyPrice / planSellPrice 为负数。
 *
 * 仅股票/期权场景：卖空收取权利金时，买入或卖出端的现金流方向会反向。
 * 数量始终保持正数。
 */
function allowsNegativePrice(asset: FinancialPlanAsset): boolean {
  return asset.assetType === planType.stock && asset.stockSubType === stockSubType.option
}

/** 计算单条标的的目标盈利：(planSellPrice − planBuyPrice) × planQuantity。 */
function computeTargetProfit(asset: FinancialPlanAsset): number {
  const buy = Number(asset.planBuyPrice)
  const sell = Number(asset.planSellPrice)
  const qty = Number(asset.planQuantity)
  if (!Number.isFinite(buy) || !Number.isFinite(sell) || !Number.isFinite(qty)) {
    return 0
  }
  return Number(((sell - buy) * qty).toFixed(2))
}

/** 目标盈利的展示文本：未填齐时返回占位符。 */
function formatComputedTargetProfit(asset: FinancialPlanAsset): string {
  const value = computeTargetProfit(asset)
  if (!value) {
    return '—'
  }
  return value.toFixed(2)
}

/** 触发新增标的。 */
function handleAdd(): void {
  const nextAsset = createDefaultAsset()
  localItems.value = [...localItems.value, nextAsset]
  emit('add', { ...nextAsset })
}

/** 触发保存某一行；具体的 API 调用与 planId 注入由父组件完成。 */
function handleSaveSingle(index: number): void {
  const target = localItems.value[index]
  if (!target) {
    return
  }
  emit('save', { ...target }, index)
}

/** 触发移除单个标的。 */
function handleRemove(index: number): void {
  const currentAsset = localItems.value[index]
  if (!currentAsset) {
    return
  }

  localItems.value.splice(index, 1)
  emit('remove', { ...currentAsset }, index)
  emit('reorder', cloneItems(localItems.value))
}

/** 向上调整标的顺序。 */
function handleMoveUp(index: number): void {
  if (index <= 0) {
    return
  }

  const nextItems = cloneItems(localItems.value)
  const [currentAsset] = nextItems.splice(index, 1)
  nextItems.splice(index - 1, 0, currentAsset)
  localItems.value = nextItems
  emit('reorder', cloneItems(localItems.value))
}

/** 向下调整标的顺序。 */
function handleMoveDown(index: number): void {
  if (index >= localItems.value.length - 1) {
    return
  }

  const nextItems = cloneItems(localItems.value)
  const [currentAsset] = nextItems.splice(index, 1)
  nextItems.splice(index + 1, 0, currentAsset)
  localItems.value = nextItems
  emit('reorder', cloneItems(localItems.value))
}

/** 处理资产类型切换。 */
function handleAssetTypeChange(index: number, event: any): void {
  const nextIndex = Number(event?.detail?.value ?? 0)
  const nextAsset = localItems.value[index]
  if (!nextAsset) {
    return
  }

  nextAsset.assetType = assetTypeOptions[nextIndex]?.value as FinancialPlanAsset['assetType']
  if (nextAsset.assetType === planType.stock) {
    // 切到股票时若未指定子类型，先默认正股，避免后端 FP_ASSET_INVALID。
    if (!nextAsset.stockSubType) {
      nextAsset.stockSubType = stockSubType.equity
    }
  } else {
    nextAsset.stockSubType = undefined
  }
}

/** 处理股票子类型切换。 */
function handleStockSubTypeChange(index: number, event: any): void {
  const nextIndex = Number(event?.detail?.value ?? 0)
  const nextAsset = localItems.value[index]
  if (!nextAsset) {
    return
  }

  nextAsset.stockSubType = stockSubTypeOptions[nextIndex]?.value as FinancialPlanAsset['stockSubType']
}

// 父组件外部刷新（如载入计划详情）时把数据同步到 localItems。
watch(
  () => props.items,
  (nextItems) => {
    if (suppressNextPropSync) {
      suppressNextPropSync = false
      return
    }
    localItems.value = cloneItems(nextItems)
  },
  { deep: true, immediate: true },
)

// 用户在编辑器内的任何修改都立即向上同步，避免「输入了但页面顶部「保存」拿到空数据」。
let suppressNextPropSync = false
watch(
  localItems,
  (nextItems) => {
    suppressNextPropSync = true
    emit('reorder', cloneItems(nextItems))
  },
  { deep: true },
)
</script>

<style scoped>
.plan-asset-editor {
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

.asset-card {
  margin-top: 24rpx;
  padding: 24rpx;
  border: 1rpx solid #e2e8f0;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.asset-card-top {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.asset-name {
  display: block;
  color: #0f172a;
  font-size: 28rpx;
  font-weight: 600;
}

.asset-meta {
  display: block;
  margin-top: 6rpx;
  color: #64748b;
  font-size: 22rpx;
}

.asset-actions {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.action-link {
  color: #2563eb;
  font-size: 24rpx;
}

.action-link.danger {
  color: #dc2626;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.field {
  flex: 1 1 220rpx;
  min-width: 220rpx;
}

.label {
  display: block;
  margin-bottom: 12rpx;
  color: #475569;
  font-size: 24rpx;
}

.label-hint {
  margin-left: 8rpx;
  color: #94a3b8;
  font-size: 22rpx;
}

.input,
.picker-value {
  width: 100%;
  min-height: 72rpx;
  padding: 18rpx 20rpx;
  box-sizing: border-box;
  border: 1rpx solid #dbe3ef;
  border-radius: 16rpx;
  background: #ffffff;
  color: #0f172a;
  font-size: 26rpx;
}

.readonly-value {
  width: 100%;
  min-height: 72rpx;
  padding: 18rpx 20rpx;
  box-sizing: border-box;
  border: 1rpx dashed #cbd5e1;
  border-radius: 16rpx;
  background: #f8fafc;
  color: #1e293b;
  font-size: 26rpx;
}

.hint {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: #fef9c3;
  color: #854d0e;
  font-size: 22rpx;
}

.footer {
  display: flex;
  justify-content: flex-end;
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
</style>