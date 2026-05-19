<template> 
  <view class="schedule-edit-container">
    <view class="edit-content">
      <!-- 基本信息 -->
      <view class="form-section">
        <text class="section-title">基本信息</text>
        <view class="form-item">
          <text class="label">标题 *</text>
          <input class="input" v-model="localSchedule.itemTitle" placeholder="请输入日程标题"/>
        </view>
        <view class="form-item">
          <text class="label">描述</text>
          <view class="expand-container">
            <textarea class="textarea" v-model="localSchedule.itemDesc" placeholder="请输入日程描述"/>
          </view>
        </view>
      </view>

      <!-- 设置模式选择 -->
      <view class="form-section">
        <text class="section-title">模式</text>
        <fun-radio-group
            :options="radioOptions"
            @update:modelValue="onTaskTypeChanged"
            :modelValue="scheduleExtra.taskType"
        ></fun-radio-group>
      </view>

      <!-- 习惯养成模式 -->
      <view class="form-section" v-if="scheduleExtra?.taskType === 'Habit'">
        <text class="section-title">时间设置</text>
        <view class="form-row">
          <view class="form-item form-item-inline">
            <text class="label">重复类型</text>
            <picker class="picker" mode="selector" :range="repeatTypeOptions"
                    :value="getRepeatTypeIndex(localSchedule?.repeatType)"
                    @change="handleRepeatTypeChange">
              <view class="picker-display">{{ getRepeatTypeText(localSchedule?.repeatType) }}</view>
            </picker>
          </view>
          <view class="form-item form-item-inline" v-if="localSchedule?.repeatType !== 'daily'">
            <view style="width: 100%" v-if="isWeekRepeat(localSchedule?.repeatType)">
              <text class="label">重复星期</text>
              <view class="week-days-container">
                <view v-for="(day, index) in weekDays" :key="index" class="week-day-item"
                      :class="{ selected: localSchedule?.repeatKeys?.includes(weekDayIndex[index]) }"
                      @click="toggleWeekDay(weekDayIndex[index])">
                  {{ day }}
                </view>
              </view>
            </view>
            <view   style="width: 100%" v-else-if="localSchedule?.repeatType === 'monthly'">
              <text class="label">日期 *</text>
              <picker class="picker" mode="selector" :range="monthDays"
                      :value="getMonthDayIndex(localSchedule?.repeatKeys?.[0])"
                      @change="handleMonthDayChange">
                <view class="picker-display">{{ localSchedule?.repeatKeys?.[0] }}日</view>
              </picker>
            </view>
            <view  style="width: 100%" v-else-if="localSchedule?.repeatType === 'yearly'">
              <text class="label">日期 *</text>
              <picker class="picker" mode="date" :value="localSchedule?.repeatKeys?.[0]" fields="month-day"
                      @change="handleYearDateChange">
                <view class="picker-display">{{ localSchedule?.repeatKeys?.[0] }}</view>
              </picker>
            </view>
          </view>
        </view>
        <view class="form-row" v-if="schedule.itemType !== 'task'">
          <view class="form-item form-item-inline">
            <text class="label">开始时间 *</text>
            <picker class="picker" mode="time" :value="startTime" start="00:00"
                    end="23:59" @change="(e) => handleStartTimeChange(e)">
              <view class="picker-display">{{ startTime }}</view>
            </picker>
          </view>

          <view class="form-item form-item-inline">
            <text class="label">结束时间 *</text>
            <picker class="picker" mode="time" :value="endTime" start="00:00"
                    end="23:59" @change="(e) => handleEndTimeChange(e)">
              <view class="picker-display">{{ endTime }}</view>
            </picker>
          </view>
        </view>

        <view class="form-row">
          <view class="form-item form-item-inline">
            <text class="label">重复至</text>
            <picker class="picker" mode="date" :value="formatDate(localSchedule?.repeatEndDay)"
                    start="2023-01-01" end="2030-12-31"
                    @change="(e) => handleRepeatDateChange(e, 'repeatEndDay')">
              <view class="picker-display">{{ formatDate(localSchedule?.repeatEndDay) }}</view>
            </picker>
          </view>
        </view>
      </view>

      <!-- Todo模式 - 核心修复：totalCount绑定统一为scheduleExtra -->
      <view class="form-section" v-else-if="scheduleExtra?.taskType === 'Todo'">
        <text class="section-title">Todo</text>
        <view class="form-row">
          <view class="form-item form-item-inline">
            <text class="label">日期 *</text>
            <picker class="picker" mode="date" :value="eventDate" fields="month-day"
                    @change="(e) => handleEventDateChange(e)">
              <view class="picker-display">{{ eventDate }}</view>
            </picker>
          </view>
        </view>
        <view class="form-row" v-if="schedule.itemType !== 'task'">
          <view class="form-item form-item-inline">
            <text class="label">开始时间 *</text>
            <picker class="picker" mode="time" :value="startTime" start="00:00"
                    end="23:59" @change="(e) => handleStartTimeChange(e)">
              <view class="picker-display">{{ startTime }}</view>
            </picker>
          </view>
          <view class="form-item form-item-inline">
            <text class="label">结束时间 *</text>
            <picker class="picker" mode="time" :value="endTime" start="00:00"
                    end="23:59" @change="(e) => handleEndTimeChange(e)">
              <view class="picker-display">{{ endTime }}</view>
            </picker>
          </view>
        </view>
      </view>

      <!-- 类型设置 -->
      <view class="form-section">
        <text class="section-title">类型设置</text>
        <view class="form-item">
          <text class="label">日程类型</text>
          <picker class="picker" mode="selector" :range="itemLabelOptions"
                  :value="getItemLabelIndex(localSchedule?.itemLabel)"
                  @change="handleItemLabelChange">
            <view class="picker-display">{{ getItemLabelText(localSchedule?.itemLabel) }}</view>
          </picker>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
