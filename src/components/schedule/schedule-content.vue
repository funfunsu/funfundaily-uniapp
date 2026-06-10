<template>
  <!-- 顶部固定栏 -->
  <view class="top-bar">
    <view class="flex-row" style="width: 100%;">
      <view class="day-column-header" style="width: 12%; flex-shrink: 0;">
        <view class="schedule-header"></view>
      </view>
      <view class="dates-header" style="width: 88%;">
        <view class="flex-row">
          <view
              class="day-column-header"
              v-for="(date, dateIndex) in dates"
              :key="dateIndex"
              style="width: 14%;"
          >
            <view class="schedule-header">
              <view class="schedule-header-item">
                <text>{{ weekDays[new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1] }}</text>
                <text class="date-label">{{ date.split('-').slice(1).join('-') }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>

  <!-- 中间内容区域：可上下滚动 0-24 小时，进入默认定位到 8:00 -->
  <scroll-view
      class="content-container"
      scroll-y
      :scroll-top="defaultScrollTop"
      :scroll-with-animation="false"
  >
    <view class="content-wrapper">

      <!-- 空状态：新用户 / 无日程时的引导，鼓励快速创建第一个日程 -->
      <view v-if="isScheduleEmpty" class="empty-guide">
        <view class="empty-guide__hero">
          <text class="empty-guide__emoji">🗓️</text>
        </view>
        <text class="empty-guide__title">这一周还空着呢～</text>
        <text class="empty-guide__subtitle">把想做的事安排进来，时间会更有掌控感 ✨</text>

        <view class="empty-guide__samples">
          <view class="empty-guide__sample"><text>🏃 晨跑 30 分钟</text></view>
          <view class="empty-guide__sample"><text>📚 睡前亲子阅读</text></view>
          <view class="empty-guide__sample"><text>🍱 周末家庭聚餐</text></view>
        </view>

        <button class="empty-guide__cta" @click="toggleGrid('', '')">
          ＋ 创建第一个日程
        </button>
        <text class="empty-guide__hint">点一下，30 秒搞定第一个安排</text>
      </view>

      <view v-else class="flex-row">
        <view class="time-axis" style="width: 12%; flex-shrink: 0;">
          <view class="flex-column">
            <view
                class="flex-item-V schedule-time"
                v-for="(hour, index) in hours"
                :key="index"
            >
              <view class="time-line-top">{{ hour }}</view>
            </view>
          </view>
        </view>

        <view class="dates-container" style="width: 88%;">
          <view class="flex-row">
            <view
                class="day-column"
                v-for="(date, dateIndex) in dates"
                :key="dateIndex"
                style="width: 14%;"
            >
              <view class="flex-column">
                <view
                    v-for="(hour, hourIndex) in hours"
                    :key="hourIndex"
                    class="flex-item-V schedule-item"
                >
                  <view class="time-slot" @click.stop = "toggleGrid(date,hour)"></view>
                </view>

                <view class="events-layer">
                  <view
                      v-for="(schedule, index) in getAllEventsForDate(date)"
                      :key="getEventKey(schedule, date)"
                      :class="['event-container', getEventColorClass(schedule)]"
                      :style="getEventStyle(schedule)"
                      @click.stop="toggleEventSelection(schedule, date)"
                  >
                    <!-- 仅在 shareMode 为 true 时显示选中框 -->
                    <view
                        v-if="shareMode"
                        class="event-checkbox"
                        :class="{ 'checked': isSelected(schedule, date) }"
                    >
                      <text v-if="isSelected(schedule, date)">✓</text>
                    </view>

                    <view class="event-title">{{ schedule.itemTitle }}</view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import {ref, watch, onMounted, reactive, computed, nextTick} from 'vue';
import DateUtils from '../../utils/util';

// Props 定义
const props = defineProps({
  eventList: {
    type: Array,
    default: () => []
  },
  currentUser:{type:String,default:() => ''},
  weekDays: {
    type: Array,
    default: () => ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  },
  hours: {
    type: Array,
    default: () => [
      '0:00', '1:00', '2:00', '3:00', '4:00', '5:00', '6:00', '7:00',
      '8:00', '9:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
    ]
  },
  shareMode: {
    type: Boolean,
    default: false
  }
});



// State
const selectedEvents = ref(new Set());
const dates = ref([]);
// 进入默认定位到 8:00（行高 60px，时间轴从 0:00 起）。scroll-view 的 scroll-top 仅在「值变化」时
// 才滚动，初值若直接给 480，mp-weixin 首次渲染不会滚动 → 看起来停在 0:00。故初值给 0，渲染后再设为 480 触发滚动。
const MORNING_SCROLL_TOP = 8 * 60;
const defaultScrollTop = ref(0);

// 渲染后把视口定位到早上 8 点
const focusToMorning = () => {
  defaultScrollTop.value = 0;
  nextTick(() => {
    setTimeout(() => { defaultScrollTop.value = MORNING_SCROLL_TOP; }, 60);
  });
};
const personColorMap = reactive({})
const availableColors = ['blue', '1', '2', '3', '4', '5', '6']; // 定义可用的颜色类名

const emit = defineEmits([ 'event-click','grid-click'])


// 如果原来有计算属性，可以在这里用 computed 定义
const isScheduleEmpty = computed(() => {
  const hasNonEmptySchedule = props.eventList.some((item) => {
    // 检查 item 是否存在，item.schedules 是否存在，以及其长度是否大于 0
    return item && item.schedules && item.schedules.length > 0;
  });

  // 如果 hasNonEmptySchedule 为 true (即找到了非空的 schedules)，则整体不为空，isScheduleEmpty 应为 false
  // 如果 hasNonEmptySchedule 为 false (即所有 schedules 都是空的或不存在)，则整体为空，isScheduleEmpty 应为 true
  // 因此，返回值是 hasNonEmptySchedule 的反面
  return !hasNonEmptySchedule;


});

// Methods
const updateDatesFromEventList = (list) => {
  dates.value = [...new Set(list.map(item => item.date))].sort();
  console.log("🗓️ Updated dates:", dates.value);
};

const getEventColorClass = (schedule) => {
  if (props.currentUser){
    return `event-blue`;
  }
  // 假设 event 对象中有 personId 字段，如果没有，请替换为实际字段
  const userId = schedule.userId; // 提供默认值以防缺失
  if (!personColorMap[userId]) {
    // 如果该 userId 还没有分配颜色，则分配一个
    const colorIndex = Object.keys(personColorMap).length;
    personColorMap[userId] = `event-${availableColors[colorIndex]}`;
  }
  return personColorMap[userId];
};

const getAllEventsForDate = (date) => {
  let schedules = [];
  props.eventList.forEach(event => {
    if (event.date === date) {
      schedules =   event.schedules;
    }
  });
  return schedules;
};

const getEventStyle = (schedule) => {
  const startTime = DateUtils.getHourAndMinFromDateTimeStr(schedule.startTime);
  const endTime = DateUtils.getHourAndMinFromDateTimeStr(schedule.endTime);
  const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
  const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
  const durationMinutes = endMinutes - startMinutes;
  const durationHours = durationMinutes / 60;

  const startHour =  parseInt(startTime.split(':')[0]);
  const startMinute = parseInt(startTime.split(':')[1]);

  const hourHeight = 60;
  // 锚点取时间轴第一格的小时（当前为 0:00），使事件定位随轴起点自适应
  const gridStartHour = parseInt((props.hours?.[0] || '0:00').split(':')[0]) || 0;
  const topOffset = (startHour - gridStartHour) * hourHeight + (startMinute / 60) * hourHeight;
  const eventHeight = durationHours * hourHeight;

  return {
    position: 'absolute',
    top: `${topOffset}px`,
    height: `${eventHeight}px`,
    zIndex: 10
  };
};

const getEventKey = (event, date) => {
  return event.id != null ? String(event.id) : `${date}-${event.startTime}-${event.endTime}`;
};

const toggleGrid = (date,hour) =>{
  emit('grid-click',date,hour)
}

const toggleEventSelection = (event, date) => {
  if (!props.shareMode) {
    emit('event-click',event)
    return; // 非分享模式不可选
  }
  const key = getEventKey(event, date);
  if (selectedEvents.value.has(key)) {
    selectedEvents.value.delete(key);
  } else {
    selectedEvents.value.add(key);
  }
};

const isSelected = (event, date) => {
  return selectedEvents.value.has(getEventKey(event, date));
};

const clearSelection = () => {
  selectedEvents.value.clear();
  // emit('selection-change', []);
};

const getTotalEventCount = () => {
  let total = 0;
  props.eventList.forEach(event => {
    total += (event.schedules || []).length;
  });
  return total;
}


// 全选所有事件
const selectAll= () =>  {
  if (!props.shareMode) return;
  selectedEvents.value.clear();
  for (const date of dates.value) {
    const events = getAllEventsForDate(date);
    for (const event of events) {
      selectedEvents.value.add(getEventKey(event, date));
    }
  }
  // this.$emit('selection-change', Array.from(selectedEvents.value));
}

// 反选（已选的取消，未选的选中）
const toggleSelectAll= () => {
  if (!props.shareMode) return;
  const allKeys = new Set();
  for (const date of dates.value) {
    const events = getAllEventsForDate(date);
    for (const event of events) {
      allKeys.add(getEventKey(event, date));
    }
  }

  const newSelected = new Set();
  for (const key of allKeys) {
    if (!selectedEvents.value.has(key)) {
      newSelected.add(key);
    }
  }
  selectedEvents.value = newSelected;
  // this.$emit('selection-change', Array.from(selectedEvents.value));
}


// 获取完整选中事件对象（含原始数据）
const getSelectedEventObjects= () => {
  const selected = [];
  props.eventList.forEach(event => {
    const date = event.date;
    const list = event.schedules;
    list.forEach(schedule => {
      const fakeEvent = {
        id: schedule.id,
        title: schedule.itemTitle,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      };
      const key = getEventKey(fakeEvent, date);
      if (selectedEvents.value.has(key)) {
        selected.push({...schedule, date});
      }
    });
  });
  return selected;
}

// Watchers
watch(() => props.shareMode, (newVal) => {
  if (!newVal) {
    clearSelection();
  }
});

watch(() => props.eventList, (newList) => {
  console.log("📅 eventList changed, updating dates...");
  updateDatesFromEventList(newList);
  if (!isScheduleEmpty.value) focusToMorning();
}, { immediate: false });

// Lifecycle Hooks
onMounted(() => {
  updateDatesFromEventList(props.eventList);
  focusToMorning();
});



// --- 新增：暴露给父组件的方法 ---
defineExpose({
  // 暴露获取选中事件对象的方法
  getSelectedEventObjects,
  getTotalEventCount,
  selectAll,
  toggleSelectAll,
  focusToMorning,
  // clearSelection,
  // getSelectedCount,
  // getTotalEventCount
});
</script>
<style scoped>
/* 顶部固定栏 */
.top-bar {
  height: 40px;
  color: white;
  display: flex;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
  z-index: 100;
  position: fixed;
  width: 100%;
}

/* 中间内容区域：scroll-view，需要明确高度才能内部滚动 */
.content-container {
  height: 100%; /* 父容器为 100vh 的 flex 列，高度确定 */
  position: relative;
  -webkit-overflow-scrolling: touch;
}

.content-wrapper {
  flex: 1; /* 占据 content-container 的所有可用空间 */
  /* margin-right: -6px; */ /* 如果滚动条导致布局偏移，可以考虑用 padding 或调整其他地方 */
  /* 确保它也有明确的高度上下文 */
  display: flex;
  flex-direction: column;
  padding-top: 40px;
  padding-bottom:60px;
}
/* 关键修改：让 flex-row 填充 content-wrapper */
.content-wrapper > .flex-row { /* 使用子选择器更精确 */
  flex: 1; /* 占据 wrapper 的所有可用空间 */
  /* min-height: 0; */ /* 有时在嵌套 flex 中防止子项溢出不被截断 */
}

.content-container::-webkit-scrollbar {
  width: 6px;
}

.content-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.content-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.content-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}

