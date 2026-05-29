<template>
  <view
      class="task-item"
      :class="{ 'task-item--completed': task.isCompleted & mode !== 'share', 'task-item--selecting': mode === 'share' }"
      @click="handleItemClick"
  >
    <view class="task-header">
      <!-- 复选框区域（仅在分享模式下显示） -->
      <view v-if="mode === 'share'" class="checkbox-wrapper">
        <checkbox
            :checked="isSelected"
            @click.stop="toggleSelection"
            class="task-checkbox"
        />
      </view>

      <view class="task-title-section">
        <!-- 任务类型图标 -->
        <progress-line-item v-if="task.extra.taskType === 'Habit'" :total-count="3" :fill-count="task.isCompleted?0:2" :is-completed="true"></progress-line-item>
        <!-- 标题在分享模式下不应触发编辑 -->
        <text
            class="task-title"
            @click.stop="switchToCheckinCalendar(task.id)"
        >
          {{ task.itemTitle || '任务标题' }}
        </text>
        <view v-if="!task.isCompleted && task.extra.taskType === 'Habit' && startCount>1">
          <progress-line-item
              :total-count="startCount"
              :fill-count="fillStartCount"
              :is-completed="task.isCompleted"
          />
        </view>
        <template v-if="task.repeatEndDay">
          <text class = "task-marks">{{markText}}</text>
        </template>

        <text  v-if="task.recordExtra?.count" class="check-in-count">
          {{ task.recordExtra?.count || 0 }}/{{task.extra.totalCount}} 次
        </text>
        <text  v-else class="check-in-count">
          {{task.extra.totalCount}} 次
        </text>
      </view>

      <!-- 操作区域（仅在非分享模式下显示） -->
      <template v-if="mode !== 'share'">
        <view class="task-actions">
          <template v-if="!isReadOnly">
            <!-- 编辑入口：跳转任务编辑页（支持修改/删除） -->
            <view class="task-edit-btn" @click.stop="handleEdit">
              <text class="edit-icon">✏️</text>
            </view>
            <!-- 按时间任务的 勾选框 (未完成=空心方框 / 完成=带对勾) -->
            <view
                class="task-check-box"
                :class="{ 'task-check-box--completed': task.isCompleted }"
                :style="{ pointerEvents: task.isCompleted ? 'none' : 'auto' }"
                @click.stop="handleTaskCheck({detail: {value: true}})"
            >
              <text class="check-icon" v-if="task.isCompleted">✓</text>
            </view>
          </template>
        </view>
      </template>
    </view>
    <!-- 任务描述和完成时间/打卡次数在同一行 -->
    <view class="task-desc-and-time" >
      <view class="task-desc-wrap">
        <text class="task-desc">{{ displayDesc }}</text>
        <text
            v-if="isDescLong"
            class="desc-toggle"
            @click.stop="descExpanded = !descExpanded"
        >{{ descExpanded ? '收起' : '查看更多' }}</text>
      </view>
      <template v-if="mode !== 'share'">
        <text v-if="task.completedTime" class="completed-time">
          {{ DateUtils.formatDateTimeToShow(new Date(task.completedTime)) }}
        </text>
        <template v-else>
          <text v-if="todayIsDueDate(task.showExtra?.dueDate)" class="completed-time">
            🚩本日截止
          </text>
          <text v-else  class="completed-time">
            截止于{{ task.showExtra?.dueDate }}
          </text>
        </template>
      </template>
      <!-- 得分，紧跟在进度或开关后 -->
      <text v-if="task.extra?.score>0"
          class="task-point"
          :class="{ 'task-point--completed': task.isCompleted }"
      >
        +{{ task.extra?.score || 0 }} 分
      </text>
    </view>
  </view>
</template>

<script setup>
import {defineProps, defineEmits, computed, ref} from 'vue'
import DateUtils from "../../utils/util";
import {TASK_REPEAT_TYPE_LABEL_MAP} from "../../utils/constants";
import ProgressLineItem from "../fun-components/progress-line-item.vue";

// Props：接收单个任务对象
const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  mode: {
    type: String,
    default: 'normal',
    validator: (value) => ['normal', 'share','taskReadonly','checkinReadonly'].includes(value)
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  curDate:{
    type: Date,
    default:new Date()
  }
})

const taskRepeatTypeLabelMap= TASK_REPEAT_TYPE_LABEL_MAP;

// 任务描述过长时截断，点击「查看更多」展开
const DESC_LIMIT = 40;
const descExpanded = ref(false);
const isDescLong = computed(() => (props.task.itemDesc || '').length > DESC_LIMIT);
const displayDesc = computed(() => {
  const desc = props.task.itemDesc || ' ';
  if (!isDescLong.value || descExpanded.value) return desc;
  return desc.slice(0, DESC_LIMIT) + '…';
});

const todayIsDueDate = (duDate) => {
  return DateUtils.getDateStr(props.curDate) === duDate;
}

