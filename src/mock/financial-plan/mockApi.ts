import type {
  Api1FinancialPlanQueryRequest,
  Api1FinancialPlanQueryResponse,
  Api2CreateFinancialPlanRequest,
  Api2CreateFinancialPlanResponse,
  Api3UpdateFinancialPlanRequest,
  Api3UpdateFinancialPlanResponse,
  Api4SaveFinancialPlanAssetsRequest,
  Api4SaveFinancialPlanAssetsResponse,
  Api5UpdateFinancialPlanAssetParamsRequest,
  Api5UpdateFinancialPlanAssetParamsResponse,
  Api6CreateRealizationBatchRequest,
  Api6CreateRealizationBatchResponse,
  Api7RecordRealizationBuyRequest,
  Api7RecordRealizationBuyResponse,
  Api8RecordRealizationSellRequest,
  Api8RecordRealizationSellResponse,
  Api9GetFinancialPlanDetailResponse,
  Api10GetFinancialPlanDashboardResponse,
  Api11ArchiveFinancialPlanRequest,
  Api11ArchiveFinancialPlanResponse,
} from '../../../../api/financial-plan'

import type { AssetProfitSummary, FinancialPlan, FinancialPlanAsset, ProgressSnapshot } from '../../../../api/financial-plan-types'

import { financialPlanMockState, nextTraceId } from './data'

type Method = 'GET' | 'POST' | 'PUT'

interface MockEnvelope<T> {
  code: string
  message: string
  data: T
  traceId: string
}

const SUCCESS_CODE = '0'

/** 统一包装成功响应。 */
function ok<T>(data: T): MockEnvelope<T> {
  return {
    code: SUCCESS_CODE,
    message: 'success',
    data,
    traceId: nextTraceId(),
  }
}

/** 统一包装业务错误响应。 */
function bizError(code: string, message: string): MockEnvelope<null> {
  return {
    code,
    message,
    data: null,
    traceId: nextTraceId(),
  }
}

/** 安全转换数字，兜底返回 0。 */
function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** 当前 ISO 时间。 */
function nowIso(): string {
  return new Date().toISOString()
}

/** 计算标的目标盈利。 */
function calcAssetTargetProfit(asset: FinancialPlanAsset): number {
  return (asset.planSellPrice - asset.planBuyPrice) * asset.planQuantity
}

/** 计算某标的的实际盈利。 */
function calcAssetActualProfit(assetId: string): number {
  return financialPlanMockState.batches
    .filter((b) => b.assetId === assetId && b.stageStatus === 'COMPLETED')
    .reduce((sum, b) => sum + (b.actualProfit || 0), 0)
}

/** 计算某标的已兑现数量（按已完成批次累计）。 */
function calcAssetRealizedQuantity(assetId: string): number {
  return financialPlanMockState.batches
    .filter((b) => b.assetId === assetId && b.stageStatus === 'COMPLETED')
    .reduce((sum, b) => sum + b.quantity, 0)
}

/** 重算单个标的派生字段。 */
function refreshAsset(asset: FinancialPlanAsset): FinancialPlanAsset {
  const realized = calcAssetRealizedQuantity(asset.assetId)
  const targetProfit = calcAssetTargetProfit(asset)
  const actualProfit = calcAssetActualProfit(asset.assetId)
  const completionRate = asset.planQuantity > 0 ? realized / asset.planQuantity : 0

  return {
    ...asset,
    realizedQuantity: realized,
    openQuantity: Math.max(asset.planQuantity - realized, 0),
    targetProfit,
    actualProfit,
    completionRate,
  }
}