.dates-header {
  overflow-x: auto;
  flex-shrink: 0;
}

.day-column-header {
  display: inline-flex;
  flex-direction: column;
  border-right: 1px solid #eee;
  border-top: 1px solid #eee;
}

/* 左侧时间轴 */
.time-axis {
  background: #f7f8fa;
  border-right: 1px solid #eee;
}

.schedule-time {
  height: 60px;
  line-height: 60px;
  font-size: 12px;
  color: #888;
  text-align: center;
  border-bottom: 1px solid #eee;
}

/* 右侧日期容器 */
.dates-container {
  flex-shrink: 0;
}

.day-column {
  display: inline-flex;
  flex-direction: column;
  border-right: 1px solid #eee;
  position: relative;
}

/* 日期表头 */
.schedule-header {
  height: 40px;
  line-height: 20px;
  background: #f7f8fa;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.schedule-header-item {
  font-size: 14px;
  color: #2196f3;
  font-weight: bold;
  text-align: center;
}

.date-label {
  display: block;
  font-size: 12px;
  color: #888;
  font-weight: normal;
}

/* 时间格子 */
.schedule-item {
  height: 60px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-slot {
  width: 100%;
  height: 100%;
}

/* 事件层 */
.events-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  pointer-events: none;
  height: calc(100% - 40px);
}

