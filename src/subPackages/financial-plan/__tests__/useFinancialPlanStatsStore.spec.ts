import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { financialPlanApiClient } from '../api'
import { useFinancialPlanStore } from '../stores/useFinancialPlanStore'
import { usePlanAssetStore } from '../stores/usePlanAssetStore'
import { useFinancialPlanStatsStore } from '../stores/useFinancialPlanStatsStore'

describe('useFinancialPlanStatsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** 覆盖 dashboard 加载与 getter。 */
  it('loads dashboard and exposes completion, warnings and gap getters', async () => {
    const store = useFinancialPlanStatsStore()

    vi.spyOn(financialPlanApiClient, 'getDashboard').mockResolvedValue({
      code: '0',
      message: '',
      data: {
        planSummary: {
          planId: 'p1',
          targetProfit: 100,
          actualProfit: 60,
          realizedQuantity: 5,
          plannedQuantity: 10,
          completionRate: 60,
          completedBatchCount: 1,
          incompleteBatchCount: 1,
        },
        assetSummaries: [
          {
            assetId: 'a1',
            assetCode: 'A1',
            assetName: 'asset-1',
            targetProfit: 40,
            actualProfit: 20,
            realizedQuantity: 2,
            plannedQuantity: 5,
            completionRate: 50,
          },
        ],
        progress: {
          planStatus: 'IN_PROGRESS',
          timeProgressRate: 30,
          quantityProgressRate: 50,
          profitProgressRate: 60,
          warningFlags: ['INCOMPLETE_BATCH'],
        },
      },
    } as any)

    await store.loadDashboard('p1')

    expect(store.completionRate).toBe(60)
    expect(store.warningFlags).toEqual(['INCOMPLETE_BATCH'])
    expect(store.actualVsTargetGap).toBe(-40)
  })

  /** 覆盖本地重算目标盈利。 */
  it('recalculates local target profit when asset list exists', () => {
    const statsStore = useFinancialPlanStatsStore()
    const assetStore = usePlanAssetStore()

    assetStore.assetList = [
      { assetId: 'a1', targetProfit: 30, planQuantity: 2 },
      { assetId: 'a2', targetProfit: 20, planQuantity: 3 },
    ] as any

    statsStore.summary = {
      planId: 'p1',
      targetProfit: 1,
      actualProfit: 10,
      realizedQuantity: 1,
      plannedQuantity: 1,
      completionRate: 100,
      completedBatchCount: 0,
      incompleteBatchCount: 0,
    }

    const result = statsStore.recalculateTargetProfit('p1')

    expect(result?.targetProfit).toBe(50)
    expect(result?.plannedQuantity).toBe(5)
    expect(result?.completionRate).toBe(20)
  })

  /** 覆盖 refreshStats 使用 currentPlanId 的分支。 */
  it('refreshes stats with current plan id when planId is omitted', async () => {
    const statsStore = useFinancialPlanStatsStore()
    const planStore = useFinancialPlanStore()
    planStore.currentPlanId = 'p-current'

    const dashboardSpy = vi.spyOn(statsStore, 'loadDashboard').mockResolvedValue(null)

    await statsStore.refreshStats()

    expect(dashboardSpy).toHaveBeenCalledWith('p-current')
  })
})