/** 按计划重算 plan 层统计字段。 */
function refreshPlan(plan: FinancialPlan): FinancialPlan {
  const assets = financialPlanMockState.assets
    .filter((asset) => asset.planId === plan.planId)
    .map((asset) => refreshAsset(asset))

  // 同步回 state
  assets.forEach((asset) => {
    const index = financialPlanMockState.assets.findIndex((a) => a.assetId === asset.assetId)
    if (index >= 0) {
      financialPlanMockState.assets[index] = asset
    }
  })

  const targetProfit = assets.reduce((sum, item) => sum + item.targetProfit, 0)
  const actualProfit = assets.reduce((sum, item) => sum + item.actualProfit, 0)
  const planQuantity = assets.reduce((sum, item) => sum + item.planQuantity, 0)
  const realizedQuantity = assets.reduce((sum, item) => sum + item.realizedQuantity, 0)
  const completionRate = planQuantity > 0 ? realizedQuantity / planQuantity : 0

  return {
    ...plan,
    targetProfit,
    actualProfit,
    completionRate,
    updatedAt: nowIso(),
  }
}

/** 生成计划 summary。 */
function buildPlanSummary(planId: string) {
  const assets = financialPlanMockState.assets.filter((asset) => asset.planId === planId).map((asset) => refreshAsset(asset))
  const batches = financialPlanMockState.batches.filter((batch) => batch.planId === planId)

  const targetProfit = assets.reduce((sum, item) => sum + item.targetProfit, 0)
  const actualProfit = assets.reduce((sum, item) => sum + item.actualProfit, 0)
  const plannedQuantity = assets.reduce((sum, item) => sum + item.planQuantity, 0)
  const realizedQuantity = assets.reduce((sum, item) => sum + item.realizedQuantity, 0)
  const completionRate = plannedQuantity > 0 ? realizedQuantity / plannedQuantity : 0

  return {
    planId,
    targetProfit,
    actualProfit,
    realizedQuantity,
    plannedQuantity,
    completionRate,
    completedBatchCount: batches.filter((batch) => batch.stageStatus === 'COMPLETED').length,
    incompleteBatchCount: batches.filter((batch) => batch.stageStatus !== 'COMPLETED').length,
  }
}

/** 生成资产 summary 列表。 */
function buildAssetSummaries(planId: string): AssetProfitSummary[] {
  return financialPlanMockState.assets
    .filter((asset) => asset.planId === planId)
    .map((asset) => {
      const refreshed = refreshAsset(asset)
      return {
        assetId: refreshed.assetId,
        assetCode: refreshed.assetCode,
        assetName: refreshed.assetName,
        targetProfit: refreshed.targetProfit,
        actualProfit: refreshed.actualProfit,
        realizedQuantity: refreshed.realizedQuantity,
        plannedQuantity: refreshed.planQuantity,
        completionRate: refreshed.completionRate,
      }
    })
}

/** 生成 progress 快照。 */
function buildProgress(plan: FinancialPlan): ProgressSnapshot {
  const now = new Date()
  const start = new Date(plan.startDate)
  const end = new Date(plan.endDate)
  const totalTime = Math.max(end.getTime() - start.getTime(), 1)
  const elapsedTime = Math.min(Math.max(now.getTime() - start.getTime(), 0), totalTime)
  const timeProgressRate = elapsedTime / totalTime

  const summary = buildPlanSummary(plan.planId)
  const quantityProgressRate = summary.plannedQuantity > 0 ? summary.realizedQuantity / summary.plannedQuantity : 0
  const profitProgressRate = summary.targetProfit > 0 ? summary.actualProfit / summary.targetProfit : 0

  const warningFlags: ProgressSnapshot['warningFlags'] = []
  if (now > end && quantityProgressRate < 1) {
    warningFlags.push('OVER_WINDOW')
  }
  if (summary.incompleteBatchCount > 0) {
    warningFlags.push('INCOMPLETE_BATCH')
  }
  if (quantityProgressRate >= 1) {
    warningFlags.push('QUANTITY_REACHED')
  }

  let planStatus: ProgressSnapshot['planStatus'] = 'NOT_STARTED'
  if (quantityProgressRate >= 1) {
    planStatus = 'COMPLETED'
  } else if (quantityProgressRate > 0) {
    planStatus = 'IN_PROGRESS'
  }

  return {
    planStatus,
    timeProgressRate,
    quantityProgressRate,
    profitProgressRate,
    warningFlags,
  }
}

