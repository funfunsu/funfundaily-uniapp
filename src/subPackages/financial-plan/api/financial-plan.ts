import type {
  AssetMarket,
  AssetProfitSummary,
  BatchDirection,
  BatchStats,
  BatchType,
  ExerciseAction,
  FinancialPlan,
  FinancialPlanAsset,
  FinancialPlanListItem,
  InstrumentType,
  OptionType,
  PlanStatus,
  PlanType,
  ProfitSummary,
  ProgressSnapshot,
  RealizationBatch,
  RealizationOperation,
  StageStatus,
  StockSubType,
  TimeRangeType,
} from './financial-plan-types'

export const httpMethod = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  delete: 'DELETE',
} as const

export type HttpMethod = (typeof httpMethod)[keyof typeof httpMethod]

export const financialPlanErrorCode = {
  fpPermissionDenied: 'FP_PERMISSION_DENIED',
  fpValidationFailed: 'FP_VALIDATION_FAILED',
  fpWindowInvalid: 'FP_WINDOW_INVALID',
  fpTypeUnsupported: 'FP_TYPE_UNSUPPORTED',
  fpPlanNotFound: 'FP_PLAN_NOT_FOUND',
  fpVersionConflict: 'FP_VERSION_CONFLICT',
  fpAssetInvalid: 'FP_ASSET_INVALID',
  fpAssetDuplicated: 'FP_ASSET_DUPLICATED',
  fpAssetNotFound: 'FP_ASSET_NOT_FOUND',
  fpAssetQtyLtRealized: 'FP_ASSET_QTY_LT_REALIZED',
  fpRealizationQtyExceeded: 'FP_REALIZATION_QTY_EXCEEDED',
  fpBatchNotFound: 'FP_BATCH_NOT_FOUND',
  fpSellBeforeBuy: 'FP_SELL_BEFORE_BUY',
  fpStageConflict: 'FP_STAGE_CONFLICT',
  fpPlanAlreadyArchived: 'FP_PLAN_ALREADY_ARCHIVED',
  fpQueryInvalid: 'FP_QUERY_INVALID',
  fpStatCalcFailed: 'FP_STAT_CALC_FAILED',
} as const

export type FinancialPlanErrorCode =
  (typeof financialPlanErrorCode)[keyof typeof financialPlanErrorCode]

export interface ApiResponseEnvelope<TData> {
  code: string
  message: string
  data: TData
}

export interface PlanMutationResult {
  planId: string
  status: PlanStatus
  version: number
}

export interface Api1FinancialPlanQueryRequest {
  groupId: string
  ownerUserId?: string
  keyword?: string
  planType?: PlanType
  executionStatus?: PlanStatus
  timeRangeType?: TimeRangeType
  startDate?: string
  endDate?: string
  pageNo: number
  pageSize: number
}

export interface Api1FinancialPlanQueryResponse {
  list: FinancialPlanListItem[]
  total: number
  pageNo: number
  pageSize: number
}

export const api1FinancialPlanQueryUrl = '/api/financial-plans/query'
export const api1FinancialPlanQueryMethod = httpMethod.post

export interface Api2CreateFinancialPlanRequest {
  groupId: string
  ownerUserId: string
  planName: string
  planType: PlanType
  stockSubType?: StockSubType
  timeRangeType: TimeRangeType
  fiscalYear?: number
  startDate?: string
  endDate?: string
  remark?: string
  /** 用户设定的目标盈利。 */
  targetProfit?: number
}

export type Api2CreateFinancialPlanResponse = PlanMutationResult

export const api2CreateFinancialPlanUrl = '/api/financial-plans'
export const api2CreateFinancialPlanMethod = httpMethod.post

export interface Api3UpdateFinancialPlanRequest {
  planName: string
  status: PlanStatus
  timeRangeType: TimeRangeType
  fiscalYear?: number
  startDate?: string
  endDate?: string
  remark?: string
  /** 用户设定的目标盈利。 */
  targetProfit?: number
  version: number
}

export type Api3UpdateFinancialPlanResponse = PlanMutationResult

export const api3UpdateFinancialPlanUrl = '/api/financial-plans/{planId}'
export const api3UpdateFinancialPlanMethod = httpMethod.put

export interface Api4SaveFinancialPlanAssetsItem {
  assetId?: string
  stockName: string
  market: AssetMarket
  targetProfit: number
  sequenceNo: number
}

export interface Api4SaveFinancialPlanAssetsRequest {
  items: Api4SaveFinancialPlanAssetsItem[]
}

export interface Api4SaveFinancialPlanAssetsResponse {
  planId: string
  items: FinancialPlanAsset[]
}

