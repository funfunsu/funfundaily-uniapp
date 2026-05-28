<template>
  <view class="fb-calendar">
    <!-- 头部：年月选择 + 左右切换 -->
    <view class="fb-header">
      <view class="fb-nav-btn" @click="changeMonth(-1)"><text class="fb-nav-text">上一月</text></view>
      <view class="fb-date-wrap">
        <picker @change="handleYearChange" :value="yearIndex" :range="yearList">
          <view class="fb-select">{{ currentYear }}年</view>
        </picker>
        <picker @change="handleMonthChange" :value="monthIndex" :range="monthList">
          <view class="fb-select">{{ currentMonth }}月</view>
        </picker>
      </view>
      <view class="fb-nav-btn" @click="changeMonth(1)"><text class="fb-nav-text">下一月</text></view>
    </view>

    <!-- 星期 -->
    <view class="fb-week">
      <view class="fb-week-item" v-for="(w, i) in weekList" :key="i"><text class="fb-week-text">{{ w }}</text></view>
    </view>

    <!-- 日期格子 -->
    <view class="fb-grid">
      <view
        class="fb-cell"
        v-for="(item, index) in calendarDays"
        :key="index"
        :class="{
          'fb-cell--other': item.isOtherMonth,
          'fb-cell--today': item.isToday,
          'fb-cell--persist': item.status === 'persist',
          'fb-cell--relapse': item.status === 'relapse'
        }"
        @click="handleDateClick(item)"
      >
        <text class="fb-day">{{ item.day }}</text>
        <text v-if="item.status === 'persist'" class="fb-mark">坚持</text>
        <text v-else-if="item.status === 'relapse'" class="fb-mark fb-mark--relapse">破戒</text>
      </view>
    </view>

    <!-- 图例 -->
    <view class="fb-legend">
      <view class="fb-legend-item"><view class="fb-dot fb-dot--persist"></view><text class="fb-legend-text">坚持</text></view>
      <view class="fb-legend-item"><view class="fb-dot fb-dot--relapse"></view><text class="fb-legend-text">破戒</text></view>
      <view class="fb-legend-item"><view class="fb-dot fb-dot--none"></view><text class="fb-legend-text">未反馈</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  // 日期 -> 反馈状态映射：{ 'YYYY-MM-DD': 'persist' | 'relapse' }
  statusMap: { type: Object, default: () => ({}) },
  initYear: { type: Number, default: new Date().getFullYear() },
  initMonth: { type: Number, default: new Date().getMonth() + 1 }
})

const emit = defineEmits(['dateSelected', 'monthChange'])

const currentYear = ref(props.initYear)
const currentMonth = ref(props.initMonth)
const weekList = ref(['日', '一', '二', '三', '四', '五', '六'])
const calendarDays = ref([])

const nowYear = new Date().getFullYear()
const yearList = ref(Array.from({ length: 10 }, (v, i) => nowYear - 5 + i))
const monthList = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

const yearIndex = computed(() => yearList.value.findIndex(y => y === currentYear.value))
const monthIndex = computed(() => monthList.value.findIndex(m => m === currentMonth.value))

const generateCalendar = () => {
  const days = []
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month - 1, 1).getDay()
  const totalDays = new Date(year, month, 0).getDate()
  const lastMonthTotal = new Date(year, month - 1, 0).getDate()
  const today = new Date()
  const ty = today.getFullYear(); const tm = today.getMonth() + 1; const td = today.getDate()

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ year, month, day: lastMonthTotal - i, isOtherMonth: true, isToday: false, status: '' })
  }
  for (let day = 1; day <= totalDays; day++) {
    const dateKey = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`
    days.push({
      year, month, day, date: dateKey,
      isOtherMonth: false,
      isToday: year === ty && month === tm && day === td,
      status: props.statusMap[dateKey] || ''
    })
  }
  let remain = 42 - days.length
  if (remain > 7) remain -= 7
  for (let day = 1; day <= remain; day++) {
    days.push({ year, month, day, isOtherMonth: true, isToday: false, status: '' })
  }
  calendarDays.value = days
}

const changeMonth = (dir) => {
  if (dir === -1) {
    currentMonth.value -= 1
    if (currentMonth.value < 1) { currentMonth.value = 12; currentYear.value -= 1 }
  } else {
    currentMonth.value += 1
    if (currentMonth.value > 12) { currentMonth.value = 1; currentYear.value += 1 }
  }
}
const handleYearChange = (e) => { currentYear.value = yearList.value[e.detail.value] }
const handleMonthChange = (e) => { currentMonth.value = monthList.value[e.detail.value] }
const handleDateClick = (item) => { if (!item.isOtherMonth) emit('dateSelected', item) }

watch([currentYear, currentMonth], () => {
  generateCalendar()
  emit('monthChange', { year: currentYear.value, month: currentMonth.value })
}, { immediate: true })

watch(() => props.statusMap, () => generateCalendar(), { deep: true })
</script>

<style scoped>
.fb-calendar {
  width: 100%; padding: 20rpx; box-sizing: border-box;
  background: #fff; border-radius: 20rpx; box-shadow: 0 4rpx 15rpx rgba(0,0,0,0.06);
}
.fb-header { display: flex; align-items: center; justify-content: space-between; padding: 10rpx 0; margin-bottom: 16rpx; }
.fb-nav-btn { width: 128rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 34rpx; background: #f5f7fa; }
.fb-nav-text { color: #007AFF; font-size: 24rpx; }
.fb-date-wrap { display: flex; align-items: center; gap: 20rpx; }
.fb-select { font-weight: 600; color: #222; padding: 8rpx 20rpx; }
.fb-week { display: flex; justify-content: space-between; margin-bottom: 12rpx; width: 100%; }
.fb-week-item { width: calc(100% / 7); height: 60rpx; display: flex; align-items: center; justify-content: center; }
.fb-week-text { font-size: 26rpx; font-weight: 600; color: #475569; }
.fb-grid { display: flex; flex-wrap: wrap; gap: 8rpx 0; }
.fb-cell {
  width: calc(100% / 7); height: 96rpx; display: flex; flex-direction: column;
  align-items: center; justify-content: center; box-sizing: border-box; border-radius: 12rpx;
  position: relative;
}
.fb-day { color: #333; font-size: 28rpx; }
.fb-cell--other .fb-day { color: #e0e0e0; }
.fb-cell--today { background: #e6f0ff; }
.fb-cell--today .fb-day { color: #007AFF; font-weight: bold; }
.fb-cell--persist { background: rgba(16,185,129,0.12); }
.fb-cell--relapse { background: rgba(239,68,68,0.12); }
.fb-mark { font-size: 18rpx; color: #10b981; margin-top: 2rpx; }
.fb-mark--relapse { color: #ef4444; }
.fb-legend { display: flex; gap: 28rpx; justify-content: center; margin-top: 18rpx; }
.fb-legend-item { display: flex; align-items: center; gap: 8rpx; }
.fb-dot { width: 20rpx; height: 20rpx; border-radius: 50%; }
.fb-dot--persist { background: #10b981; }
.fb-dot--relapse { background: #ef4444; }
.fb-dot--none { background: #e2e8f0; }
.fb-legend-text { font-size: 22rpx; color: #94a3b8; }
</style>