// 引入必要的 Vue 功能
import { ref, reactive, computed, onMounted, watch } from 'vue';
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
    default: () => new Date()
  },
  startTime:{
    type: String,
    default:'08:00'
  }
});


let repeatDiffDays = getStoredData(STORAGE_KEYS.SCHEDULE_REPEAT_CACHED_DURATION);
let scheduleDiffMin = getStoredData(STORAGE_KEYS.SCHEDULE_CACHED_DURATION);
if (!repeatDiffDays){
  repeatDiffDays = 180
}
if (!scheduleDiffMin){
  scheduleDiffMin = 45
}

const startTime = ref(null)
const endTime = ref(null)
const eventDate = ref(null)

// 定义自定义事件，可选通知父组件数据就绪
const emit = defineEmits(['schedule-ready']);

// ✅ 初始化给兜底完整结构，模板渲染时永远有值，杜绝undefined报错
const localSchedule = ref({
  id: '',
  itemTitle: '',
  itemDesc: null,
  location: null,
  repeatType: 'none',
  repeatKeys: ['whole'],
  repeatStartDay: DateUtils.getDateStr(new Date()),
  repeatEndDay: DateUtils.getDateStr(new Date()),
  itemType: 'task',
  label: null,
  startTime: '',
  endTime: '',
  userId: '',
  extra: { score: 0, taskType: 'Habit', totalCount: 1 },
  updateScope: null,
  showExtra: null
});

// ✅ 核心：独立响应式extra对象，解决v-model绑定嵌套属性undefined报错
const scheduleExtra = reactive({ score: 0, taskType: 'Habit', totalCount: 1 });

const radioOptions = reactive([
  { label: '重复', value: 'Habit' },
  { label: '不重复', value: 'Todo' }
])
const repeatDurationOptions = reactive([
  { label: '不指定', value: 'whole' },
  { label: '指定日期', value: 'select' }
])

