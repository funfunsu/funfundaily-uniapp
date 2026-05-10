import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  financialPlanApiClient,
} from '../api'
import { resolveFinancialPlanErrorPrompt } from '../utils/errorPrompt'
import { ensureCurrentGroup, ensureCurrentMember, readCurrentGroupId } from '../../../utils/currentGroupResolver'
import type {
  Api1FinancialPlanQueryRequest,
  Api1FinancialPlanQueryResponse,
  Api2CreateFinancialPlanRequest,
  Api3UpdateFinancialPlanRequest,
  Api9GetFinancialPlanDetailResponse,
} from '../../../../../api/financial-plan'
import type {
  FinancialPlan,
  FinancialPlanListItem,
  PlanStatus,
} from '../../../../../api/financial-plan-types'

const financialPlanQueryStorageKey = 'financial-plan-query'
const defaultPageNo = 1
const defaultPageSize = 10
const defaultQuery: Api1FinancialPlanQueryRequest = {
  groupId: '',
  pageNo: defaultPageNo,
  pageSize: defaultPageSize,
}

/** 判断当前运行环境是否支持 uni 存储。 */
function hasUniStorage(): boolean {
  return typeof uni !== 'undefined' && typeof uni.getStorageSync === 'function'
}

/**
 * 解析当前操作群组 id；缓存缺失时自动从 /api/group/list 默认一个并落盘。
 *
 * 仍可能返回空串：用户没有任何群组。此时调用方需要 toast 引导。
 */
async function resolveCurrentGroupIdAsync(): Promise<string> {
  const cached = readCurrentGroupId()
  if (cached) {
    // 触发一次 ensureCurrentMember，把当前用户的成员关系也带回来，
    // 后续创建/编辑等需要 role 的路径无需等待。
    void ensureCurrentMember(cached)
    return cached
  }
  const group = await ensureCurrentGroup()
  if (!group) {
    return ''
  }
  void ensureCurrentMember(group.id)
  return String(group.id)
}

/**
 * 读取持久化查询条件。
 *
 * 如果本地没有数据或解析失败，返回默认分页条件。
 */
function loadPersistedQuery(): Api1FinancialPlanQueryRequest {
  if (!hasUniStorage()) {
    return { ...defaultQuery }
  }

  try {
    const cached = uni.getStorageSync(financialPlanQueryStorageKey)
    if (cached && typeof cached === 'object') {
      return {
        ...defaultQuery,
        ...cached,
        pageNo: Number(cached.pageNo) || defaultPageNo,
        pageSize: Number(cached.pageSize) || defaultPageSize,
      }
    }
  } catch (error) {
    console.warn('loadPersistedQuery failed:', error)
  }

  return { ...defaultQuery }
}

/**
 * 保存查询条件到本地缓存。
 */
function persistQuery(query: Api1FinancialPlanQueryRequest): void {
  if (!hasUniStorage()) {
    return
  }
  try {
    uni.setStorageSync(financialPlanQueryStorageKey, query)
  } catch (error) {
    console.warn('persistQuery failed:', error)
  }
}

/**
 * 将详情响应里的 plan 转成列表项结构，便于列表和详情共享状态。
 */
function toListItem(plan: FinancialPlan): FinancialPlanListItem {
  return {
    planId: plan.planId,
    groupId: plan.groupId,
    ownerUserId: plan.ownerUserId,
    planName: plan.planName,
    planType: plan.planType,
    stockSubType: plan.stockSubType,
    status: plan.status,
    timeRangeType: plan.timeRangeType,
    fiscalYear: plan.fiscalYear,
    startDate: plan.startDate,
    endDate: plan.endDate,
    targetProfit: plan.targetProfit,
    actualProfit: plan.actualProfit,
    completionRate: plan.completionRate,
    updatedAt: plan.updatedAt,
  }
}

/**
 * 统一显示错误提示，并返回 null，避免异常继续向页面上抛。
 */
function handleFinancialPlanStoreError(error: unknown): null {
  const message = resolveFinancialPlanErrorPrompt(error, '理财计划操作失败，请稍后重试')

  if (typeof uni !== 'undefined' && typeof uni.showToast === 'function') {
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2500,
    })
  }

  console.warn('FinancialPlanStore error:', error)
  return null
}