export const api4SaveFinancialPlanAssetsUrl =
  '/api/financial-plans/{planId}/assets/save'
export const api4SaveFinancialPlanAssetsMethod = httpMethod.post

export interface Api5UpdateFinancialPlanAssetParamsRequest {
  stockName: string
  market: AssetMarket
  targetProfit: number
  version: number
}

export interface Api5UpdateFinancialPlanAssetParamsResponse {
  assetId: string
  stockName: string
  market: AssetMarket
  targetProfit: number
  version: number
}

export const api5UpdateFinancialPlanAssetParamsUrl =
  '/api/financial-plans/{planId}/assets/{assetId}'
export const api5UpdateFinancialPlanAssetParamsMethod = httpMethod.put

export interface Api6CreateRealizationBatchRequest {
  assetId: string
  /** 批次只挂正股；该字段保留兼容，后端恒按 EQUITY 处理。 */
  batchType?: BatchType
  /** @deprecated 期权下沉到操作层，批次不再带方向。 */
  direction?: BatchDirection
  batchName?: string
  quantity: number
  planBuyPrice: number
  planSellPrice: number
  /** @deprecated 期权到期下沉到操作层。 */
  expirationDate?: string
  note?: string
}

export interface Api6CreateRealizationBatchResponse {
  batchId: string
  planId: string
  assetId: string
  quantity: number
  stageStatus: StageStatus
}

export const api6CreateRealizationBatchUrl =
  '/api/financial-plans/{planId}/realizations'
export const api6CreateRealizationBatchMethod = httpMethod.post

export interface Api7RecordRealizationBuyRequest {
  /** STOCK（默认）/ OPTION。 */
  instrument?: InstrumentType
  tradeDate: string
  /** OPTION 时可为 0。 */
  actualBuyPrice: number
  /** STOCK >0，OPTION ≠0（可为负）。 */
  quantity: number
  fee?: number
  /** 仅 OPTION 必填。 */
  optionType?: OptionType
  /** 仅 OPTION 必填：目标价格。 */
  strikePrice?: number
  /** 仅 OPTION 必填：到期时间。 */
  expirationDate?: string
  note?: string
}

export interface Api7RecordRealizationBuyResponse {
  batchId: string
  stageStatus: StageStatus
  actualBuyAmount: number
}

export const api7RecordRealizationBuyUrl =
  '/api/financial-plans/{planId}/realizations/{batchId}/buy'
export const api7RecordRealizationBuyMethod = httpMethod.post

export interface Api8RecordRealizationSellRequest {
  /** STOCK（默认）/ OPTION。 */
  instrument?: InstrumentType
  tradeDate: string
  /** OPTION 时可为 0。 */
  actualSellPrice: number
  /** STOCK >0，OPTION ≠0（可为负）。 */
  quantity: number
  fee?: number
  /** 仅 OPTION 必填。 */
  optionType?: OptionType
  /** 仅 OPTION 必填：目标价格。 */
  strikePrice?: number
  /** 仅 OPTION 必填：到期时间。 */
  expirationDate?: string
  note?: string
}

export interface Api8RecordRealizationSellResponse {
  batchId: string
  stageStatus: StageStatus
  actualProfit: number
}

export const api8RecordRealizationSellUrl =
  '/api/financial-plans/{planId}/realizations/{batchId}/sell'
export const api8RecordRealizationSellMethod = httpMethod.post

export interface Api9GetFinancialPlanDetailRequest {}

export interface Api9GetFinancialPlanDetailResponse {
  plan: FinancialPlan
  assets: FinancialPlanAsset[]
  realizationBatches: RealizationBatch[]
  summary: ProfitSummary
  /** 各批次卡片汇总，顺序与 realizationBatches 一致。 */
  batchStats?: BatchStats[]
}

export const api9GetFinancialPlanDetailUrl = '/api/financial-plans/{planId}'
export const api9GetFinancialPlanDetailMethod = httpMethod.get

export interface Api10GetFinancialPlanDashboardRequest {}

export interface Api10GetFinancialPlanDashboardResponse {
  planSummary: ProfitSummary
  assetSummaries: AssetProfitSummary[]
  progress: ProgressSnapshot
}

export const api10GetFinancialPlanDashboardUrl =
  '/api/financial-plans/{planId}/dashboard'
export const api10GetFinancialPlanDashboardMethod = httpMethod.get

export interface Api11ArchiveFinancialPlanRequest {
  version: number
}

export interface Api11ArchiveFinancialPlanResponse {
  planId: string
  status: PlanStatus
}

export const api11ArchiveFinancialPlanUrl = '/api/financial-plans/{planId}'
export const api11ArchiveFinancialPlanMethod = httpMethod.delete