// ✅ 重复时长切换事件 - 修改为操作 localRepeatDuration ref
const onRepeatDurationChanged = (e) => {
  localRepeatDuration.value = e; // 直接修改 ref
  if (e === 'whole'){
    localSchedule.value.repeatKeys = ['whole'];
  } else {
    // 确保 watchRepeatType 函数能正确处理新的 repeatType 和 e
    watchRepeatType(localSchedule.value.repeatType, e);
  }
}


const handleStartTimeChange = (e) => {
  doHandleStartTimeChange(e.detail.value)
};
const doHandleStartTimeChange = (_startTime) => {
  startTime.value = _startTime;
  // 2. 拆分时分并转数字计算
  const [startHour, startMinute] = startTime.value.split(':').map(Number);
  // 3. 核心计算逻辑
  const totalMinutes = startHour * 60 + startMinute + scheduleDiffMin;
  const endHour = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
  const endMinute = String(totalMinutes % 60).padStart(2, '0');
  // 4. 自动赋值结束时间 (同样 HH:mm 格式)
  endTime.value = `${endHour}:${endMinute}`;
};
const handleEndTimeChange = (e, field) => {
  endTime.value = e.detail.value;
  //计算endTime和startTime的diff minute
  endTime.value = e.detail.value;
  // 1. 判空：开始时间为空时不计算，避免报错
  if (!startTime.value) return;

  // 2. 拆分 开始时间 的时和分，并转数字
  const [sH, sM] = startTime.value.split(':').map(Number);
  // 3. 拆分 结束时间 的时和分，并转数字
  const [eH, eM] = endTime.value.split(':').map(Number);

  // 4. 核心计算：转成当日总分钟数 做差值运算
  const startTotalMin = sH * 60 + sM;
  const endTotalMin = eH * 60 + eM;
  const minuteDiff = endTotalMin - startTotalMin;
  if (scheduleDiffMin !== minuteDiff){
    scheduleDiffMin = minuteDiff
    setStoredData(STORAGE_KEYS.SCHEDULE_CACHED_DURATION,minuteDiff)
  }
};

// ✅ 任务类型切换事件(习惯/Todo)
const onTaskTypeChanged = (e) => {
  scheduleExtra.taskType = e;
  if (e === 'Todo'){
    localSchedule.value.repeatType = 'none';
    localSchedule.value.repeatKeys = [];
  } else {
    localSchedule.value.repeatType = 'daily'; // 或其他默认类型
    localSchedule.value.repeatKeys = ['whole'];
  }
}

// ✅ 使用 ref 替代 computed 来管理 localRepeatDuration 的状态
const localRepeatDuration = ref('whole');

// ✅ 一个计算属性来根据 localSchedule.value.repeatKeys 计算当前状态（如果需要的话，主要用于初始化）
// 但主要状态由 localRepeatDuration 控制
const calculateRepeatDuration = (keys) => {
  return keys?.includes('whole') ? 'whole' : 'select';
};

// --- 静态下拉选项定义 ---
const repeatTypeOptions = ref(HOBIT_TASK_REPEAT_TYPE_LABELS);
const repeatTypeValues = ref(HOBIT_TASK_REPEAT_TYPE_VALUES);
const weekDays = ref(['一', '二', '三', '四', '五', '六', '日']);
const weekDayIndex = ref(['1', '2', '3', '4', '5', '6', '0']);
const monthDays = ref(Array.from({ length: 31 }, (_, i) => (i + 1).toString()));
const itemLabelOptions = ref(['学校', '家里']);
const itemLabelValues = ref(['school', 'home']);

// ✅ 计算属性-自动响应任务类型变化
const settingMode = computed(() => {
  return scheduleExtra.taskType === 'Todo' ? 'Todo' : 'Time'
});

