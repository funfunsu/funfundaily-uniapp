export const planType = {
  savings: 'SAVINGS',
  stock: 'STOCK',
} as const

export type PlanType = (typeof planType)[keyof typeof planType]

/** 兼容旧 UI 引用；新模型已将子类型迁移到批次层。 */
export const stockSubType = {
  equity: 'EQUITY',
  option: 'OPTION',
} as const

export type StockSubType = (typeof stockSubType)[keyof typeof stockSubType]

export const planStatus = {
  draft: 'DRAFT',
  active: 'ACTIVE',
  archived: 'ARCHIVED',
} as const

export type PlanStatus = (typeof planStatus)[keyof typeof planStatus]

export const timeRangeType = {
  year: 'YEAR',
  custom: 'CUSTOM',
} as const

export type TimeRangeType = (typeof timeRangeType)[keyof typeof timeRangeType]

export const stageStatus = {
  pendingBuy: 'PENDING_BUY',
  partialBought: 'PARTIAL_BOUGHT',
  pendingSell: 'PENDING_SELL',
  completed: 'COMPLETED',
} as const

export type StageStatus = (typeof stageStatus)[keyof typeof stageStatus]

export const planProgressStatus = {
  notStarted: 'NOT_STARTED',
  inProgress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  partial: 'PARTIAL',
} as const

export type PlanProgressStatus = (typeof planProgressStatus)[keyof typeof planProgressStatus]

export const warningFlag = {
  overWindow: 'OVER_WINDOW',
  incompleteBatch: 'INCOMPLETE_BATCH',
  quantityReached: 'QUANTITY_REACHED',
} as const

export type WarningFlag = (typeof warningFlag)[keyof typeof warningFlag]

/** 标的所属市场（与后端 AssetMarket 对齐）。 */
export const assetMarket = {
  us: 'US',
  hk: 'HK',
  cn: 'CN',
} as const

export type AssetMarket = (typeof assetMarket)[keyof typeof assetMarket]

/** 批次类型。 */
export const batchType = {
  equity: 'EQUITY',
  derivative: 'DERIVATIVE',
} as const

export type BatchType = (typeof batchType)[keyof typeof batchType]

/** 衍生品批次方向。 */
export const batchDirection = {
  call: 'CALL',
  put: 'PUT',
  shortCall: 'SHORT_CALL',
  shortPut: 'SHORT_PUT',
} as const

export type BatchDirection = (typeof batchDirection)[keyof typeof batchDirection]

/** 操作类型（一个批次可对应多条买/卖操作）。 */
export const operationType = {
  buy: 'BUY',
  sell: 'SELL',
} as const

export type OperationType = (typeof operationType)[keyof typeof operationType]

/** 操作标的类型：正股 / 期权。 */
export const instrumentType = {
  stock: 'STOCK',
  option: 'OPTION',
} as const

export type InstrumentType = (typeof instrumentType)[keyof typeof instrumentType]

/** 期权类型：看涨 / 看跌。 */
export const optionType = {
  call: 'CALL',
  put: 'PUT',
} as const

export type OptionType = (typeof optionType)[keyof typeof optionType]

/** 行权动作：行权 / 被行权。 */
export const exerciseAction = {
  exercise: 'EXERCISE',
  assign: 'ASSIGN',
} as const

export type ExerciseAction = (typeof exerciseAction)[keyof typeof exerciseAction]

export interface FinancialPlan {
  planId: string
  groupId: string
  ownerUserId: string
  planName: string
  planType: PlanType
  stockSubType?: StockSubType
  status: PlanStatus
  timeRangeType: TimeRangeType
  fiscalYear?: number
  startDate: string
  endDate: string
  remark?: string
  targetProfit: number
  actualProfit: number
  completionRate: number
  version: number
  createdAt: string
  updatedAt: string
}

/**
 * 计划标的：股票名 / 市场 / 用户目标盈利。
 *
 * 「已计划盈利」「已实现盈利」由统计层从各批次汇总，不在实体上。
 */
export interface FinancialPlanAsset {
  assetId: string
  planId: string
  stockName: string
  market: AssetMarket
  /** 用户设定的目标盈利。 */
  targetProfit: number
  sequenceNo: number
  version: number
}

/** 兑现批次：自带类型 / 方向 / 数量 / 计划价 / 到期日（衍生品）。 */
export interface RealizationBatch {
  batchId: string
  planId: string
  assetId: string
  batchName?: string
  batchType: BatchType
  direction?: BatchDirection
  quantity: number
  planBuyPrice: number
  planSellPrice: number
  expirationDate?: string
  stageStatus: StageStatus
  actualBuyPrice?: number
  actualSellPrice?: number
  actualBuyAmount?: number
  actualSellAmount?: number
  actualProfit?: number
  buyTradeDate?: string
  sellTradeDate?: string
  feeTotal: number
  note?: string
  version: number
}

/** 批次下的单次操作明细（多次买/卖即多条；正股或期权）。 */
export interface RealizationOperation {
  operationId: string
  batchId: string
  instrument: InstrumentType
  operationType: OperationType
  /** 仅 OPTION 有效。 */
  optionType?: OptionType
  /** 仅 OPTION 有效：目标价格（行权价）。 */
  strikePrice?: number
  /** 仅 OPTION 有效：到期时间。 */
  expirationDate?: string
  tradeDate: string
  price: number
  quantity: number
  fee: number
  note?: string
  createdAt: string
}

/** 批次内单个期权 key 的持仓与盈亏汇总。 */
export interface OptionKeyStats {
  optionType: OptionType
  strikePrice: number
  expirationDate: string
  netQuantity: number
  costAmount: number
  avgCost?: number
  realizedProfit: number
}

/** 批次卡片汇总（正股 + 各期权 key）。 */
export interface BatchStats {
  batchId: string
  targetProfit: number
  stockRealizedProfit: number
  optionRealizedProfit: number
  totalRealizedProfit: number
  stockQuantity: number
  stockCostPrice?: number
  stockCostAmount: number
  optionKeys: OptionKeyStats[]
}

export interface ProfitSummary {
  planId: string
  /** 目标盈利 = Σ 各标的的 targetProfit（用户设定）。 */
  targetProfit: number
  /** 已计划盈利 = Σ 各标的 plannedProfit（= Σ 批次目标收益）。 */
  plannedProfit: number
  /** 已实现盈利 = Σ COMPLETED 批次的 actualProfit。 */
  actualProfit: number
  realizedQuantity: number
  plannedQuantity: number
  /** 计划完成度 = plannedProfit / targetProfit。 */
  plannedCompletionRate: number
  /** 实际完成度 = actualProfit / targetProfit。 */
  completionRate: number
  completedBatchCount: number
  incompleteBatchCount: number
}

export interface AssetProfitSummary {
  assetId: string
  assetCode: string
  assetName: string
  targetProfit: number
  plannedProfit: number
  actualProfit: number
  realizedQuantity: number
  plannedQuantity: number
  plannedCompletionRate: number
  completionRate: number
}

export interface ProgressSnapshot {
  planStatus: PlanProgressStatus
  timeProgressRate: number
  quantityProgressRate: number
  profitProgressRate: number
  warningFlags: WarningFlag[]
}

export interface FinancialPlanListItem {
  planId: string
  groupId: string
  ownerUserId: string
  planName: string
  planType: PlanType
  stockSubType?: StockSubType
  status: PlanStatus
  timeRangeType: TimeRangeType
  fiscalYear?: number
  startDate: string
  endDate: string
  targetProfit: number
  actualProfit: number
  completionRate: number
  updatedAt: string
}
