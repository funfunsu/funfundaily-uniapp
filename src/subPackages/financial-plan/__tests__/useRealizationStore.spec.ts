import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { financialPlanApiClient } from '../api'
import { useRealizationStore } from '../stores/useRealizationStore'
import { useFinancialPlanStatsStore } from '../stores/useFinancialPlanStatsStore'

describe('useRealizationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** 覆盖 createBatch 与统计刷新联动。 */
  it('creates realization batch and refreshes stats', async () => {
    const store = useRealizationStore()
    const statsStore = useFinancialPlanStatsStore()
    const refreshStatsSpy = vi.spyOn(statsStore, 'refreshStats').mockResolvedValue(null)

    vi.spyOn(financialPlanApiClient, 'createRealizationBatch').mockResolvedValue({
      code: '0',
      message: '',
      data: {
        batchId: 'b1',
        planId: 'p1',
        assetId: 'a1',
        quantity: 10,
        stageStatus: 'PENDING_BUY',
      },
    } as any)

    const result = await store.createBatch('p1', {
      assetId: 'a1',
      batchName: 'batch-1',
      quantity: 10,
      note: 'note-1',
    })

    expect(result?.batchId).toBe('b1')
    expect(store.batchList[0].batchName).toBe('batch-1')
    expect(store.selectedBatch?.batchId).toBe('b1')
    expect(refreshStatsSpy).toHaveBeenCalledWith('p1')
  })

  /** 覆盖 recordSell 与 getter 统计。 */
  it('records sell and updates completed getters', async () => {
    const store = useRealizationStore()
    const statsStore = useFinancialPlanStatsStore()
    vi.spyOn(statsStore, 'refreshStats').mockResolvedValue(null)

    store.batchList = [
      {
        batchId: 'b1',
        planId: 'p1',
        assetId: 'a1',
        batchName: 'batch-1',
        quantity: 3,
        stageStatus: 'PENDING_SELL',
        feeTotal: 0,
        version: 2,
      },
      {
        batchId: 'b2',
        planId: 'p1',
        assetId: 'a2',
        batchName: 'batch-2',
        quantity: 2,
        stageStatus: 'PENDING_BUY',
        feeTotal: 0,
        version: 1,
      },
    ] as any

    vi.spyOn(financialPlanApiClient, 'recordRealizationSell').mockResolvedValue({
      code: '0',
      message: '',
      data: {
        batchId: 'b1',
        stageStatus: 'COMPLETED',
        actualProfit: 20,
      },
    } as any)

    await store.recordSell('p1', 'b1', {
      tradeDate: '2026-02-01',
      actualSellPrice: 30,
      quantity: 3,
      fee: 2,
      note: 'sell-note',
      version: 2,
    })

    expect(store.batchList.find((item) => item.batchId === 'b1')?.stageStatus).toBe('COMPLETED')
    expect(store.completedBatches.length).toBe(1)
    expect(store.incompleteBatches.length).toBe(1)
    expect(store.realizedQuantity).toBe(5)
  })
})
