<template>
  <view class="date-picker-container">
    <!-- 选择器触发区域（优化间距和字体） -->
    <view
        class="picker-trigger"
        :class="{ disabled: disabled }"
        @click="handleTriggerClick"
    >
      <text class="trigger-label">{{ label }}</text>
      <text class="trigger-value">
        {{ displayValue || placeholder }}
      </text>
      <view class="arrow-icon">▸</view>
    </view>

    <!-- 纯原生弹窗（优化遮罩层级） -->
    <view v-if="isPopupShow" class="popup-mask" @click="closePopup">
      <view class="popup-content" @click.stop>
        <!-- 弹窗标题栏：核心优化取消/确认按钮为胶囊式 -->
        <view class="popup-header">
          <button class="header-btn cancel-btn" @click="closePopup">取消</button>
          <text class="header-title">{{ title || `选择${mode === 'date' ? '日期' : mode === 'time' ? '时间' : '日期时间'}` }}</text>
          <button class="header-btn confirm-btn" @click="confirmSelection" :disabled="!selectedDate">确认</button>
        </view>

        <!-- 仅时间模式：保留原逻辑，优化样式 -->
        <picker-view
            v-if="mode === 'time'"
            class="picker-view"
            :value="pickerValue"
            @change="onPickerChange"
            :indicator-style="`height: ${indicatorHeight}px;`"
        >
          <picker-view-column>
            <view class="picker-item" v-for="(hour, index) in hours" :key="index">
              {{ hour }}时
            </view>
          </picker-view-column>
          <picker-view-column>
            <view class="picker-item" v-for="(minute, index) in minutes" :key="index">
              {{ minute }}分
            </view>
          </picker-view-column>
        </picker-view>

        <!-- 日期/日期时间模式：左右增减年月 + 周行式日期平铺（核心） -->
        <view v-else class="date-select-wrap">
          <!-- 顶部年月选择栏：点击选择式（提升可用性） -->
          <view class="ym-select-bar">
            <view class="ym-unit">
              <picker
                  mode="selector"
                  :range="yearOptions"
                  :value="yearPickerIndex"
                  @change="onYearPickerChange"
              >
                <view class="ym-selector">
                  <text class="ym-value">{{ currentYM.year }}年</text>
                  <text class="ym-arrow">▾</text>
                </view>
              </picker>
            </view>
            <view class="ym-unit">
              <picker
                  mode="selector"
                  :range="monthOptions"
                  :value="monthPickerIndex"
                  @change="onMonthPickerChange"
              >
                <view class="ym-selector">
                  <text class="ym-value">{{ currentYM.month }}月</text>
                  <text class="ym-arrow">▾</text>
                </view>
              </picker>
            </view>
          </view>

          <!-- 日期区域：周行式平铺（优化样式，无边框更简约） -->
          <view class="date-panel">
            <!-- 星期头部（优化背景和圆角） -->
            <view class="week-header">
              <text class="week-item" v-for="week in weekList" :key="week">{{ week }}</text>
            </view>
            <!-- 日期格子：周行式7列，优化间距和选中态 -->
            <view class="date-grid">
              <!-- 月初空白格 -->
              <view class="date-item empty" v-for="(item, idx) in preEmptyDays" :key="`pre-${idx}`"></view>
              <!-- 当月有效日期 -->
              <view
                  class="date-item"
                  v-for="day in days"
                  :key="day"
                  :class="{ active: selectedDate === day, today: isToday(day) }"
                  @click="handleDateClick(day)"
              >
                {{ day }}
              </view>
              <!-- 月末空白格 -->
              <view class="date-item empty" v-for="(item, idx) in afterEmptyDays" :key="`after-${idx}`"></view>
            </view>
          </view>

          <!-- 日期时间模式：底部时间选择器（优化高度和分隔） -->
          <picker-view
              v-if="mode === 'datetime'"
              class="time-picker-view"
              :value="pickerValue.slice(3,5)"
              @change="onTimePickerChange"
              :indicator-style="`height: ${indicatorHeight}px;`"
          >
            <picker-view-column>
              <view class="picker-item" v-for="(hour, index) in hours" :key="index">
                {{ hour }}时
              </view>
            </picker-view-column>
            <picker-view-column>
              <view class="picker-item" v-for="(minute, index) in minutes" :key="index">
                {{ minute }}分
              </view>
            </picker-view-column>
          </picker-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

