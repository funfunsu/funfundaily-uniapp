<template>
  <view class="schedule-edit-container">
    <view class="edit-content">
      <!-- 基本信息 -->
      <view class="form-section">
        <text class="section-title">基本信息</text>

        <view class="form-item">
          <text class="label">标题 *</text>
          <input class="input" v-model="schedule.itemTitle" placeholder="请输入日程标题"/>
        </view>
        <view class="form-item">
          <text class="label">描述</text>
          <view class="expand-container">
            <textarea class="textarea" v-model="schedule.itemDesc" placeholder="请输入日程描述"/>
          </view>
        </view>
      </view>

      <!-- 设置模式选择 -->
      <view class="form-section">
        <text class="section-title">模式</text>
        <view class="form-row">
          <!-- 使用 flex 并排 -->
          <view class="form-item  form-item-inline" @click="setSettingType('Times')">
            <button :class="['selector-btn', { active: schedule.extra.taskType === 'Times' }]">
              按次数
            </button>
          </view>
          <view class="form-item  form-item-inline" @click="setSettingType('Time')">
            <button :class="['selector-btn', { active: schedule.extra.taskType === 'Time' }]">
              按时间
            </button>
          </view>
        </view>
      </view>

      <!-- 时间设置相关 (当 mode 为 'Time') -->
      <view class="form-section" v-if="schedule.extra.taskType === 'Time'">
        <text class="section-title">时间设置</text>
        <view class="form-row">

          <!-- 重复类型选择 -->
          <view class="form-item  form-item-inline">
            <text class="label">重复类型</text>
            <picker class="picker" mode="selector" :range="repeatTypeOptions"
                    :value="getRepeatTypeIndex(schedule.repeatType)" @change="handleRepeatTypeChange">
              <view class="picker-display">{{ getRepeatTypeText(schedule.repeatType) }}</view>
            </picker>
          </view>
          <!-- 不重复：日期+时间 -->
          <view  v-if="schedule.repeatType === 'none'" class="form-item  form-item-inline">
            <text class="label">事件日期 *</text>
            <picker class="picker" mode="date" :value="formatDate(schedule.startTime)" start="2025-01-01"
                    end="2030-12-31" @change="(e) => handleEventDateChange(e)">
              <view class="picker-display">{{ formatDate(schedule.startTime) }}</view>
            </picker>
          </view>
          <view v-else-if="isWeekRepeat(schedule.repeatType)" class="form-item  form-item-inline">
            <text class="label">重复星期</text>
            <view class="week-days-container">
              <view v-for="(day, index) in weekDays" :key="index" class="week-day-item"
                    :class="{ selected: schedule.repeatKeys.includes(weekDayIndex[index]) }"
                    @click="toggleWeekDay(weekDayIndex[index])">
                {{ day }}
              </view>
            </view>
          </view>
          <view class="form-item form-item-inline" v-else-if="schedule.repeatType === 'monthly'">
            <text class="label">日期 *</text>
            <picker class="picker" mode="selector" :range="monthDays"
                    :value="getMonthDayIndex(schedule.repeatKeys[0])"
                    @change="(e) => handleMonthDayChange(e, 'startTime')">
              <view class="picker-display">{{ schedule.repeatKeys[0] }}日</view>
            </picker>
          </view>
          <view class="form-item  form-item-inline" v-else-if="schedule.repeatType === 'yearly'">
            <text class="label">日期 *</text>
            <picker class="picker" mode="date" :value="schedule.repeatKeys[0]" fields="month-day"
                    @change="(e) => handleYearDateChange(e)">
              <view class="picker-display">{{ (schedule.repeatKeys[0]) }}</view>
            </picker>
          </view>
        </view>
        <!-- 重复时间范围 - 仅在设置重复时显示 -->
        <view v-if="schedule.repeatType !== 'none'" class="form-row">
          <view class="form-item form-item-inline">
            <text class="label">重复开始日期</text>
            <picker class="picker" mode="date" :value="formatDate(schedule.repeatStartDay)"
                    start="2023-01-01" end="2030-12-31"
                    @change="(e) => handleRepeatDateChange(e, 'repeatStartDay')">
              <view class="picker-display">{{ formatDate(schedule.repeatStartDay) }}</view>
            </picker>
          </view>

          <view class="form-item form-item-inline">
            <text class="label">重复结束日期</text>
            <picker class="picker" mode="date" :value="formatDate(schedule.repeatEndDay)"
                    start="2023-01-01" end="2030-12-31"
                    @change="(e) => handleRepeatDateChange(e, 'repeatEndDay')">
              <view class="picker-display">{{ formatDate(schedule.repeatEndDay) }}</view>
            </picker>
          </view>
        </view>
      </view>

      <!-- 次数设置相关 (当 mode 为 'count') -->
      <view class="form-section" v-else-if="schedule.extra.taskType === 'Times'">
        <text class="section-title">次数设置</text>

        <view class="form-row">
          <view class="form-item form-item-inline" >
            <text class="label">重复类型</text>
            <picker class="picker" mode="selector" :range="repeatTypeOptions"
                    :value="getRepeatTypeIndex(schedule.repeatType)" @change="handleRepeatTypeChange">
              <view class="picker-display">{{ getRepeatTypeText(schedule.repeatType) }}</view>
            </picker>
          </view>
          <view class="form-item form-item-inline">
            <text class="label">次数</text>
            <input class="input" type="number" v-model.number="schedule.extra.totalCount" placeholder="请输入总执行次数"/>
          </view>

        </view>

        <view class="form-row">
          <view class="form-item form-item-inline">
            <text class="label">截止日期</text>
            <picker class="picker" mode="date" :value="formatDate(schedule.repeatEndDay)"
                    start="2023-01-01" end="2030-12-31"
                    @change="(e) => handleRepeatDateChange(e, 'repeatEndDay')">
              <view class="picker-display">{{ formatDate(schedule.repeatEndDay) }}</view>
            </picker>
          </view>
        </view>
      </view>

      <!-- 类型设置 -->
      <view class="form-section" v-if="schedule.itemType !== 'task' && settingMode === 'Time'">
        <text class="section-title">类型设置</text>

        <view class="form-item">
          <text class="label">日程类型</text>
          <picker class="picker" mode="selector" :range="itemLabelOptions"
                  :value="getItemLabelIndex(schedule.itemLabel)" @change="handleItemLabelChange">
            <view class="picker-display">{{ getItemLabelText(schedule.itemLabel) }}</view>
          </picker>
        </view>
      </view>

      <!-- 积分设置 - 放在一行显示 -->
      <view class="form-section" v-if="schedule.itemType === 'task'">
        <text class="section-title">积分设置</text>

        <view class="form-row">
          <view class="form-item form-item-inline">
            <text class="label">积分数量</text>
            <input class="input" type="number" v-model.number="schedule.extra.score" placeholder="积分"/>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 引入必要的 Vue 功能
