import type { FinancialPlan, FinancialPlanAsset, RealizationBatch } from '../../../../api/financial-plan-types'

/**
 * 理财计划 Mock 状态容器。
 *
 * 这里使用内存态，便于离线开发时在一次运行会话内模拟“创建→编辑→兑现→统计”的完整链路。
 */
export interface FinancialPlanMockState {
  plans: FinancialPlan[]
  assets: FinancialPlanAsset[]
  batches: RealizationBatch[]
  nextPlanId: number
  nextAssetId: number
  nextBatchId: number
}

/** 当前日期字符串（yyyy-mm-dd）。 */
const today = new Date().toISOString().slice(0, 10)

/** 初始化 Mock 数据：覆盖储蓄、股票（正股/期权）及已归档样例。 */
export function createInitialFinancialPlanMockState(): FinancialPlanMockState {
  return {
    plans: [
      {
        planId: '1001',
        groupId: '1',
        ownerUserId: '1',
        planName: '家庭教育储蓄计划',
        planType: 'SAVINGS',
        status: 'ACTIVE',
        timeRangeType: 'YEAR',
        fiscalYear: 2026,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        remark: '每月固定储蓄',
        targetProfit: 1200,
        actualProfit: 260,
        completionRate: 0.22,
        version: 1,
        createdAt: '2026-01-01T00:00:00+08:00',
        updatedAt: '2026-03-01T10:00:00+08:00',
      },
      {
        planId: '1002',
        groupId: '1',
        ownerUserId: '1',
        planName: '美股正股成长计划',
        planType: 'STOCK',
        stockSubType: 'EQUITY',
        status: 'ACTIVE',
        timeRangeType: 'CUSTOM',
        startDate: '2026-02-01',
        endDate: '2026-11-30',
        remark: '分批建仓分批止盈',
        targetProfit: 8200,
        actualProfit: 1450,
        completionRate: 0.35,
        version: 2,
        createdAt: '2026-02-01T09:00:00+08:00',
        updatedAt: '2026-05-01T12:00:00+08:00',
      },
      {
        planId: '1003',
        groupId: '1',
        ownerUserId: '1',
        planName: '期权短线策略（历史归档）',
        planType: 'STOCK',
        stockSubType: 'OPTION',
        status: 'ARCHIVED',
        timeRangeType: 'YEAR',
        fiscalYear: 2025,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        remark: '已完成复盘',
        targetProfit: 5000,
        actualProfit: 5280,
        completionRate: 1,
        version: 4,
        createdAt: '2025-01-01T08:00:00+08:00',
        updatedAt: '2025-12-31T21:00:00+08:00',
      },
    ],
    assets: [
      {
        assetId: '2001',
        planId: '1001',
        assetType: 'SAVINGS',
        assetCode: 'CASH-001',
        assetName: '定期存款',
        planBuyPrice: 1,
        planSellPrice: 1.02,
        planQuantity: 12000,
        realizedQuantity: 2600,
        openQuantity: 9400,
        targetProfit: 240,
        actualProfit: 52,
        completionRate: 0.2167,
        currency: 'CNY',
        sequenceNo: 1,
        version: 1,
      },
      {
        assetId: '2002',
        planId: '1002',
        assetType: 'STOCK',
        assetCode: 'AAPL',
        assetName: 'Apple Inc.',
        stockSubType: 'EQUITY',
        planBuyPrice: 165,
        planSellPrice: 210,
        planQuantity: 120,
        realizedQuantity: 40,
        openQuantity: 80,
        targetProfit: 5400,
        actualProfit: 820,
        completionRate: 0.3333,
        currency: 'USD',
        sequenceNo: 1,
        version: 2,
      },
      {
        assetId: '2003',
        planId: '1002',
        assetType: 'STOCK',
        assetCode: 'TSLA',
        assetName: 'Tesla',
        stockSubType: 'EQUITY',
        planBuyPrice: 185,
        planSellPrice: 245,
        planQuantity: 60,
        realizedQuantity: 15,
        openQuantity: 45,
        targetProfit: 3600,
        actualProfit: 630,
        completionRate: 0.25,
        currency: 'USD',
        sequenceNo: 2,
        version: 1,
      },
      {
        assetId: '2004',
        planId: '1003',
        assetType: 'STOCK',
        assetCode: 'SPY-202512-C-500',
        assetName: 'SPY Dec Call',
        stockSubType: 'OPTION',
        planBuyPrice: 8,
        planSellPrice: 12,
        planQuantity: 100,
        realizedQuantity: 100,
        openQuantity: 0,
        targetProfit: 400,
        actualProfit: 528,
        completionRate: 1,
        currency: 'USD',
        sequenceNo: 1,
        version: 3,
      },
    ],
    batches: [
      {
        batchId: '3001',
        planId: '1002',
        assetId: '2002',
        batchName: 'AAPL 第一批',
        quantity: 40,
        stageStatus: 'COMPLETED',
        actualBuyPrice: 168,
        actualSellPrice: 189,
        actualBuyAmount: 6720,
        actualSellAmount: 7560,
        actualProfit: 820,
        buyTradeDate: '2026-02-20',
        sellTradeDate: '2026-04-15',
        feeTotal: 20,
        note: '趋势单',
        version: 2,
      },
      {
        batchId: '3002',
        planId: '1002',
        assetId: '2003',
        batchName: 'TSLA 试仓',
        quantity: 15,
        stageStatus: 'COMPLETED',
        actualBuyPrice: 190,
        actualSellPrice: 233,
        actualBuyAmount: 2850,
        actualSellAmount: 3495,
        actualProfit: 630,
        buyTradeDate: '2026-03-05',
        sellTradeDate: '2026-04-28',
        feeTotal: 15,
        note: '波段',
        version: 2,
      },
      {
        batchId: '3003',
        planId: '1003',
        assetId: '2004',
        batchName: '期权主仓',
        quantity: 100,
        stageStatus: 'COMPLETED',
        actualBuyPrice: 8.2,
        actualSellPrice: 13.6,
        actualBuyAmount: 820,
        actualSellAmount: 1360,
        actualProfit: 528,
        buyTradeDate: '2025-09-15',
        sellTradeDate: '2025-11-19',
        feeTotal: 12,
        note: '归档历史记录',
        version: 3,
      },
    ],
    nextPlanId: 1100,
    nextAssetId: 2100,
    nextBatchId: 3100,
  }
}

/** 运行时可变 Mock 状态实例。 */
export const financialPlanMockState: FinancialPlanMockState = createInitialFinancialPlanMockState()

/** 生成 mock traceId。 */
export function nextTraceId(): string {
  return `mock-fp-${Date.now()}`
}

/** 返回当日字符串，便于更新 updatedAt。 */
export function nowDateString(): string {
  return today
}
