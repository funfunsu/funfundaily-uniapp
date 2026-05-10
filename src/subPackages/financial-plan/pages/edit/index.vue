<template>
  <view class="financial-plan-page">
    <view class="page-header">
      <view>
        <text class="page-title">{{ isEditing ? '编辑理财计划' : '新建理财计划' }}</text>
        <text class="page-subtitle">支持年度/自定义时间范围与储蓄/股票计划切换</text>
      </view>
      <view class="header-actions">
        <button v-if="isEditing" class="secondary-button" @click="handleToggleArchive">
          {{ planForm.status === 'ARCHIVED' ? '恢复' : '归档' }}
        </button>
      </view>
    </view>

    <financial-plan-form
      v-model="planForm"
      :editable="true"
      :owner-options="ownerOptions"
      @submit="handleSubmit"
      @delete="handleDelete"
      @cancel="handleCancel"
    />

    <view class="section-block">
      <view class="section-block__header">
        <text class="section-block__title">计划标的</text>
        <text class="section-block__subtitle">维护多个标的并同步目标收益</text>
      </view>
      <plan-asset-editor
        :items="assetList"
        :editable="true"
        @add="handleAssetAdd"
        @remove="handleAssetRemove"
        @reorder="handleAssetReorder"
        @save="handleAssetSave"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

import FinancialPlanForm from '../../components/financial-plan-form.vue'
import PlanAssetEditor from '../../components/plan-asset-editor.vue'
import { useFinancialPlanStore } from '../../stores/useFinancialPlanStore'
import { usePlanAssetStore } from '../../stores/usePlanAssetStore'
import { useFinancialPlanStatsStore } from '../../stores/useFinancialPlanStatsStore'
import { planStatus, planType, stockSubType, timeRangeType } from '../../../../../../api/financial-plan-types'
import type { FinancialPlan, FinancialPlanAsset } from '../../../../../../api/financial-plan-types'
import type {
  Api2CreateFinancialPlanRequest,
  Api3UpdateFinancialPlanRequest,
} from '../../../../../../api/financial-plan'
import { ensureCurrentGroup, ensureCurrentMember } from '../../../../utils/currentGroupResolver'
import { STORAGE_KEYS, getStoredData } from '../../../../utils/storageManager'

interface SelectOption {
  label: string
  value: string
}

const planStore = useFinancialPlanStore()
const assetStore = usePlanAssetStore()
const statsStore = useFinancialPlanStatsStore()

const planId = ref('')

const isEditing = computed(() => Boolean(planId.value))
const assetList = computed(() => assetStore.assetList)

const ownerOptions = ref<SelectOption[]>([])

const defaultPlanForm: FinancialPlan = {
  planId: '',
  groupId: '',
  ownerUserId: '',
  planName: '',
  planType: planType.savings,
  stockSubType: undefined,
  status: planStatus.draft,
  timeRangeType: timeRangeType.custom,
  fiscalYear: undefined,
  startDate: '',
  endDate: '',
  remark: '',
  targetProfit: 0,
  actualProfit: 0,
  completionRate: 0,
  version: 1,
  createdAt: '',
  updatedAt: '',
}

const planForm = ref<FinancialPlan>({ ...defaultPlanForm })

/** 从 cached_member_list 构造负责人选项（已经在 ensureCurrentMember 时落盘）。 */
function resolveOwnerOptions(): SelectOption[] {
  const list = getStoredData<Array<{ userId?: string | number; id?: string | number; userInfo?: { nickname?: string } }>>(
    STORAGE_KEYS.MEMBER_LIST,
  ) || []
  return list
    .filter((member) => member && (member.userId !== undefined || member.id !== undefined))
    .map((member) => {
      const userId = member.userId !== undefined ? member.userId : member.id
      const nickname = member.userInfo?.nickname
      return {
        label: nickname ? String(nickname) : `成员 ${userId}`,
        value: String(userId),
      }
    })
}

/** 创建一个空标的。 */
function createEmptyAsset(sequenceNo: number): FinancialPlanAsset {
  return {
    assetId: `temp-${Date.now()}-${sequenceNo}`,
    planId: planForm.value.planId || '',
    assetType: planForm.value.planType,
    assetCode: '',
    assetName: '',
    stockSubType: planForm.value.planType === planType.stock ? (planForm.value.stockSubType || stockSubType.equity) : undefined,
    planBuyPrice: 0,
    planSellPrice: 0,
    planQuantity: 0,
    realizedQuantity: 0,
    openQuantity: 0,
    targetProfit: 0,
    actualProfit: 0,
    completionRate: 0,
    currency: 'CNY',
    sequenceNo,
    version: 1,
  }
}

