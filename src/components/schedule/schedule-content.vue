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

  <!-- 中间内容区域 -->
  <view class="content-container">
    <view class="content-wrapper">
      <view class="flex-row">
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
                  <view class="time-slot"></view>
                </view>

                <view class="events-layer">
                  <view
                      v-for="(event, index) in getAllEventsForDate(date)"
                      :key="getEventKey(event, date)"
                      :class="['event-container', `event-${event.color}`]"
                      :style="getEventStyle(event)"
                      @click.stop="toggleEventSelection(event, date)"
                  >
                    <!-- 仅在 shareMode 为 true 时显示选中框 -->
                    <view
                        v-if="shareMode"
                        class="event-checkbox"
                        :class="{ 'checked': isSelected(event, date) }"
                    >
                      <text v-if="isSelected(event, date)">✓</text>
                    </view>

                    <view class="event-title">{{ event.title }}</view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import DateUtils from '../../utils/util';

// Props 定义
const props = defineProps({
  eventList: {
    type: Array,
    default: () => []
  },
  weekDays: {
    type: Array,
    default: () => ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  },
  hours: {
    type: Array,
    default: () => [
      '8:00', '9:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
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

const emit = defineEmits([ 'event-click'])


// Methods
const updateDatesFromEventList = (list) => {
  dates.value = [...new Set(list.map(item => item.date))].sort();
  console.log("🗓️ Updated dates:", dates.value);
};

const getAllEventsForDate = (date) => {
  let schedules = [];
  props.eventList.forEach(event => {
    if (event.date === date) {
      schedules = event.schedules;
    }
  });
  let eventsForDate = [];
  schedules.forEach(schedule => {
    const startTime = DateUtils.getHourAndMinFromDateTimeStr(schedule.startTime);
    const endTime = DateUtils.getHourAndMinFromDateTimeStr(schedule.endTime);
    let color = 'blue';

    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    const durationMinutes = endMinutes - startMinutes;
    const durationHours = durationMinutes / 60;

    eventsForDate.push({
      id: schedule.id,
      title: schedule.itemTitle,
      startHour: parseInt(startTime.split(':')[0]),
      startMinute: parseInt(startTime.split(':')[1]),
      durationHours: durationHours,
      durationMinutes: durationMinutes,
      color: color
    });
  });
  return eventsForDate;
};

const getEventStyle = (event) => {
  const hourHeight = 60;
  const topOffset = (event.startHour - 8) * hourHeight + (event.startMinute / 60) * hourHeight;
  const eventHeight = event.durationHours * hourHeight;

  return {
    position: 'absolute',
    top: `${topOffset}px`,
    height: `${eventHeight}px`,
    zIndex: 10
  };
};

const getEventKey = (event, date) => {
  return event.id != null ? String(event.id) : `${date}-${event.startHour}-${event.title}`;
};

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
  // emit('selection-change', Array.from(selectedEvents.value));
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
  if (!this.shareMode) return;
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
  if (!this.shareMode) return;
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
}, { immediate: false });

// Lifecycle Hooks
onMounted(() => {
  updateDatesFromEventList(props.eventList);
});



// --- 新增：暴露给父组件的方法 ---
defineExpose({
  // 暴露获取选中事件对象的方法
  getSelectedEventObjects,
  getTotalEventCount,
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
}

/* 中间内容区域 */
.content-container {
  flex: 1; /* 占据父容器剩余空间 */
  /* 关键：允许自身滚动 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
  /* 确保它有明确的块级显示 */
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  flex: 1; /* 占据 content-container 的所有可用空间 */
  /* margin-right: -6px; */ /* 如果滚动条导致布局偏移，可以考虑用 padding 或调整其他地方 */
  /* 确保它也有明确的高度上下文 */
  display: flex;
  flex-direction: column;
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
  border: solid;
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

.event-blue {
  background: #2196f3;
}

.event-orange {
  background: #ff9800;
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

.time-line-top {
  top: -23px;
  font-size: small;
  padding-left: 6px;
  color: #2196f3;
}

/* 小屏幕适配 */
@media (max-width: 375px) {
  .day-column {
    width: 90px !important;
  }

  .day-column-header {
    width: 90px !important;
  }
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
</style>