import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { FinancialPlanApiError, financialPlanApiClient } from '../api'
import { useFinancialPlanStore } from '../stores/useFinancialPlanStore'

describe('useFinancialPlanStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** 校验查询与 getter 的主路径。 */
  it('queries plan list and derives active or archived getters', async () => {
    const store = useFinancialPlanStore()

    vi.spyOn(financialPlanApiClient, 'queryPlans').mockResolvedValue({
      code: '0',
      message: '',
      data: {
        list: [
          {
            planId: 'p-active',
            groupId: 'g1',
            ownerUserId: 'u1',
            planName: 'active-plan',
            planType: 'SAVINGS',
            status: 'ACTIVE',
            timeRangeType: 'CUSTOM',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            targetProfit: 100,
            actualProfit: 10,
            completionRate: 10,
            updatedAt: '2026-01-01T00:00:00Z',
          },
          {
            planId: 'p-archived',
            groupId: 'g1',
            ownerUserId: 'u1',
            planName: 'archived-plan',
            planType: 'STOCK',
            status: 'ARCHIVED',
            timeRangeType: 'YEAR',
            fiscalYear: 2026,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            targetProfit: 200,
            actualProfit: 0,
            completionRate: 0,
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
        total: 2,
        pageNo: 1,
        pageSize: 10,
      },
    } as any)

    const result = await store.queryPlans({ groupId: 'g1', pageNo: 1, pageSize: 10 })

    expect(result?.total).toBe(2)
    expect(store.total).toBe(2)
    expect(store.activePlans.map((item) => item.planId)).toEqual(['p-active'])
    expect(store.archivedPlans.map((item) => item.planId)).toEqual(['p-archived'])
  })

  /** 校验详情加载会同步 selectedPlan。 */
  it('loads plan detail and exposes selectedPlan from detail cache', async () => {
    const store = useFinancialPlanStore()

    vi.spyOn(financialPlanApiClient, 'getPlanDetail').mockResolvedValue({
      code: '0',
      message: '',
      data: {
        plan: {
          planId: 'p1',
          groupId: 'g1',
          ownerUserId: 'u1',
          planName: 'detail-plan',
          planType: 'SAVINGS',
          status: 'ACTIVE',
          timeRangeType: 'CUSTOM',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          targetProfit: 80,
          actualProfit: 20,
          completionRate: 25,
          version: 1,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
        },
        assets: [],
        realizationBatches: [],
        summary: {
          planId: 'p1',
          targetProfit: 80,
          actualProfit: 20,
          realizedQuantity: 0,
          plannedQuantity: 0,
          completionRate: 25,
          completedBatchCount: 0,
          incompleteBatchCount: 0,
        },
      },
    } as any)

    await store.loadPlanDetail('p1')

    expect(store.currentPlanId).toBe('p1')
    expect((store.selectedPlan as any).plan.planName).toBe('detail-plan')
  })

  /** 至少包含一个错误码处理用例。 */
  it('handles financial plan api errors and returns null', async () => {
    const store = useFinancialPlanStore()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    vi.spyOn(financialPlanApiClient, 'queryPlans').mockRejectedValue(
      new FinancialPlanApiError('bad query', 'FP_QUERY_INVALID', 'trace-1'),
    )

    const result = await store.queryPlans({ groupId: 'g1', pageNo: 1, pageSize: 10 })

    expect(result).toBeNull()
    expect((globalThis as any).uni.showToast).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
  })
})