// ✅ 重复类型联动处理
const watchRepeatType = (type, duration) => {
  if (isWeekRepeat(type)) {
    localSchedule.value.repeatKeys = [DateUtils.getWeekDay(props.curDate).toString()];
  } else if ( type === 'yearly') {
    localSchedule.value.repeatKeys = [DateUtils.getDayInYear(props.curDate)];
  } else if ( type === 'monthly') {
    localSchedule.value.repeatKeys = [DateUtils.getDayInMonth(props.curDate)];
  }else {
    localSchedule.value.repeatKeys = []
  }
}

// ✅ 获取日期天数
const getMonthDay = (dateTimeStr) => {
  if (!dateTimeStr) return 1;
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return 1;
  return date.getDate();
};

// ✅ 获取日期天数索引
const getMonthDayIndex = (dateTimeStr) => {
  const day = getMonthDay(dateTimeStr);
  return day - 1;
};

// ✅ 月份日期选择事件
const handleMonthDayChange = (e) => { // 移除 field 参数，不需要
  const dayIndex = e.detail.value;
  if (localSchedule.value.repeatKeys && Array.isArray(localSchedule.value.repeatKeys)) {
    localSchedule.value.repeatKeys[0] = monthDays.value[dayIndex];
  }
};

// ✅ 年份日期选择事件
const handleYearDateChange = (e) => {
  const dateStr = e.detail.value;
  // 从 "YYYY-MM-DD" 提取 "MM-DD"
  const [_, month, day] = dateStr.split('-');
  const formattedKey = `${month}-${day}`;
  if (localSchedule.value.repeatKeys && Array.isArray(localSchedule.value.repeatKeys)) {
    localSchedule.value.repeatKeys[0] = formattedKey;
  }
};

// ✅ 日期格式化方法
const formatDate = (dateTimeStr) => {
  if (!dateTimeStr) return '';
  return DateUtils.getDateFromDateTimeStr(dateTimeStr) || ''
};

// ✅ 重复类型索引获取
const getRepeatTypeIndex = (type) => {
  if (!type) type = 'none';
  const index = repeatTypeValues.value.indexOf(type);
  return index !== -1 ? index : 0;
};

// ✅ 重复类型文本获取
const getRepeatTypeText = (type) => {
  const index = repeatTypeValues.value.indexOf(type);
  return index !== -1 ? repeatTypeOptions.value[index] : repeatTypeOptions.value[0];
};

// ✅ 标签索引获取
const getItemLabelIndex = (type) => {
  if(!type) return 0
  const index = itemLabelValues.value.indexOf(type)
  return index > -1 ? index : 0
}

// ✅ 标签文本获取
const getItemLabelText = (type) => {
  const index = getItemLabelIndex(type)
  return itemLabelOptions.value[index]
}

// ✅ 是否是每周重复
const isWeekRepeat = (type) => {
  return type === 'weekly'
}

// ✅ 重复类型切换事件
const handleRepeatTypeChange = (e) => {
  const index = e.detail.value
  localSchedule.value.repeatType = repeatTypeValues.value[index]
  if(localSchedule.value.repeatType !== 'none') {
    watchRepeatType(localSchedule.value.repeatType , localRepeatDuration.value);
  }

  if ( localSchedule.value.repeatType === 'yearly'){
    const repeatStartDay = new Date(localSchedule.value.repeatStartDay);
    const endDate = new Date(repeatStartDay);
    endDate.setDate(endDate.getDate() + 360*20);
    localSchedule.value.repeatEndDay = DateUtils.getDateStr(endDate);
  }else {
    handleRepeatDateChanged('repeatStartDay');
  }
}

// ✅ 星期勾选事件
const toggleWeekDay = (day) => {
  const idx = localSchedule.value.repeatKeys.findIndex(item => item === day)
  if(idx > -1) {
    localSchedule.value.repeatKeys.splice(idx,1)
  } else {
    localSchedule.value.repeatKeys.push(day)
  }
}