import { ref, reactive, computed, onMounted } from 'vue';
import DateUtils from "../../utils/util";
import { getStoredData, setStoredData, STORAGE_KEYS } from "../../utils/storageManager";

// --- Props 定义 ---
const props = defineProps({
  schedule: Object,
  curDate: new Date()
});

// --- Refs for static-ish options ---
const repeatTypeOptions = ref(['一次性', '每天', '每周', '每月', '每年']);
const repeatTypeValues = ref(['none', 'daily', 'weekly', 'monthly', 'yearly']);
const weekDays = ref(['一', '二', '三', '四', '五', '六', '日']);
const weekDayIndex = ref(['1', '2', '3', '4', '5', '6', '0']);
const monthDays = ref(Array.from({ length: 31 }, (_, i) => (i + 1).toString()));
const itemLabelOptions = ref(['学校', '家里']);
const itemLabelValues = ref(['school', 'home']);
const showDescription = ref(false);

// --- 新增：设置模式 ---
const settingMode = ref('Time');

let startTime;
let endTime;

let repeatDiffDays = getStoredData(STORAGE_KEYS.SCHEDULE_REPEAT_CACHED_DURATION);
let scheduleDiffMin = getStoredData(STORAGE_KEYS.SCHEDULE_CACHED_DURATION);
if (!repeatDiffDays) {
  repeatDiffDays = 180;
}
if (!scheduleDiffMin) {
  scheduleDiffMin = 45;
}


// 设置类型选择函数
const setSettingType = (type) => {
  props.schedule.extra.taskType = type;
};

const getMonthDay = (dateTimeStr) => {
  if (!dateTimeStr) return 1;
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return 1;
  return date.getDate();
};

const getMonthDayIndex = (dateTimeStr) => {
  const day = getMonthDay(dateTimeStr);
  return day - 1;
};


const handleMonthDayChange = (e, field) => {
  const dayIndex = e.detail.value;
  if (props.schedule.repeatKeys && Array.isArray(props.schedule.repeatKeys)) {
    props.schedule.repeatKeys[0] = monthDays.value[dayIndex];
  }
};