/** 根据 planId 加载计划，不存在返回错误 envelope。 */
function requirePlan(planId: string): FinancialPlan | MockEnvelope<null> {
  const plan = financialPlanMockState.plans.find((item) => item.planId === planId)
  if (!plan) {
    return bizError('FP_PLAN_NOT_FOUND', `planId=${planId} not found`)
  }
  return plan
}

/** 匹配 /api/financial-plans/{planId} 风格路径。 */
function extractPathParams(url: string): { planId?: string; assetId?: string; batchId?: string } {
  const parts = url.split('/').filter(Boolean)
  const result: { planId?: string; assetId?: string; batchId?: string } = {}

  const planIndex = parts.indexOf('financial-plans')
  if (planIndex >= 0 && parts[planIndex + 1]) {
    result.planId = decodeURIComponent(parts[planIndex + 1])
  }

  const assetIndex = parts.indexOf('assets')
  if (assetIndex >= 0 && parts[assetIndex + 1] && parts[assetIndex + 1] !== 'save') {
    result.assetId = decodeURIComponent(parts[assetIndex + 1])
  }

  const realizationIndex = parts.indexOf('realizations')
  if (realizationIndex >= 0 && parts[realizationIndex + 1] && parts[realizationIndex + 1] !== 'buy' && parts[realizationIndex + 1] !== 'sell') {
    result.batchId = decodeURIComponent(parts[realizationIndex + 1])
  }

  return result
}

/** API-1：分页查询。 */
function handleQueryPlans(request: Api1FinancialPlanQueryRequest): MockEnvelope<Api1FinancialPlanQueryResponse> {
  let list = [...financialPlanMockState.plans]

  if (request.groupId) {
    list = list.filter((item) => item.groupId === request.groupId)
  }
  if (request.ownerUserId) {
    list = list.filter((item) => item.ownerUserId === request.ownerUserId)
  }
  if (request.keyword) {
    const keyword = request.keyword.toLowerCase()
    list = list.filter((item) => item.planName.toLowerCase().includes(keyword))
  }
  if (request.planType) {
    list = list.filter((item) => item.planType === request.planType)
  }
  if (request.executionStatus) {
    list = list.filter((item) => item.status === request.executionStatus)
  }
  if (request.timeRangeType) {
    list = list.filter((item) => item.timeRangeType === request.timeRangeType)
  }

  const pageNo = Math.max(toNumber(request.pageNo), 1)
  const pageSize = Math.max(toNumber(request.pageSize), 1)
  const start = (pageNo - 1) * pageSize
  const paged = list.slice(start, start + pageSize)

  return ok({
    list,
    total: list.length,
    pageNo,
    pageSize,
    ...{ list: paged },
  })
}

/** API-2：创建计划。 */
function handleCreatePlan(request: Api2CreateFinancialPlanRequest): MockEnvelope<Api2CreateFinancialPlanResponse> {
  const planId = String(financialPlanMockState.nextPlanId++)
  const now = nowIso()

  const plan: FinancialPlan = {
    planId,
    groupId: request.groupId,
    ownerUserId: request.ownerUserId,
    planName: request.planName,
    planType: request.planType,
    stockSubType: request.stockSubType,
    status: 'DRAFT',
    timeRangeType: request.timeRangeType,
    fiscalYear: request.fiscalYear,
    startDate: request.startDate || `${request.fiscalYear || new Date().getFullYear()}-01-01`,
    endDate: request.endDate || `${request.fiscalYear || new Date().getFullYear()}-12-31`,
    remark: request.remark,
    targetProfit: 0,
    actualProfit: 0,
    completionRate: 0,
    version: 0,
    createdAt: now,
    updatedAt: now,
  }

  financialPlanMockState.plans.unshift(plan)

  return ok({
    planId,
    status: plan.status,
    version: plan.version,
  })
}