/** 初始化页面数据。 */
async function initPage(): Promise<void> {
  // 「归属群组」不再出现在表单：默认走当前操作群组（与积分管理一致），
  // 仅需准备好成员上下文用于「所属人」选项与默认值。
  const group = await ensureCurrentGroup()
  if (!group) {
    await uni.showToast({ title: '请先创建或加入一个群组', icon: 'none', duration: 2500 })
    return
  }
  await ensureCurrentMember(group.id)

  ownerOptions.value = resolveOwnerOptions()

  if (planId.value) {
    const detail = await planStore.loadPlanDetail(planId.value)
    if (detail) {
      planForm.value = { ...detail.plan }
      assetStore.assetList = detail.assets.map((asset) => ({ ...asset }))
      await statsStore.loadDashboard(planId.value)
      return
    }
  }

  // 默认 groupId 取当前操作群组；ownerUserId 优先取当前登录用户，再退回当前成员。
  const loginUser = getStoredData<{ id?: string | number }>(STORAGE_KEYS.USER_INFO)
  const currentMember = getStoredData<{ userId?: string | number; id?: string | number }>(STORAGE_KEYS.CURRENT_MEMBER)
  const defaultOwnerId = loginUser?.id !== undefined && loginUser.id !== null
    ? String(loginUser.id)
    : (currentMember?.userId !== undefined ? String(currentMember.userId) : (currentMember?.id !== undefined ? String(currentMember.id) : ''))

  planForm.value = {
    ...defaultPlanForm,
    groupId: String(group.id),
    ownerUserId: defaultOwnerId || ownerOptions.value[0]?.value || '',
  }
  assetStore.assetList = [createEmptyAsset(1)]
  statsStore.recalculateTargetProfit()
}

/** 校验年度模式下起止时间。 */
function validateYearRange(formValue: FinancialPlan): string {
  if (formValue.timeRangeType !== timeRangeType.year) {
    return ''
  }

  if (!formValue.fiscalYear) {
    return '年度模式需要填写 fiscalYear'
  }

  return ''
}

/**
 * 提交「计划基础信息」。
 *
 * 标的不再随计划提交：每个标的有独立的「保存标的」按钮（见 handleAssetSave），
 * 这样新增标的、调整标的不会反复 bump 计划本身的 version，避开了
 * 「expected=1, actual=0」类乐观锁冲突。
 */
async function handleSubmit(formValue: FinancialPlan): Promise<void> {
  const yearError = validateYearRange(formValue)
  if (yearError) {
    await uni.showToast({ title: yearError, icon: 'none' })
    return
  }

  if (isEditing.value) {
    const updateRequest: Api3UpdateFinancialPlanRequest = {
      planName: formValue.planName,
      status: formValue.status,
      timeRangeType: formValue.timeRangeType,
      fiscalYear: formValue.fiscalYear,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      remark: formValue.remark,
      version: formValue.version,
    }

    const success = await planStore.updatePlan(planId.value, updateRequest)
    if (success) {
      // 保险起见：拉一次详情同步 version / status，避免下次提交时本地状态过期。
      await syncPlanFormFromDetail(planId.value)
      await statsStore.refreshStats(planId.value)
      await uni.showToast({ title: '保存成功', icon: 'success' })
    }
    return
  }

  const createRequest: Api2CreateFinancialPlanRequest = {
    groupId: formValue.groupId,
    ownerUserId: formValue.ownerUserId,
    planName: formValue.planName,
    planType: formValue.planType,
    stockSubType: formValue.stockSubType,
    timeRangeType: formValue.timeRangeType,
    fiscalYear: formValue.fiscalYear,
    startDate: formValue.startDate,
    endDate: formValue.endDate,
    remark: formValue.remark,
  }

  const nextPlanId = await planStore.createPlan(createRequest)
  if (nextPlanId) {
    planId.value = nextPlanId
    // 关键：把后端真实 version / status / planId 同步回 planForm，
    // 否则下次「保存」会拿前端默认 version=1 撞上后端真实的 version=0。
    await syncPlanFormFromDetail(nextPlanId)
    await statsStore.refreshStats(nextPlanId)
    await uni.showToast({ title: '计划已创建，请逐项保存标的', icon: 'success', duration: 2500 })
  }
}