.event-container {
  border-radius: 16px;
  padding: 0;
  border: 0.5px solid #ffffff;
  color: #fff;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 auto;
  pointer-events: auto;
  overflow: hidden;
  width: 100%;
  position: relative;
}

.event-title {
  margin-bottom: 2px;
  text-align: center;
  font-size: small;
}

/* 选中框样式 */
.event-checkbox {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #2196f3;
  font-weight: bold;
  z-index: 20;
  pointer-events: none;
}

.event-checkbox.checked {
  background: white;
}


/* 为每种颜色定义具体的背景色 */
.event-blue {
  background: #2196F3;
}
.event-1 {
  background: #1565C0;
}

.event-2 {
  background: #00B8D4;
}

.event-3 {

  background: #3D5AFE;
}

.event-4 {
  background: cornflowerblue;
}

.event-5 {
  background: #1565C0;
}

.event-6 {
  background: #0D47A1;
}

.time-line-top {
  top: -23px;
  font-size: small;
  padding-left: 6px;
  color: #2196f3;
}


/* 布局类 */
.flex-row {
  display: flex;
  flex-direction: row;
}

.flex-column {
  display: flex;
  flex-direction: column;
}


/* --- 空状态引导：新用户 / 无日程时展示 --- */
.empty-guide {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 64rpx 48rpx 80rpx;
  text-align: center;
}