/** API-3：更新计划。 */
function handleUpdatePlan(planId: string, request: Api3UpdateFinancialPlanRequest): MockEnvelope<Api3UpdateFinancialPlanResponse> {
  const plan = requirePlan(planId)
  if ('code' in plan) {
    return plan
  }

  if (plan.version !== request.version) {
    return bizError('FP_VERSION_CONFLICT', `planId=${planId} version mismatch`)
  }

  if (plan.status === 'ARCHIVED') {
    return bizError('FP_PLAN_ALREADY_ARCHIVED', `planId=${planId} archived`)
  }

  const updated = refreshPlan({
    ...plan,
    planName: request.planName,
    status: request.status,
    timeRangeType: request.timeRangeType,
    fiscalYear: request.fiscalYear,
    startDate: request.startDate || plan.startDate,
    endDate: request.endDate || plan.endDate,
    remark: request.remark,
    version: plan.version + 1,
  })

  const index = financialPlanMockState.plans.findIndex((item) => item.planId === planId)
  financialPlanMockState.plans[index] = updated

  return ok({
    planId: updated.planId,
    status: updated.status,
    version: updated.version,
  })
}

/** API-4：批量保存标的。 */
function handleSaveAssets(planId: string, request: Api4SaveFinancialPlanAssetsRequest): MockEnvelope<Api4SaveFinancialPlanAssetsResponse> {
  const plan = requirePlan(planId)
  if ('code' in plan) {
    return plan
  }

  request.items.forEach((item) => {
    const existing = item.assetId
      ? financialPlanMockState.assets.find((asset) => asset.assetId === item.assetId && asset.planId === planId)
      : undefined

    if (existing) {
      existing.assetType = item.assetType
      existing.assetCode = item.assetCode
      existing.assetName = item.assetName
      existing.planBuyPrice = toNumber(item.planBuyPrice)
      existing.planSellPrice = toNumber(item.planSellPrice)
      existing.planQuantity = toNumber(item.planQuantity)
      existing.currency = item.currency
      existing.sequenceNo = item.sequenceNo
      existing.version += 1
    } else {
      const newAsset: FinancialPlanAsset = {
        assetId: String(financialPlanMockState.nextAssetId++),
        planId,
        assetType: item.assetType,
        assetCode: item.assetCode,
        assetName: item.assetName,
        stockSubType: item.assetType === 'STOCK' ? plan.stockSubType : undefined,
        planBuyPrice: toNumber(item.planBuyPrice),
        planSellPrice: toNumber(item.planSellPrice),
        planQuantity: toNumber(item.planQuantity),
        realizedQuantity: 0,
        openQuantity: toNumber(item.planQuantity),
        targetProfit: 0,
        actualProfit: 0,
        completionRate: 0,
        currency: item.currency,
        sequenceNo: item.sequenceNo,
        version: 0,
      }
      financialPlanMockState.assets.push(newAsset)
    }
  })

  const assets = financialPlanMockState.assets
    .filter((asset) => asset.planId === planId)
    .sort((a, b) => a.sequenceNo - b.sequenceNo)
    .map((asset) => refreshAsset(asset))

  const planIndex = financialPlanMockState.plans.findIndex((item) => item.planId === planId)
  financialPlanMockState.plans[planIndex] = refreshPlan(financialPlanMockState.plans[planIndex])

  return ok({
    planId,
    items: assets,
  })
}