const markText = computed(() => {
  if (props.task.repeatType === 'none'){
    return `${DateUtils.formatYearAndMonth(props.task.repeatEndDay)}前`
  }
  return `${DateUtils.formatYearAndMonth(props.task.repeatEndDay)}前${TASK_REPEAT_TYPE_LABEL_MAP[props.task.repeatType]}`
});
const startCount = computed(() => props.task.extra.totalCount);
const isReadOnly = computed(() => ['share','taskReadonly','checkinReadonly'].includes(props.mode));

const fillStartCount = computed(() => {
  const currentCount = props.task?.recordExtra?.count;
  const totalCount = props.task?.extra?.totalCount;

  if (typeof currentCount !== 'number' || isNaN(currentCount) || typeof totalCount !== 'number' || isNaN(totalCount) || totalCount === 0) {
    return 0;
  }

  const ratio = currentCount / totalCount;
  const calculatedStars = ratio * startCount.value;
  return calculatedStars<1?1:calculatedStars;
});

// Emits：定义组件向外触发的事件
const emit = defineEmits([
  'item-click',
  'edit-task',
  'check-task',
  'check-in',
  'delay-click',
  'toggle-select'
])

const handleItemClick = () => {
  if (props.mode === 'share') {
    toggleSelection();
  } else {
    emit('item-click', props.task);
  }
}

const switchToCheckinCalendar = (taskId) => {
  uni.navigateTo({ url: `/pages/task/checkin-calendar?taskId=${taskId}` });
}
const handleEdit = () => {
  emit('edit-task', props.task);
}
const delayClick = () => {
  emit('delay-click', props.task)
}

const handleTaskCheck = (event) => {
  const checked = event.detail.value
  if (checked) {
    emit('check-task', { task: props.task, completed: true })
  }
}

const toggleSelection = () => {
  emit('toggle-select', props.task);
}
</script>

<style scoped>
/* --- 主容器 全部rpx --- */
.task-item {
  padding: 32rpx;
  border-bottom: 2rpx solid #eee;
  transition: all 0.2s ease;
  background-color: #ffffff;
  position: relative;
}

/* --- 复选框包装器 全部rpx --- */
.checkbox-wrapper {
  display: flex;
  align-items: center;
  margin-right: 16rpx;
}
.task-checkbox {
  transform: scale(0.8);
}

/* --- 头部行 全部rpx --- */
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

/* --- 标题区域 全部rpx --- */
.task-title-section {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}
.task-title {
  color: #007aff;
  word-break: break-word;
  flex-grow: 1;
  font-size: 32rpx;
}
.task-item--completed .task-title {
  color: #888;
  text-decoration: line-through;
}

/* --- 描述和时间/打卡次数容器 全部rpx --- */
.task-desc-and-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  color: #666;
  min-height: 40rpx;
  gap: 16rpx;
  flex-wrap: wrap;
}
.task-desc-wrap {
  flex: 1 1 auto;
  min-width: 0;
  word-break: break-word;
}
.task-desc {
  font-size: 24rpx;
}
.desc-toggle {
  font-size: 24rpx;
  color: #007aff;
  margin-left: 8rpx;
  white-space: nowrap;
}
.task-item--completed .task-desc {
  color: #aaa;
}

/* --- 完成时间/打卡次数/推迟按钮 全部rpx --- */
.completed-time {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #888;
  white-space: nowrap;
  margin-left: auto;
}
.check-in-count {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #007aff8f;
  font-weight: 500;
  white-space: nowrap;
  margin-left: auto;
}
.delay {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #e57427;
  font-weight: 500;
  white-space: nowrap;
  margin-left: auto;
}

/* --- 操作区域 全部rpx --- */
.task-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 16rpx;
  margin-left: 24rpx;
}
.task-point {
  font-size: 28rpx;
  font-weight: bold;
  color: #bcb9b4;
  transition: color 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.task-point--completed {
  color: #4caf50 !important;
}

/* --- 编辑按钮 全部rpx --- */
.task-edit-btn {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.task-edit-btn:active {
  opacity: 0.6;
}
.edit-icon {
  font-size: 30rpx;
  line-height: 1;
}

/* ✅ ✅ ✅ 自定义勾选框 - 你调整的白底蓝勾样式 全部rpx 最终版 */
.task-check-box {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
  border: 3rpx solid #007AFF;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF;
  transition: all 0.2s ease;
}
/* 完成状态：保留白色背景 + 蓝色边框 + 蓝色对勾 你的要求样式 */
.task-check-box--completed {
  border-color: #FFFFFF;
}
.task-marks{
  color: #007aff8f;
  font-size: 24rpx;
  padding-right: 1rpx;
  padding-left: 1rpx;
}
.check-icon {
  color: #007AFF;
  font-size: 40rpx;
  font-weight: bold;
  line-height: 1;
}
.flag-warning{
  color: #34C759;   /* 完成状态-绿色小旗 (完成成功色) */
}
</style>