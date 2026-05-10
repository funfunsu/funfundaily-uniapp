import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { financialPlanApiClient } from '../api'
import { usePlanAssetStore } from '../stores/usePlanAssetStore'

describe('usePlanAssetStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** 覆盖目标收益重算与 getter。 */
  it('recalculates target profit and completion rate for an asset', () => {
    const store = usePlanAssetStore()
    store.assetList = [
      {
        assetId: 'a1',
        planId: 'p1',
        assetType: 'STOCK',
        assetCode: '0001',
        assetName: 'asset-1',
        planBuyPrice: 10,
        planSellPrice: 14,
        planQuantity: 5,
        realizedQuantity: 0,
        openQuantity: 0,
        targetProfit: 0,
        actualProfit: 10,
        completionRate: 0,
        currency: 'CNY',
        sequenceNo: 1,
        version: 1,
      } as any,
    ]

    const nextAsset = store.recalculateTargetProfit('a1')

    expect(nextAsset?.targetProfit).toBe(20)
    expect(nextAsset?.completionRate).toBe(50)
    expect(store.assetCount).toBe(1)
    expect(store.totalPlannedQuantity).toBe(5)
    expect(store.assetTargetProfit).toBe(20)
  })

  /** 覆盖保存动作。 */
  it('saves assets and syncs local asset list', async () => {
    const store = usePlanAssetStore()

    vi.spyOn(financialPlanApiClient, 'saveAssets').mockResolvedValue({
      code: '0',
      message: '',
      data: {
        planId: 'p1',
        items: [
          {
            assetId: 'a1',
            planId: 'p1',
            assetType: 'SAVINGS',
            assetCode: 'S-1',
            assetName: 'saving-a1',
            planBuyPrice: 1,
            planSellPrice: 1.2,
            planQuantity: 100,
            realizedQuantity: 0,
            openQuantity: 100,
            targetProfit: 20,
            actualProfit: 0,
            completionRate: 0,
            currency: 'CNY',
            sequenceNo: 1,
            version: 1,
          },
        ],
      },
    } as any)

    const result = await store.saveAssets('p1', { items: [] })

    expect(result?.items.length).toBe(1)
    expect(store.assetList[0].assetName).toBe('saving-a1')
  })

  /** 覆盖删除动作。 */
  it('removes local assets by assetId', () => {
    const store = usePlanAssetStore()
    store.assetList = [
      { assetId: 'a1' } as any,
      { assetId: 'a2' } as any,
    ]

    const removed = store.removeLocalAsset('a1')

    expect(removed).toBe(true)
    expect(store.assetList.map((item) => item.assetId)).toEqual(['a2'])
  })
})