/** API-5：调整标的参数。 */
function handleUpdateAssetParams(
  planId: string,
  assetId: string,
  request: Api5UpdateFinancialPlanAssetParamsRequest,
): MockEnvelope<Api5UpdateFinancialPlanAssetParamsResponse> {
  const plan = requirePlan(planId)
  if ('code' in plan) {
    return plan
  }

  const asset = financialPlanMockState.assets.find((item) => item.planId === planId && item.assetId === assetId)
  if (!asset) {
    return bizError('FP_ASSET_NOT_FOUND', `assetId=${assetId} not found`)
  }

  if (asset.version !== request.version) {
    return bizError('FP_VERSION_CONFLICT', `assetId=${assetId} version mismatch`)
  }

  asset.planBuyPrice = toNumber(request.planBuyPrice)
  asset.planSellPrice = toNumber(request.planSellPrice)
  asset.planQuantity = toNumber(request.planQuantity)
  asset.version += 1

  const refreshed = refreshAsset(asset)
  const index = financialPlanMockState.assets.findIndex((item) => item.assetId === assetId)
  financialPlanMockState.assets[index] = refreshed

  const planIndex = financialPlanMockState.plans.findIndex((item) => item.planId === planId)
  financialPlanMockState.plans[planIndex] = refreshPlan(financialPlanMockState.plans[planIndex])

  return ok({
    assetId: refreshed.assetId,
    planBuyPrice: refreshed.planBuyPrice,
    planSellPrice: refreshed.planSellPrice,
    planQuantity: refreshed.planQuantity,
    targetProfit: refreshed.targetProfit,
  })
}

/** API-6：新增批次。 */
function handleCreateBatch(planId: string, request: Api6CreateRealizationBatchRequest): MockEnvelope<Api6CreateRealizationBatchResponse> {
  const plan = requirePlan(planId)
  if ('code' in plan) {
    return plan
  }

  const asset = financialPlanMockState.assets.find((item) => item.planId === planId && item.assetId === request.assetId)
  if (!asset) {
    return bizError('FP_ASSET_NOT_FOUND', `assetId=${request.assetId} not found`)
  }

  const quantity = toNumber(request.quantity)
  if (quantity <= 0 || quantity > Math.max(asset.planQuantity - asset.realizedQuantity, 0)) {
    return bizError('FP_REALIZATION_QTY_EXCEEDED', 'batch quantity exceeded')
  }

  const batch: RealizationBatch = {
    batchId: String(financialPlanMockState.nextBatchId++),
    planId,
    assetId: request.assetId,
    batchName: request.batchName,
    quantity,
    stageStatus: 'PENDING_BUY',
    feeTotal: 0,
    note: request.note,
    version: 0,
  }

  financialPlanMockState.batches.unshift(batch)

  return ok({
    batchId: batch.batchId,
    planId,
    assetId: batch.assetId,
    quantity: batch.quantity,
    stageStatus: batch.stageStatus,
  })
}

/** API-7：登记买入。 */
function handleRecordBuy(
  planId: string,
  batchId: string,
  request: Api7RecordRealizationBuyRequest,
): MockEnvelope<Api7RecordRealizationBuyResponse> {
  const plan = requirePlan(planId)
  if ('code' in plan) {
    return plan
  }

  const batch = financialPlanMockState.batches.find((item) => item.planId === planId && item.batchId === batchId)
  if (!batch) {
    return bizError('FP_BATCH_NOT_FOUND', `batchId=${batchId} not found`)
  }

  if (batch.version !== request.version) {
    return bizError('FP_VERSION_CONFLICT', `batchId=${batchId} version mismatch`)
  }

  const quantity = toNumber(request.quantity)
  if (quantity <= 0 || quantity > batch.quantity) {
    return bizError('FP_REALIZATION_QTY_EXCEEDED', 'buy quantity exceeded batch quantity')
  }

  batch.actualBuyPrice = toNumber(request.actualBuyPrice)
  batch.actualBuyAmount = batch.actualBuyPrice * quantity
  batch.buyTradeDate = request.tradeDate
  batch.feeTotal = toNumber(request.fee)
  batch.stageStatus = 'PENDING_SELL'
  batch.version += 1

  return ok({
    batchId: batch.batchId,
    stageStatus: batch.stageStatus,
    actualBuyAmount: batch.actualBuyAmount,
  })
}

