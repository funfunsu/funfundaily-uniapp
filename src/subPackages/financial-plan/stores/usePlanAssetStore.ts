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
} from '../api/financial-plan'
import type {
  FinancialPlanAsset,
} from '../api/financial-plan-types'

function hasUniToast(): boolean {
  return typeof uni !== 'undefined' && typeof uni.showToast === 'function'
}

function handlePlanAssetStoreError(error: unknown): null {
  const message = resolveFinancialPlanErrorPrompt(error, '计划标的操作失败，请稍后重试')
  if (hasUniToast()) {
    uni.showToast({ title: message, icon: 'none', duration: 2500 })
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
    assetCount: (state): number => state.assetList.length,
  },

  actions: {
    setEditingAsset(asset: FinancialPlanAsset | null): void {
      this.editingAsset = asset ? { ...asset } : null
    },

    /** 批量 upsert 标的，并替换 assetList。 */
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
     * 单独保存一个标的：API-4 upsert 语义；只把响应里对应那一项合并回本地列表，
     * 保留其他 temp- 行的本地编辑。
     *
     * 以 (stockName, market) 作为响应里查找匹配项的键。
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
          (saved) => saved.stockName === item.stockName && saved.market === item.market,
        )
        if (!persisted) {
          return null
        }
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

    /** 调整单个标的的目标利润 / 股票名 / 市场。 */
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
          currentAsset.stockName = result.stockName
          currentAsset.market = result.market
          currentAsset.targetProfit = result.targetProfit
          currentAsset.version = result.version
        }
        if (this.editingAsset && this.editingAsset.assetId === assetId && currentAsset) {
          this.editingAsset = { ...currentAsset }
        }
        return result
      } catch (error) {
        return handlePlanAssetStoreError(error)
      } finally {
        this.assetLoading = false
      }
    },

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
