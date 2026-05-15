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
  Api13UpdateRealizationBatchRequest,
} from '../../../../../api/financial-plan'
import type {
  RealizationBatch,
  RealizationOperation,
} from '../../../../../api/financial-plan-types'

function hasUniToast(): boolean {
  return typeof uni !== 'undefined' && typeof uni.showToast === 'function'
}

function handleRealizationStoreError(error: unknown): null {
  const message = resolveFinancialPlanErrorPrompt(error, '兑现批次操作失败，请稍后重试')
  if (hasUniToast()) {
    uni.showToast({ title: message, icon: 'none', duration: 2500 })
  }
  console.warn('RealizationStore error:', error)
  return null
}

function cloneBatch(batch: RealizationBatch): RealizationBatch {
  return { ...batch }
}

async function refreshStatsSafely(planId: string): Promise<void> {
  const statsStore = useFinancialPlanStatsStore()
  await statsStore.refreshStats(planId)
}

/** 重新拉取计划详情，把最新的批次聚合落回本地。 */
async function reloadBatchListFromDetail(planId: string): Promise<RealizationBatch[]> {
  const response = await financialPlanApiClient.getPlanDetail(planId)
  return response.data.realizationBatches.map((batch) => cloneBatch(batch))
}

export const useRealizationStore = defineStore('realization', {
  state: () => ({
    batchList: [] as RealizationBatch[],
    selectedBatch: null as RealizationBatch | null,
    /** 按 batchId 缓存的操作明细列表。 */
    operationsByBatchId: {} as Record<string, RealizationOperation[]>,
    submitting: false,
  }),

  getters: {
    completedBatches: (state): RealizationBatch[] =>
      state.batchList.filter((batch) => batch.stageStatus === 'COMPLETED'),

    incompleteBatches: (state): RealizationBatch[] =>
      state.batchList.filter((batch) => batch.stageStatus !== 'COMPLETED'),

    realizedQuantity: (state): number =>
      state.batchList.reduce((sum, batch) => sum + Number(batch.quantity || 0), 0),
  },

  actions: {
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
        return detail
      } catch (error) {
        return handleRealizationStoreError(error)
      } finally {
        this.submitting = false
      }
    },

    /** 创建批次（新模型：携带 batchType / direction / planBuyPrice / planSellPrice / expirationDate）。 */
    async createBatch(
      planId: string,
      request: Api6CreateRealizationBatchRequest,
    ): Promise<Api6CreateRealizationBatchResponse | null> {
      this.submitting = true
      try {
        const response = await financialPlanApiClient.createRealizationBatch(planId, request)
        // 后端是真相源；直接拉一次详情把批次列表刷新到最新状态。
        this.batchList = await reloadBatchListFromDetail(planId)
        await refreshStatsSafely(planId)
        return response.data
      } catch (error) {
        return handleRealizationStoreError(error)
      } finally {
        this.submitting = false
      }
    },

    /** 登记一次买入（同批次可多次）。 */
    async recordBuy(
      planId: string,
      batchId: string,
      request: Api7RecordRealizationBuyRequest,
    ): Promise<Api7RecordRealizationBuyResponse | null> {
      this.submitting = true
      try {
        const response = await financialPlanApiClient.recordRealizationBuy(planId, batchId, request)
        this.batchList = await reloadBatchListFromDetail(planId)
        // 操作明细缓存失效。
        delete this.operationsByBatchId[batchId]
        await refreshStatsSafely(planId)
        return response.data
      } catch (error) {
        return handleRealizationStoreError(error)
      } finally {
        this.submitting = false
      }
    },

    /** 登记一次卖出（同批次可多次）。 */
    async recordSell(
      planId: string,
      batchId: string,
      request: Api8RecordRealizationSellRequest,
    ): Promise<Api8RecordRealizationSellResponse | null> {
      this.submitting = true
      try {
        const response = await financialPlanApiClient.recordRealizationSell(planId, batchId, request)
        this.batchList = await reloadBatchListFromDetail(planId)
        delete this.operationsByBatchId[batchId]
        await refreshStatsSafely(planId)
        return response.data
      } catch (error) {
        return handleRealizationStoreError(error)
      } finally {
        this.submitting = false
      }
    },

    /** 编辑批次（API-13）：成功后从详情刷新批次列表。 */
    async updateBatch(
      planId: string,
      batchId: string,
      request: Api13UpdateRealizationBatchRequest,
    ): Promise<RealizationBatch | null> {
      this.submitting = true
      try {
        const response = await financialPlanApiClient.updateRealizationBatch(planId, batchId, request)
        this.batchList = await reloadBatchListFromDetail(planId)
        await refreshStatsSafely(planId)
        return response.data
      } catch (error) {
        return handleRealizationStoreError(error)
      } finally {
        this.submitting = false
      }
    },

    /** 拉取某批次的所有操作明细（缓存命中即直返）。 */
    async loadBatchOperations(planId: string, batchId: string): Promise<RealizationOperation[]> {
      if (this.operationsByBatchId[batchId]) {
        return this.operationsByBatchId[batchId]
      }
      try {
        const response = await financialPlanApiClient.listBatchOperations(planId, batchId)
        const ops = Array.isArray(response.data) ? response.data : []
        this.operationsByBatchId[batchId] = ops
        return ops
      } catch (error) {
        handleRealizationStoreError(error)
        return []
      }
    },
  },
})