const handleYearDateChange = (e) => {
  const dateStr = e.detail.value;
  const [year, month, day] = dateStr.split('-');
  const formattedKey = month + '-' + day;
  if (props.schedule.repeatKeys && Array.isArray(props.schedule.repeatKeys)) {
    props.schedule.repeatKeys[0] = formattedKey;
  }
};

const formatDate = (dateTimeStr) => {
  if (dateTimeStr) {
    return DateUtils.getDateFromDateTimeStr(dateTimeStr);
  }
};

const getRepeatTypeIndex = (type) => {
  if (!props.schedule.repeatType) {
    props.schedule.repeatType = 'none';
  }
  const index = repeatTypeValues.value.indexOf(props.schedule.repeatType);
  return index !== -1 ? index : 0;
};

const getRepeatTypeText = (type) => {
  const index = repeatTypeValues.value.indexOf(type);
  return index !== -1 ? repeatTypeOptions.value[index] : repeatTypeOptions.value[0];
};

const getItemLabelIndex = (type) => {
  const index = itemLabelValues.value.indexOf(type);
  return index !== -1 ? index : 0;
};

const getItemLabelText = (type) => {
  const index = itemLabelValues.value.indexOf(type);
  return index !== -1 ? itemLabelOptions.value[index] : itemLabelOptions.value[0];
};

const handleRepeatDateChanged = (field) => {
  if (field === 'repeatStartDay') {
    const repeatStartDay = new Date(props.schedule['repeatStartDay']);
    const endDate = new Date(repeatStartDay);
    endDate.setDate(endDate.getDate() + repeatDiffDays);
    props.schedule.repeatEndDay = DateUtils.getDayEndTimeStr(endDate);
  } else if (field === 'repeatEndDay') {
    const repeatEndDay = new Date(props.schedule[field]);
    const repeatStartDay = new Date(props.schedule['repeatStartDay']);
    const dayDiff = DateUtils.getDaysDiff(repeatStartDay, repeatEndDay);
    if (repeatDiffDays !== dayDiff) {
      repeatDiffDays = dayDiff;
      setStoredData(STORAGE_KEYS.SCHEDULE_REPEAT_CACHED_DURATION, dayDiff);
    }

    if(props.schedule.extra.taskType === 'Times'){
      props.schedule['endTime'] = props.schedule[field];
    }
  }
};

const handleRepeatDateChange = (e, field) => {
  const dateStr = e.detail.value;
  props.schedule[field] = DateUtils.replaceDatePart(props.schedule[field], dateStr);
  handleRepeatDateChanged(field);
};

const handleEventDateChange = (e) => {
  const dateStr = e.detail.value;
  props.schedule['startTime'] = DateUtils.replaceDatePart(props.schedule['startTime'], dateStr);
  props.schedule['endTime'] = DateUtils.replaceDatePart(props.schedule['endTime'], dateStr);
};

const isWeekRepeat = (repeatType) => {
  return repeatType === 'weekly' || repeatType === 'oddWeek' || repeatType === 'evenWeek';
};

const handleRepeatTypeChange = (e) => {
  const index = e.detail.value;
  const today = props.curDate ? props.curDate : new Date();
  props.schedule.repeatType = repeatTypeValues.value[index];
  if (props.schedule.repeatType === 'none') {
    return;
  }
  if (isWeekRepeat(props.schedule.repeatType)) {
    props.schedule.repeatKeys = [DateUtils.getWeekDay(today).toString()];
  } else if (props.schedule.repeatType === 'yearly') {
    props.schedule.repeatKeys = [DateUtils.getDayInYear(today)];
  } else if (props.schedule.repeatType === 'monthly') {
    props.schedule.repeatKeys = [DateUtils.getDayInMonth(today)];
  }
  if (!props.schedule.repeatStartDay) {
    props.schedule.repeatStartDay = DateUtils.getDayStartTimeStr(today);
  }
  if (props.schedule.repeatType === 'yearly') {
    const repeatStartDay = new Date(props.schedule.repeatStartDay);
    const endDate = new Date(repeatStartDay);
    endDate.setDate(endDate.getDate() + 360 * 20);
    props.schedule.repeatEndDay = DateUtils.getDayEndTimeStr(endDate);
  } else {
    handleRepeatDateChanged('repeatStartDay');
  }

  if ( props.schedule.extra.taskType === 'Times'){
    props.schedule.repeatKeys = ['whole']
  }
};

