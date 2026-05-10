import { defineStore } from 'pinia'

import {
  financialPlanApiClient,
} from '../api'
import { resolveFinancialPlanErrorPrompt } from '../utils/errorPrompt'
import { useFinancialPlanStatsStore } from './useFinancialPlanStatsStore'
import { useFinancialPlanStore } from './useFinancialPlanStore'
import type {
  Api6CreateRealizationBatchRequest,
  Api6CreateRealizationBatchResponse,
  Api7RecordRealizationBuyRequest,
  Api7RecordRealizationBuyResponse,
  Api8RecordRealizationSellRequest,
  Api8RecordRealizationSellResponse,
  Api9GetFinancialPlanDetailResponse,
  RealizationBatch,
} from '../../../../../api/financial-plan'

/** 判断当前运行环境是否支持 uni 提示。 */
function hasUniToast(): boolean {
  return typeof uni !== 'undefined' && typeof uni.showToast === 'function'
}

/** 统一处理理财计划兑现 store 错误。 */
function handleRealizationStoreError(error: unknown): null {
  const message = resolveFinancialPlanErrorPrompt(error, '兑现批次操作失败，请稍后重试')

  if (hasUniToast()) {
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2500,
    })
  }

  console.warn('RealizationStore error:', error)
  return null
}

/** 克隆批次对象，避免直接复用 API 返回引用。 */
function cloneBatch(batch: RealizationBatch): RealizationBatch {
  return { ...batch }
}

/** 通过批次 ID 同步本地 selectedBatch。 */
function resolveSelectedBatch(batchList: RealizationBatch[], selectedBatchId: string | null): RealizationBatch | null {
  if (selectedBatchId) {
    return batchList.find((item) => item.batchId === selectedBatchId) || null
  }

  return batchList[0] || null
}

/** 触发看板统计刷新，失败时仅记录日志，不打断主流程。 */
async function refreshStatsSafely(planId: string): Promise<void> {
  const statsStore = useFinancialPlanStatsStore()
  await statsStore.refreshStats(planId)
}

export const useRealizationStore = defineStore('realization', {
  state: () => ({
    batchList: [] as RealizationBatch[],
    selectedBatch: null as RealizationBatch | null,
    submitting: false,
  }),

  getters: {
    /** 已完成的兑现批次。 */
    completedBatches: (state): RealizationBatch[] =>
      state.batchList.filter((batch) => batch.stageStatus === 'COMPLETED'),

    /** 未完成的兑现批次。 */
    incompleteBatches: (state): RealizationBatch[] =>
      state.batchList.filter((batch) => batch.stageStatus !== 'COMPLETED'),

    /** 当前页面内已兑现数量总和。 */
    realizedQuantity: (state): number =>
      state.batchList.reduce((sum, batch) => sum + Number(batch.quantity || 0), 0),
  },

  actions: {
    /** 设置当前选中的兑现批次。 */
    setSelectedBatch(batchId: string | null): void {
      this.selectedBatch = batchId
        ? this.batchList.find((item) => item.batchId === batchId) || null
        : null
    },

    /** 从计划详情加载批次历史。 */
    async loadBatchHistory(planId?: string): Promise<Api9GetFinancialPlanDetailResponse | null> {
      const currentPlanStore = useFinancialPlanStore()
      const resolvedPlanId = planId || currentPlanStore.currentPlanId

      if (!resolvedPlanId) {
        return null
      }

      this.submitting = true
      try {
        const response = await financialPlanApiClient.getPlanDetail(resolvedPlanId)
        const detail = response.data
        this.batchList = detail.realizationBatches.map((batch) => cloneBatch(batch))
        this.selectedBatch = resolveSelectedBatch(this.batchList, this.selectedBatch?.batchId || null)
        return detail
      } catch (error) {
        return handleRealizationStoreError(error)
      } finally {
        this.submitting = false
      }
    },

    /** 新增兑现批次，并刷新统计看板。 */
    async createBatch(
      planId: string,
      request: Api6CreateRealizationBatchRequest,
    ): Promise<Api6CreateRealizationBatchResponse | null> {
      this.submitting = true
      try {
        const response = await financialPlanApiClient.createRealizationBatch(planId, request)
        const result = response.data
        const nextBatch: RealizationBatch = {
          batchId: result.batchId,
          planId: result.planId,
          assetId: result.assetId,
          batchName: request.batchName,
          quantity: result.quantity,
          stageStatus: result.stageStatus,
          feeTotal: 0,
          version: 1,
          note: request.note,
        }

        this.batchList = [nextBatch, ...this.batchList.filter((item) => item.batchId !== nextBatch.batchId)]
        this.selectedBatch = cloneBatch(nextBatch)
        await refreshStatsSafely(planId)
        return result
      } catch (error) {
        return handleRealizationStoreError(error)
      } finally {
        this.submitting = false
      }
    },

    /** 登记兑现买入，并刷新统计看板。 */
    async recordBuy(
      planId: string,
      batchId: string,
      request: Api7RecordRealizationBuyRequest,
    ): Promise<Api7RecordRealizationBuyResponse | null> {
      this.submitting = true
      try {
        const response = await financialPlanApiClient.recordRealizationBuy(planId, batchId, request)
        const result = response.data
        const currentBatch = this.batchList.find((item) => item.batchId === batchId)

        if (currentBatch) {
          currentBatch.stageStatus = result.stageStatus
          currentBatch.actualBuyPrice = request.actualBuyPrice
          currentBatch.actualBuyAmount = result.actualBuyAmount
          currentBatch.buyTradeDate = request.tradeDate
          currentBatch.quantity = request.quantity
          currentBatch.feeTotal = Number((Number(currentBatch.feeTotal || 0) + Number(request.fee || 0)).toFixed(8))
          currentBatch.note = request.note || currentBatch.note
        }

        if (this.selectedBatch && this.selectedBatch.batchId === batchId && currentBatch) {
          this.selectedBatch = cloneBatch(currentBatch)
        }

        await refreshStatsSafely(planId)
        return result
      } catch (error) {
        return handleRealizationStoreError(error)
      } finally {
        this.submitting = false
      }
    },

    /** 登记兑现卖出，并刷新统计看板。 */
    async recordSell(
      planId: string,
      batchId: string,
      request: Api8RecordRealizationSellRequest,
    ): Promise<Api8RecordRealizationSellResponse | null> {
      this.submitting = true
      try {
        const response = await financialPlanApiClient.recordRealizationSell(planId, batchId, request)
        const result = response.data
        const currentBatch = this.batchList.find((item) => item.batchId === batchId)

        if (currentBatch) {
          currentBatch.stageStatus = result.stageStatus
          currentBatch.actualSellPrice = request.actualSellPrice
          currentBatch.actualSellAmount = Number((Number(request.actualSellPrice || 0) * Number(request.quantity || 0)).toFixed(8))
          currentBatch.actualProfit = result.actualProfit
          currentBatch.sellTradeDate = request.tradeDate
          currentBatch.quantity = request.quantity
          currentBatch.feeTotal = Number((Number(currentBatch.feeTotal || 0) + Number(request.fee || 0)).toFixed(8))
          currentBatch.note = request.note || currentBatch.note
        }

        if (this.selectedBatch && this.selectedBatch.batchId === batchId && currentBatch) {
          this.selectedBatch = cloneBatch(currentBatch)
        }

        await refreshStatsSafely(planId)
        return result
      } catch (error) {
        return handleRealizationStoreError(error)
      } finally {
        this.submitting = false
      }
    },
  },
})