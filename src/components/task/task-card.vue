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
        <text class="task-type-icon" :class="task.extra.taskType === 'Time' ? 'icon-time' : 'icon-times'">
          {{ task.extra.taskType === 'Time' ? '' : '⭐' }} <!-- 示例图标 -->
        </text>
        <!-- 标题在分享模式下不应触发编辑 -->
        <text
            class="task-title"
            @click.stop="handleEditTaskClick()"
        >
          {{ task.itemTitle || '任务标题' }}
        </text>
      </view>

      <!-- 操作区域（仅在非分享模式下显示） -->
      <template v-if="mode !== 'share'">
        <view class="task-actions">
          <!-- 按次数任务的星星进度条 -->
          <view v-if="task.extra.taskType === 'Times'" class="stars-container">
            <text
                v-for="n in startCount "
                :key="n"
                class="star-icon"
                :class="{ 'star-filled': n <= fillStartCount, 'star-disabled': task.isCompleted }"
                @click.stop="!task.isCompleted && handleStarClick(n)"
            >
              ★
            </text>
          </view>
          <!-- 按时间任务的开关 -->
          <switch
              v-else-if="task.extra.taskType === 'Time'"
              :checked="!!task.isCompleted"
              :disabled="!!task.isCompleted"
              @change="(e) => handleTaskCheck(e)"
              class="task-switch"
          />
          <!-- 得分，紧跟在进度或开关后 -->
          <text
              class="task-point"
              :class="{ 'task-point--completed': task.isCompleted }"
          >
            +{{ task.extra?.score || 0 }} 分
          </text>
        </view>
      </template>

    </view>

    <!-- 任务描述和完成时间/打卡次数在同一行 -->
    <view class="task-desc-and-time" >
      <text v-if="task.extra.taskType === 'Times'">[{{DateUtils.getDateFromDateTimeStr(task.repeatEndDay)}}前{{task.repeatType === 'none'? '':taskRepeatTypeLabelMap[task.repeatType]}}完成{{task.extra.totalCount}}次]</text>
      <text v-else-if="task.extra.taskType === 'Time'">[{{DateUtils.getDateFromDateTimeStr(task.repeatEndDay)}}{{task.repeatType === 'none'? '':taskRepeatTypeLabelMap[task.repeatType]+task.repeatKeys}}完成]</text>
      <text class="task-desc">{{ task.itemDesc || '' }}</text>
      <template v-if="mode !== 'share'">
        <template  v-if="task.extra.taskType === 'Times'">
          <text v-if="task.isCompleted"
              class="completed-time"
          >
            已完成（打卡{{ task.recordExtra?.count || 0 }} 次）
          </text>
          <text v-else

              class="check-in-count"
          >
            打卡 {{ task.recordExtra?.count || 0 }}/{{task.extra.totalCount}} 次
          </text>

        </template>

        <!-- 完成后时间，或按次数任务的完成时间，与描述同行并靠右 -->
        <text v-if="task.isCompleted" class="completed-time">
          {{ DateUtils.formatDateTimeToShow(new Date(task.completedTime)) }}
        </text>
        <!-- 按次数任务，显示打卡次数（如果未完成） -->

        <!-- 按时间任务的推迟按钮 -->
        <text
            v-else-if="task.extra.taskType === 'Time' && task.repeatType === 'none'"
            class="delay"
            @click.stop="delayClick"
        >
          推迟
        </text>
      </template>
    </view>
  </view>
</template>

<script setup>
import {defineProps, defineEmits, computed} from 'vue'
import DateUtils from "../../utils/util";
import {TASK_REPEAT_TYPE_LABEL_MAP} from "../../utils/constants";

// Props：接收单个任务对象
const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  // 新增 mode 属性
  mode: {
    type: String,
    default: 'normal', // 默认为 'normal'，可以是 'normal' 或 'share'
    validator: (value) => ['normal', 'share'].includes(value) // 确保值有效
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})

const taskRepeatTypeLabelMap= TASK_REPEAT_TYPE_LABEL_MAP;


const startCount = computed(() => props.task.extra.totalCount > 5? 5:props.task.extra.totalCount); // 从 events 的 key 中提取并排序

const fillStartCount = computed(() => {
  // 确保 recordExtra.count 和 extra.totalCount 都存在且为数字
  const currentCount = props.task?.recordExtra?.count;
  const totalCount = props.task?.extra?.totalCount;

  // 如果 count 或 totalCount 不存在或不是数字，则默认为 0
  if (typeof currentCount !== 'number' || isNaN(currentCount) || typeof totalCount !== 'number' || isNaN(totalCount) || totalCount === 0) {
    return 0;
  }

  // 计算比例，然后乘以最大星星数
  const ratio = currentCount / totalCount;
  const calculatedStars = ratio * startCount.value;

  // 如果你想显示部分点亮的星星，可以返回精确的数字
  // 如果只显示整颗星星，则可以使用 Math.min(Math.floor(calculatedStars), maxStars.value)
  // 但这里我们返回精确值，以便在模板中判断哪些星星是完全亮的，哪些是部分亮的（如果需要）
  return calculatedStars<1?1:calculatedStars;
});

