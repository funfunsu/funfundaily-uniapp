import { financialPlanErrorCode, type FinancialPlanErrorCode } from '../../../../../api/financial-plan'
import { FinancialPlanApiError } from '../api'

/**
 * 理财计划业务错误码到前端提示语映射。
 */
export const financialPlanErrorPromptMap: Record<FinancialPlanErrorCode, string> = {
  [financialPlanErrorCode.fpPermissionDenied]: '您暂无该家庭数据访问权限，请切换账号或联系管理员',
  [financialPlanErrorCode.fpValidationFailed]: '输入参数不完整或格式不正确，请检查后重试',
  [financialPlanErrorCode.fpWindowInvalid]: '计划时间窗口不合法，请确认开始和结束日期',
  [financialPlanErrorCode.fpTypeUnsupported]: '当前计划类型配置不支持，请检查计划类型与子类型',
  [financialPlanErrorCode.fpPlanNotFound]: '计划不存在或已被删除，请刷新后重试',
  [financialPlanErrorCode.fpVersionConflict]: '数据已被他人更新，请刷新后重试',
  [financialPlanErrorCode.fpAssetInvalid]: '标的参数非法，请检查价格与数量',
  [financialPlanErrorCode.fpAssetDuplicated]: '同一计划下标的重复，请调整后保存',
  [financialPlanErrorCode.fpAssetNotFound]: '标的不存在或已被删除，请刷新后重试',
  [financialPlanErrorCode.fpAssetQtyLtRealized]: '计划数量不能小于已兑现数量，请调整输入',
  [financialPlanErrorCode.fpRealizationQtyExceeded]: '兑现数量超过可用额度，请检查批次数量',
  [financialPlanErrorCode.fpBatchNotFound]: '兑现批次不存在，请刷新后重试',
  [financialPlanErrorCode.fpSellBeforeBuy]: '请先登记买入，再进行卖出登记',
  [financialPlanErrorCode.fpStageConflict]: '当前批次状态不允许该操作，请刷新后重试',
  [financialPlanErrorCode.fpPlanAlreadyArchived]: '计划已归档，当前不允许编辑',
  [financialPlanErrorCode.fpQueryInvalid]: '查询条件不合法，请调整筛选项后重试',
  [financialPlanErrorCode.fpStatCalcFailed]: '统计计算失败，请稍后重试',
}

/**
 * 将错误对象转换成面向用户的提示语。
 */
export function resolveFinancialPlanErrorPrompt(
  error: unknown,
  fallbackPrompt: string,
): string {
  if (error instanceof FinancialPlanApiError) {
    const matchedPrompt = financialPlanErrorPromptMap[error.code as FinancialPlanErrorCode]
    if (matchedPrompt) {
      return matchedPrompt
    }
    if (error.message) {
      return error.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackPrompt
}