/** 重新拉一次详情，覆盖 planForm 的服务端字段（version / status / planId 等）。 */
async function syncPlanFormFromDetail(targetPlanId: string): Promise<void> {
  const detail = await planStore.loadPlanDetail(targetPlanId)
  if (!detail) {
    return
  }
  planForm.value = { ...planForm.value, ...detail.plan }
}

/** 触发删除/停用。 */
async function handleDelete(formValue: FinancialPlan): Promise<void> {
  if (!planId.value) {
    return
  }

  await planStore.archivePlan(planId.value, formValue.version)
  await statsStore.refreshStats(planId.value)
  await uni.showToast({ title: '已归档', icon: 'success' })
}

/** 取消编辑。 */
function handleCancel(): void {
  uni.navigateBack()
}

/** 切换归档/恢复。 */
async function handleToggleArchive(): Promise<void> {
  if (!planId.value) {
    return
  }

  await planStore.archivePlan(planId.value, planForm.value.version)
  await statsStore.refreshStats(planId.value)
}

/** 新增标的。 */
function handleAssetAdd(asset: FinancialPlanAsset): void {
  assetStore.assetList = [...assetStore.assetList.filter((item) => !item.assetId.startsWith('temp-')), asset]
  statsStore.recalculateTargetProfit(planId.value || undefined)
}

/** 删除标的。 */
function handleAssetRemove(_asset: FinancialPlanAsset, index: number): void {
  assetStore.assetList = assetStore.assetList.filter((_, currentIndex) => currentIndex !== index)
  statsStore.recalculateTargetProfit(planId.value || undefined)
}

/** 重排行顺序。 */
function handleAssetReorder(items: FinancialPlanAsset[]): void {
  assetStore.assetList = [...items]
  statsStore.recalculateTargetProfit(planId.value || undefined)
}

/**
 * 单独保存某个标的：以当前 planId 作为上下文，调一次 API-4 但只把响应里
 * 对应的那一行合并回本地，其他未保存的 temp- 行保持不动。
 */
async function handleAssetSave(asset: FinancialPlanAsset, index: number): Promise<void> {
  if (!planId.value) {
    await uni.showToast({
      title: '请先点击页面顶部「保存」创建计划',
      icon: 'none',
      duration: 2500,
    })
    return
  }

  if (!asset.assetCode || !asset.assetName) {
    await uni.showToast({ title: '请先填写资产代码和名称', icon: 'none' })
    return
  }

  const isTemp = String(asset.assetId || '').startsWith('temp-')
  const item = {
    assetId: isTemp ? undefined : asset.assetId,
    assetType: asset.assetType,
    assetCode: asset.assetCode,
    assetName: asset.assetName,
    stockSubType: asset.stockSubType,
    planBuyPrice: Number(asset.planBuyPrice),
    planSellPrice: Number(asset.planSellPrice),
    planQuantity: Number(asset.planQuantity),
    currency: asset.currency || 'CNY',
    sequenceNo: asset.sequenceNo || index + 1,
  }

  const persisted = await assetStore.saveSingleAsset(planId.value, item, asset.assetId)
  if (persisted) {
    await statsStore.refreshStats(planId.value)
    await uni.showToast({ title: '标的保存成功', icon: 'success' })
  }
}

onLoad((query) => {
  planId.value = String(query?.planId || '')
})

onMounted(async () => {
  await initPage()
})
</script>

<style scoped>
.financial-plan-page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 160rpx;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx;
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 16rpx 40rpx rgba(30, 41, 59, 0.08);
}

.page-title {
  display: block;
  color: #0f172a;
  font-size: 36rpx;
  font-weight: 700;
}

.page-subtitle {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}

.header-actions {
  display: flex;
  gap: 16rpx;
}

.secondary-button {
  min-width: 140rpx;
  border-radius: 999rpx;
  background: #eef2ff;
  color: #334155;
}

.section-block {
  margin-top: 24rpx;
}

.section-block__header {
  margin-bottom: 16rpx;
}

.section-block__title {
  display: block;
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 600;
}

.section-block__subtitle {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}
</style>