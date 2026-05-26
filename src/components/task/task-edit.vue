<template>
  <view class="schedule-edit-container" :class="{ 'is-embedded': embedded }">
    <view class="edit-content">
      <view class="form">
        <!-- 标题：主输入，置顶突出 -->
        <input
            class="t-title"
            v-model="localSchedule.itemTitle"
            placeholder="想做点什么？"
            placeholder-class="t-title-ph"
        />

        <!-- 描述：默认折叠，点击后展开（已有内容则直接展开） -->
        <view v-if="!showDesc" class="t-desc-add" @click="expandDesc">
          <text class="t-desc-add__icon">＋</text>
          <text>添加描述</text>
        </view>
        <textarea
            v-else
            class="t-desc-textarea"
            v-model="localSchedule.itemDesc"
            :maxlength="500"
            placeholder="补充说明（可选）"
            placeholder-class="t-desc-ph"
            auto-height
        />

        <!-- 类型：分段控件 -->
        <text class="t-group-label">类型</text>
        <view class="t-seg">
          <view class="t-seg__item" :class="{ 't-seg__item--active': scheduleExtra.taskType === 'Habit' }" @click="onTaskTypeChanged('Habit')">习惯</view>
          <view class="t-seg__item" :class="{ 't-seg__item--active': scheduleExtra.taskType === 'Todo' }" @click="onTaskTypeChanged('Todo')">待办</view>
          <view class="t-seg__item" :class="{ 't-seg__item--active': scheduleExtra.taskType === 'Goal' }" @click="onTaskTypeChanged('Goal')">目标</view>
        </view>
        <text class="t-seg-hint">{{ typeHint }}</text>

      <!-- 习惯：重复+次数一行 / 重复范围一行 / 日期细节 / 截止 -->
      <view v-if="scheduleExtra.taskType === 'Habit'" class="t-section">
        <!-- 重复(日月年) 与 次数 同一行 -->
        <view class="t-row t-row--split">
          <picker class="t-split__l" mode="selector" :range="repeatTypeOptions"
                  :value="getRepeatTypeIndex(localSchedule?.repeatType)" @change="handleRepeatTypeChange">
            <view class="t-kv">
              <text class="t-row__label">重复</text>
              <view class="t-row__value"><text>{{ getRepeatTypeText(localSchedule?.repeatType) }}</text><text class="t-row__chev">›</text></view>
            </view>
          </picker>
          <view class="t-split__r">
            <text class="t-row__label">次数</text>
            <view class="t-stepper">
              <view class="t-stepper__btn" @click="stepCount(-1)">−</view>
              <text class="t-stepper__val">{{ scheduleExtra.totalCount }}</text>
              <view class="t-stepper__btn" @click="stepCount(1)">＋</view>
            </view>
          </view>
        </view>

        <!-- 重复范围（非每天）：标签 + 定宽分段，一行展示 -->
        <view v-if="localSchedule?.repeatType !== 'daily'" class="t-row">
          <text class="t-row__label">重复范围</text>
          <view class="t-seg t-seg--inline">
            <view class="t-seg__item" :class="{ 't-seg__item--active': localRepeatDuration === 'whole' }" @click="onRepeatDurationChanged('whole')">不指定</view>
            <view class="t-seg__item" :class="{ 't-seg__item--active': localRepeatDuration === 'select' }" @click="onRepeatDurationChanged('select')">指定日期</view>
          </view>
        </view>

        <!-- 指定日期细节 -->
        <view v-if="localRepeatDuration !== 'whole'">
          <view v-if="isWeekRepeat(localSchedule?.repeatType)" class="t-row t-row--col">
            <text class="t-row__label">重复星期</text>
            <view class="week-days-container">
              <view v-for="(day, index) in weekDays" :key="index" class="week-day-item"
                    :class="{ selected: localSchedule?.repeatKeys?.includes(weekDayIndex[index]) }"
                    @click="toggleWeekDay(weekDayIndex[index])">{{ day }}</view>
            </view>
          </view>
          <picker v-else-if="localSchedule?.repeatType === 'monthly'" mode="selector" :range="monthDays"
                  :value="getMonthDayIndex(localSchedule?.repeatKeys?.[0])" @change="handleMonthDayChange">
            <view class="t-row"><text class="t-row__label">每月日期</text><view class="t-row__value"><text>{{ localSchedule?.repeatKeys?.[0] }}日</text><text class="t-row__chev">›</text></view></view>
          </picker>
          <picker v-else-if="localSchedule?.repeatType === 'yearly'" mode="date" :value="localSchedule?.repeatKeys?.[0]" fields="month-day" @change="handleYearDateChange">
            <view class="t-row"><text class="t-row__label">每年日期</text><view class="t-row__value"><text>{{ localSchedule?.repeatKeys?.[0] }}</text><text class="t-row__chev">›</text></view></view>
          </picker>
        </view>

        <picker mode="date" :value="formatDate(localSchedule?.repeatEndDay)" start="2023-01-01" end="2030-12-31"
                @change="(e) => handleRepeatDateChange(e, 'repeatEndDay')">
          <view class="t-row t-row--last"><text class="t-row__label">截止日期</text><view class="t-row__value"><text>{{ formatDate(localSchedule?.repeatEndDay) }}</text><text class="t-row__chev">›</text></view></view>
        </picker>
      </view>

      <!-- 待办：截止 + 完成次数 -->
      <view v-else-if="scheduleExtra.taskType === 'Todo'" class="t-section">
        <picker mode="date" :value="formatDate(localSchedule?.repeatEndDay)" start="2023-01-01" end="2030-12-31"
                @change="(e) => handleRepeatDateChange(e, 'repeatEndDay')">
          <view class="t-row"><text class="t-row__label">截止日期</text><view class="t-row__value"><text>{{ formatDate(localSchedule?.repeatEndDay) }}</text><text class="t-row__chev">›</text></view></view>
        </picker>
        <view class="t-row t-row--last">
          <text class="t-row__label">完成次数</text>
          <view class="t-stepper">
            <view class="t-stepper__btn" @click="stepCount(-1)">−</view>
            <text class="t-stepper__val">{{ scheduleExtra.totalCount }}</text>
            <view class="t-stepper__btn" @click="stepCount(1)">＋</view>
          </view>
        </view>
      </view>

      <!-- 目标：截止 -->
      <view v-else-if="scheduleExtra.taskType === 'Goal'" class="t-section">
        <picker mode="date" :value="formatDate(localSchedule?.repeatEndDay)" start="2023-01-01" end="2030-12-31"
                @change="(e) => handleRepeatDateChange(e, 'repeatEndDay')">
          <view class="t-row t-row--last"><text class="t-row__label">截止日期</text><view class="t-row__value"><text>{{ formatDate(localSchedule?.repeatEndDay) }}</text><text class="t-row__chev">›</text></view></view>
        </picker>
      </view>

        <!-- 关联目标（仅任务类型）-->
        <view v-if="localSchedule?.itemType === 'task'">
          <text class="t-group-label">关联目标</text>
          <view class="t-chips">
            <view class="t-chip" :class="{ 't-chip--active': !localSchedule.parentId }" @click="handleSelectGoal({ id: 0, title: '无目标' })">无目标</view>
            <view class="t-chip" v-for="(goal, idx) in goalList" :key="idx"
                  :class="{ 't-chip--active': localSchedule.parentId === goal.id }" @click="handleSelectGoal(goal)">{{ goal.itemTitle || '未命名目标' }}</view>
          </view>
        </view>

        <!-- 积分奖励（仅任务类型）-->
        <view v-if="localSchedule?.itemType === 'task'" class="t-row t-row--solo">
          <text class="t-row__label">积分奖励</text>
          <view class="t-stepper">
            <view class="t-stepper__btn" @click="stepScore(-1)">−</view>
            <text class="t-stepper__val">{{ scheduleExtra.score }}</text>
            <view class="t-stepper__btn" @click="stepScore(1)">＋</view>
          </view>
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
  goalList: {
    type: Array,
    default: () => []
  },
  // 嵌入底部弹层时为 true：去掉整页高度/自身滚动/卡片阴影，交给弹层 body 滚动
  embedded: {
    type: Boolean,
    default: false
  }
});

