import { defineStore } from 'pinia'

import {
  FinancialPlanApiError,
  financialPlanApiClient,
} from '../api'
import { useFinancialPlanStore } from './useFinancialPlanStore'
import { usePlanAssetStore } from './usePlanAssetStore'
import type {
  Api10GetFinancialPlanDashboardResponse,
  AssetProfitSummary,
  ProfitSummary,
  ProgressSnapshot,
} from '../../../../../api/financial-plan'

/** 判断当前运行环境是否支持 uni 提示。 */
function hasUniToast(): boolean {
  return typeof uni !== 'undefined' && typeof uni.showToast === 'function'
}

/** 统一处理理财计划统计 store 错误。 */
function handleFinancialPlanStatsStoreError(error: unknown): null {
  let message = '统计看板加载失败，请稍后重试'

  if (error instanceof FinancialPlanApiError) {
    message = error.code && error.code !== '0'
      ? `${error.code}: ${error.message || message}`
      : (error.message || message)
  } else if (error instanceof Error && error.message) {
    message = error.message
  }

  if (hasUniToast()) {
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2500,
    })
  }

  console.warn('FinancialPlanStatsStore error:', error)
  return null
}

/** 克隆概要信息，避免直接复用 API 返回引用。 */
function cloneSummary(summary: ProfitSummary): ProfitSummary {
  return { ...summary }
}

/** 克隆资产统计项，避免直接复用 API 返回引用。 */
function cloneAssetSummary(assetSummary: AssetProfitSummary): AssetProfitSummary {
  return { ...assetSummary }
}

/** 克隆进度快照，避免直接复用 API 返回引用。 */
function cloneProgress(progress: ProgressSnapshot): ProgressSnapshot {
  return {
    ...progress,
    warningFlags: [...progress.warningFlags],
  }
}

/** 根据当前本地标的列表，计算目标盈利总和。 */
function resolveLocalTargetProfit(): number {
  const assetStore = usePlanAssetStore()
  return assetStore.assetTargetProfit
}

/** 构建一个本地预估的计划统计摘要。 */
function buildLocalSummary(planId: string): ProfitSummary {
  const assetStore = usePlanAssetStore()
  const targetProfit = resolveLocalTargetProfit()
  const actualProfit = 0

  return {
    planId,
    targetProfit,
    actualProfit,
    realizedQuantity: 0,
    plannedQuantity: assetStore.totalPlannedQuantity,
    completionRate: targetProfit > 0 ? Number(((actualProfit / targetProfit) * 100).toFixed(2)) : 0,
    completedBatchCount: 0,
    incompleteBatchCount: 0,
  }
}

export const useFinancialPlanStatsStore = defineStore('financialPlanStats', {
  state: () => ({
    summary: null as ProfitSummary | null,
    assetSummaries: [] as AssetProfitSummary[],
    progress: null as ProgressSnapshot | null,
    statsLoading: false,
  }),

  getters: {
    /** 当前计划完成度。 */
    completionRate: (state): number => state.summary?.completionRate ?? 0,

    /** 当前计划告警标记。 */
    warningFlags: (state): ProgressSnapshot['warningFlags'] => state.progress?.warningFlags ?? [],

    /** 实际盈利与目标盈利的差值。 */
    actualVsTargetGap: (state): number =>
      state.summary ? Number((state.summary.actualProfit - state.summary.targetProfit).toFixed(8)) : 0,
  },

  actions: {
    /** 加载指定计划的 dashboard 统计。 */
    async loadDashboard(planId: string): Promise<Api10GetFinancialPlanDashboardResponse | null> {
      this.statsLoading = true
      try {
        const response = await financialPlanApiClient.getDashboard(planId)
        const data = response.data

        this.summary = cloneSummary(data.planSummary)
        this.assetSummaries = data.assetSummaries.map((assetSummary) => cloneAssetSummary(assetSummary))
        this.progress = cloneProgress(data.progress)

        const assetStore = usePlanAssetStore()
        if (assetStore.assetList.length > 0) {
          this.recalculateTargetProfit(planId)
        }

        return data
      } catch (error) {
        return handleFinancialPlanStatsStoreError(error)
      } finally {
        this.statsLoading = false
      }
    },

    /** 刷新统计看板；未传 planId 时优先使用当前选中计划。 */
    async refreshStats(planId?: string): Promise<Api10GetFinancialPlanDashboardResponse | null> {
      const planStore = useFinancialPlanStore()
      const resolvedPlanId = planId || planStore.currentPlanId

      if (!resolvedPlanId) {
        return null
      }

      return this.loadDashboard(resolvedPlanId)
    },

    /** 基于本地标的列表即时重算目标盈利，不改写实际盈利。 */
    recalculateTargetProfit(planId?: string): ProfitSummary | null {
      const assetStore = usePlanAssetStore()
      const planStore = useFinancialPlanStore()
      const resolvedPlanId = planId || this.summary?.planId || planStore.currentPlanId || ''

      if (!resolvedPlanId) {
        return null
      }

      if (assetStore.assetList.length === 0) {
        return this.summary
      }

      const targetProfit = resolveLocalTargetProfit()
      const plannedQuantity = assetStore.totalPlannedQuantity
      const actualProfit = this.summary?.actualProfit ?? 0

      if (this.summary) {
        this.summary = {
          ...this.summary,
          planId: resolvedPlanId,
          targetProfit,
          plannedQuantity,
          completionRate: targetProfit > 0 ? Number(((actualProfit / targetProfit) * 100).toFixed(2)) : 0,
        }
      } else {
        this.summary = buildLocalSummary(resolvedPlanId)
      }

      return this.summary
    },
  },
})