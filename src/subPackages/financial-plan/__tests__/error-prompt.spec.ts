import { describe, expect, it } from 'vitest'

import { financialPlanErrorCode } from '../../../../../api/financial-plan'
import { FinancialPlanApiError } from '../api'
import {
  financialPlanErrorPromptMap,
  resolveFinancialPlanErrorPrompt,
} from '../utils/errorPrompt'

describe('financial plan error prompt', () => {
  /**
   * 确保每个业务错误码都存在可展示提示。
   */
  it('covers all financial plan error codes with user prompt', () => {
    const codes = Object.values(financialPlanErrorCode)

    codes.forEach((code) => {
      expect(financialPlanErrorPromptMap[code]).toBeTruthy()
      expect(financialPlanErrorPromptMap[code].length).toBeGreaterThan(4)
    })
  })

  /**
   * 优先返回错误码映射提示。
   */
  it('resolves prompt by business error code first', () => {
    const error = new FinancialPlanApiError('raw message', 'FP_QUERY_INVALID', 'trace-1')
    const prompt = resolveFinancialPlanErrorPrompt(error, 'fallback')

    expect(prompt).toBe(financialPlanErrorPromptMap[financialPlanErrorCode.fpQueryInvalid])
  })

  /**
   * 对未知错误回退到错误信息或默认文案。
   */
  it('falls back gracefully for unknown errors', () => {
    expect(resolveFinancialPlanErrorPrompt(new Error('network down'), 'fallback')).toBe('network down')
    expect(resolveFinancialPlanErrorPrompt({}, 'fallback')).toBe('fallback')
  })
})
