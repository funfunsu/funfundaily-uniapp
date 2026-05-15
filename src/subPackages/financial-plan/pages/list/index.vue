<template>
  <view class="page-container">
    <view class="page-header">
      <text class="page-title">理财计划</text>
      <text class="page-subtitle">让收益稳步发生</text>
    </view>

    <view class="content-container">
      <view v-if="loading && sortedPlanList.length === 0" class="empty-state">加载中...</view>
      <view v-else-if="sortedPlanList.length === 0" class="empty-state">
        <text>暂无理财计划，点击下方「新建计划」开始</text>
      </view>

      <view v-else class="plan-list">
        <view
          v-for="plan in sortedPlanList"
          :key="plan.planId"
          class="plan-card"
          :class="{ 'plan-card--expanded': expandedPlanId === plan.planId, 'plan-card--archived': !isPlanEditable(plan) }"
        >
          <view class="plan-card__header" @click="togglePlan(plan.planId)">
            <view class="plan-card__head-left">
              <text class="plan-card__name">{{ plan.planName }}</text>
              <text class="plan-card__meta">{{ resolveDateRangeLabel(plan) }}</text>
            </view>
            <view class="plan-card__head-right">
              <text class="plan-card__status" :class="resolveStatusClass(plan)">{{ resolveStatusLabel(plan) }}</text>
              <text
                v-if="isPlanEditable(plan) && expandedPlanId === plan.planId"
                class="header-link"
                @click.stop="openEditPlanModal(plan.planId)"
              >编辑</text>
              <text
                v-if="expandedPlanId === plan.planId"
                class="header-link header-link--danger"
                @click.stop="handleArchivePlan(plan)"
              >{{ plan.status === 'ARCHIVED' ? '恢复' : '归档' }}</text>
              <text class="plan-card__caret">{{ expandedPlanId === plan.planId ? '▾' : '▸' }}</text>
            </view>
          </view>

          <view v-if="expandedPlanId === plan.planId" class="plan-card__body">
            <view v-if="!planDetails[plan.planId]" class="loading-text">详情加载中...</view>

            <view v-else>
              <view class="metric-row">
                <view class="metric">
                  <text class="metric__label">目标盈利</text>
                  <text class="metric__value">¥{{ formatNumber(planDetails[plan.planId].summary?.targetProfit) }}</text>
                </view>
                <view class="metric">
                  <text class="metric__label">已计划盈利</text>
                  <text class="metric__value">¥{{ formatNumber(planDetails[plan.planId].summary?.plannedProfit) }}</text>
                  <text class="metric__sub">计划完成度 {{ formatPercent(planDetails[plan.planId].summary?.plannedCompletionRate) }}</text>
                  <text
                    v-for="b in resolvePlanMarketBreakdowns(plan.planId)"
                    :key="`plan-${plan.planId}-planned-${b.market}`"
                    class="metric__sub metric__sub--breakdown"
                  >{{ b.currency }} {{ formatNumber(b.plannedNative) }} ×{{ b.rate }}</text>
                </view>
                <view class="metric">
                  <text class="metric__label">已实现盈利</text>
                  <text class="metric__value" :class="profitToneClass(planDetails[plan.planId].summary?.actualProfit)">¥{{ formatProfit(planDetails[plan.planId].summary?.actualProfit) }}</text>
                  <text class="metric__sub">实际完成度 {{ formatPercent(planDetails[plan.planId].summary?.completionRate) }}</text>
                  <text
                    v-for="b in resolvePlanMarketBreakdowns(plan.planId)"
                    :key="`plan-${plan.planId}-actual-${b.market}`"
                    class="metric__sub metric__sub--breakdown"
                  >{{ b.currency }} {{ formatProfit(b.actualNative) }} ×{{ b.rate }}</text>
                </view>
              </view>

              <view class="section">
                <view class="section__title-row">
                  <text class="section__title">计划标的</text>
                  <button
                    v-if="isPlanEditable(plan)"
                    class="row-btn row-btn--primary"
                    @click.stop="toggleAddAssetForm(plan.planId)"
                  >{{ showAddAssetFormFor === plan.planId ? '取消' : '+ 标的' }}</button>
                </view>

                <view v-if="showAddAssetFormFor === plan.planId" class="inline-form">
                  <view class="inline-form__grid">
                    <view class="inline-field">
                      <text class="inline-field__label">股票名称</text>
                      <input class="inline-input" v-model="newAssetForm.stockName" placeholder="例如：腾讯控股" />
                    </view>
                    <view class="inline-field">
                      <text class="inline-field__label">所属市场</text>
                      <picker :range="marketOptions" range-key="label" @change="onNewAssetMarketChange">
                        <view class="inline-picker">{{ resolveMarketLabel(newAssetForm.market) }}</view>
                      </picker>
                    </view>
                    <view class="inline-field">
                      <text class="inline-field__label">目标盈利</text>
                      <input class="inline-input" v-model="newAssetForm.targetProfit" type="number" placeholder="0.00" />
                    </view>
                  </view>
                  <view class="inline-form__actions">
                    <button class="row-btn" @click.stop="closeAddAssetForm">取消</button>
                    <button class="row-btn row-btn--primary" @click.stop="handleSubmitAddAsset(plan.planId)">保存</button>
                  </view>
                </view>

                <view v-if="planDetails[plan.planId].assets.length === 0" class="empty-mini">暂无标的</view>

                <view
                  v-for="asset in planDetails[plan.planId].assets"
                  :key="asset.assetId"
                  class="asset-block"
                >
                  <view class="asset-row">
                    <view class="asset-row__info">
                      <text class="asset-row__name">
                        <text class="market-chip" :class="resolveMarketChipClass(asset.market)">{{ resolveMarketLabel(asset.market) }}</text>
                        {{ asset.stockName }}
                      </text>
                      <text class="asset-row__meta">
                        <text class="currency-tag">{{ resolveMarketCurrencyCode(asset.market) }}</text>
                        目标 <text class="positive">{{ formatNumber(asset.targetProfit) }}</text>
                        · 已计划 <text class="positive">{{ formatNumber(resolveAssetPlannedProfitRaw(plan.planId, asset.assetId)) }}</text>
                        · 已实现 <text :class="profitToneClass(resolveAssetActualProfitRaw(plan.planId, asset.assetId))">{{ formatProfit(resolveAssetActualProfitRaw(plan.planId, asset.assetId)) }}</text>
                      </text>
                      <text class="asset-row__rate">
                        计划完成度 {{ formatPercent(resolveAssetPlannedRate(plan.planId, asset.assetId)) }}
                        · 实际完成度 {{ formatPercent(resolveAssetActualRate(plan.planId, asset.assetId)) }}
                      </text>
                    </view>
                    <view class="row-actions">
                      <button
                        v-if="isPlanEditable(plan)"
                        class="row-btn row-btn--primary"
                        @click.stop="toggleAddBatchForm(asset.assetId)"
                      >{{ showAddBatchFormFor === asset.assetId ? '取消' : '+ 批次' }}</button>
                    </view>
                  </view>

                  <view v-if="showAddBatchFormFor === asset.assetId" class="inline-form inline-form--asset">
                    <view class="inline-form__grid">
                      <view class="inline-field">
                        <text class="inline-field__label">批次类型</text>
                        <picker :range="batchTypeOptions" range-key="label" @change="onNewBatchTypeChange">
                          <view class="inline-picker">{{ resolveBatchTypeLabel(newBatchForm.batchType) }}</view>
                        </picker>
                      </view>
                      <view class="inline-field" v-if="newBatchForm.batchType === 'DERIVATIVE'">
                        <text class="inline-field__label">方向</text>
                        <picker :range="directionOptions" range-key="label" @change="onNewBatchDirectionChange">
                          <view class="inline-picker">{{ resolveDirectionLabel(newBatchForm.direction) }}</view>
                        </picker>
                      </view>
                      <view class="inline-field">
                        <text class="inline-field__label">数量</text>
                        <input class="inline-input" v-model="newBatchForm.quantity" type="number" placeholder="数量" />
                      </view>
                      <view class="inline-field">
                        <text class="inline-field__label">预期买入价</text>
                        <input class="inline-input" v-model="newBatchForm.planBuyPrice" type="number" placeholder="0.00" />
                      </view>
                      <view class="inline-field">
                        <text class="inline-field__label">预期卖出价</text>
                        <input class="inline-input" v-model="newBatchForm.planSellPrice" type="number" placeholder="0.00" />
                      </view>
                      <view class="inline-field" v-if="newBatchForm.batchType === 'DERIVATIVE'">
                        <text class="inline-field__label">到期日</text>
                        <input class="inline-input" v-model="newBatchForm.expirationDate" placeholder="YYYY-MM-DD" />
                      </view>
                    </view>
                    <view class="inline-form__actions">
                      <button class="row-btn" @click.stop="closeAddBatchForm">取消</button>
                      <button
                        class="row-btn row-btn--primary"
                        @click.stop="handleSubmitAddBatch(plan.planId, asset.assetId)"
                      >保存</button>
                    </view>
                  </view>

                  <view
                    v-for="batch in batchesByAsset(plan.planId, asset.assetId)"
                    :key="batch.batchId"
                    class="batch-block"
                  >
                    <view class="batch-row">
                      <view class="batch-row__info">
                        <text class="batch-row__name">
                          {{ resolveBatchTitle(batch) }}
                          <text class="status-badge" :class="resolveStageToneClass(batch.stageStatus)">
                            {{ resolveStageLabel(batch.stageStatus) }}
                          </text>
                        </text>
                        <text v-if="batch.batchType === 'DERIVATIVE'" class="batch-row__type">
                          {{ resolveBatchTypeLabel(batch.batchType) }}·{{ resolveDirectionLabel(batch.direction) }}
                          <text v-if="batch.expirationDate"> · 到期 {{ batch.expirationDate }}</text>
                        </text>
                        <text class="batch-row__summary">
                          数量 {{ batch.quantity }}
                          · 预期 {{ formatNumber(batch.planBuyPrice) }}→{{ formatNumber(batch.planSellPrice) }}
                          · 目标 <text class="positive">{{ formatNumber(computeBatchTargetProfit(batch)) }}</text>
                          · 已实现 <text :class="profitToneClass(batch.actualProfit)">{{ formatProfit(batch.actualProfit) }}</text>
                        </text>
                      </view>
                      <view class="row-actions">
                        <button
                          v-if="isPlanEditable(plan)"
                          class="row-btn"
                          @click.stop="toggleEditBatchForm(batch)"
                        >编辑</button>
                        <button
                          v-if="isPlanEditable(plan)"
                          class="row-btn"
                          @click.stop="toggleBuyForm(batch.batchId)"
                        >买入</button>
                        <button
                          v-if="isPlanEditable(plan)"
                          class="row-btn"
                          :disabled="batch.stageStatus === 'PENDING_BUY' || batch.stageStatus === 'COMPLETED'"
                          @click.stop="toggleSellForm(batch.batchId)"
                        >卖出</button>
                      </view>
                    </view>

                    <view v-if="showEditBatchFormFor === batch.batchId" class="inline-form inline-form--batch">
                      <view class="inline-form__grid">
                        <view class="inline-field" v-if="batch.batchType === 'DERIVATIVE'">
                          <text class="inline-field__label">方向</text>
                          <picker :range="directionOptions" range-key="label" @change="onEditBatchDirectionChange">
                            <view class="inline-picker">{{ resolveDirectionLabel(editBatchForm.direction) }}</view>
                          </picker>
                        </view>
                        <view class="inline-field">
                          <text class="inline-field__label">数量</text>
                          <input class="inline-input" v-model="editBatchForm.quantity" type="number" placeholder="数量" />
                        </view>
                        <view class="inline-field">
                          <text class="inline-field__label">预期买入价</text>
                          <input class="inline-input" v-model="editBatchForm.planBuyPrice" type="number" placeholder="0.00" />
                        </view>
                        <view class="inline-field">
                          <text class="inline-field__label">预期卖出价</text>
                          <input class="inline-input" v-model="editBatchForm.planSellPrice" type="number" placeholder="0.00" />
                        </view>
                        <view class="inline-field" v-if="batch.batchType === 'DERIVATIVE'">
                          <text class="inline-field__label">到期日</text>
                          <input class="inline-input" v-model="editBatchForm.expirationDate" placeholder="YYYY-MM-DD" />
                        </view>
                        <view class="inline-field">
                          <text class="inline-field__label">名称</text>
                          <input class="inline-input" v-model="editBatchForm.batchName" placeholder="批次名称（可选）" />
                        </view>
                      </view>
                      <view class="inline-form__actions">
                        <button class="row-btn" @click.stop="closeEditBatchForm">取消</button>
                        <button
                          class="row-btn row-btn--primary"
                          @click.stop="handleSubmitEditBatch(plan.planId, batch.batchId)"
                        >保存</button>
                      </view>
                    </view>

                    <view v-if="showBuyFormFor === batch.batchId" class="inline-form inline-form--batch">
                      <view class="inline-form__grid">
                        <view class="inline-field">
                          <text class="inline-field__label">日期</text>
                          <input class="inline-input" v-model="opForm.tradeDate" placeholder="YYYY-MM-DD" />
                        </view>
                        <view class="inline-field">
                          <text class="inline-field__label">买入价</text>
                          <input class="inline-input" v-model="opForm.price" type="number" placeholder="0.00" />
                        </view>
                        <view class="inline-field">
                          <text class="inline-field__label">数量</text>
                          <input class="inline-input" v-model="opForm.quantity" type="number" placeholder="0" />
                        </view>
                        <view class="inline-field">
                          <text class="inline-field__label">手续费</text>
                          <input class="inline-input" v-model="opForm.fee" type="number" placeholder="0" />
                        </view>
                      </view>
                      <view class="inline-form__actions">
                        <button class="row-btn" @click.stop="closeOpForm">取消</button>
                        <button
                          class="row-btn row-btn--primary"
                          @click.stop="handleSubmitBuy(plan.planId, batch.batchId)"
                        >保存</button>
                      </view>
                    </view>

                    <view v-if="showSellFormFor === batch.batchId" class="inline-form inline-form--batch">
                      <view class="inline-form__grid">
                        <view class="inline-field">
                          <text class="inline-field__label">日期</text>
                          <input class="inline-input" v-model="opForm.tradeDate" placeholder="YYYY-MM-DD" />
                        </view>
                        <view class="inline-field">
                          <text class="inline-field__label">卖出价</text>
                          <input class="inline-input" v-model="opForm.price" type="number" placeholder="0.00" />
                        </view>
                        <view class="inline-field">
                          <text class="inline-field__label">数量</text>
                          <input class="inline-input" v-model="opForm.quantity" type="number" placeholder="0" />
                        </view>
                        <view class="inline-field">
                          <text class="inline-field__label">手续费</text>
                          <input class="inline-input" v-model="opForm.fee" type="number" placeholder="0" />
                        </view>
                      </view>
                      <view class="inline-form__actions">
                        <button class="row-btn" @click.stop="closeOpForm">取消</button>
                        <button
                          class="row-btn row-btn--primary"
                          @click.stop="handleSubmitSell(plan.planId, batch.batchId)"
                        >保存</button>
                      </view>
                    </view>

                    <!-- 操作明细：紧凑两列 grid，避免一行一条占用过多空间 -->
                    <view v-if="batchOperations(batch.batchId).length > 0" class="op-grid">
                      <view
                        v-for="op in batchOperations(batch.batchId)"
                        :key="op.operationId"
                        class="op-cell"
                        :class="op.operationType === 'BUY' ? 'op-cell--buy' : 'op-cell--sell'"
                      >
                        <text class="op-cell__type">{{ op.operationType === 'BUY' ? '买' : '卖' }}</text>
                        <text class="op-cell__line">{{ op.tradeDate }} · {{ formatNumber(op.price) }} × {{ op.quantity }}<text v-if="op.fee && Number(op.fee) > 0"> · 费 {{ formatNumber(op.fee) }}</text></text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 新建 / 编辑 理财计划弹窗 -->
    <view v-if="showPlanModal" class="modal-mask" @click.self="closePlanModal">
      <view class="modal-panel">
        <view class="modal-header">
          <text class="modal-title">{{ planModalMode === 'create' ? '新建理财计划' : '编辑理财计划' }}</text>
        </view>
        <view class="modal-body">
          <view class="modal-field">
            <text class="modal-label">计划名称</text>
            <input class="modal-input" v-model="planFormState.planName" placeholder="例如：2026 家庭计划" />
          </view>
          <view class="modal-field">
            <text class="modal-label">时间范围</text>
            <picker :range="timeRangeOptions" range-key="label" @change="onPlanTimeRangeChange">
              <view class="modal-picker">{{ resolveTimeRangeLabel(planFormState.timeRangeType) }}</view>
            </picker>
          </view>
          <view class="modal-field" v-if="planFormState.timeRangeType === 'YEAR'">
            <text class="modal-label">年度</text>
            <input class="modal-input" v-model="planFormState.fiscalYear" type="number" placeholder="例如 2026" />
          </view>
          <view v-else class="modal-field-row">
            <view class="modal-field">
              <text class="modal-label">开始日期</text>
              <input class="modal-input" v-model="planFormState.startDate" placeholder="YYYY-MM-DD" />
            </view>
            <view class="modal-field">
              <text class="modal-label">结束日期</text>
              <input class="modal-input" v-model="planFormState.endDate" placeholder="YYYY-MM-DD" />
            </view>
          </view>
          <view class="modal-field">
            <text class="modal-label">目标盈利</text>
            <input class="modal-input" v-model="planFormState.targetProfit" type="number" placeholder="0.00" />
          </view>
          <view class="modal-field">
            <text class="modal-label">备注</text>
            <textarea class="modal-textarea" v-model="planFormState.remark" placeholder="可选" />
          </view>
        </view>
        <view class="modal-actions">
          <button class="row-btn" @click="closePlanModal">取消</button>
          <button class="row-btn row-btn--primary" @click="handleSubmitPlan">保存</button>
        </view>
      </view>
    </view>

    <schedule-bottom-bar
      :buttons="bottomButtons"
      :show-group-member="false"
      :auto-load-members="true"
      @member-change="handleGroupMemberChange"
      @buttonClick="handleButtonClick"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

