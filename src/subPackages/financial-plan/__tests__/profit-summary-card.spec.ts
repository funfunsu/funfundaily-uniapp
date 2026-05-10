import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProfitSummaryCard from '../components/profit-summary-card.vue'

describe('profit-summary-card', () => {
  /** 覆盖 props 渲染与告警标签映射。 */
  it('renders summary values and warning labels', () => {
    const wrapper = mount(ProfitSummaryCard as any, {
      props: {
        summary: {
          targetProfit: 100,
          actualProfit: 40,
          completionRate: 40,
          realizedQuantity: 6,
          plannedQuantity: 10,
          completedBatchCount: 1,
          incompleteBatchCount: 2,
        },
        progress: {
          timeProgressRate: 20,
          quantityProgressRate: 50,
          profitProgressRate: 40,
          warningFlags: ['OVER_WINDOW', 'INCOMPLETE_BATCH'],
        },
      },
    })

    const text = wrapper.text()
    expect(text).toContain('目标收益')
    expect(text).toContain('100')
    expect(text).toContain('已超出时间窗口')
    expect(text).toContain('存在未完成批次')
  })

  /** 覆盖查看详情事件。 */
  it('emits viewDetail when detail button is clicked', async () => {
    const wrapper = mount(ProfitSummaryCard as any, {
      props: {
        summary: null,
        progress: null,
      },
    })

    const button = wrapper.find('button')
    await button.trigger('click')

    expect((wrapper.emitted('viewDetail') || []).length).toBe(1)
  })
})