// ✅ 标签切换事件
const handleItemLabelChange = (e) => {
  const index = e.detail.value
  localSchedule.value.itemLabel = itemLabelValues.value[index]
}

// ✅ 【重中之重修复】日期赋值事件 - 加固版，支持所有日期字段赋值，不会丢失最新值
const handleRepeatDateChange = (e, field) => {
  if (field && e?.detail?.value) {
    localSchedule.value[field] = e.detail.value;
  }
  handleRepeatDateChanged(field)
}

const handleEventDateChange = (e, field) => {
  eventDate.value = e.detail.value;
}


const handleRepeatDateChanged = (field)=>{
  if (field === 'repeatStartDay'){
    const repeatStartDay = new Date(localSchedule.value[field]);
    const endDate = new Date(repeatStartDay);
    endDate.setDate(endDate.getDate() + repeatDiffDays);
    localSchedule.value.repeatEndDay = DateUtils.getDateStr(endDate);
  }else if (field === 'repeatEndDay'){
    const repeatEndDay = new Date(localSchedule.value[field]);
    const repeatStartDay = new Date(localSchedule.value['repeatStartDay']);
    const dayDiff = DateUtils.getDaysDiff(repeatStartDay,repeatEndDay);
    if (repeatDiffDays !== dayDiff){
      repeatDiffDays = dayDiff
      setStoredData(STORAGE_KEYS.SCHEDULE_REPEAT_CACHED_DURATION,dayDiff)
    }
  }
}

// ✅ 万能深拷贝方法
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// ✅ 初始化赋值 + 监听props变化自动同步
onMounted(() => {
  const scheduleData = props.schedule?.extra ? props.schedule : { ...props.schedule, extra: { score:0, taskType:'Habit', totalCount:1 } };
  console.log(scheduleData)
  const copyData = deepClone(scheduleData);
  localSchedule.value = copyData;
  if (!localSchedule.value.id){
    localSchedule.value.repeatType = 'daily';
    handleRepeatDateChanged('repeatStartDay')
    eventDate.value = DateUtils.getDateStr(props.curDate)
  }else{
    debugger
    eventDate.value = DateUtils.getDateFromDateTimeStr(localSchedule.value.startTime)
    startTime.value = DateUtils.getHourAndMinFromDateTimeStr(localSchedule.value.startTime)
    endTime.value = DateUtils.getHourAndMinFromDateTimeStr(localSchedule.value.endTime)
  }
  doHandleStartTimeChange(props.startTime)
  Object.assign(scheduleExtra, copyData.extra); // 更新 reactive 对象
  localRepeatDuration.value = calculateRepeatDuration(copyData.repeatKeys); // 初始化 localRepeatDuration
  emit('schedule-ready', true);
});

watch(
    () => props.schedule,
    (newSchedule) => {
      const scheduleData = newSchedule?.extra ? newSchedule : { ...newSchedule, extra: { score:0, taskType:'Habit', totalCount:1 } };
      const copyData = deepClone(scheduleData);
      localSchedule.value = copyData;
      Object.assign(scheduleExtra, copyData.extra); // 更新 reactive 对象
      localRepeatDuration.value = calculateRepeatDuration(copyData.repeatKeys); // 同步 localRepeatDuration
      emit('schedule-ready', true);
    },
    { deep: true, immediate: true } // immediate: true 确保首次传入 props 时也触发一次
);

// ✅ 暴露给父组件的核心方法 - 合并所有最新值并返回，父组件直接调用即可拿到全部最新数据
defineExpose({
  getFinalSchedule: () => {
    localSchedule.value.extra = {...scheduleExtra}; // 创建副本，避免外部直接修改内部 reactive 对象
    localSchedule.value.startTime = DateUtils.combineDateTime(eventDate.value,startTime.value+':00')
    localSchedule.value.endTime = DateUtils.combineDateTime(eventDate.value,endTime.value+':00')
    return localSchedule.value;
  }
})
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