<template>
  <view class="task-list">
    <view v-if="taskList.length === 0" class="no-tasks-container">
      <!-- 引导创建任务的按钮 -->
      <button v-if="mode == 'normal'" class="create-task-btn" @click="onAddTaskClick">
        + 添加一个任务
      </button>
    </view>

    <view v-for="task in taskList" :key="task.id">
      <TaskCard
          @item-click="onTaskItemClick"
          @edit-task="onEditTask"
          @check-task="onTaskCheck"
          @delay-click="onTaskDelay"
          @toggle-select="toggleSelect"
          :mode="mode"
          :is-selected="isTaskSelected(task)"
          :task="task"
          :cur-date = currentDate
      />
    </view>
  </view>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import TaskCard from './task-card.vue'
import DateUtils from "../../utils/util";
import apiTs from "../../utils/apiTs";

// ✅ 1. 接收父组件传递的所有参数
const props = defineProps({
  taskList: {
    type: Array,
    default: () => [],
    required: true
  },
  currentDate:{
    type:Date,
    default:new Date(),
    required:true
  },
  currentMember:{
    type: Object,
    default: () => {},
    required: true
  },
  mode: {
    //readonly || normal || share
    type: String,
    default: 'normal',
    required: true
  },
  selectedTaskIds: {
    type: Set,
    default: () => new Set(),
    required: true
  }
})

// ✅ 2. 抛出所有需要父组件处理的事件（和原页面事件名完全一致，无缝对接）
const emit = defineEmits([
  'task-item-click',
  'check-task',
  'delay-click',
  'toggle-select'
])

// ✅ 3. 组件内部所有方法，逻辑和原页面完全一致，只是触发事件改为emit
// 判断任务是否被选中
const isTaskSelected = (task) => {
  return props.selectedTaskIds.has(task.id);
};

// 切换单个任务的选中状态
const toggleSelect = (task) => {
  if (props.mode !== 'share') return;
  emit('toggle-select', task)
};

// 点击添加任务按钮
const onAddTaskClick = () => {
  uni.navigateTo({ url: '/pages/task/edit' });
}

// 任务项点击
const onTaskItemClick = (taskId) => {
  // emit('task-item-click', taskId)
}
const onEditTask = (task) => { uni.navigateTo({ url: `/pages/task/edit?id=${task.id}` }); }



const onTaskDelay = async (task) => {
  const startDate = DateUtils.getDateFromDateTimeStr(task.startTime, null);
  task.startTime = DateUtils.replaceDatePart(task.startTime, DateUtils.getDateStr(DateUtils.getDayOff(new Date(startDate), 1)))
  const endDate = DateUtils.getDateFromDateTimeStr(task.endTime, null);
  task.endTime = DateUtils.replaceDatePart(task.endTime, DateUtils.getDateStr(DateUtils.getDayOff(new Date(endDate), 1)))
  const req = { targetUserId: props.currentMember.userId, groupId: props.currentMember.groupId, items: [task] };
  await apiTs.schedule.save(req);
  emit('delay-click', task)
}


const onTaskCheck = ({task, completed}) => {
  task.recordExtra.count = task.recordExtra.count ? task.recordExtra.count + 1 : 1;
  const completeFlag = task.extra.taskType === 'Time' ? true : task.recordExtra.count >= task.extra.totalCount
  const data = { taskId: task.id, targetUserId: props.currentMember.userId, groupId: props.currentMember.groupId, taskTime: DateUtils.formatDateTime(props.currentDate) }
  apiTs.checkin.task.complete(data)

  const updatedTask = { ...task, isCompleted: completeFlag, completedTime: Date.now() }
  const index = props.taskList.findIndex(t => t.id === task.id)
  if (index !== -1) props.taskList.splice(index, 1, updatedTask)
  emit('check-task', task,completeFlag)
}
</script>

<style scoped>
.task-list {
  padding: 0 16rpx;
  flex-grow: 1;
}

/* --- 无任务状态容器 --- */
.no-tasks-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40rpx 0;
}

/* --- 创建任务按钮样式 --- */
.create-task-btn {
  width: 60%;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: bold;
  color: #007aff;
  background-color: transparent;
  border: none;
  border: 2rpx dashed #007aff;
  border-radius: 40rpx;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  box-sizing: border-box;
}

.create-task-btn:active {
  opacity: 0.8;
}

/* 小屏适配 */
@media (max-width: 375px) {
  .create-task-btn {
    width: 70%;
    height: 70rpx;
    line-height: 70rpx;
    font-size: 26rpx;
  }
}
</style>