import scheduleBottomBar from '../../../../components/schedule-bottom-bar.vue'
import { useFinancialPlanStore } from '../../stores/useFinancialPlanStore'
import { useRealizationStore } from '../../stores/useRealizationStore'
import { ensureCurrentGroup, ensureCurrentMember } from '../../../../utils/currentGroupResolver'
import { STORAGE_KEYS, getStoredData } from '../../../../utils/storageManager'
import {
  assetMarket,
  batchType as batchTypeEnum,
  batchDirection,
  timeRangeType as timeRangeTypeEnum,
  planType as planTypeEnum,
} from '../../../../../../api/financial-plan-types'
import type {
  AssetMarket,
  BatchType,
  BatchDirection,
  FinancialPlanListItem,
  RealizationBatch,
  RealizationOperation,
  PlanStatus,
  TimeRangeType,
} from '../../../../../../api/financial-plan-types'
import type {
  Api2CreateFinancialPlanRequest,
  Api3UpdateFinancialPlanRequest,
} from '../../../../../../api/financial-plan'
import { financialPlanApiClient } from '../../api'

const planStore = useFinancialPlanStore()
const realizationStore = useRealizationStore()

const currentGroup = ref<{ id?: string | number } | null>(null)
const expandedPlanId = ref<string | null>(null)
const hasAutoExpanded = ref(false)

