import config from '../../../config/env'
import { handleFinancialPlanMockRequest } from '../../../mock/financial-plan/mockApi'
import { getToken } from '../../../utils/token'

import {
  api1FinancialPlanQueryMethod,
  api1FinancialPlanQueryUrl,
  api2CreateFinancialPlanMethod,
  api2CreateFinancialPlanUrl,
  api3UpdateFinancialPlanMethod,
  api3UpdateFinancialPlanUrl,
  api4SaveFinancialPlanAssetsMethod,
  api4SaveFinancialPlanAssetsUrl,
  api5UpdateFinancialPlanAssetParamsMethod,
  api5UpdateFinancialPlanAssetParamsUrl,
  api6CreateRealizationBatchMethod,
  api6CreateRealizationBatchUrl,
  api7RecordRealizationBuyMethod,
  api7RecordRealizationBuyUrl,
  api8RecordRealizationSellMethod,
  api8RecordRealizationSellUrl,
  api11ArchiveFinancialPlanMethod,
  api11ArchiveFinancialPlanUrl,
  api9GetFinancialPlanDetailMethod,
  api9GetFinancialPlanDetailUrl,
  api10GetFinancialPlanDashboardMethod,
  api10GetFinancialPlanDashboardUrl,
  api12ListBatchOperationsMethod,
  api12ListBatchOperationsUrl,
  api13UpdateRealizationBatchMethod,
  api13UpdateRealizationBatchUrl,
  financialPlanErrorCode,
  type Api1FinancialPlanQueryRequest,
  type Api1FinancialPlanQueryResponse,
  type Api2CreateFinancialPlanRequest,
  type Api2CreateFinancialPlanResponse,
  type Api3UpdateFinancialPlanRequest,
  type Api3UpdateFinancialPlanResponse,
  type Api4SaveFinancialPlanAssetsRequest,
  type Api4SaveFinancialPlanAssetsResponse,
  type Api5UpdateFinancialPlanAssetParamsRequest,
  type Api5UpdateFinancialPlanAssetParamsResponse,
  type Api6CreateRealizationBatchRequest,
  type Api6CreateRealizationBatchResponse,
  type Api7RecordRealizationBuyRequest,
  type Api7RecordRealizationBuyResponse,
  type Api8RecordRealizationSellRequest,
  type Api8RecordRealizationSellResponse,
  type Api11ArchiveFinancialPlanRequest,
  type Api11ArchiveFinancialPlanResponse,
  type Api9GetFinancialPlanDetailResponse,
  type Api10GetFinancialPlanDashboardResponse,
  type ApiResponseEnvelope,
  type FinancialPlanApiContract,
  type FinancialPlanErrorCode,
} from './financial-plan'
import type { RealizationOperation, RealizationBatch } from './financial-plan-types'
import type { Api13UpdateRealizationBatchRequest } from './financial-plan'

const financialPlanErrorCodeSet = new Set<string>(Object.values(financialPlanErrorCode))

export interface FinancialPlanApiClientOptions {
  timeoutMs?: number
  retryCount?: number
  retryDelayMs?: number
}

export interface ApiEnvelopeWithTrace<TData> extends ApiResponseEnvelope<TData> {
  traceId?: string
}

export class FinancialPlanApiError extends Error {
  code: string
  traceId?: string
  statusCode?: number
  isFinancialPlanError: boolean

  constructor(
    message: string,
    code: string,
    traceId?: string,
    statusCode?: number,
    isFinancialPlanError: boolean = false,
  ) {
    super(message)
    this.name = 'FinancialPlanApiError'
    this.code = code
    this.traceId = traceId
    this.statusCode = statusCode
    this.isFinancialPlanError = isFinancialPlanError
  }
}

/**
 * 统一创建理财计划 API 客户端。
 *
 * - 覆盖 API-1 ~ API-10。
 * - 统一错误码识别（FinancialPlanErrorCode）。
 * - 从响应头/响应体透传 traceId。
 * - 带基础 timeout + retry 策略。
 */
