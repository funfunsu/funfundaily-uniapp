<template>
  <view class="task-calendar-container">
    <!-- 日历头部：年份选择+月份选择+左右切换按钮 -->
    <view class="calendar-header">
      <view class="prev-btn" @click="changeMonth(-1)">
        <text class="btn-icon">上一月</text>
      </view>

      <view class="date-select-wrap">
        <!-- 年份选择器 -->
        <picker @change="handleYearChange" :value="yearIndex" :range="yearList">
          <view class="select-item">{{ currentYear }}年</view>
        </picker>
        <!-- 月份选择器 -->
        <picker @change="handleMonthChange" :value="monthIndex" :range="monthList">
          <view class="select-item">{{ currentMonth }}月</view>
        </picker>
      </view>

      <view class="next-btn" @click="changeMonth(1)">
        <text class="btn-icon">下一月</text>
      </view>
    </view>

    <!-- 星期头部 大气舒展样式 -->
    <view class="calendar-week">
      <view class="week-item" v-for="(item, index) in weekList" :key="index">
        <text class="week-text">{{ item }}</text>
      </view>
    </view>

    <!-- 日历主体：日期格子 -->
    <view class="calendar-content">
      <view
          class="date-item"
          v-for="(item, index) in calendarDays"
          :key="index"
          :class="{
          'other-month': item.isOtherMonth,
          'today': item.isToday,
          'has-task': item.taskDueCount > 0,
          'selected-date': selectedDate.year === item.year && selectedDate.month === item.month && selectedDate.day === item.day && !item.isOtherMonth
        }"
          @click="handleDateClick(item)"
      >
        <!-- 日期数字 -->
        <text class="date-num">{{ item.day }}</text>
        <!-- 任务数量角标：有任务才显示 -->
        <view class="task-count-tag" v-if="item.taskCount - item.taskDueCount > 0">
          <text class="tag-text">{{ item.taskCount - item.taskDueCount }}</text>
        </view>
        <view class="task-due-count-tag" v-if="item.taskDueCount > 0">
          <text class="tag-text">{{ item.taskDueCount }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// ✅ 接收父组件传参：任务数据格式不变，无缝兼容
const props = defineProps({
  taskList: {
    type: Array,
    default: () => [] // 格式：[{date: 'YYYY-MM-DD', count: 数字}]
  },
  initYear: {
    type: Number,
    default: new Date().getFullYear()
  },
  initMonth: {
    type: Number,
    default: new Date().getMonth() + 1
  }
})

// ✅ ✅ ✅ 核心新增：抛出【月份变化事件 monthChange】+ 保留原有选中日期事件
const emit = defineEmits(['dateSelected', 'dateClick', 'monthChange'])

// ✅ 响应式核心数据
const currentYear = ref(props.initYear)
const currentMonth = ref(props.initMonth)
const weekList = ref(['日', '一', '二', '三', '四', '五', '六'])
const calendarDays = ref([])
// 选中日期的响应式数据，记录当前选中的日期
const selectedDate = ref({ year: null, month: null, day: null })

// 年份列表+月份列表
const nowYear = new Date().getFullYear()
const yearList = ref(Array.from({length: 10}, (v, i) => nowYear - 5 + i))
const monthList = ref([1,2,3,4,5,6,7,8,9,10,11,12])

// 年份/月份选择器的默认选中下标
const yearIndex = computed(() => {
  return yearList.value.findIndex(item => item === currentYear.value)
})
const monthIndex = computed(() => {
  return monthList.value.findIndex(item => item === currentMonth.value)
})

// ✅ 核心方法：生成指定年月的日历数据
const generateCalendar = () => {
  const daysArr = []
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month - 1, 1).getDay()
  const totalDays = new Date(year, month, 0).getDate()
  const lastMonthTotalDays = new Date(year, month - 1, 0).getDate()
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()

  // 补上月月末日期
  for (let i = firstDay - 1; i >= 0; i--) {
    daysArr.push({
      year: month === 1 ? year - 1 : year,
      month: month === 1 ? 12 : month - 1,
      day: lastMonthTotalDays - i,
      isOtherMonth: true,
      isToday: false,
      taskDueCount: 0,
      taskCount:0
    })
  }

  // 生成当月日期
  for (let day = 1; day <= totalDays; day++) {
    const fullDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`
    const taskItem = props.taskList.find(item => item.date === fullDate)
    daysArr.push({
      year,
      month,
      day,
      date: fullDate,
      isOtherMonth: false,
      isToday: year === todayYear && month === todayMonth && day === todayDay,
      taskDueCount: taskItem ? taskItem.dueCount : 0,
      taskCount: taskItem ? taskItem.count : 0
    })
  }

  // 补下月月初日期
  let remain = 42 - daysArr.length
  if (remain>7){
    remain = remain -7
  }
  for (let day = 1; day <= remain; day++) {
    daysArr.push({
      year: month === 12 ? year + 1 : year,
      month: month === 12 ? 1 : month + 1,
      day,
      isOtherMonth: true,
      isToday: false,
      taskDueCount: 0,
      taskCount:0
    })
  }

  calendarDays.value = daysArr
}

// 左右切换月份方法
const changeMonth = (type) => {
  if (type === -1) {
    currentMonth.value -= 1
    if (currentMonth.value < 1) {
      currentMonth.value = 12
      currentYear.value -= 1
    }
  } else {
    currentMonth.value += 1
    if (currentMonth.value > 12) {
      currentMonth.value = 1
      currentYear.value += 1
    }
  }
}

// 年份选择器点击事件
const handleYearChange = (e) => {
  currentYear.value = yearList.value[e.detail.value]
}

// 月份选择器点击事件
const handleMonthChange = (e) => {
  currentMonth.value = monthList.value[e.detail.value]
}

// 日期点击事件 - 选中日期+传参给父组件
const handleDateClick = (item) => {
  // 只处理【当月有效日期】，补位日期不触发
  if (!item.isOtherMonth) {
    // 1. 记录选中的日期，用于高亮样式
    selectedDate.value = {
      year: item.year,
      month: item.month,
      day: item.day
    }
    // 2. 把选中的完整日期数据传给父组件
    emit('dateSelected', item)
  }
}

// ✅ ✅ ✅ 核心新增：监听年月变化，自动通知父组件
watch([currentYear, currentMonth], (newVal) => {
  generateCalendar()
  // 切换月份后，清空选中状态
  selectedDate.value = { year: null, month: null, day: null }
  // ✅ 关键：向父组件抛出月份变化事件 + 传递最新的年月数据
  emit('monthChange', {
    year: currentYear.value,
    month: currentMonth.value
  })
}, { immediate: true })

watch(() => props.taskList, () => {
  generateCalendar()
}, { deep: true })
</script>

<style scoped>
/* 日历整体容器 */
.task-calendar-container {
  width: 100%;
  padding: 20rpx;
  box-sizing: border-box;
  background-color: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.06);
  margin: 10rpx 0;
}

/* 头部：左右按钮 + 年月选择器 */
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10rpx 0;
  margin-bottom: 20rpx;
}
.prev-btn, .next-btn {
  width: 128rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 34rpx;
  background-color: #f5f7fa;
}
.btn-icon {
  color: #007AFF;
  font-size: 24rpx;
}
.date-select-wrap {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.select-item {
  font-weight: 600;
  color: #222222;
  padding: 8rpx 20rpx;
}

/* 星期头部 大气舒展样式 */
.calendar-week {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
  width: 100%;
}
.week-item {
  width: calc(100% / 7);
  height: 70rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.week-text {
  font-size: 28rpx;
  font-weight: 600;
}

/* 日历主体：日期格子容器 */
.calendar-content {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 0;
}
.date-item {
  width: calc(100% / 7);
  height: 100rpx;
  line-height: 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  position: relative;
  border-radius: 12rpx;
  transition: all 0.2s ease;
}
.date-num {
  color: #333;
}
/* 其他月份补位日期 */
.other-month .date-num {
  color: #e0e0e0;
}
/* 今日高亮样式 */
.today {
  background-color: #e6f0ff;
}
.today .date-num {
  color: #007AFF;
  font-weight: bold;
}
/* 选中日期高亮样式 */
.selected-date {
  background-color: #007AFF;
}
.selected-date .date-num {
  color: #ffffff !important;
  font-weight: bold;
}
/* 选中日期+今日 叠加样式 */
.today.selected-date {
  background-color: #007AFF;
  opacity: 0.9;
}

/* 任务数量角标样式 */
.task-due-count-tag {
  position: absolute;
  top: 1rpx;
  right: 1rpx;
  min-width: 40rpx;
  height: 40rpx;
  background-color: #e9398b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 任务数量角标样式 */
.task-count-tag {
  position: absolute;
  top: 1rpx;
  right: 30rpx;
  min-width: 32rpx;
  height: 32rpx;
  background-color: rgb(233 58 139 / 20%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tag-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 500;
}
</style>