// ✅ 选中目标 赋值parentId
const handleSelectGoal = (goal) => {
  localSchedule.value.parentId = goal.id; // 核心赋值：选中目标的id = parentId
  // 无目标时 parentId = null，和上面的无目标选项联动
};

// watch(() => localSchedule.value.parentId, () => {}, { immediate: true });

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

// 描述：默认折叠，已有内容或点击「添加描述」后展开
const descExpanded = ref(false)
const showDesc = computed(() => descExpanded.value || !!localSchedule.value.itemDesc)
function expandDesc() { descExpanded.value = true }

// 类型说明文案
const typeHint = computed(() => {
  switch (scheduleExtra.taskType) {
    case 'Habit': return '每天 / 每周重复打卡，养成习惯'
    case 'Todo': return '一次性待办，完成即可'
    case 'Goal': return '长期目标，可关联子任务'
    default: return ''
  }
})

// 步进器：次数 ≥ 1，积分 ≥ 0
function stepCount(d) {
  scheduleExtra.totalCount = Math.max(1, Number(scheduleExtra.totalCount || 1) + d)
}
function stepScore(d) {
  scheduleExtra.score = Math.max(0, Number(scheduleExtra.score || 0) + d)
}

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

// ✅ 任务类型切换事件(习惯/Todo)
const onTaskTypeChanged = (e) => {
  scheduleExtra.taskType = e;
  if (e === 'Todo'){
    localSchedule.value.repeatType = 'none';
    localSchedule.value.repeatKeys = [];
    localSchedule.value.itemType = 'task'
  } else if(e === 'Habit'){
    localSchedule.value.repeatType = 'daily'; // 或其他默认类型
    localSchedule.value.repeatKeys = ['whole'];
    localSchedule.value.itemType = 'task'
  }else if(e === 'Goal'){
    localSchedule.value.repeatType = 'none'; // 或其他默认类型
    localSchedule.value.repeatKeys = [];
    localSchedule.value.itemType = 'goal'
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

// 读取缓存配置
let repeatDiffDays = getStoredData(STORAGE_KEYS.SCHEDULE_REPEAT_CACHED_DURATION);
if (!repeatDiffDays) {
  repeatDiffDays = 180;
}

// ✅ 重复类型联动处理
const watchRepeatType = (type, duration) => {
  if(duration === 'select') {
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
    watchRepeatType(e, localRepeatDuration.value);
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
    // localSchedule.value.repeatStartDay = DateUtils.getDateStr(props.curDate)
  }
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

/* 嵌入底部弹层：高度自适应、不自带滚动、去背景 */
.is-embedded {
  height: auto;
  background-color: transparent;
}
.is-embedded .edit-content {
  flex: none;
  overflow: visible;
  padding: 0;
}
.is-embedded .form {
  padding-left: 0;
  padding-right: 0;
  border-radius: 0;
}

/* ===== 极简渐进式表单 ===== */
.form {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 4rpx 28rpx 16rpx;
  box-sizing: border-box;
}

/* 标题：主输入，定高+行高居中，避免大字号被裁切 */
.t-title {
  width: 100%;
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2937;
  height: 96rpx;
  line-height: 96rpx;
  padding: 0;
  margin-top: 8rpx;
  border-bottom: 2rpx solid #f1f5f9;
  box-sizing: border-box;
}
.t-title-ph { color: #cbd5e1; font-weight: 600; }

/* 描述折叠/展开 */
.t-desc-add {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx 0;
  color: #94a3b8;
  font-size: 27rpx;
  border-bottom: 2rpx solid #f1f5f9;
}
.t-desc-add__icon { font-size: 30rpx; }
.t-desc-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx 0;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #334155;
  border-bottom: 2rpx solid #f1f5f9;
}
.t-desc-ph { color: #cbd5e1; }

/* 分组小标题 */
.t-group-label {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin: 30rpx 0 14rpx;
  font-weight: 500;
}

/* 分段控件 */
.t-seg {
  display: flex;
  background: #f1f5f9;
  border-radius: 999rpx;
  padding: 6rpx;
  gap: 6rpx;
}
/* 行内定宽分段（重复范围用）：固定宽度，避免在弹性行里被收缩挤压变形 */
.t-seg--inline { width: 300rpx; flex: none; padding: 4rpx; }
.t-seg__item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 27rpx;
  color: #64748b;
  border-radius: 999rpx;
  transition: all 0.2s;
}
.t-seg__item--active {
  background: #ffffff;
  color: #2196f3;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}
.t-seg-hint {
  display: block;
  font-size: 22rpx;
  color: #b8c2cf;
  margin-top: 12rpx;
}

.t-section { margin-top: 18rpx; }

/* 可点行 */
.t-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 92rpx;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f1f5f9;
}
.t-row--last { border-bottom: none; }
.t-row--solo { border-bottom: none; margin-top: 8rpx; }
.t-row--col {
  flex-direction: column;
  align-items: stretch;
  gap: 16rpx;
}
/* 一行两栏：左选择器（可点）+ 右步进器 */
.t-row--split { gap: 24rpx; }
.t-split__l { flex: 1; min-width: 0; }
.t-split__r { display: flex; align-items: center; gap: 16rpx; flex-shrink: 0; }
.t-kv { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.t-row__label { font-size: 28rpx; color: #334155; }
.t-row__value {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 28rpx;
  color: #1f2937;
}
.t-row__chev { color: #cbd5e1; font-size: 32rpx; }

/* 步进器 */
.t-stepper { display: flex; align-items: center; gap: 6rpx; }
.t-stepper__btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  line-height: 1;
}
.t-stepper__btn:active { background: #e2e8f0; }
.t-stepper__val {
  min-width: 72rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

/* 目标 chips */
.t-chips { display: flex; flex-wrap: wrap; gap: 14rpx; }
.t-chip {
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  color: #475569;
  font-size: 26rpx;
}
.t-chip--active { background: #e6f0ff; color: #2196f3; font-weight: 600; }

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
.goal-select-wrap { width: 100%; display: flex; flex-direction: column; gap: 8rpx; }
.goal-select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 16rpx;
  border-radius: 12rpx;
  background: #f7f8fa;
  font-size: 28rpx;
  color: #333;
  transition: all 0.2s ease;
}
/* 选中态高亮 */
.goal-select-item.active {
  background: #e6f0ff;
  color: #007AFF;
}
.goal-name { flex: 1; }
.icon-selected {
  font-size: 24rpx;
  font-weight: bold;
  color: #007AFF;
}
/* 点击反馈 */
.goal-select-item:active {
  background: #e5e7eb;
}
.goal-select-item.active:active {
  background: #d1e0ff;
}
</style>