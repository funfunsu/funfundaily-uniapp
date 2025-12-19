<template>
  <view
      class="task-item"
      :class="{ 'task-item--completed': task.isCompleted }"
  >
    <view class="task-header">
      <view class="task-title-section">
        <text class="task-title"  @click.stop="handleEditTaskClick()">{{ task.itemTitle || '任务标题' }}<text class="edit-icon"></text></text>
      </view>

      <view class="task-actions">

        <switch
            :checked="!!task.isCompleted"
            :disabled="!!task.isCompleted"
            @change="(e) => handleTaskCheck(e)"
            class="task-switch"
        />
        <!-- 得分，紧跟在 switch 后面 -->
        <text
            class="task-point"
            :class="{ 'task-point--completed': task.isCompleted }"
        >
          +{{ task.extra.score || 0 }} 分
        </text>
      </view>
    </view>

    <!-- 任务描述和完成时间在同一行 -->
    <view class="task-desc-and-time">
      <text class="task-desc">{{ task.itemDesc || '暂无任务描述' }}</text>
      <!-- 完成后时间，与描述同行并靠右 -->
      <text v-if="task.isCompleted" class="completed-time">
        {{ DateUtils.formatDateTimeToShow(new Date(task.completedTime)) }}
      </text>
      <text class="delay" v-else-if="task.repeatType !== 'daily'" @click.stop="delayClick">推迟</text>
    </view>
  </view>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import DateUtils from "../../utils/util";

// Props：接收单个任务对象
const props = defineProps({
  task: {
    type: Object,
    required: true
  }
})

// Emits：定义组件向外触发的事件
const emit = defineEmits([
  'item-click',
  'edit-task',
  'check-task',
  'delay-click'
])

// 方法：点击任务项主体（未完成状态下）
const itemClick = () => {
  emit('item-click', props.task)
}

const delayClick = () =>{
  console.log('delay!')
  emit('delay-click', props.task)
}

// 方法：点击编辑图标
const handleEditTaskClick = () => {
  emit('edit-task', props.task)
}

// 方法：切换完成状态
const handleTaskCheck = (event) => {
  const checked = event.detail.value // 假设是微信小程序或 uni-app 环境
  if (checked) {
    emit('check-task', { task: props.task, completed: true })
  }
}

// 辅助函数：格式化时间
const formatTime = (timestamp) => {
  debugger
  DateUtils.formatDate(new Date(timestamp))
}
</script>

<style scoped>
/* --- 主容器 --- */
.task-item {
  padding: 16px;
  border-bottom: 1px solid #eee;
  transition: all 0.2s ease;
  background-color: #ffffff;
}

.task-item--completed {
}

/* --- 头部行 --- */
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

/* --- 标题区域 --- */
.task-title-section {
  flex-grow: 1;
  min-width: 0; /* 允许内部文本溢出隐藏 */
}

.task-title {
  color: #007aff;
  word-break: break-word;
}

.task-item--completed .task-title {
  color: #888;
  text-decoration: line-through;
}

/* --- 描述和时间容器 --- */
.task-desc-and-time {
  display: flex;
  justify-content: space-between; /* 关键：描述左对齐，时间右对齐 */
  align-items: center;
  font-size: 14px;
  color: #666;
  min-height: 20px; /* 确保基本高度 */
  gap: 8px; /* 当内容靠近时提供一点间距 */
}

/* --- 任务描述 --- */
.task-desc {
  flex-grow: 1; /* 描述占据剩余空间 */
  flex-shrink: 1; /* 允许收缩 */
  min-width: 0; /* 允许长文本溢出并换行 */
  word-break: break-word;
  font-size: smaller;
}

.task-item--completed .task-desc {
  color: #aaa;
}

/* --- 完成时间 --- */
.completed-time {
  flex-shrink: 0; /* 时间不收缩 */
  font-size: 12px;
  color: #4caf50; /* 成功绿色 */
  font-weight: 500;
  white-space: nowrap; /* 防止时间戳换行 */
  margin-left: auto; /* 确保靠右 (虽然 justify-content: space-between 已经做到了) */
}
/* --- 完成时间 --- */
.delay {
  flex-shrink: 0; /* 时间不收缩 */
  font-size: 12px;
  color: #e57427; /* 成功绿色 */
  font-weight: 500;
  white-space: nowrap; /* 防止时间戳换行 */
  margin-left: auto; /* 确保靠右 (虽然 justify-content: space-between 已经做到了) */
}

/* --- 操作区域 --- */
.task-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px; /* 控制操作项之间的间距 */
  margin-left: 12px;
}

.edit-icon {
  font-size: 18px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.edit-icon:hover {
  color: #555;
}

.task-item--completed .edit-icon {
  opacity: 0.5;
  pointer-events: none;
}

.task-item--completed .task-switch  {
}

/* --- 开关样式调整 --- */
.task-switch {
  transform: scale(0.8); /* 稍微缩小开关 */
  margin: 0; /* 重置可能存在的默认边距 */
  flex-shrink: 0; /* 防止被挤压 */
}

/* --- 得分 --- */
.task-point {
  font-size: 14px;
  font-weight: bold;
  color: #bcb9b4; /* 完成前的橙色 */
  transition: color 0.3s ease;
  white-space: nowrap; /* 防止换行 */
  flex-shrink: 0; /* 防止被挤压 */
}

/* 已完成状态下的得分颜色变为绿色 */
.task-point--completed {
  color: #4caf50 !important;
}

</style>