import { defineStore } from 'pinia'

import {
  financialPlanApiClient,
} from '../api'
import { resolveFinancialPlanErrorPrompt } from '../utils/errorPrompt'
import type {
  Api4SaveFinancialPlanAssetsRequest,
  Api4SaveFinancialPlanAssetsResponse,
  Api5UpdateFinancialPlanAssetParamsRequest,
  Api5UpdateFinancialPlanAssetParamsResponse,
  FinancialPlanAsset,
} from '../../../../../api/financial-plan'

/** 计算计划标的的目标盈利。 */
function calculateTargetProfit(asset: Pick<FinancialPlanAsset, 'planBuyPrice' | 'planSellPrice' | 'planQuantity'>): number {
  const buyPrice = Number(asset.planBuyPrice)
  const sellPrice = Number(asset.planSellPrice)
  const quantity = Number(asset.planQuantity)

  if (!Number.isFinite(buyPrice) || !Number.isFinite(sellPrice) || !Number.isFinite(quantity)) {
    return 0
  }

  return Number(((sellPrice - buyPrice) * quantity).toFixed(8))
}

/** 计算完成度，保留两位小数。 */
function calculateCompletionRate(actualProfit: number, targetProfit: number): number {
  if (!Number.isFinite(actualProfit) || !Number.isFinite(targetProfit) || targetProfit === 0) {
    return 0
  }

  return Number(((actualProfit / targetProfit) * 100).toFixed(2))
}

/** 判断当前运行环境是否支持 uni 提示。 */
function hasUniToast(): boolean {
  return typeof uni !== 'undefined' && typeof uni.showToast === 'function'
}

/** 统一处理理财计划标的 store 错误。 */
function handlePlanAssetStoreError(error: unknown): null {
  const message = resolveFinancialPlanErrorPrompt(error, '计划标的操作失败，请稍后重试')

  if (hasUniToast()) {
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2500,
    })
  }

  console.warn('PlanAssetStore error:', error)
  return null
}

export const usePlanAssetStore = defineStore('planAsset', {
  state: () => ({
    assetList: [] as FinancialPlanAsset[],
    editingAsset: null as FinancialPlanAsset | null,
    assetLoading: false,
  }),

  getters: {
    /** 当前计划标的数量。 */
    assetCount: (state): number => state.assetList.length,

    /** 当前计划的计划数量总和。 */
    totalPlannedQuantity: (state): number =>
      state.assetList.reduce((sum, asset) => sum + Number(asset.planQuantity || 0), 0),

    /** 当前计划的目标盈利总和。 */
    assetTargetProfit: (state): number =>
      state.assetList.reduce((sum, asset) => sum + Number(asset.targetProfit || 0), 0),
  },

  actions: {
    /** 设置当前正在编辑的计划标的。 */
    setEditingAsset(asset: FinancialPlanAsset | null): void {
      this.editingAsset = asset ? { ...asset } : null
    },

    /** 计算并更新单个计划标的的目标盈利。 */
    recalculateTargetProfit(
      assetId: string,
      patch?: Partial<Pick<FinancialPlanAsset, 'planBuyPrice' | 'planSellPrice' | 'planQuantity'>>,
    ): FinancialPlanAsset | null {
      const currentAsset = this.assetList.find((item) => item.assetId === assetId)
      if (!currentAsset) {
        return null
      }

      const nextAsset: FinancialPlanAsset = {
        ...currentAsset,
        ...patch,
      }
      nextAsset.targetProfit = calculateTargetProfit(nextAsset)
      nextAsset.completionRate = calculateCompletionRate(nextAsset.actualProfit, nextAsset.targetProfit)

      const index = this.assetList.findIndex((item) => item.assetId === assetId)
      this.assetList.splice(index, 1, nextAsset)

      if (this.editingAsset && this.editingAsset.assetId === assetId) {
        this.editingAsset = { ...nextAsset }
      }

      return nextAsset
    },

    /** 保存计划标的并同步到本地状态。 */
    async saveAssets(
      planId: string,
      request: Api4SaveFinancialPlanAssetsRequest,
    ): Promise<Api4SaveFinancialPlanAssetsResponse | null> {
      this.assetLoading = true
      try {
        const response = await financialPlanApiClient.saveAssets(planId, request)
        this.assetList = response.data.items.map((asset) => ({ ...asset }))
        this.editingAsset = null
        return response.data
      } catch (error) {
        return handlePlanAssetStoreError(error)
      } finally {
        this.assetLoading = false
      }
    },

    /**
     * 单独保存一个标的（指定 planId），仅更新本行：
     * 复用 API-4 的 upsert 语义，但只把响应里对应的那一项合并回 assetList，
     * 不影响其他尚未持久化的 temp- 行。
     *
     * @param planId          计划主键
     * @param item            待保存项（assetId 缺失代表新增）
     * @param originalAssetId 编辑器里这一行当前的 assetId（含 temp- 前缀）
     */
    async saveSingleAsset(
      planId: string,
      item: Api4SaveFinancialPlanAssetsRequest['items'][number],
      originalAssetId: string,
    ): Promise<FinancialPlanAsset | null> {
      this.assetLoading = true
      try {
        const response = await financialPlanApiClient.saveAssets(planId, { items: [item] })
        const persisted = response.data.items.find(
          (saved) => saved.assetCode === item.assetCode && saved.assetType === item.assetType,
        )
        if (!persisted) {
          return null
        }
        // 仅替换被保存的那一行，保留其他 temp- 行用户的本地编辑。
        const targetId = item.assetId || originalAssetId
        this.assetList = this.assetList.map((a) =>
          a.assetId === targetId ? { ...persisted } : a,
        )
        if (this.editingAsset && this.editingAsset.assetId === targetId) {
          this.editingAsset = { ...persisted }
        }
        return persisted
      } catch (error) {
        return handlePlanAssetStoreError(error)
      } finally {
        this.assetLoading = false
      }
    },

    /** 更新单个计划标的的目标参数并刷新本地缓存。 */
    async updateAssetParams(
      planId: string,
      assetId: string,
      request: Api5UpdateFinancialPlanAssetParamsRequest,
    ): Promise<Api5UpdateFinancialPlanAssetParamsResponse | null> {
      this.assetLoading = true
      try {
        const response = await financialPlanApiClient.updateAssetParams(planId, assetId, request)
        const result = response.data
        const currentAsset = this.assetList.find((item) => item.assetId === assetId)

        if (currentAsset) {
          currentAsset.planBuyPrice = result.planBuyPrice
          currentAsset.planSellPrice = result.planSellPrice
          currentAsset.planQuantity = result.planQuantity
          currentAsset.targetProfit = result.targetProfit
          currentAsset.completionRate = calculateCompletionRate(currentAsset.actualProfit, currentAsset.targetProfit)
        }

        if (this.editingAsset && this.editingAsset.assetId === assetId) {
          this.editingAsset = currentAsset ? { ...currentAsset } : null
        }

        return result
      } catch (error) {
        return handlePlanAssetStoreError(error)
      } finally {
        this.assetLoading = false
      }
    },

    /** 从本地列表中移除一个标的。 */
    removeLocalAsset(assetId: string): boolean {
      const index = this.assetList.findIndex((item) => item.assetId === assetId)
      if (index < 0) {
        return false
      }

      this.assetList.splice(index, 1)

      if (this.editingAsset && this.editingAsset.assetId === assetId) {
        this.editingAsset = null
      }

      return true
    },
  },
})