// 1. 组件属性（完全保留原有，提取yearRange为独立响应式更易用）
const props = defineProps({
  mode: {
    type: String,
    default: 'date',
    validator: (val) => ['date', 'time', 'datetime'].includes(val)
  },
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  title: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  yearRange: {
    type: Array,
    // 往前放宽到 100 年，覆盖生日/纪念日等久远日期；往后保留 10 年
    default: () => {
      const now = new Date()
      return [now.getFullYear() - 100, now.getFullYear() + 10]
    }
  },
  indicatorHeight: {
    type: Number,
    default: 44
  }
})

// 2. 组件事件（保留原有）
const emit = defineEmits(['update:modelValue', 'change', 'confirm'])

// 3. 核心响应式数据（重构：适配左右增减年月，精简无用数据）
const isPopupShow = ref(false)
const pickerValue = ref([0, 0, 0, 0, 0]) // 仅时间模式使用
const selectedDate = ref(null) // 选中的日期（数字）
const weekList = ref(['日', '一', '二', '三', '四', '五', '六']) // 固定星期顺序
// 年月核心数据（独立管理，方便增减操作）
const currentYM = ref({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
})
const yearOptions = computed(() => {
  const [start, end] = props.yearRange
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const monthOptions = computed(() => Array.from({ length: 12 }, (_, i) => i + 1))
const yearPickerIndex = computed(() => yearOptions.value.findIndex(y => y === currentYM.value.year))
const monthPickerIndex = computed(() => currentYM.value.month - 1)

// 基础可选数据（精简计算）
const hours = computed(() => Array.from({ length: 24 }, (_, i) => i)) // 0-23时
const minutes = computed(() => Array.from({ length: 12 }, (_, i) => i * 5)) // 5分钟一档
// 当月天数
const days = computed(() => {
  const { year, month } = currentYM.value
  const lastDay = new Date(year, month, 0).getDate()
  return Array.from({ length: lastDay }, (_, i) => i + 1)
})
// 月初前置空白格（补全第一周）
const preEmptyDays = computed(() => {
  const { year, month } = currentYM.value
  const firstDayWeek = new Date(year, month - 1, 1).getDay()
  return firstDayWeek
})
// 月末后置空白格（补全最后一周，7列一行）
const afterEmptyDays = computed(() => {
  const total = preEmptyDays.value + days.value.length
  const remain = 7 - (total % 7)
  return remain === 7 ? 0 : remain
})

// 4. 显示值格式化（保留原有，父页面无感知）
const displayValue = computed(() => {
  if (!props.modelValue) return ''
  if (props.mode === 'date') {
    const [year, month, day] = props.modelValue.split('-')
    return `${year}年${month}月${day}日`
  } else if (props.mode === 'time') {
    return props.modelValue
  } else {
    const [date, time] = props.modelValue.split(' ')
    const [year, month, day] = date.split('-')
    const formattedDate = `${year}年${month}月${day}日`
    return `${formattedDate} ${time}`
  }
})

// 5. 工具方法（精简，保留核心）
// 判断是否是今日
const isToday = (day) => {
  const now = new Date()
  const { year, month } = currentYM.value
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day
}
// 解析绑定值为年/月/日/时/分
const parseModelValue = () => {
  if (!props.modelValue) return null
  if (props.mode === 'date') {
    const [y, m, d] = props.modelValue.split('-').map(Number)
    return { y, m, d, h: 0, mi: 0 }
  } else if (props.mode === 'time') {
    const [h, mi] = props.modelValue.split(':').map(Number)
    return { y: 0, m: 0, d: 0, h, mi }
  } else {
    const [dateStr, timeStr] = props.modelValue.split(' ')
    const [y, m, d] = dateStr.split('-').map(Number)
    const [h, mi] = timeStr.split(':').map(Number)
    return { y, m, d, h, mi }
  }
}

// 6. 初始化方法（适配左右增减年月）
const initPickerValue = () => {
  const now = new Date()
  const parseData = parseModelValue()
  // 初始化年月（限制在yearRange内）
  const initYear = parseData?.y || now.getFullYear()
  currentYM.value = {
    year: Math.max(props.yearRange[0], Math.min(props.yearRange[1], initYear)),
    month: parseData?.m || now.getMonth() + 1
  }
  // 初始化选中日期，确保合法
  const maxDay = new Date(currentYM.value.year, currentYM.value.month, 0).getDate()
  const defaultDay = parseData?.d || now.getDate()
  selectedDate.value = Math.min(defaultDay, maxDay)
  // 初始化时间选择器
  const parsedMinute = parseData?.mi
  const currentMinute = now.getMinutes()
  const minuteValue = typeof parsedMinute === 'number'
      ? parsedMinute
      : currentMinute - (currentMinute % 5)
  const minuteIndex = minutes.value.findIndex(m => m === minuteValue)
  pickerValue.value = [
    0, 0, 0,
    typeof parseData?.h === 'number' ? hours.value.findIndex(h => h === parseData.h) : hours.value.findIndex(h => h === now.getHours()),
    minuteIndex >= 0 ? minuteIndex : 0
  ]
}

// 7. 核心事件：年月直接选择
const adjustSelectedDateByMonth = () => {
  if (!selectedDate.value) return
  const maxDay = new Date(currentYM.value.year, currentYM.value.month, 0).getDate()
  if (selectedDate.value > maxDay) {
    selectedDate.value = maxDay
  }
}
const onYearPickerChange = (e) => {
  const index = Number(e.detail.value)
  const nextYear = yearOptions.value[index]
  if (typeof nextYear !== 'number') return
  currentYM.value.year = nextYear
  adjustSelectedDateByMonth()
}
const onMonthPickerChange = (e) => {
  const index = Number(e.detail.value)
  currentYM.value.month = index + 1
  adjustSelectedDateByMonth()
}

// 8. 其他事件处理（精简，优化逻辑）
// 打开弹窗
const handleTriggerClick = () => {
  if (props.disabled) return
  initPickerValue()
  isPopupShow.value = true
}
// 关闭弹窗
const closePopup = () => {
  isPopupShow.value = false
  emit('change', props.modelValue)
}
// 纯时间模式选择器变化
const onPickerChange = (e) => {
  pickerValue.value = e.detail.value
}
// 点击日期
const handleDateClick = (day) => {
  selectedDate.value = day
}
// 日期时间模式-时间选择器变化
const onTimePickerChange = (e) => {
  pickerValue.value[3] = e.detail.value[0]
  pickerValue.value[4] = e.detail.value[1]
}
// 确认选择
const confirmSelection = () => {
  let result = ''
  const { year, month } = currentYM.value
  const day = selectedDate.value
  const hour = hours.value[pickerValue.value[3]]
  const minute = minutes.value[pickerValue.value[4]]

  // 补0格式化
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  const h = String(hour).padStart(2, '0')
  const mi = String(minute).padStart(2, '0')

  // 按模式拼接结果
  if (props.mode === 'date') {
    result = `${year}-${m}-${d}`
  } else if (props.mode === 'time') {
    result = `${h}:${mi}`
  } else {
    result = `${year}-${m}-${d} ${h}:${mi}`
  }

  // 更新绑定值并抛事件
  emit('update:modelValue', result)
  emit('confirm', result)
  closePopup()
}

// 9. 监听与挂载（精简，仅监听必要数据）
watch(() => props.modelValue, initPickerValue, { immediate: true })
onMounted(() => {
  initPickerValue()
})
</script>

<style scoped>
/* 全局样式重置：清除button默认样式，避免浏览器/小程序差异 */
button {
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  line-height: 1;
  font-size: inherit;
  color: inherit;
}
button:disabled {
  opacity: 0.3;
  pointer-events: none;
}

/* 容器样式：精简，统一盒模型 */
.date-picker-container {
  width: 100%;
  box-sizing: border-box;
}

/* 触发区域：优化字体、间距、箭头，更精致 */
.picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 24rpx;
  border: 1px solid #e8e8e8;
  border-radius: 16rpx;
  box-sizing: border-box;
  background: #fff;
  transition: border-color 0.2s;
}
.picker-trigger:hover {
  border-color: #dcdcdc;
}
.picker-trigger.disabled {
  background: #fafafa;
  color: #cccccc;
  border-color: #f0f0f0;
}
.trigger-label {
  font-size: 28rpx;
  color: #333333;
  flex: 0 0 auto;
  margin-right: 16rpx;
}
.trigger-value {
  font-size: 28rpx;
  color: #666666;
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arrow-icon {
  font-size: 24rpx;
  color: #999999;
  flex: 0 0 auto;
  transition: transform 0.2s;
}
.picker-trigger:active .arrow-icon {
  transform: translateX(4rpx);
}

/* 弹窗遮罩：优化透明度，更柔和 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  box-sizing: border-box;
  backdrop-filter: blur(2rpx);
}

/* 弹窗内容：优化圆角，底部无圆角 */
.popup-content {
  width: 100%;
  max-height: 85vh;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  box-sizing: border-box;
  overflow-y: auto;
}

/* 弹窗标题栏：核心优化！胶囊式取消/确认按钮，居中标题 */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 24rpx;
  border-bottom: 1px solid #f5f5f5;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
}
.header-btn {
  min-width: 120rpx;
  height: 64rpx;
  line-height: 64rpx;
  font-size: 28rpx;
  border-radius: 32rpx;
  transition: all 0.2s;
}
/* 取消按钮：浅灰背景 */
.cancel-btn {
  background: #f5f5f5;
  color: #666666;
}
.cancel-btn:active {
  background: #e9e9e9;
}
/* 确认按钮：主题色背景，禁用时浅灰 */
.confirm-btn {
  background: #007AFF;
  color: #ffffff;
}
.confirm-btn:disabled {
  background: #f5f5f5;
  color: #cccccc;
}
.confirm-btn:active {
  background: #0066cc;
}
/* 标题：居中，加粗，优化字体 */
.header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  flex: 1;
  text-align: center;
  margin: 0 24rpx;
}