const bottomButtons = ref([{ code: 'addPlan', text: '新建计划' }])

const planList = computed(() => planStore.planList)
const planDetails = computed(() => planStore.planDetails)
const loading = computed(() => planStore.loading)

const sortedPlanList = computed(() => {
  return [...planList.value].sort((a, b) => {
    const aEnd = a.endDate || ''
    const bEnd = b.endDate || ''
    if (aEnd === bEnd) return 0
    if (!aEnd) return 1
    if (!bEnd) return -1
    return bEnd.localeCompare(aEnd)
  })
})

// ===== inline form 状态 =====
const showAddAssetFormFor = ref<string | null>(null)
const newAssetForm = reactive({
  stockName: '',
  market: 'CN' as AssetMarket,
  targetProfit: '',
})

const showAddBatchFormFor = ref<string | null>(null)
const newBatchForm = reactive({
  batchType: 'EQUITY' as BatchType,
  direction: undefined as BatchDirection | undefined,
  quantity: '',
  planBuyPrice: '',
  planSellPrice: '',
  expirationDate: '',
})

const showBuyFormFor = ref<string | null>(null)
const showSellFormFor = ref<string | null>(null)
const showEditBatchFormFor = ref<string | null>(null)
const opForm = reactive({
  tradeDate: todayDateString(),
  price: '',
  quantity: '',
  fee: '',
})

const editBatchForm = reactive({
  batchName: '',
  direction: undefined as BatchDirection | undefined,
  quantity: '',
  planBuyPrice: '',
  planSellPrice: '',
  expirationDate: '',
  version: 0,
})

// ===== plan modal 状态 =====
const showPlanModal = ref(false)
const planModalMode = ref<'create' | 'edit'>('create')
const editingPlanId = ref<string | null>(null)
const planFormState = reactive({
  planName: '',
  timeRangeType: 'CUSTOM' as TimeRangeType,
  fiscalYear: '',
  startDate: '',
  endDate: '',
  targetProfit: '',
  remark: '',
  version: 0,
})