.empty-guide__hero {
  width: 180rpx;
  height: 180rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8f1ff 0%, #d4e6ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(33, 150, 243, 0.18);
  margin-bottom: 36rpx;
}

.empty-guide__emoji {
  font-size: 96rpx;
  line-height: 1;
}

.empty-guide__title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 14rpx;
}

.empty-guide__subtitle {
  font-size: 26rpx;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 40rpx;
}

.empty-guide__samples {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  width: 100%;
  max-width: 460rpx;
  margin-bottom: 48rpx;
}

.empty-guide__sample {
  background: #f7f9fc;
  border: 2rpx solid #eef2f7;
  border-radius: 16rpx;
  padding: 20rpx 28rpx;
  font-size: 27rpx;
  color: #475569;
  text-align: left;
}

.empty-guide__cta {
  width: 100%;
  max-width: 460rpx;
  height: 92rpx;
  line-height: 92rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #4f8cff 0%, #2196f3 100%);
  border: none;
  border-radius: 46rpx;
  box-shadow: 0 10rpx 24rpx rgba(33, 150, 243, 0.32);
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  box-sizing: border-box;
}

.empty-guide__cta::after { border: none; }

.empty-guide__cta:active {
  transform: scale(0.98);
  opacity: 0.92;
}

.empty-guide__hint {
  font-size: 23rpx;
  color: #b0b8c4;
  margin-top: 20rpx;
}

/* --- 小屏适配 --- */
@media (max-width: 375px) {
  .empty-guide { padding: 48rpx 36rpx 64rpx; }
  .empty-guide__hero { width: 150rpx; height: 150rpx; }
  .empty-guide__emoji { font-size: 80rpx; }
  .empty-guide__title { font-size: 34rpx; }
}
</style>