/* 时间模式选择器：优化高度和内边距 */
.picker-view {
  width: 100%;
  height: 360rpx;
  padding: 24rpx;
  box-sizing: border-box;
}
.picker-item {
  text-align: center;
  font-size: 32rpx;
  color: #333333;
  height: 44px;
  line-height: 44px;
}

/* ========== 核心样式：左减右增年月栏 + 简约周行日期 ========== */
.date-select-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx;
  box-sizing: border-box;
}

/* 年月选择栏：左右增减式，水平居中，间距优化 */
.ym-select-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}
/* 年/月单元 */
.ym-unit {
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 年月选择器：点击展开列表 */
.ym-selector {
  min-width: 180rpx;
  height: 64rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #f5f5f5;
  border-radius: 32rpx;
  transition: all 0.2s;
}
.ym-selector:active {
  background: #e9e9e9;
}
/* 年月值：加粗，大字体，视觉突出 */
.ym-value {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
}
.ym-arrow {
  font-size: 22rpx;
  color: #666666;
}

/* 日期面板：无边框化，更简约，统一圆角 */
.date-panel {
  width: 100%;
  border-radius: 16rpx;
  overflow: hidden;
  background: #fafafa;
}
/* 星期头部：浅灰背景，文字居中，优化高度 */
.week-header {
  display: flex;
  width: 100%;
  background: #f5f5f5;
}
.week-item {
  width: 100%;
  text-align: center;
  font-size: 26rpx;
  color: #999999;
  height: 72rpx;
  line-height: 72rpx;
}
/* 日期格子容器：标准7列网格 */
.date-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  width: 100%;
  row-gap: 8rpx;
  column-gap: 0;
  padding: 12rpx 0;
}
/* 日期格子：标准单元，保证与星期头一一对应 */
.date-item {
  width: 100%;
  text-align: center;
  font-size: 28rpx;
  color: #333333;
  height: 76rpx;
  line-height: 76rpx;
  box-sizing: border-box;
  border-radius: 999rpx;
  transition: all 0.2s;
}
/* 空白格：透明背景，无点击 */
.date-item.empty {
  background: transparent;
  pointer-events: none;
}
/* 今日样式：浅蓝背景+主题色，无圆角 */
.date-item.today {
  color: #007AFF;
  font-weight: 500;
  background: #f0f7ff;
}
/* 选中样式：主题色背景+白色，加粗，视觉突出 */
.date-item.active {
  background: #007AFF;
  color: #ffffff;
  font-weight: 600;
}
/* 日期点击反馈：缩放+透明度，更细腻 */
.date-item:not(.empty):active {
  transform: scale(0.95);
  opacity: 0.9;
}

/* 日期时间模式-底部时间选择器：优化高度，加分隔线，精简内边距 */
.time-picker-view {
  width: 100%;
  height: 200rpx;
  padding: 0 24rpx;
  margin-top: 8rpx;
  border-top: 1px solid #f5f5f5;
  box-sizing: border-box;
}
</style>