/** API-8：登记卖出。 */
function handleRecordSell(
  planId: string,
  batchId: string,
  request: Api8RecordRealizationSellRequest,
): MockEnvelope<Api8RecordRealizationSellResponse> {
  const plan = requirePlan(planId)
  if ('code' in plan) {
    return plan
  }

  const batch = financialPlanMockState.batches.find((item) => item.planId === planId && item.batchId === batchId)
  if (!batch) {
    return bizError('FP_BATCH_NOT_FOUND', `batchId=${batchId} not found`)
  }

  if (!batch.actualBuyPrice || !batch.actualBuyAmount) {
    return bizError('FP_SELL_BEFORE_BUY', 'sell before buy is not allowed')
  }

  if (batch.version !== request.version) {
    return bizError('FP_VERSION_CONFLICT', `batchId=${batchId} version mismatch`)
  }

  const quantity = toNumber(request.quantity)
  if (quantity <= 0 || quantity > batch.quantity) {
    return bizError('FP_REALIZATION_QTY_EXCEEDED', 'sell quantity exceeded batch quantity')
  }

  batch.actualSellPrice = toNumber(request.actualSellPrice)
  batch.actualSellAmount = batch.actualSellPrice * quantity
  batch.sellTradeDate = request.tradeDate
  batch.feeTotal += toNumber(request.fee)
  batch.actualProfit = batch.actualSellAmount - batch.actualBuyAmount - batch.feeTotal
  batch.stageStatus = 'COMPLETED'
  batch.version += 1

  const asset = financialPlanMockState.assets.find((item) => item.assetId === batch.assetId)
  if (asset) {
    const refreshed = refreshAsset(asset)
    const assetIndex = financialPlanMockState.assets.findIndex((item) => item.assetId === asset.assetId)
    financialPlanMockState.assets[assetIndex] = refreshed
  }

  const planIndex = financialPlanMockState.plans.findIndex((item) => item.planId === planId)
  financialPlanMockState.plans[planIndex] = refreshPlan(financialPlanMockState.plans[planIndex])

  return ok({
    batchId: batch.batchId,
    stageStatus: batch.stageStatus,
    actualProfit: batch.actualProfit || 0,
  })
}

/** API-9：详情。 */
function handleGetPlanDetail(planId: string): MockEnvelope<Api9GetFinancialPlanDetailResponse> {
  const plan = requirePlan(planId)
  if ('code' in plan) {
    return plan
  }

  const refreshedPlan = refreshPlan(plan)
  const planIndex = financialPlanMockState.plans.findIndex((item) => item.planId === planId)
  financialPlanMockState.plans[planIndex] = refreshedPlan

  const assets = financialPlanMockState.assets
    .filter((asset) => asset.planId === planId)
    .sort((a, b) => a.sequenceNo - b.sequenceNo)
    .map((asset) => refreshAsset(asset))

  const batches = financialPlanMockState.batches
    .filter((batch) => batch.planId === planId)
    .sort((a, b) => (a.batchId > b.batchId ? -1 : 1))

  return ok({
    plan: refreshedPlan,
    assets,
    realizationBatches: batches,
    summary: buildPlanSummary(planId),
  })
}

/** API-10：看板。 */
function handleGetDashboard(planId: string): MockEnvelope<Api10GetFinancialPlanDashboardResponse> {
  const plan = requirePlan(planId)
  if ('code' in plan) {
    return plan
  }

  const refreshedPlan = refreshPlan(plan)
  const planIndex = financialPlanMockState.plans.findIndex((item) => item.planId === planId)
  financialPlanMockState.plans[planIndex] = refreshedPlan

  return ok({
    planSummary: buildPlanSummary(planId),
    assetSummaries: buildAssetSummaries(planId),
    progress: buildProgress(refreshedPlan),
  })
}