const handleItemLabelChange = (e) => {
  const index = e.detail.value;
  props.schedule.itemLabel = itemLabelValues.value[index];
};

const toggleWeekDay = (dayIndex) => {
  const key = dayIndex.toString();
  if (!Array.isArray(props.schedule.repeatKeys)) {
    props.schedule.repeatKeys = [];
  }
  const index = props.schedule.repeatKeys.indexOf(key);
  if (index > -1) {
    props.schedule.repeatKeys.splice(index, 1);
  } else {
    props.schedule.repeatKeys.push(key);
  }
  props.schedule.repeatKeys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
};


// --- Lifecycle Hooks ---
onMounted(() => {
  // 组件挂载时，可以根据 props.schedule 的初始状态判断 settingMode
  // 例如，如果 props.schedule 中有 totalCount，则初始为 'count' 模式
  if (!props.schedule.extra.taskType){
    props.schedule.extra.taskType = 'Times';
  }
  if(!props.schedule.extra.totalCount){
    props.schedule.extra.totalCount = 1
  }
});
</script>

<style scoped>
.schedule-edit-container {
  height: 100%;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}


.edit-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.form-section {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  display: block;
}

/* 基础表单项样式 */
.form-item {
  margin-bottom: 15px;
}

/* 行内表单项容器 */
.form-row {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 15px;
  gap: 10px;
}

/* 行内表单项样式 */
.form-item-inline {
  flex: 1;
  min-width: 200px;
  margin-bottom: 0;
}

/* 标签样式 */
.label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.expand-trigger {
  cursor: pointer;
  color: #2196f3;
  transition: color 0.3s;
  margin-bottom: 10px;
  display: inline-block;
}

.expand-trigger:active {
  color: #1976d2;
}

.expand-icon {
  font-size: 12px;
  color: #999;
  margin-left: 5px;
}

.expand-container {
  animation: slideDown 0.2s ease-out;
}

/* 输入框通用样式 */
.input,
.textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: #2196f3;
}

.textarea {
  height: 100px;
  resize: none;
}

.input {
  height: 40px;
  resize: none;
}

/* 选择器样式 */
.picker {
  width: 100%;
}

.picker-display {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  position: relative;
  transition: border-color 0.3s;
}

.picker-display:active {
  border-color: #2196f3;
}

/* 星期选择器样式 */
.week-days-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.week-day-item {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #666;
  transition: all 0.3s;
}

.week-day-item.selected {
  background-color: #2196f3;
  color: white;
}

.week-day-item:active {
  transform: scale(0.95);
}

/* 单选按钮样式 */
.radio-label {
  display: flex;
  align-items: center;
  margin-right: 20px;
}

.radio-text {
  margin-left: 5px;
  font-size: 14px;
  color: #333;
}

/* 展开动画 */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 适配小屏幕 */
@media (max-width: 414px) {
  .edit-content {
    padding: 10px;
  }

  .form-section {
    padding: 12px;
  }

  .form-row {
    flex-direction: column;
    gap: 15px;
  }

  .form-item-inline {
    min-width: 100%;
  }

  .week-days-container {
    gap: 8px;
  }

  .week-day-item {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }

  .radio-label {
    margin-bottom: 10px;
  }
}

/* 适配平板等大屏幕 */
@media (min-width: 768px) {
  .form-row {
    gap: 20px;
  }

  .form-item-inline {
    flex: 0 0 calc(50% - 10px);
    min-width: calc(50% - 10px);
  }

  .form-section {
    padding: 20px;
  }

  .input,
  .textarea,
  .picker-display {
    padding: 14px;
    font-size: 16px;
  }
}


.type-selector {
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
}

.selector-item {
  flex: 1;
  padding: 0 10rpx;
}

.selector-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #f8f8f8;
  border: 1px solid #ddd;
  border-radius: 10rpx;
  font-size: 28rpx;
  color: #666;
  transition: all 0.3s;
}

.selector-btn.active {
  background-color: #007aff;
  color: white;
  border-color: #007aff;
}

.count-settings-row {
  display: flex;
  flex-wrap: wrap; /* 允许换行，以防屏幕太窄 */
}

.inline-item {
  flex: 1; /* 平分剩余空间 */
  min-width: 45%; /* 设置最小宽度，确保在窄屏上也能合理显示 */
  margin-right: 20rpx; /* 右边距 */
}

.inline-item:last-child {
  margin-right: 0; /* 最后一个元素去掉右边距 */
}

.button-container {
  margin-top: 40rpx;
  padding: 0 20rpx;
}
</style>