// ===== option lists =====
const marketOptions = [
  { label: '美股', value: assetMarket.us },
  { label: '港股', value: assetMarket.hk },
  { label: 'A 股', value: assetMarket.cn },
] as const

const batchTypeOptions = [
  { label: '正股', value: batchTypeEnum.equity },
  { label: '衍生品', value: batchTypeEnum.derivative },
] as const

const directionOptions = [
  { label: '买入 CALL', value: batchDirection.call },
  { label: '买入 PUT', value: batchDirection.put },
  { label: '卖空 CALL', value: batchDirection.shortCall },
  { label: '卖空 PUT', value: batchDirection.shortPut },
] as const

const timeRangeOptions = [
  { label: '自定义', value: timeRangeTypeEnum.custom },
  { label: '年度', value: timeRangeTypeEnum.year },
] as const

// ===== 数据加载 =====

function todayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function findCurrentPlanId(): string | null {
  if (sortedPlanList.value.length === 0) return null
  const today = todayDateString()
  const containing = sortedPlanList.value.find((plan) => {
    const start = plan.startDate || ''
    const end = plan.endDate || ''
    return start && end && start <= today && today <= end
  })
  if (containing) return String(containing.planId)
  return String(sortedPlanList.value[0].planId)
}

async function fetchPlans(): Promise<void> {
  const groupId = currentGroup.value?.id
  if (groupId === undefined || groupId === null || groupId === '') return
  await planStore.queryPlans({
    groupId: String(groupId),
    pageNo: 1,
    pageSize: 100,
  })
  if (!hasAutoExpanded.value) {
    const target = findCurrentPlanId()
    if (target) {
      expandedPlanId.value = target
      await loadDetailIfNeeded(target)
      await loadOperationsForExpandedPlan(target)
    }
    hasAutoExpanded.value = true
  } else if (expandedPlanId.value) {
    const stillThere = sortedPlanList.value.some((p) => String(p.planId) === expandedPlanId.value)
    if (stillThere) {
      await loadDetailIfNeeded(expandedPlanId.value)
    } else {
      expandedPlanId.value = null
    }
  }
}

async function loadDetailIfNeeded(planId: string): Promise<void> {
  if (!planDetails.value[planId]) {
    await planStore.loadPlanDetail(planId)
  }
}

async function loadOperationsForExpandedPlan(planId: string): Promise<void> {
  const detail = planDetails.value[planId]
  if (!detail) return
  for (const batch of detail.realizationBatches) {
    void realizationStore.loadBatchOperations(planId, String(batch.batchId))
  }
}

async function togglePlan(planId: string): Promise<void> {
  const target = String(planId)
  if (expandedPlanId.value === target) {
    expandedPlanId.value = null
    return
  }
  expandedPlanId.value = target
  await loadDetailIfNeeded(target)
  await loadOperationsForExpandedPlan(target)
}

function batchesByAsset(planId: string, assetId: string): RealizationBatch[] {
  const detail = planDetails.value[planId]
  if (!detail) return []
  return detail.realizationBatches.filter((b) => String(b.assetId) === String(assetId))
}

function batchOperations(batchId: string): RealizationOperation[] {
  return realizationStore.operationsByBatchId[batchId] || []
}

/** 单批次目标收益。 */
function computeBatchTargetProfit(batch: RealizationBatch): number {
  const buy = Number(batch.planBuyPrice)
  const sell = Number(batch.planSellPrice)
  const qty = Number(batch.quantity)
  if (!Number.isFinite(buy) || !Number.isFinite(sell) || !Number.isFinite(qty)) {
    return 0
  }
  return Number(((sell - buy) * qty).toFixed(2))
}

/**
 * 市场 → 人民币的汇率（与后端 ExchangeRateConfig 默认值保持一致）。
 *
 * 后端会把每个标的的 plannedProfit / actualProfit 按所属市场换算成 CNY，
 * 前端这里在标的行级别复用同一组汇率，让显示和后端聚合口径一致。
 */
const EXCHANGE_RATE_TO_CNY: Record<string, number> = {
  US: 7.2,
  HK: 0.92,
  CN: 1,
}

function resolveMarketRate(market?: string): number {
  if (!market) return 1
  return EXCHANGE_RATE_TO_CNY[market] ?? 1
}

/** 市场对应的原币种代号；CN 即 CNY，无需在 UI 上额外展示。 */
function resolveMarketCurrencyCode(market?: string): string {
  if (market === 'US') return 'USD'
  if (market === 'HK') return 'HKD'
  if (market === 'CN') return 'CNY'
  return ''
}

/** 单标的「已计划盈利」原币种金额（未乘汇率）= 各批次目标收益之和。 */
function resolveAssetPlannedProfitRaw(planId: string, assetId: string): number {
  return batchesByAsset(planId, assetId).reduce((sum, b) => sum + computeBatchTargetProfit(b), 0)
}

/** 单标的「已实现盈利」原币种金额（未乘汇率）= COMPLETED 批次的 actualProfit 之和。 */
function resolveAssetActualProfitRaw(planId: string, assetId: string): number {
  return batchesByAsset(planId, assetId)
    .filter((b) => b.stageStatus === 'COMPLETED')
    .reduce((sum, b) => sum + Number(b.actualProfit || 0), 0)
}

/** 计划层「已计划盈利」按市场分组的原币种 + 汇率明细。 */
interface PlanMarketBreakdown {
  market: string
  currency: string
  plannedNative: number
  actualNative: number
  rate: number
}

/**
 * 按市场聚合一个计划下的原币种已计划/已实现金额，便于在计划摘要旁边展示
 * 「USD 479 ×7.2 / HKD 1500 ×0.92 / CNY 5000」这样的换算明细。
 * 没有产生任何金额的市场直接过滤掉。
 */
function resolvePlanMarketBreakdowns(planId: string): PlanMarketBreakdown[] {
  const detail = planDetails.value[planId]
  if (!detail) {
    return []
  }
  const buckets: Record<string, { plannedNative: number; actualNative: number }> = {}
  for (const asset of detail.assets) {
    const market = String(asset.market || '')
    if (!buckets[market]) {
      buckets[market] = { plannedNative: 0, actualNative: 0 }
    }
    buckets[market].plannedNative += resolveAssetPlannedProfitRaw(planId, asset.assetId)
    buckets[market].actualNative += resolveAssetActualProfitRaw(planId, asset.assetId)
  }
  return Object.entries(buckets)
    .map(([market, vals]) => ({
      market,
      currency: resolveMarketCurrencyCode(market),
      plannedNative: Number(vals.plannedNative.toFixed(2)),
      actualNative: Number(vals.actualNative.toFixed(2)),
      rate: resolveMarketRate(market),
    }))
    .filter((b) => b.plannedNative !== 0 || b.actualNative !== 0)
}

/** 标的用户目标盈利，优先用 entity 字段，缺失返回 0。 */
function resolveAssetTargetProfit(planId: string, assetId: string): number {
  const detail = planDetails.value[planId]
  if (!detail) return 0
  const asset = detail.assets.find((a) => String(a.assetId) === String(assetId))
  return Number(asset?.targetProfit || 0)
}

