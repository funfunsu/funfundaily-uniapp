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
        <fun-radio-group
            :options="radioOptions"
            v-model="schedule.extra.taskType"
        ></fun-radio-group>
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
import FunRadioGroup from "../fun-components/fun-radio-group.vue";
import {HOBIT_TASK_REPEAT_TYPE_LABELS, HOBIT_TASK_REPEAT_TYPE_VALUES} from "../../utils/constants";

// --- Props 定义 ---
const props = defineProps({
  schedule: {
    type: Object,
    required: true
  },
  curDate: {
    type: Date,
    default: () => new Date() // ✅ 正确：引用类型的默认值必须是函数返回
  }
});

const radioOptions = reactive([
  { label: '按次数', value: 'Times' },
  { label: '按时间', value: 'Time' }
])

// --- Refs for static-ish options ---
const repeatTypeOptions = ref(HOBIT_TASK_REPEAT_TYPE_LABELS);
const repeatTypeValues = ref(HOBIT_TASK_REPEAT_TYPE_VALUES);
const weekDays = ref(['一', '二', '三', '四', '五', '六', '日']);
const weekDayIndex = ref(['1', '2', '3', '4', '5', '6', '0']);
const monthDays = ref(Array.from({ length: 31 }, (_, i) => (i + 1).toString()));
const itemLabelOptions = ref(['学校', '家里']);
const itemLabelValues = ref(['school', 'home']);

// --- 新增：设置模式 ---
const settingMode = ref('Time');
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
/* 全局容器 - 统一 rpx 单位 */
.schedule-edit-container {
  height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.edit-content {
  flex: 1;
  overflow-y: auto;
  padding: 30rpx;
  box-sizing: border-box;
}

.form-section {
  background-color: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  display: block;
}

/* 基础表单项样式 */
.form-item {
  margin-bottom: 30rpx;
  box-sizing: border-box;
}

/* 核心修复：form-row 样式 */
.form-row {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 核心修复：form-item-inline 样式 */
.form-item-inline {
  width: calc(50% - 15rpx);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  margin-right: 15rpx;
  margin-bottom: 20rpx;
  flex-shrink: 0;
  flex-grow: 0;
}

.form-row > .form-item-inline:nth-child(2n) {
  margin-right: 0 !important;
}

/* 标签样式 - 统一 rpx */
.label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.expand-container {
  animation: slideDown 0.2s ease-out;
}

/* ✅✅✅ 【重中之重】input 终极完美样式 - 根治：默认值偏下+光标居左+placeholder居中  */
.input {
  width: 100%;
  padding: 0 24rpx; /* 关键1：上下padding设为0，左右保留24rpx，彻底消除内边距挤压 */
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  transition: border-color 0.3s;
  height: 80rpx; /* 高度不变，和你原来一致 */
  line-height: 80rpx; /* 关键2：行高=高度，实现【非聚焦/聚焦】都垂直居中 */
  text-align: left; /* 关键3：强制文字、光标永远居左，永不居中 */
  vertical-align: middle; /* 关键4：小程序专属，修复基线对齐bug，让默认值必居中 */
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: #2196f3;
}

/* ✅ textarea 样式保留，正常无问题 */
.textarea {
  width: 100%;
  padding: 24rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  transition: border-color 0.3s;
  height: 200rpx;
  resize: none;
  text-align: left;
}

.picker {
  width: 100%;
  box-sizing: border-box;
}
.picker-display {
  width: 100%;
  padding: 24rpx;
  border: 2rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  background-color: white;
  transition: border-color 0.3s;
  width: 100%;
  box-sizing: border-box;
  height: 80rpx;
  display: flex; /* flex居中对view容器无任何兼容问题 */
  align-items: center;
  justify-content: center;
}

.picker-display:active {
  border-color: #2196f3;
}

/* 星期选择器样式 */
.week-days-container {
  display: flex;
  box-sizing: border-box;
}

.week-day-item {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #666;
  transition: all 0.3s;
  margin-right: 20rpx;
}

.week-day-item:last-child {
  margin-right: 0;
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
  margin-right: 40rpx;
  box-sizing: border-box;
}

.radio-text {
  margin-left: 10rpx;
  font-size: 28rpx;
  color: #333;
}

/* 展开动画 */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.type-selector {
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}
.selector-item {
  flex: 1;
  box-sizing: border-box;
  padding: 24rpx;
  border: 2rpx solid #ddd;
  font-size: 28rpx;
  transition: all 0.3s;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.selector-item.selected {
  background-color: #007aff;
  color: white;
  border-color: #007aff; /* 选中后边框和背景色一致，视觉更干净 */
}
</style>