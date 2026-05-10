import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import PlanAssetEditor from '../components/plan-asset-editor.vue'

function buildAsset(overrides: Record<string, unknown> = {}) {
  return {
    assetId: 'a1',
    planId: 'p1',
    assetType: 'STOCK',
    assetCode: '0001',
    assetName: 'asset-1',
    stockSubType: 'EQUITY',
    planBuyPrice: 10,
    planSellPrice: 12,
    planQuantity: 5,
    realizedQuantity: 2,
    openQuantity: 3,
    targetProfit: 10,
    actualProfit: 0,
    completionRate: 0,
    currency: 'CNY',
    sequenceNo: 1,
    version: 1,
    ...overrides,
  }
}

describe('plan-asset-editor', () => {
  /** 覆盖 INV-2：非法参数阻止保存。 */
  it('blocks update and shows toast when plan params are invalid', async () => {
    const wrapper = mount(PlanAssetEditor as any, {
      props: {
        editable: true,
        planType: 'STOCK',
        items: [buildAsset({ planBuyPrice: 0 })],
      },
    })

    const saveButton = wrapper.findAll('button').find((node) => node.text().includes('保存标的'))
    await saveButton?.trigger('click')

    expect((globalThis as any).uni.showToast).toHaveBeenCalled()
    expect(wrapper.emitted('update')).toBeUndefined()
  })

  /** 覆盖 INV-2：计划数量小于已兑现数量阻止保存。 */
  it('blocks update when planned quantity is lower than realized quantity', async () => {
    const wrapper = mount(PlanAssetEditor as any, {
      props: {
        editable: true,
        planType: 'STOCK',
        items: [buildAsset({ planQuantity: 1, realizedQuantity: 2 })],
      },
    })

    const saveButton = wrapper.findAll('button').find((node) => node.text().includes('保存标的'))
    await saveButton?.trigger('click')

    expect((globalThis as any).uni.showToast).toHaveBeenCalled()
    expect(wrapper.emitted('update')).toBeUndefined()
  })

  /** 覆盖有效参数保存与事件。 */
  it('emits update with normalized numeric fields for valid asset', async () => {
    const wrapper = mount(PlanAssetEditor as any, {
      props: {
        editable: true,
        planType: 'STOCK',
        items: [buildAsset()],
      },
    })

    const saveButton = wrapper.findAll('button').find((node) => node.text().includes('保存标的'))
    await saveButton?.trigger('click')

    const updateEvents = wrapper.emitted('update') || []
    expect(updateEvents.length).toBe(1)
    expect(updateEvents[0][0].planBuyPrice).toBe(10)
    expect(updateEvents[0][0].planSellPrice).toBe(12)
    expect(updateEvents[0][1]).toBe(0)
  })
})
