<template>
  <view class="financial-plan-form">
    <view class="grid">
      <view class="field field-wide">
        <text class="label">计划名称</text>
        <input class="input" v-model="formData.planName" :disabled="!editable" placeholder="请输入计划名称" />
      </view>

      <view class="field">
        <text class="label">时间范围</text>
        <picker :range="timeRangeOptions" range-key="label" :disabled="!editable" @change="handleTimeRangeTypeChange">
          <view class="picker-value">{{ timeRangeTypeLabel }}</view>
        </picker>
      </view>

      <view class="field" v-if="formData.timeRangeType === timeRangeTypeEnum.year">
        <text class="label">年度</text>
        <input class="input" v-model="formData.fiscalYear" :disabled="!editable" type="number" placeholder="例如 2026" />
      </view>

      <view class="field">
        <text class="label">开始日期</text>
        <input class="input" :value="resolvedStartDate" :disabled="!editable || formData.timeRangeType === timeRangeTypeEnum.year" placeholder="YYYY-MM-DD" @input="handleStartDateInput" />
      </view>

      <view class="field">
        <text class="label">结束日期</text>
        <input class="input" :value="resolvedEndDate" :disabled="!editable || formData.timeRangeType === timeRangeTypeEnum.year" placeholder="YYYY-MM-DD" @input="handleEndDateInput" />
      </view>

      <view class="field">
        <text class="label">所属人</text>
        <picker :range="ownerOptions" range-key="label" :disabled="!editable" @change="handleOwnerChange">
          <view class="picker-value">{{ ownerLabel }}</view>
        </picker>
      </view>

      <view class="field field-wide">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="formData.remark" :disabled="!editable" placeholder="请输入备注" />
      </view>
    </view>

    <view class="actions">
      <button class="btn btn-secondary" @click="handleCancel">取消</button>
      <button class="btn btn-warning" v-if="editable" @click="handleDelete">删除/停用</button>
      <button class="btn btn-primary" v-if="editable" @click="handleSubmit">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import { planType, timeRangeType } from '../../../../../api/financial-plan-types'
import type { FinancialPlan } from '../../../../../api/financial-plan-types'

interface SelectOption {
  label: string
  value: string | number
}

const props = withDefaults(
  defineProps<{
    modelValue: FinancialPlan
    editable?: boolean
    ownerOptions?: SelectOption[]
  }>(),
  {
    editable: false,
    ownerOptions: () => [],
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: FinancialPlan): void
  (event: 'submit', value: FinancialPlan): void
  (event: 'delete', value: FinancialPlan): void
  (event: 'cancel'): void
}>()

const timeRangeTypeEnum = timeRangeType

/** 生成默认表单值。 */
function createDefaultFormData(): FinancialPlan {
  return {
    planId: '',
    groupId: '',
    ownerUserId: '',
    planName: '',
    // 理财计划本身不再承载类型语义；保留 SAVINGS 仅为满足后端必填校验，
    // 实际类型由各标的（asset.assetType）自行声明。
    planType: planType.savings,
    stockSubType: undefined,
    status: 'DRAFT',
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
}

const formData = reactive<FinancialPlan>({
  ...createDefaultFormData(),
  ...props.modelValue,
})

/** 计算年度模式下的开始日期。 */
function resolveYearStartDate(year: number | string | undefined): string {
  if (!year) {
    return ''
  }

  return `${String(year)}-01-01`
}

/** 计算年度模式下的结束日期。 */
function resolveYearEndDate(year: number | string | undefined): string {
  if (!year) {
    return ''
  }

  return `${String(year)}-12-31`
}

const timeRangeOptions: SelectOption[] = [
  { label: '自定义', value: timeRangeType.custom },
  { label: '年度', value: timeRangeType.year },
]

const timeRangeTypeLabel = computed(() => timeRangeOptions.find((item) => item.value === formData.timeRangeType)?.label || '自定义')
const ownerLabel = computed(() => props.ownerOptions.find((item) => item.value === formData.ownerUserId)?.label || '请选择所属人')
const resolvedStartDate = computed(() =>
  formData.timeRangeType === timeRangeTypeEnum.year ? resolveYearStartDate(formData.fiscalYear) : formData.startDate,
)
const resolvedEndDate = computed(() =>
  formData.timeRangeType === timeRangeTypeEnum.year ? resolveYearEndDate(formData.fiscalYear) : formData.endDate,
)

/** 将年度模式下的起止日期写回表单。 */
function syncYearDates(): void {
  if (formData.timeRangeType !== timeRangeTypeEnum.year) {
    return
  }

  formData.startDate = resolveYearStartDate(formData.fiscalYear)
  formData.endDate = resolveYearEndDate(formData.fiscalYear)
}

/** 处理时间范围切换。 */
function handleTimeRangeTypeChange(event: any): void {
  const index = Number(event?.detail?.value ?? 0)
  formData.timeRangeType = timeRangeOptions[index]?.value as FinancialPlan['timeRangeType']
  syncYearDates()
}

/** 处理开始日期输入。 */
function handleStartDateInput(event: any): void {
  formData.startDate = event?.detail?.value || ''
}

/** 处理结束日期输入。 */
function handleEndDateInput(event: any): void {
  formData.endDate = event?.detail?.value || ''
}

/** 处理所属人切换。 */
function handleOwnerChange(event: any): void {
  const index = Number(event?.detail?.value ?? 0)
  formData.ownerUserId = String(props.ownerOptions[index]?.value ?? '')
}

/** 触发表单提交。 */
function handleSubmit(): void {
  syncYearDates()
  emit('submit', { ...formData })
}

/** 触发删除/停用。 */
function handleDelete(): void {
  emit('delete', { ...formData })
}

/** 触发取消。 */
function handleCancel(): void {
  emit('cancel')
}

watch(
  () => props.modelValue,
  (nextValue) => {
    Object.assign(formData, createDefaultFormData(), nextValue)
    syncYearDates()
  },
  { deep: true },
)

watch(
  formData,
  (nextValue) => {
    const nextModelValue: FinancialPlan = {
      ...nextValue,
      startDate: nextValue.timeRangeType === timeRangeTypeEnum.year ? resolveYearStartDate(nextValue.fiscalYear) : nextValue.startDate,
      endDate: nextValue.timeRangeType === timeRangeTypeEnum.year ? resolveYearEndDate(nextValue.fiscalYear) : nextValue.endDate,
    }
    emit('update:modelValue', nextModelValue)
  },
  { deep: true },
)
</script>

<style scoped>
.financial-plan-form {
  padding: 28rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  border-radius: 28rpx;
  box-shadow: 0 20rpx 44rpx rgba(30, 41, 59, 0.1);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.field {
  flex: 1 1 260rpx;
  min-width: 260rpx;
}

.field-wide {
  flex: 2 1 380rpx;
}

.label {
  display: block;
  margin-bottom: 12rpx;
  color: #475569;
  font-size: 24rpx;
}

.input,
.picker-value,
.textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1rpx solid #dbe3ef;
  border-radius: 16rpx;
  background: #ffffff;
  color: #0f172a;
  font-size: 26rpx;
}

.input,
.picker-value {
  min-height: 72rpx;
  padding: 18rpx 20rpx;
}

.textarea {
  min-height: 160rpx;
  padding: 18rpx 20rpx;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 28rpx;
}

.btn {
  min-width: 150rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
}

.btn-secondary {
  background: #eef2ff;
  color: #334155;
}

.btn-warning {
  background: #fff7ed;
  color: #c2410c;
}

.btn-primary {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #ffffff;
}
</style>