/** 标的「计划完成度」= 已计划盈利 / 目标盈利（均为市场原币种，单位一致）。 */
function resolveAssetPlannedRate(planId: string, assetId: string): number {
  const target = resolveAssetTargetProfit(planId, assetId)
  if (target === 0) return 0
  return resolveAssetPlannedProfitRaw(planId, assetId) / target
}

/** 标的「实际完成度」= 已实现盈利 / 目标盈利（均为市场原币种，单位一致）。 */
function resolveAssetActualRate(planId: string, assetId: string): number {
  const target = resolveAssetTargetProfit(planId, assetId)
  if (target === 0) return 0
  return resolveAssetActualProfitRaw(planId, assetId) / target
}

/** 已结束（endDate < 今天）或已归档则不可编辑。 */
function isPlanEditable(plan: FinancialPlanListItem): boolean {
  if (plan.status === 'ARCHIVED') return false
  if (plan.endDate && plan.endDate < todayDateString()) return false
  return true
}

// ===== 群组与底栏 =====

function handleGroupMemberChange(payload: { currentGroup?: { id?: string | number } | null }): void {
  const next = payload?.currentGroup || null
  const prev = currentGroup.value?.id
  currentGroup.value = next
  if (next?.id !== prev) {
    expandedPlanId.value = null
    hasAutoExpanded.value = false
  }
  fetchPlans()
}

function handleButtonClick(code: string): void {
  if (code === 'addPlan') {
    openCreatePlanModal()
  }
}

// ===== 计划弹窗 =====

function openCreatePlanModal(): void {
  planModalMode.value = 'create'
  editingPlanId.value = null
  resetPlanFormState()
  showPlanModal.value = true
}

function openEditPlanModal(planId: string): void {
  const detail = planDetails.value[planId]
  if (!detail) {
    uni.showToast({ title: '详情还未加载完成', icon: 'none' })
    return
  }
  planModalMode.value = 'edit'
  editingPlanId.value = planId
  planFormState.planName = detail.plan.planName || ''
  planFormState.timeRangeType = detail.plan.timeRangeType || 'CUSTOM'
  planFormState.fiscalYear = detail.plan.fiscalYear ? String(detail.plan.fiscalYear) : ''
  planFormState.startDate = detail.plan.startDate || ''
  planFormState.endDate = detail.plan.endDate || ''
  planFormState.targetProfit = detail.plan.targetProfit !== undefined && detail.plan.targetProfit !== null
    ? String(detail.plan.targetProfit)
    : ''
  planFormState.remark = detail.plan.remark || ''
  planFormState.version = detail.plan.version || 0
  showPlanModal.value = true
}

function closePlanModal(): void {
  showPlanModal.value = false
}

function resetPlanFormState(): void {
  planFormState.planName = ''
  planFormState.timeRangeType = 'CUSTOM'
  planFormState.fiscalYear = ''
  planFormState.startDate = todayDateString()
  planFormState.endDate = ''
  planFormState.targetProfit = ''
  planFormState.remark = ''
  planFormState.version = 0
}

function onPlanTimeRangeChange(event: { detail: { value: number } }): void {
  const idx = Number(event.detail.value)
  planFormState.timeRangeType = (timeRangeOptions[idx]?.value as TimeRangeType) || 'CUSTOM'
}

async function handleSubmitPlan(): Promise<void> {
  if (!planFormState.planName.trim()) {
    await uni.showToast({ title: '请填写计划名称', icon: 'none' })
    return
  }
  if (planFormState.timeRangeType === 'YEAR') {
    if (!planFormState.fiscalYear) {
      await uni.showToast({ title: '请填写年度', icon: 'none' })
      return
    }
  } else {
    if (!planFormState.startDate || !planFormState.endDate) {
      await uni.showToast({ title: '请填写开始/结束日期', icon: 'none' })
      return
    }
  }

  if (planModalMode.value === 'create') {
    await ensureCurrentGroup()
    const group = getStoredData<{ id?: string | number }>(STORAGE_KEYS.CURRENT_GROUP)
    if (!group?.id) {
      await uni.showToast({ title: '请先选择群组', icon: 'none' })
      return
    }
    await ensureCurrentMember(group.id)
    const loginUser = getStoredData<{ id?: string | number }>(STORAGE_KEYS.USER_INFO)
    const currentMember = getStoredData<{ userId?: string | number; id?: string | number }>(STORAGE_KEYS.CURRENT_MEMBER)
    const ownerUserId = loginUser?.id !== undefined
      ? String(loginUser.id)
      : (currentMember?.userId !== undefined ? String(currentMember.userId) : '')
    const request: Api2CreateFinancialPlanRequest = {
      groupId: String(group.id),
      ownerUserId,
      planName: planFormState.planName.trim(),
      planType: planTypeEnum.savings,
      timeRangeType: planFormState.timeRangeType,
      fiscalYear: planFormState.fiscalYear ? Number(planFormState.fiscalYear) : undefined,
      startDate: planFormState.startDate || undefined,
      endDate: planFormState.endDate || undefined,
      targetProfit: planFormState.targetProfit !== '' ? Number(planFormState.targetProfit) : undefined,
      remark: planFormState.remark || undefined,
    }
    const newPlanId = await planStore.createPlan(request)
    if (newPlanId) {
      await uni.showToast({ title: '计划已创建', icon: 'success' })
      closePlanModal()
      expandedPlanId.value = newPlanId
      await planStore.loadPlanDetail(newPlanId)
      await fetchPlans()
    }
    return
  }

  if (!editingPlanId.value) return
  const updateRequest: Api3UpdateFinancialPlanRequest = {
    planName: planFormState.planName.trim(),
    status: 'ACTIVE',
    timeRangeType: planFormState.timeRangeType,
    fiscalYear: planFormState.fiscalYear ? Number(planFormState.fiscalYear) : undefined,
    startDate: planFormState.startDate || undefined,
    endDate: planFormState.endDate || undefined,
    targetProfit: planFormState.targetProfit !== '' ? Number(planFormState.targetProfit) : undefined,
    remark: planFormState.remark || undefined,
    version: planFormState.version,
  }
  const ok = await planStore.updatePlan(editingPlanId.value, updateRequest)
  if (ok) {
    await uni.showToast({ title: '已保存', icon: 'success' })
    closePlanModal()
    await planStore.loadPlanDetail(editingPlanId.value)
    await fetchPlans()
  }
}

async function handleArchivePlan(plan: FinancialPlanListItem): Promise<void> {
  if (!plan.planId) return
  const actionLabel = plan.status === 'ARCHIVED' ? '恢复' : '归档'
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: `${actionLabel}计划`,
      content: `确认${actionLabel}「${plan.planName}」吗？`,
      success: (result) => resolve(Boolean(result.confirm)),
      fail: () => resolve(false),
    })
  })
  if (!confirmed) return

  if (plan.status === 'ARCHIVED') {
    // 恢复：先刷新详情拿到最新 version，再走 updatePlan(status=ACTIVE)。
    const fresh = await planStore.loadPlanDetail(plan.planId)
    if (!fresh) {
      return
    }
    await planStore.updatePlan(plan.planId, {
      planName: fresh.plan.planName,
      status: 'ACTIVE',
      timeRangeType: fresh.plan.timeRangeType,
      fiscalYear: fresh.plan.fiscalYear,
      startDate: fresh.plan.startDate,
      endDate: fresh.plan.endDate,
      remark: fresh.plan.remark,
      targetProfit: fresh.plan.targetProfit,
      version: fresh.plan.version,
    })
  } else {
    // 归档：后端已经做了幂等处理（不再校验 version、并把 endDate 设为今天），直接调用即可。
    const version = planDetails.value[plan.planId]?.plan.version || 1
    await planStore.archivePlan(plan.planId, version)
  }
  await fetchPlans()
}