// Emits：定义组件向外触发的事件
const emit = defineEmits([
  'item-click',
  'edit-task',
  'check-task', // 对于按时间任务，或按次数任务达到总次数时
  'check-in',   // 对于按次数任务的单次打卡，传递目标打卡次数
  'delay-click',
  'toggle-select' // 新增：用于切换选中状态
])

// 方法：点击任务项主体
const handleItemClick = () => {
  if (props.mode === 'share') {
    // 在分享模式下，点击任务项主体也应切换选中状态
    toggleSelection();
  } else {
    // 在普通模式下，触发点击事件
    emit('item-click', props.task);
  }
}

// 方法：点击推迟按钮
const delayClick = () => {
  console.log('delay!')
  emit('delay-click', props.task)
}

// 方法：点击编辑图标
const handleEditTaskClick = () => {
  // 在分享模式下，点击标题不触发编辑
  if (props.mode !== 'share') {
    emit('edit-task', props.task)
  }
}

// 方法：处理按次数任务的星星点击打卡
const handleStarClick = (targetIndex) => {
  debugger
  // 发射打卡事件，父组件需要处理 recordExtra.count 更新到 targetCount
  emit('check-task', { task: props.task, completed: true });
};

// 方法：切换按时间任务的完成状态
const handleTaskCheck = (event) => {
  const checked = event.detail.value
  if (checked) {
    emit('check-task', { task: props.task, completed: true })
  }
}

// 方法：切换选中状态（用于分享模式）
const toggleSelection = () => {
  emit('toggle-select', props.task);
}
</script>

<style scoped>
/* --- 主容器 --- */
.task-item {
  padding: 16px;
  border-bottom: 1px solid #eee;
  transition: all 0.2s ease;
  background-color: #ffffff;
  position: relative;
}

.task-item--completed {
  opacity: 0.7;
}

/* 新增：分享模式下的样式 */
.task-item--selecting {
  /* background-color: #f0f8ff; */
}

/* --- 复选框包装器 --- */
.checkbox-wrapper {
  display: flex;
  align-items: center;
  margin-right: 8px;
}

.task-checkbox {
  transform: scale(0.8);
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
  min-width: 0;
  display: flex;
  align-items: center; /* 确保图标和标题垂直居中 */
}

.task-type-icon {
  font-size: 18px; /* 图标大小 */
  margin-right: 6px;
  flex-shrink: 0; /* 防止被挤压 */
}

.task-title {
  color: #007aff;
  word-break: break-word;
  flex-grow: 1; /* 标题占据剩余空间 */
}

.task-item--completed .task-title {
  color: #888;
  text-decoration: line-through;
}

/* --- 描述和时间/打卡次数容器 --- */
.task-desc-and-time {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #666;
  min-height: 20px;
  gap: 8px;
}

/* --- 任务描述 --- */
.task-desc {
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 0;
  word-break: break-word;
  font-size: smaller;
}

.task-item--completed .task-desc {
  color: #aaa;
}

/* --- 完成时间 --- */
.completed-time {
  flex-shrink: 0;
  font-size: 12px;
  color: #4caf50;
  font-weight: 500;
  white-space: nowrap;
  margin-left: auto;
}

/* --- 打卡次数显示 (未完成时) --- */
.check-in-count {
  flex-shrink: 0;
  font-size: 12px;
  color: #9e9e9e;
  font-weight: 500;
  white-space: nowrap;
  margin-left: auto;
}

/* --- 延迟按钮 --- */
.delay {
  flex-shrink: 0;
  font-size: 12px;
  color: #e57427;
  font-weight: 500;
  white-space: nowrap;
  margin-left: auto;
}

/* --- 操作区域 --- */
.task-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  margin-left: 12px;
}

.edit-icon {
  font-size: 18px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
  margin-left: 4px;
}

.edit-icon:hover {
  color: #555;
}

.task-item--completed .edit-icon {
  opacity: 0.5;
  pointer-events: none;
}

/* --- 星星进度条容器 --- */
.stars-container {
  display: flex;
  align-items: center;
  gap: 2px; /* 星星之间的间距 */
  flex-shrink: 0; /* 防止被挤压 */
}

/* --- 星星图标样式 --- */
.star-icon {
  font-size: 18px; /* 星星大小 */
  color: #ccc; /* 默认灰色 */
  cursor: pointer;
  transition: color 0.2s ease;
  user-select: none; /* 防止选中文本 */
}

.star-icon.star-filled {
  color: #FFD700; /* 亮金色 */
}

.star-icon.star-disabled {
  cursor: not-allowed; /* 已完成时禁用点击 */
  opacity: 0.6; /* 稍微降低透明度 */
}

/* --- 开关样式调整 --- */
.task-switch {
  transform: scale(0.8);
  margin: 0;
  flex-shrink: 0;
}

/* --- 得分 --- */
.task-point {
  font-size: 14px;
  font-weight: bold;
  color: #bcb9b4;
  transition: color 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.task-point--completed {
  color: #4caf50 !important;
}
</style>