// API method signatures for client implementation.
export interface FinancialPlanApiContract {
  /** API-1: Query plans by conditions with pagination. */
  queryPlans(
    request: Api1FinancialPlanQueryRequest,
  ): Promise<ApiResponseEnvelope<Api1FinancialPlanQueryResponse>>

  /** API-2: Create a financial plan. */
  createPlan(
    request: Api2CreateFinancialPlanRequest,
  ): Promise<ApiResponseEnvelope<Api2CreateFinancialPlanResponse>>

  /** API-3: Update plan base info and status by plan ID. */
  updatePlan(
    planId: string,
    request: Api3UpdateFinancialPlanRequest,
  ): Promise<ApiResponseEnvelope<Api3UpdateFinancialPlanResponse>>

  /** API-4: Save plan assets in batch for a plan. */
  saveAssets(
    planId: string,
    request: Api4SaveFinancialPlanAssetsRequest,
  ): Promise<ApiResponseEnvelope<Api4SaveFinancialPlanAssetsResponse>>

  /** API-5: Update target params of one plan asset. */
  updateAssetParams(
    planId: string,
    assetId: string,
    request: Api5UpdateFinancialPlanAssetParamsRequest,
  ): Promise<ApiResponseEnvelope<Api5UpdateFinancialPlanAssetParamsResponse>>

  /** API-6: Create one realization batch for an asset. */
  createRealizationBatch(
    planId: string,
    request: Api6CreateRealizationBatchRequest,
  ): Promise<ApiResponseEnvelope<Api6CreateRealizationBatchResponse>>

  /** API-7: Record buy operation in a realization batch. */
  recordRealizationBuy(
    planId: string,
    batchId: string,
    request: Api7RecordRealizationBuyRequest,
  ): Promise<ApiResponseEnvelope<Api7RecordRealizationBuyResponse>>

  /** API-8: Record sell operation in a realization batch. */
  recordRealizationSell(
    planId: string,
    batchId: string,
    request: Api8RecordRealizationSellRequest,
  ): Promise<ApiResponseEnvelope<Api8RecordRealizationSellResponse>>

  /** API-9: Get full plan detail aggregate. */
  getPlanDetail(
    planId: string,
  ): Promise<ApiResponseEnvelope<Api9GetFinancialPlanDetailResponse>>

  /** API-10: Get dashboard statistics for a plan. */
  getDashboard(
    planId: string,
  ): Promise<ApiResponseEnvelope<Api10GetFinancialPlanDashboardResponse>>

  /** API-11: Archive a financial plan. */
  archivePlan(
    planId: string,
    request: Api11ArchiveFinancialPlanRequest,
  ): Promise<ApiResponseEnvelope<Api11ArchiveFinancialPlanResponse>>

  /** API-12: List operations of a realization batch. */
  listBatchOperations(
    planId: string,
    batchId: string,
  ): Promise<ApiResponseEnvelope<RealizationOperation[]>>

  /** API-13: Update realization batch metadata. */
  updateRealizationBatch(
    planId: string,
    batchId: string,
    request: Api13UpdateRealizationBatchRequest,
  ): Promise<ApiResponseEnvelope<RealizationBatch>>

  /** API-14: Exercise / assign an option key within a batch. */
  exerciseOption(
    planId: string,
    batchId: string,
    request: Api14ExerciseOptionRequest,
  ): Promise<ApiResponseEnvelope<RealizationBatch>>
}

export const api12ListBatchOperationsUrl =
  '/api/financial-plans/{planId}/realizations/{batchId}/operations'
export const api12ListBatchOperationsMethod = httpMethod.get

/** API-13: 编辑兑现批次（正股计划）。 */
export interface Api13UpdateRealizationBatchRequest {
  batchName?: string
  /** @deprecated 期权下沉到操作层。 */
  direction?: BatchDirection
  quantity?: number
  planBuyPrice?: number
  planSellPrice?: number
  /** @deprecated 期权到期下沉到操作层。 */
  expirationDate?: string
  note?: string
  version: number
}

export const api13UpdateRealizationBatchUrl =
  '/api/financial-plans/{planId}/realizations/{batchId}'
export const api13UpdateRealizationBatchMethod = httpMethod.put

/** API-14: 行权 / 被行权（针对批次内某个期权 key）。 */
export interface Api14ExerciseOptionRequest {
  optionType: OptionType
  strikePrice: number
  expirationDate: string
  action: ExerciseAction
}

export const api14ExerciseOptionUrl =
  '/api/financial-plans/{planId}/realizations/{batchId}/exercise'
export const api14ExerciseOptionMethod = httpMethod.post