// ===== Asset inline form =====

function toggleAddAssetForm(planId: string): void {
  if (showAddAssetFormFor.value === planId) {
    closeAddAssetForm()
    return
  }
  showAddAssetFormFor.value = planId
  newAssetForm.stockName = ''
  newAssetForm.market = 'CN'
  newAssetForm.targetProfit = ''
}

function closeAddAssetForm(): void {
  showAddAssetFormFor.value = null
}

function onNewAssetMarketChange(event: { detail: { value: number } }): void {
  const idx = Number(event.detail.value)
  newAssetForm.market = marketOptions[idx]?.value || 'CN'
}

async function handleSubmitAddAsset(planId: string): Promise<void> {
  if (!newAssetForm.stockName.trim()) {
    await uni.showToast({ title: '请填写股票名称', icon: 'none' })
    return
  }
  const targetProfitNum = Number(newAssetForm.targetProfit)
  if (!Number.isFinite(targetProfitNum)) {
    await uni.showToast({ title: '请填写目标盈利', icon: 'none' })
    return
  }
  const sequenceNo = (planDetails.value[planId]?.assets.length || 0) + 1
  try {
    await financialPlanApiClient.saveAssets(planId, {
      items: [
        {
          stockName: newAssetForm.stockName.trim(),
          market: newAssetForm.market,
          targetProfit: targetProfitNum,
          sequenceNo,
        },
      ],
    })
    closeAddAssetForm()
    await uni.showToast({ title: '标的已保存', icon: 'success' })
    await planStore.loadPlanDetail(planId)
  } catch (error) {
    console.warn('saveAssets failed:', error)
    await uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

// ===== Batch inline form =====

function toggleAddBatchForm(assetId: string): void {
  if (showAddBatchFormFor.value === assetId) {
    closeAddBatchForm()
    return
  }
  showAddBatchFormFor.value = assetId
  newBatchForm.batchType = 'EQUITY'
  newBatchForm.direction = undefined
  newBatchForm.quantity = ''
  newBatchForm.planBuyPrice = ''
  newBatchForm.planSellPrice = ''
  newBatchForm.expirationDate = ''
}

function closeAddBatchForm(): void {
  showAddBatchFormFor.value = null
}

function onNewBatchTypeChange(event: { detail: { value: number } }): void {
  const idx = Number(event.detail.value)
  newBatchForm.batchType = batchTypeOptions[idx]?.value || 'EQUITY'
  if (newBatchForm.batchType === 'EQUITY') {
    newBatchForm.direction = undefined
    newBatchForm.expirationDate = ''
  } else if (!newBatchForm.direction) {
    newBatchForm.direction = batchDirection.call
  }
}

function onNewBatchDirectionChange(event: { detail: { value: number } }): void {
  const idx = Number(event.detail.value)
  newBatchForm.direction = directionOptions[idx]?.value
}

async function handleSubmitAddBatch(planId: string, assetId: string): Promise<void> {
  const quantityNum = Number(newBatchForm.quantity)
  const buyNum = Number(newBatchForm.planBuyPrice)
  const sellNum = Number(newBatchForm.planSellPrice)
  if (!(quantityNum > 0)) {
    await uni.showToast({ title: '请填写数量（>0）', icon: 'none' })
    return
  }
  if (!(buyNum > 0) || !(sellNum > 0)) {
    await uni.showToast({ title: '请填写预期买入/卖出价（>0）', icon: 'none' })
    return
  }
  if (newBatchForm.batchType === 'DERIVATIVE') {
    if (!newBatchForm.direction) {
      await uni.showToast({ title: '请选择衍生品方向', icon: 'none' })
      return
    }
    if (!newBatchForm.expirationDate) {
      await uni.showToast({ title: '请填写到期日', icon: 'none' })
      return
    }
  }
  const result = await realizationStore.createBatch(planId, {
    assetId,
    batchType: newBatchForm.batchType,
    direction: newBatchForm.batchType === 'DERIVATIVE' ? newBatchForm.direction : undefined,
    quantity: quantityNum,
    planBuyPrice: buyNum,
    planSellPrice: sellNum,
    expirationDate: newBatchForm.batchType === 'DERIVATIVE' ? newBatchForm.expirationDate : undefined,
  })
  if (result) {
    closeAddBatchForm()
    await uni.showToast({ title: '批次已创建', icon: 'success' })
    await planStore.loadPlanDetail(planId)
  }
}

// ===== Buy / Sell inline form =====

function toggleBuyForm(batchId: string): void {
  if (showBuyFormFor.value === batchId) {
    closeOpForm()
    return
  }
  showSellFormFor.value = null
  showBuyFormFor.value = batchId
  resetOpForm()
}

function toggleSellForm(batchId: string): void {
  if (showSellFormFor.value === batchId) {
    closeOpForm()
    return
  }
  showBuyFormFor.value = null
  showSellFormFor.value = batchId
  resetOpForm()
}

function closeOpForm(): void {
  showBuyFormFor.value = null
  showSellFormFor.value = null
}

function resetOpForm(): void {
  opForm.tradeDate = todayDateString()
  opForm.price = ''
  opForm.quantity = ''
  opForm.fee = ''
}

async function handleSubmitBuy(planId: string, batchId: string): Promise<void> {
  const priceNum = Number(opForm.price)
  const qtyNum = Number(opForm.quantity)
  if (!opForm.tradeDate) {
    await uni.showToast({ title: '请填写交易日期', icon: 'none' })
    return
  }
  if (!(priceNum > 0) || !(qtyNum > 0)) {
    await uni.showToast({ title: '请填写正确的价格与数量', icon: 'none' })
    return
  }
  const feeNum = opForm.fee === '' ? 0 : Number(opForm.fee)
  const result = await realizationStore.recordBuy(planId, batchId, {
    tradeDate: opForm.tradeDate,
    actualBuyPrice: priceNum,
    quantity: qtyNum,
    fee: feeNum,
  })
  if (result) {
    closeOpForm()
    await uni.showToast({ title: '买入已记录', icon: 'success' })
    // 同时刷新 planDetail，让批次 stageStatus 立即更新，卖出按钮无需手动刷新页面。
    await Promise.all([
      realizationStore.loadBatchOperations(planId, batchId),
      planStore.loadPlanDetail(planId),
    ])
  }
}

// ===== 批次编辑 inline form =====

function toggleEditBatchForm(batch: RealizationBatch): void {
  if (showEditBatchFormFor.value === batch.batchId) {
    closeEditBatchForm()
    return
  }
  showBuyFormFor.value = null
  showSellFormFor.value = null
  showEditBatchFormFor.value = String(batch.batchId)
  editBatchForm.batchName = batch.batchName || ''
  editBatchForm.direction = batch.direction
  editBatchForm.quantity = String(batch.quantity ?? '')
  editBatchForm.planBuyPrice = String(batch.planBuyPrice ?? '')
  editBatchForm.planSellPrice = String(batch.planSellPrice ?? '')
  editBatchForm.expirationDate = batch.expirationDate || ''
  editBatchForm.version = batch.version ?? 0
}

function closeEditBatchForm(): void {
  showEditBatchFormFor.value = null
}

function onEditBatchDirectionChange(event: { detail: { value: number } }): void {
  const idx = Number(event.detail.value)
  editBatchForm.direction = directionOptions[idx]?.value
}

async function handleSubmitEditBatch(planId: string, batchId: string): Promise<void> {
  const quantityNum = Number(editBatchForm.quantity)
  const buyNum = Number(editBatchForm.planBuyPrice)
  const sellNum = Number(editBatchForm.planSellPrice)
  if (!(quantityNum > 0)) {
    await uni.showToast({ title: '请填写数量（>0）', icon: 'none' })
    return
  }
  if (!Number.isFinite(buyNum) || buyNum === 0) {
    await uni.showToast({ title: '请填写预期买入价', icon: 'none' })
    return
  }
  if (!Number.isFinite(sellNum) || sellNum === 0) {
    await uni.showToast({ title: '请填写预期卖出价', icon: 'none' })
    return
  }
  const result = await realizationStore.updateBatch(planId, batchId, {
    batchName: editBatchForm.batchName || undefined,
    direction: editBatchForm.direction,
    quantity: quantityNum,
    planBuyPrice: buyNum,
    planSellPrice: sellNum,
    expirationDate: editBatchForm.expirationDate || undefined,
    version: editBatchForm.version,
  })
  if (result) {
    closeEditBatchForm()
    await uni.showToast({ title: '批次已更新', icon: 'success' })
    await planStore.loadPlanDetail(planId)
  }
}

async function handleSubmitSell(planId: string, batchId: string): Promise<void> {
  const priceNum = Number(opForm.price)
  const qtyNum = Number(opForm.quantity)
  if (!opForm.tradeDate) {
    await uni.showToast({ title: '请填写交易日期', icon: 'none' })
    return
  }
  if (!(priceNum > 0) || !(qtyNum > 0)) {
    await uni.showToast({ title: '请填写正确的价格与数量', icon: 'none' })
    return
  }
  const feeNum = opForm.fee === '' ? 0 : Number(opForm.fee)
  const result = await realizationStore.recordSell(planId, batchId, {
    tradeDate: opForm.tradeDate,
    actualSellPrice: priceNum,
    quantity: qtyNum,
    fee: feeNum,
  })
  if (result) {
    closeOpForm()
    await uni.showToast({ title: '卖出已记录', icon: 'success' })
    await Promise.all([
      realizationStore.loadBatchOperations(planId, batchId),
      planStore.loadPlanDetail(planId),
    ])
  }
}

// ===== labels & formatters =====

function resolveMarketLabel(market?: string): string {
  if (market === assetMarket.us) return '美股'
  if (market === assetMarket.hk) return '港股'
  if (market === assetMarket.cn) return 'A 股'
  return '未指定市场'
}

function resolveMarketChipClass(market?: string): string {
  if (market === assetMarket.us) return 'chip--us'
  if (market === assetMarket.hk) return 'chip--hk'
  if (market === assetMarket.cn) return 'chip--cn'
  return ''
}

function resolveBatchTypeLabel(type?: BatchType): string {
  return type === 'DERIVATIVE' ? '衍生品' : '正股'
}

function resolveDirectionLabel(direction?: BatchDirection): string {
  if (direction === batchDirection.call) return '买入 CALL'
  if (direction === batchDirection.put) return '买入 PUT'
  if (direction === batchDirection.shortCall) return '卖空 CALL'
  if (direction === batchDirection.shortPut) return '卖空 PUT'
  return '请选择方向'
}

function resolveBatchTitle(batch: RealizationBatch): string {
  if (batch.batchName) return batch.batchName
  // 类型 + 方向信息已经在专门的 batch-row__type 行展示，名称只给一个通用兜底。
  return batch.batchType === 'DERIVATIVE' ? '衍生品批次' : '正股批次'
}

function resolveTimeRangeLabel(value?: string): string {
  if (value === 'YEAR') return '年度'
  return '自定义'
}

function resolveDateRangeLabel(plan: FinancialPlanListItem): string {
  if (!plan.startDate && !plan.endDate) return '未设置时间窗'
  return `${plan.startDate || '?'} ~ ${plan.endDate || '?'}`
}

/** 标签：已归档 / 已结束 / 进行中。 */
function resolveStatusLabel(plan: FinancialPlanListItem): string {
  if (plan.status === 'ARCHIVED') return '归档'
  if (plan.endDate && plan.endDate < todayDateString()) return '已结束'
  return '进行中'
}

function resolveStatusClass(plan: FinancialPlanListItem): string {
  if (plan.status === 'ARCHIVED') return 'status--archived'
  if (plan.endDate && plan.endDate < todayDateString()) return 'status--ended'
  return 'status--active'
}

function resolveStageLabel(stageStatus: RealizationBatch['stageStatus']): string {
  if (stageStatus === 'COMPLETED') return '已完成'
  if (stageStatus === 'PENDING_SELL') return '待卖出'
  if (stageStatus === 'PARTIAL_BOUGHT') return '已买入'
  return '待买入'
}

function resolveStageToneClass(stageStatus: RealizationBatch['stageStatus']): string {
  if (stageStatus === 'COMPLETED') return 'tone--completed'
  if (stageStatus === 'PENDING_SELL') return 'tone--pending-sell'
  if (stageStatus === 'PARTIAL_BOUGHT') return 'tone--partial'
  return 'tone--pending-buy'
}

function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return num.toFixed(2)
}

/** 盈利专用：空值 / 未完成兑现都展示为 0.00（而非 —）。 */
function formatProfit(value: number | string | undefined | null): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return (0).toFixed(2)
  return num.toFixed(2)
}