export function createFinancialPlanApiClient(
  options: FinancialPlanApiClientOptions = {},
): FinancialPlanApiContract {
  const timeoutMs = options.timeoutMs ?? 10000
  const retryCount = options.retryCount ?? 1
  const retryDelayMs = options.retryDelayMs ?? 250

  /** 延时函数，用于重试间隔。 */
  const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(() => resolve(), ms)
    })

  /**
   * 解析 traceId。
   * 优先响应头，其次响应体，兼容不同网关字段名。
   */
  const resolveTraceId = (responseBody: any, headers?: Record<string, any>): string | undefined => {
    if (responseBody && typeof responseBody.traceId === 'string' && responseBody.traceId) {
      return responseBody.traceId
    }
    if (!headers) {
      return undefined
    }
    return (
      headers['x-trace-id'] ||
      headers['X-Trace-Id'] ||
      headers['trace-id'] ||
      headers['Trace-Id'] ||
      headers['x-request-id'] ||
      headers['X-Request-Id']
    ) as string | undefined
  }

  /** 将模板 URL 里的路径参数替换成实际值。 */
  const buildUrl = (urlTemplate: string, params: Record<string, string | number>): string => {
    let url = urlTemplate
    Object.keys(params).forEach((key) => {
      url = url.replace(`{${key}}`, encodeURIComponent(String(params[key])))
    })
    return url
  }

  /**
   * 统一执行请求。
   *
   * - 2xx 才视为 HTTP 成功。
   * - 业务 code 非 "0" 抛 FinancialPlanApiError。
   * - 网络异常和 5xx 可按 retryCount 重试。
   */
  const requestWithRetry = async <TData>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: unknown,
  ): Promise<ApiEnvelopeWithTrace<TData>> => {
    if (config.mock) {
      const mockResponse = handleFinancialPlanMockRequest(method, url, data)
      const envelope: ApiEnvelopeWithTrace<TData> = {
        code: String(mockResponse.code ?? ''),
        message: String(mockResponse.message ?? ''),
        data: mockResponse.data as TData,
        traceId: mockResponse.traceId,
      }

      if (envelope.code !== '0') {
        const isFinancialPlanError = financialPlanErrorCodeSet.has(envelope.code)
        throw new FinancialPlanApiError(
          envelope.message || 'Financial plan mock request failed',
          envelope.code,
          envelope.traceId,
          200,
          isFinancialPlanError,
        )
      }
      return envelope
    }

    const fullUrl = `${config.baseUrl}${url}`

    const token = getToken()
    const header: Record<string, string> = {
      'content-type': 'application/json',
    }
    if (token) {
      header.Authorization = `Bearer ${token}`
    }

    let attempt = 0
    while (attempt <= retryCount) {
      try {
        const result = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
          uni.request({
            url: fullUrl,
            method,
            data,
            header,
            timeout: timeoutMs,
            success: (res) => resolve(res),
            fail: (err) => reject(err),
          })
        })

        const statusCode = result.statusCode || 0
        const responseBody = (result.data || {}) as Record<string, any>
        const traceId = resolveTraceId(responseBody, result.header as Record<string, any>)

        if (statusCode < 200 || statusCode >= 300) {
          const httpError = new FinancialPlanApiError(
            `HTTP Error: ${statusCode}`,
            'HTTP_ERROR',
            traceId,
            statusCode,
            false,
          )
          if (statusCode >= 500 && attempt < retryCount) {
            attempt += 1
            await delay(retryDelayMs)
            continue
          }
          throw httpError
        }

        const code = String(responseBody.code ?? '')
        const message = String(responseBody.message ?? '')
        const envelope: ApiEnvelopeWithTrace<TData> = {
          code,
          message,
          data: responseBody.data as TData,
          traceId,
        }

        if (code !== '0') {
          const isFinancialPlanError = financialPlanErrorCodeSet.has(code)
          throw new FinancialPlanApiError(
            message || 'Financial plan request failed',
            code,
            traceId,
            statusCode,
            isFinancialPlanError,
          )
        }

        return envelope
      } catch (error) {
        const canRetry = attempt < retryCount
        if (!canRetry) {
          throw error
        }

        // 仅网络异常或 5xx 才重试。
        if (error instanceof FinancialPlanApiError) {
          if (error.statusCode && error.statusCode >= 500) {
            attempt += 1
            await delay(retryDelayMs)
            continue
          }
          throw error
        }

        attempt += 1
        await delay(retryDelayMs)
      }
    }

    throw new FinancialPlanApiError('Financial plan request failed after retries', 'RETRY_EXHAUSTED')
  }

  /** API-1：理财计划分页查询。 */
  const queryPlans = (
    request: Api1FinancialPlanQueryRequest,
  ): Promise<ApiEnvelopeWithTrace<Api1FinancialPlanQueryResponse>> =>
    requestWithRetry<Api1FinancialPlanQueryResponse>(
      api1FinancialPlanQueryMethod,
      api1FinancialPlanQueryUrl,
      request,
    )

  /** API-2：创建理财计划。 */
  const createPlan = (
    request: Api2CreateFinancialPlanRequest,
  ): Promise<ApiEnvelopeWithTrace<Api2CreateFinancialPlanResponse>> =>
    requestWithRetry<Api2CreateFinancialPlanResponse>(
      api2CreateFinancialPlanMethod,
      api2CreateFinancialPlanUrl,
      request,
    )

  /** API-3：更新理财计划。 */
  const updatePlan = (
    planId: string,
    request: Api3UpdateFinancialPlanRequest,
  ): Promise<ApiEnvelopeWithTrace<Api3UpdateFinancialPlanResponse>> =>
    requestWithRetry<Api3UpdateFinancialPlanResponse>(
      api3UpdateFinancialPlanMethod,
      buildUrl(api3UpdateFinancialPlanUrl, { planId }),
      request,
    )

  /** API-4：批量保存计划标的。 */
  const saveAssets = (
    planId: string,
    request: Api4SaveFinancialPlanAssetsRequest,
  ): Promise<ApiEnvelopeWithTrace<Api4SaveFinancialPlanAssetsResponse>> =>
    requestWithRetry<Api4SaveFinancialPlanAssetsResponse>(
      api4SaveFinancialPlanAssetsMethod,
      buildUrl(api4SaveFinancialPlanAssetsUrl, { planId }),
      request,
    )

  /** API-5：调整计划标的参数。 */
  const updateAssetParams = (
    planId: string,
    assetId: string,
    request: Api5UpdateFinancialPlanAssetParamsRequest,
  ): Promise<ApiEnvelopeWithTrace<Api5UpdateFinancialPlanAssetParamsResponse>> =>
    requestWithRetry<Api5UpdateFinancialPlanAssetParamsResponse>(
      api5UpdateFinancialPlanAssetParamsMethod,
      buildUrl(api5UpdateFinancialPlanAssetParamsUrl, { planId, assetId }),
      request,
    )

  /** API-6：新增兑现批次。 */
  const createRealizationBatch = (
    planId: string,
    request: Api6CreateRealizationBatchRequest,
  ): Promise<ApiEnvelopeWithTrace<Api6CreateRealizationBatchResponse>> =>
    requestWithRetry<Api6CreateRealizationBatchResponse>(
      api6CreateRealizationBatchMethod,
      buildUrl(api6CreateRealizationBatchUrl, { planId }),
      request,
    )

  /** API-7：登记兑现买入。 */
  const recordRealizationBuy = (
    planId: string,
    batchId: string,
    request: Api7RecordRealizationBuyRequest,
  ): Promise<ApiEnvelopeWithTrace<Api7RecordRealizationBuyResponse>> =>
    requestWithRetry<Api7RecordRealizationBuyResponse>(
      api7RecordRealizationBuyMethod,
      buildUrl(api7RecordRealizationBuyUrl, { planId, batchId }),
      request,
    )

  /** API-8：登记兑现卖出。 */
  const recordRealizationSell = (
    planId: string,
    batchId: string,
    request: Api8RecordRealizationSellRequest,
  ): Promise<ApiEnvelopeWithTrace<Api8RecordRealizationSellResponse>> =>
    requestWithRetry<Api8RecordRealizationSellResponse>(
      api8RecordRealizationSellMethod,
      buildUrl(api8RecordRealizationSellUrl, { planId, batchId }),
      request,
    )

  /** API-9：获取理财计划详情。 */
  const getPlanDetail = (
    planId: string,
  ): Promise<ApiEnvelopeWithTrace<Api9GetFinancialPlanDetailResponse>> =>
    requestWithRetry<Api9GetFinancialPlanDetailResponse>(
      api9GetFinancialPlanDetailMethod,
      buildUrl(api9GetFinancialPlanDetailUrl, { planId }),
    )

  /** API-10：获取收益统计看板。 */
  const getDashboard = (
    planId: string,
  ): Promise<ApiEnvelopeWithTrace<Api10GetFinancialPlanDashboardResponse>> =>
    requestWithRetry<Api10GetFinancialPlanDashboardResponse>(
      api10GetFinancialPlanDashboardMethod,
      buildUrl(api10GetFinancialPlanDashboardUrl, { planId }),
    )

  /** API-11：归档理财计划。 */
  const archivePlan = (
    planId: string,
    request: Api11ArchiveFinancialPlanRequest,
  ): Promise<ApiEnvelopeWithTrace<Api11ArchiveFinancialPlanResponse>> =>
    requestWithRetry<Api11ArchiveFinancialPlanResponse>(
      api11ArchiveFinancialPlanMethod,
      buildUrl(api11ArchiveFinancialPlanUrl, { planId }),
      request,
    )

  /** API-12：列出某批次的全部买卖操作明细，按时间正序。 */
  const listBatchOperations = (
    planId: string,
    batchId: string,
  ): Promise<ApiEnvelopeWithTrace<RealizationOperation[]>> =>
    requestWithRetry<RealizationOperation[]>(
      api12ListBatchOperationsMethod,
      buildUrl(api12ListBatchOperationsUrl, { planId, batchId }),
    )

  /** API-13：编辑兑现批次（不可变更 batchType）。 */
  const updateRealizationBatch = (
    planId: string,
    batchId: string,
    request: Api13UpdateRealizationBatchRequest,
  ): Promise<ApiEnvelopeWithTrace<RealizationBatch>> =>
    requestWithRetry<RealizationBatch>(
      api13UpdateRealizationBatchMethod,
      buildUrl(api13UpdateRealizationBatchUrl, { planId, batchId }),
      request,
    )

  return {
    queryPlans,
    createPlan,
    updatePlan,
    saveAssets,
    updateAssetParams,
    createRealizationBatch,
    recordRealizationBuy,
    recordRealizationSell,
    getPlanDetail,
    getDashboard,
    archivePlan,
    listBatchOperations,
    updateRealizationBatch,
  }
}

/** 默认导出：按项目统一策略初始化的理财计划 API 客户端。 */
export const financialPlanApiClient = createFinancialPlanApiClient()

/** 工具函数：判断错误码是否属于理财计划业务错误码集合。 */
export function isFinancialPlanErrorCode(code: string): code is FinancialPlanErrorCode {
  return financialPlanErrorCodeSet.has(code)
}