export const useFinancialPlanStore = defineStore('financialPlan', {
  state: () => ({
    query: loadPersistedQuery() as Api1FinancialPlanQueryRequest,
    planList: [] as FinancialPlanListItem[],
    total: 0,
    currentPlanId: null as string | null,
    loading: false,
    planDetails: {} as Record<string, Api9GetFinancialPlanDetailResponse>,
  }),

  getters: {
    /** 当前激活中的计划列表。 */
    activePlans: (state): FinancialPlanListItem[] =>
      state.planList.filter((plan) => plan.status !== 'ARCHIVED'),

    /** 已归档计划列表。 */
    archivedPlans: (state): FinancialPlanListItem[] =>
      state.planList.filter((plan) => plan.status === 'ARCHIVED'),

    /** 当前选中的计划详情或列表项。 */
    selectedPlan: (state): Api9GetFinancialPlanDetailResponse | FinancialPlanListItem | null => {
      if (state.currentPlanId && state.planDetails[state.currentPlanId]) {
        return state.planDetails[state.currentPlanId]
      }

      if (!state.currentPlanId) {
        return null
      }

      return state.planList.find((plan) => plan.planId === state.currentPlanId) || null
    },
  },

  actions: {
    /**
     * 更新查询条件并写入本地缓存。
     */
    setQuery(query: Partial<Api1FinancialPlanQueryRequest>): void {
      this.query = {
        ...this.query,
        ...query,
        pageNo: Number(query.pageNo ?? this.query.pageNo ?? defaultPageNo),
        pageSize: Number(query.pageSize ?? this.query.pageSize ?? defaultPageSize),
      }
      persistQuery(this.query)
    },

    /**
     * 同步列表项到本地状态，避免重复写转换逻辑。
     */
    syncPlanListItem(plan: FinancialPlan | FinancialPlanListItem): void {
      const nextItem: FinancialPlanListItem = 'updatedAt' in plan && 'targetProfit' in plan
        ? {
            planId: plan.planId,
            groupId: plan.groupId,
            ownerUserId: plan.ownerUserId,
            planName: plan.planName,
            planType: plan.planType,
            stockSubType: plan.stockSubType,
            status: plan.status,
            timeRangeType: plan.timeRangeType,
            fiscalYear: plan.fiscalYear,
            startDate: plan.startDate,
            endDate: plan.endDate,
            targetProfit: plan.targetProfit,
            actualProfit: plan.actualProfit,
            completionRate: plan.completionRate,
            updatedAt: plan.updatedAt,
          }
        : plan

      const index = this.planList.findIndex((item) => item.planId === nextItem.planId)
      if (index >= 0) {
        this.planList.splice(index, 1, nextItem)
      } else {
        this.planList.unshift(nextItem)
      }
    },

    /**
     * 查询计划列表，并同步分页与筛选条件。
     */
    async queryPlans(query?: Partial<Api1FinancialPlanQueryRequest>): Promise<Api1FinancialPlanQueryResponse | null> {
      if (query) {
        this.setQuery(query)
      }

      // 兜底注入当前群组 id：缓存缺失时自动选默认群组并落盘。
      if (!this.query.groupId) {
        const resolvedGroupId = await resolveCurrentGroupIdAsync()
        if (!resolvedGroupId) {
          if (typeof uni !== 'undefined' && typeof uni.showToast === 'function') {
            uni.showToast({ title: '请先创建或加入一个群组', icon: 'none', duration: 2500 })
          }
          this.planList = []
          this.total = 0
          return null
        }
        this.setQuery({ groupId: resolvedGroupId })
      }

      this.loading = true
      try {
        const response = await financialPlanApiClient.queryPlans(this.query)
        const data = response.data
        this.planList = data.list
        this.total = data.total
        this.currentPlanId =
          this.currentPlanId && data.list.some((item) => item.planId === this.currentPlanId)
            ? this.currentPlanId
            : data.list[0]?.planId || null
        return data
      } catch (error) {
        return handleFinancialPlanStoreError(error)
      } finally {
        this.loading = false
      }
    },

    /**
     * 加载计划详情，并把详情同步到列表项和详情缓存。
     */
    async loadPlanDetail(planId: string): Promise<Api9GetFinancialPlanDetailResponse | null> {
      this.loading = true
      try {
        const response = await financialPlanApiClient.getPlanDetail(planId)
        const detail = response.data
        this.planDetails[planId] = detail
        this.currentPlanId = planId
        this.syncPlanListItem(detail.plan)
        return detail
      } catch (error) {
        return handleFinancialPlanStoreError(error)
      } finally {
        this.loading = false
      }
    },

    /**
     * 创建计划后自动刷新列表并切换到新计划。
     */
    async createPlan(request: Api2CreateFinancialPlanRequest): Promise<string | null> {
      this.loading = true
      try {
        const response = await financialPlanApiClient.createPlan(request)
        const result = response.data
        this.currentPlanId = result.planId
        await this.queryPlans({
          ...this.query,
          pageNo: this.query.pageNo || defaultPageNo,
          pageSize: this.query.pageSize || defaultPageSize,
        })
        return result.planId
      } catch (error) {
        return handleFinancialPlanStoreError(error)
      } finally {
        this.loading = false
      }
    },

    /**
     * 更新计划后同步列表项与详情缓存。
     */
    async updatePlan(planId: string, request: Api3UpdateFinancialPlanRequest): Promise<boolean> {
      this.loading = true
      try {
        const response = await financialPlanApiClient.updatePlan(planId, request)
        const result = response.data
        const currentItem = this.planList.find((item) => item.planId === planId)
        if (currentItem) {
          currentItem.status = result.status
        }
        if (this.planDetails[planId]) {
          this.planDetails[planId].plan.status = result.status
          this.planDetails[planId].plan.version = result.version
        }
        await this.loadPlanDetail(planId)
        return true
      } catch (error) {
        handleFinancialPlanStoreError(error)
        return false
      } finally {
        this.loading = false
      }
    },

    /**
     * 归档计划：调用后同步本地列表状态并保留历史数据。
     */
    async archivePlan(planId: string, version: number): Promise<boolean> {
      this.loading = true
      try {
        const response = await financialPlanApiClient.archivePlan(planId, { version })
        const result = response.data

        const currentItem = this.planList.find((item) => item.planId === planId)
        if (currentItem) {
          currentItem.status = result.status
        }
        if (this.planDetails[planId]) {
          this.planDetails[planId].plan.status = result.status
        }
        return true
      } catch (error) {
        handleFinancialPlanStoreError(error)
        return false
      } finally {
        this.loading = false
      }
    },
  },
})