function formatPercent(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return `${(num * 100).toFixed(1)}%`
}

/** 正盈利 / 负盈利的色彩 class。 */
function profitToneClass(value: number | string | undefined | null): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return 'muted'
  if (num > 0) return 'positive'
  if (num < 0) return 'negative'
  return 'muted'
}

onShow(() => {
  if (currentGroup.value?.id) {
    fetchPlans()
  }
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  padding-bottom: 200rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
}

.page-header {
  padding: 36rpx 28rpx 16rpx;
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

.content-container {
  padding: 0 24rpx;
}

.empty-state {
  margin: 80rpx auto;
  padding: 56rpx 24rpx;
  text-align: center;
  color: #64748b;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 16rpx 36rpx rgba(15, 23, 42, 0.08);
}

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.plan-card {
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 16rpx 36rpx rgba(15, 23, 42, 0.08);
  overflow: hidden;
  /* 去掉左侧色条边框，色块仅靠状态 chip 表现 */
}

.plan-card--archived {
  opacity: 0.78;
}

.plan-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 26rpx;
}

.plan-card__head-left {
  flex: 1;
}

.plan-card__name {
  display: block;
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 700;
}

.plan-card__meta {
  display: block;
  margin-top: 6rpx;
  color: #64748b;
  font-size: 22rpx;
}

.plan-card__head-right {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.plan-card__status {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.status--active {
  background: #ecfdf5;
  color: #047857;
}
.status--ended {
  background: #f1f5f9;
  color: #475569;
}
.status--archived {
  background: #fef2f2;
  color: #b91c1c;
}

.plan-card__caret {
  color: #94a3b8;
  font-size: 28rpx;
}

.header-link {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #eef2ff;
  color: #2563eb;
  font-size: 22rpx;
}

.header-link--danger {
  background: #fef2f2;
  color: #b91c1c;
}

.plan-card__body {
  padding: 0 26rpx 24rpx;
}

.loading-text {
  padding: 28rpx;
  text-align: center;
  color: #64748b;
  font-size: 24rpx;
}

.metric-row {
  display: flex;
  gap: 14rpx;
  margin-bottom: 18rpx;
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

.metric__sub {
  display: block;
  margin-top: 4rpx;
  color: #64748b;
  font-size: 20rpx;
}

.metric__sub--breakdown {
  color: #94a3b8;
  font-size: 18rpx;
  font-feature-settings: 'tnum';
}

.currency-tag {
  display: inline-block;
  margin-right: 8rpx;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  background: #eef2ff;
  color: #475569;
  font-size: 20rpx;
}

.section {
  margin-top: 10rpx;
  padding-top: 14rpx;
}

.section__title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.section__title {
  color: #0f172a;
  font-size: 26rpx;
  font-weight: 600;
}

.empty-mini {
  padding: 14rpx;
  text-align: center;
  color: #94a3b8;
  font-size: 22rpx;
}

/* 标的：用轻底色 + 间距分隔，去掉边框 */
.asset-block {
  margin-top: 12rpx;
  border-radius: 18rpx;
  background: rgba(241, 245, 249, 0.6);
  padding: 12rpx 14rpx;
}

.asset-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 6rpx;
}

.asset-row__info {
  flex: 1;
  min-width: 0;
}

.asset-row__name {
  display: block;
  color: #0f172a;
  font-size: 26rpx;
  font-weight: 600;
}

.asset-row__meta {
  display: block;
  margin-top: 4rpx;
  color: #475569;
  font-size: 22rpx;
}

.asset-row__rate {
  display: block;
  margin-top: 2rpx;
  color: #64748b;
  font-size: 20rpx;
}

.market-chip {
  display: inline-block;
  padding: 2rpx 10rpx;
  margin-right: 6rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 500;
}
.chip--us {
  background: #dbeafe;
  color: #1d4ed8;
}
.chip--hk {
  background: #fee2e2;
  color: #b91c1c;
}
.chip--cn {
  background: #fef3c7;
  color: #b45309;
}

/* 批次：在标的色块内进一步缩进，仅左侧色条做层级提示 */
.batch-block {
  margin-top: 6rpx;
  padding: 8rpx 10rpx 8rpx 14rpx;
  border-left: 4rpx solid #c7d2fe;
}

.batch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
}

.batch-row__info {
  flex: 1;
  min-width: 0;
}

.batch-row__name {
  display: block;
  color: #0f172a;
  font-size: 24rpx;
  font-weight: 600;
}

.batch-row__type {
  display: block;
  margin-top: 2rpx;
  color: #64748b;
  font-size: 21rpx;
}

.batch-row__summary {
  display: block;
  margin-top: 4rpx;
  color: #475569;
  font-size: 22rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 操作明细：两列紧凑 grid */
.op-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6rpx 12rpx;
  margin-top: 8rpx;
  padding-left: 4rpx;
}

.op-cell {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
  font-size: 21rpx;
}

.op-cell--buy {
  background: rgba(220, 252, 231, 0.55);
  color: #166534;
}
.op-cell--sell {
  background: rgba(254, 226, 226, 0.55);
  color: #991b1b;
}

.op-cell__type {
  flex-shrink: 0;
  width: 28rpx;
  height: 28rpx;
  line-height: 28rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  font-size: 18rpx;
  font-weight: 600;
}

.op-cell__line {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8rpx;
}

.row-btn {
  margin: 0;
  padding: 6rpx 16rpx;
  min-width: auto;
  height: 56rpx;
  line-height: 44rpx;
  border-radius: 999rpx;
  background: #eef2ff;
  color: #334155;
  font-size: 22rpx;
}

.row-btn[disabled] {
  background: #f1f5f9;
  color: #94a3b8;
}

.row-btn--primary {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #ffffff;
}

.status-badge {
  margin-left: 8rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 500;
}
.tone--completed {
  background: #ecfdf5;
  color: #047857;
}
.tone--pending-sell {
  background: #fef3c7;
  color: #b45309;
}
.tone--partial {
  background: #e0e7ff;
  color: #3730a3;
}
.tone--pending-buy {
  background: #f1f5f9;
  color: #475569;
}

.positive {
  color: #047857;
}
.negative {
  color: #b91c1c;
}
.muted {
  color: #64748b;
}

.inline-form {
  margin-top: 10rpx;
  padding: 12rpx 14rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.7);
}

.inline-form--asset,
.inline-form--batch {
  margin-left: 0;
}

.inline-form__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.inline-field {
  flex: 1 1 220rpx;
  min-width: 220rpx;
}

.inline-field__label {
  display: block;
  margin-bottom: 6rpx;
  color: #475569;
  font-size: 22rpx;
}

.inline-input,
.inline-picker {
  width: 100%;
  min-height: 60rpx;
  padding: 10rpx 14rpx;
  box-sizing: border-box;
  border: 1rpx solid #dbe3ef;
  border-radius: 10rpx;
  background: #ffffff;
  color: #0f172a;
  font-size: 24rpx;
}

.inline-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10rpx;
  margin-top: 10rpx;
}

/* Modal */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-panel {
  width: 90%;
  max-width: 640rpx;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 24rpx;
  border-bottom: 1rpx solid #f1f5f9;
}

.modal-title {
  display: block;
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 700;
}

.modal-body {
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.modal-field {
  display: flex;
  flex-direction: column;
}

.modal-field-row {
  display: flex;
  gap: 14rpx;
}

.modal-field-row > .modal-field {
  flex: 1;
}

.modal-label {
  display: block;
  margin-bottom: 6rpx;
  color: #475569;
  font-size: 22rpx;
}

.modal-input,
.modal-picker {
  width: 100%;
  min-height: 64rpx;
  padding: 12rpx 16rpx;
  box-sizing: border-box;
  border: 1rpx solid #dbe3ef;
  border-radius: 12rpx;
  background: #ffffff;
  color: #0f172a;
  font-size: 24rpx;
}

.modal-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 12rpx 16rpx;
  box-sizing: border-box;
  border: 1rpx solid #dbe3ef;
  border-radius: 12rpx;
  background: #ffffff;
  color: #0f172a;
  font-size: 24rpx;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  padding: 16rpx 24rpx 24rpx;
  border-top: 1rpx solid #f1f5f9;
}
</style>