/** API-11：归档计划。 */
function handleArchivePlan(
  planId: string,
  request: Api11ArchiveFinancialPlanRequest,
): MockEnvelope<Api11ArchiveFinancialPlanResponse> {
  const plan = requirePlan(planId)
  if ('code' in plan) {
    return plan
  }

  if (plan.version !== request.version) {
    return bizError('FP_VERSION_CONFLICT', `planId=${planId} version mismatch`)
  }

  if (plan.status === 'ARCHIVED') {
    return bizError('FP_PLAN_ALREADY_ARCHIVED', `planId=${planId} archived`)
  }

  const updated: FinancialPlan = {
    ...refreshPlan({ ...plan, status: 'ARCHIVED', version: plan.version + 1 }),
    status: 'ARCHIVED',
  }

  const index = financialPlanMockState.plans.findIndex((item) => item.planId === planId)
  financialPlanMockState.plans[index] = updated

  return ok({
    planId: updated.planId,
    status: updated.status,
  })
}

/**
 * 理财计划离线 Mock 请求处理器。
 *
 * 目前覆盖 API-1 ~ API-10 的核心路径，支持“创建计划→保存标的→创建批次→买入→卖出→详情/看板”主链路。
 */
export function handleFinancialPlanMockRequest(method: Method, url: string, data?: unknown): MockEnvelope<any> {
  const pureUrl = url.split('?')[0]
  const params = extractPathParams(pureUrl)

  if (method === 'POST' && pureUrl === '/api/financial-plans/query') {
    return handleQueryPlans(data as Api1FinancialPlanQueryRequest)
  }
  if (method === 'POST' && pureUrl === '/api/financial-plans') {
    return handleCreatePlan(data as Api2CreateFinancialPlanRequest)
  }
  if (method === 'PUT' && params.planId && pureUrl === `/api/financial-plans/${params.planId}`) {
    return handleUpdatePlan(params.planId, data as Api3UpdateFinancialPlanRequest)
  }
  if (method === 'POST' && params.planId && pureUrl === `/api/financial-plans/${params.planId}/assets/save`) {
    return handleSaveAssets(params.planId, data as Api4SaveFinancialPlanAssetsRequest)
  }
  if (
    method === 'PUT' &&
    params.planId &&
    params.assetId &&
    pureUrl === `/api/financial-plans/${params.planId}/assets/${params.assetId}`
  ) {
    return handleUpdateAssetParams(params.planId, params.assetId, data as Api5UpdateFinancialPlanAssetParamsRequest)
  }
  if (method === 'POST' && params.planId && pureUrl === `/api/financial-plans/${params.planId}/realizations`) {
    return handleCreateBatch(params.planId, data as Api6CreateRealizationBatchRequest)
  }
  if (
    method === 'POST' &&
    params.planId &&
    params.batchId &&
    pureUrl === `/api/financial-plans/${params.planId}/realizations/${params.batchId}/buy`
  ) {
    return handleRecordBuy(params.planId, params.batchId, data as Api7RecordRealizationBuyRequest)
  }
  if (
    method === 'POST' &&
    params.planId &&
    params.batchId &&
    pureUrl === `/api/financial-plans/${params.planId}/realizations/${params.batchId}/sell`
  ) {
    return handleRecordSell(params.planId, params.batchId, data as Api8RecordRealizationSellRequest)
  }
  if (method === 'GET' && params.planId && pureUrl === `/api/financial-plans/${params.planId}`) {
    return handleGetPlanDetail(params.planId)
  }
  if (method === 'GET' && params.planId && pureUrl === `/api/financial-plans/${params.planId}/dashboard`) {
    return handleGetDashboard(params.planId)
  }
  if (method === 'DELETE' && params.planId && pureUrl === `/api/financial-plans/${params.planId}`) {
    return handleArchivePlan(params.planId, data as Api11ArchiveFinancialPlanRequest)
  }

  return bizError('FP_QUERY_INVALID', `mock endpoint not supported: ${method} ${pureUrl}`)
}
