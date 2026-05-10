import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import RealizationBatchList from '../components/realization-batch-list.vue'

function buildBatch(overrides: Record<string, unknown> = {}) {
  return {
    batchId: 'b1',
    planId: 'p1',
    assetId: 'a1',
    batchName: 'batch-1',
    quantity: 5,
    stageStatus: 'PENDING_BUY',
    feeTotal: 0,
    version: 1,
    ...overrides,
  }
}

describe('realization-batch-list', () => {
  /** 覆盖 INV-3/INV-4：分阶段状态文本与未完成结算提示。 */
  it('renders pending and incomplete timeline labels for unresolved batches', () => {
    const wrapper = mount(RealizationBatchList as any, {
      props: {
        readonly: true,
        batches: [buildBatch({ stageStatus: 'PENDING_SELL' })],
        assetMap: { a1: 'asset-1' },
      },
    })

    const text = wrapper.text()
    expect(text).toContain('待卖出')
    expect(text).toContain('等待卖出登记')
    expect(text).toContain('未完成，暂不结算')
  })

  /** 覆盖 INV-4：完成批次缺少卖出记录时显示异常提示。 */
  it('renders completed warning when sell record is missing', () => {
    const wrapper = mount(RealizationBatchList as any, {
      props: {
        readonly: true,
        batches: [buildBatch({ stageStatus: 'COMPLETED', buyTradeDate: '2026-01-01' })],
        assetMap: { a1: 'asset-1' },
      },
    })

    expect(wrapper.text()).toContain('卖出记录缺失')
    expect(wrapper.text()).toContain('等待刷新统计')
  })

  /** 覆盖事件触发。 */
  it('emits create and edit events in editable mode', async () => {
    const wrapper = mount(RealizationBatchList as any, {
      props: {
        readonly: false,
        batches: [buildBatch()],
        assetMap: { a1: 'asset-1' },
      },
    })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')
    await buttons[3].trigger('click')

    expect((wrapper.emitted('createBatch') || []).length).toBe(1)
    expect((wrapper.emitted('editBuy') || []).length).toBe(1)
    expect((wrapper.emitted('editSell') || []).length).toBe(1)
    expect((wrapper.emitted('viewHistory') || []).length).toBe(1)
  })
})
