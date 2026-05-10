<template>
  <view class="financial-plan-filter-bar">
    <view class="row">
      <view class="field field-wide">
        <text class="label">关键词</text>
        <input
          class="input"
          :value="keyword"
          placeholder="搜索计划名称"
          @input="handleKeywordInput"
        />
      </view>

      <view class="field">
        <text class="label">计划类型</text>
        <picker :range="planTypeOptions" range-key="label" @change="handlePlanTypeChange">
          <view class="picker-value">{{ planTypeLabel }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">执行状态</text>
        <picker :range="planStatusOptions" range-key="label" @change="handleExecutionStatusChange">
          <view class="picker-value">{{ executionStatusLabel }}</view>
        </picker>
      </view>
    </view>

    <view class="row">
      <view class="field">
        <text class="label">时间范围</text>
        <picker :range="timeRangeOptions" range-key="label" @change="handleTimeRangeChange">
          <view class="picker-value">{{ timeRangeLabel }}</view>
        </picker>
      </view>

      <view class="field" v-if="timeRangeType === timeRangeTypeEnum.year">
        <text class="label">年度</text>
        <input
          class="input"
          type="number"
          :value="selectedYear"
          placeholder="例如 2026"
          @input="handleSelectedYearInput"
        />
      </view>

      <template v-else>
        <view class="field">
          <text class="label">开始日期</text>
          <input
            class="input"
            :value="startDate"
            placeholder="YYYY-MM-DD"
            @input="handleStartDateInput"
          />
        </view>

        <view class="field">
          <text class="label">结束日期</text>
          <input
            class="input"
            :value="endDate"
            placeholder="YYYY-MM-DD"
            @input="handleEndDateInput"
          />
        </view>
      </template>
    </view>

    <view class="actions">
      <button class="btn btn-secondary" @click="handleReset">重置</button>
      <button class="btn btn-primary" @click="handleSearch">搜索</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { planStatus, planType, timeRangeType } from '../../../../../api/financial-plan-types'

type OptionValue = string | number

interface SelectOption {
  label: string
  value: OptionValue
}

const props = withDefaults(
  defineProps<{
    keyword: string
    planType?: string
    executionStatus?: string
    timeRangeType?: string
    selectedYear?: number | string
    startDate?: string
    endDate?: string
  }>(),
  {
    keyword: '',
    planType: '',
    executionStatus: '',
    timeRangeType: timeRangeType.custom,
    selectedYear: '',
    startDate: '',
    endDate: '',
  },
)

const emit = defineEmits<{
  (event: 'update:keyword', value: string): void
  (event: 'update:planType', value: string): void
  (event: 'update:executionStatus', value: string): void
  (event: 'update:timeRangeType', value: string): void
  (event: 'update:selectedYear', value: number | string): void
  (event: 'update:startDate', value: string): void
  (event: 'update:endDate', value: string): void
  (event: 'search'): void
  (event: 'reset'): void
  (event: 'timeRangeChange', value: string): void
}>()

const timeRangeTypeEnum = timeRangeType

const planTypeOptions: SelectOption[] = [
  { label: '全部类型', value: '' },
  { label: '储蓄', value: planType.savings },
  { label: '股票', value: planType.stock },
]

const planStatusOptions: SelectOption[] = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: planStatus.draft },
  { label: '启用', value: planStatus.active },
  { label: '归档', value: planStatus.archived },
]

const timeRangeOptions: SelectOption[] = [
  { label: '自定义', value: timeRangeType.custom },
  { label: '年度', value: timeRangeType.year },
]

/** 根据当前值返回选项标签。 */
function resolveLabel(options: SelectOption[], value?: string | number): string {
  return options.find((item) => item.value === value)?.label || '全部'
}

const planTypeLabel = computed(() => resolveLabel(planTypeOptions, props.planType))
const executionStatusLabel = computed(() => resolveLabel(planStatusOptions, props.executionStatus))
const timeRangeLabel = computed(() => resolveLabel(timeRangeOptions, props.timeRangeType))

/** 处理关键词输入。 */
function handleKeywordInput(event: any): void {
  emit('update:keyword', event?.detail?.value || '')
}

/** 处理计划类型切换。 */
function handlePlanTypeChange(event: any): void {
  const index = Number(event?.detail?.value ?? 0)
  emit('update:planType', String(planTypeOptions[index]?.value ?? ''))
}

/** 处理执行状态切换。 */
function handleExecutionStatusChange(event: any): void {
  const index = Number(event?.detail?.value ?? 0)
  emit('update:executionStatus', String(planStatusOptions[index]?.value ?? ''))
}

/** 处理时间范围模式切换。 */
function handleTimeRangeChange(event: any): void {
  const index = Number(event?.detail?.value ?? 0)
  const nextValue = String(timeRangeOptions[index]?.value ?? timeRangeType.custom)
  emit('update:timeRangeType', nextValue)
  emit('timeRangeChange', nextValue)
}

/** 处理年度输入。 */
function handleSelectedYearInput(event: any): void {
  emit('update:selectedYear', event?.detail?.value || '')
}

/** 处理开始日期输入。 */
function handleStartDateInput(event: any): void {
  emit('update:startDate', event?.detail?.value || '')
}

/** 处理结束日期输入。 */
function handleEndDateInput(event: any): void {
  emit('update:endDate', event?.detail?.value || '')
}

/** 触发搜索。 */
function handleSearch(): void {
  emit('search')
}

/** 重置筛选条件。 */
function handleReset(): void {
  emit('reset')
}
</script>

<style scoped>
.financial-plan-filter-bar {
  padding: 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 16rpx 40rpx rgba(30, 41, 59, 0.08);
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.field {
  flex: 1 1 220rpx;
  min-width: 220rpx;
}

.field-wide {
  flex: 2 1 320rpx;
}

.label {
  display: block;
  margin-bottom: 12rpx;
  color: #475569;
  font-size: 24rpx;
}

.input,
.picker-value {
  width: 100%;
  min-height: 72rpx;
  padding: 18rpx 20rpx;
  box-sizing: border-box;
  border: 1rpx solid #dbe3ef;
  border-radius: 16rpx;
  background: #f8fbff;
  color: #0f172a;
  font-size: 26rpx;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
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

.btn-primary {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #ffffff;
}
</style>