<template>
  <view class="goal-group-root"> 
    <!-- 目标分组列表 - 完整抽离的核心内容 -->
    <view class="task-group-wrap" v-for="(goalGroup, idx) in goalTaskList" :key="idx">
      <!-- 目标分组标题栏 - 可点击折叠/展开 + 标题跳转日历 + 精美样式 -->
      <view class="goal-group-title" v-if="goalMap[goalGroup.parentId]">
        <view class="goal-title-left">
          <text class="goal-icon">🎯</text>
          <text class="goal-title-text" @click="handleGoalTitleClick(goalGroup.parentId)">
            {{ goalMap[goalGroup.parentId]?.itemTitle }}
          </text>
        </view>
        <text class="goal-collapse-icon" :class="{'icon-fold': goalGroup.isCollapse}"  @click="toggleGoalGroup(idx)">
          {{ goalGroup.isCollapse ? '⊕' : '⊖' }}
        </text>
      </view>
      <!-- 折叠控制：展开显示任务列表，收起隐藏 -->
      <view class="goal-task-content" v-show="!goalGroup.isCollapse">
        <task-list-container
            :current-date="currentDate"
            :task-list="goalGroup.taskList"
            :current-member="currentMember"
            :mode="mode"
            :selected-task-ids="selectedTaskIds"
            @check-task="emit('check-task', $event)"
            @delay-click="emit('delay-click', $event)"
            @toggle-select="emit('toggle-select', $event)"
        />
      </view>
    </view>
    <!-- 无任务兜底 -->
    <view v-show="goalTaskList.length === 0" class="empty-task">今日暂无任务</view>
  </view>
</template>

<script setup>
import {defineProps, defineEmits, ref, onMounted, watch} from 'vue'
import TaskListContainer from "./task-list-container.vue";
import {getStoredData, getStoredKey, setStoredData, STORAGE_KEYS} from "../../utils/storageManager";
import DateUtils from "../../utils/util";
import apiTs from "../../utils/apiTs";
import {onShow} from "@dcloudio/uni-app";

const goalMap = ref({}); // key=目标id value=目标完整对象


// ✅ 1. 接收父组件传入的所有参数(props) - 完整对应原页面的变量
const props = defineProps({
  goalTaskList: {
    type: Array,
    required: true,
    default: () => []
  },
  currentDate: {
    type: Date,
    required: true
  },
  currentMember: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'normal'
  },
  selectedTaskIds: {
    type: Set,
    default: () => new Set()
  }
})


onShow(() => {
  fetchUserAllGoal();
})


async function fetchUserAllGoal() {
  if (!props.currentMember) return;
  const key = getStoredKey(STORAGE_KEYS.USER_ALL_GOAL,props.currentMember.userId)
  const goalList = getStoredData(key);
  if (goalList) {
    const map = {};
    goalList.forEach(item => map[item.id] = item);
    goalMap.value = map;
    return;
  }
  try {
    const req = {
      fromDate: DateUtils.getDateStr(props.currentDate),
      toDate: DateUtils.getNextDayStr(props.currentDate),
      targetUserId: props.currentMember.userId,
      groupId: props.currentMember.groupId,
      scheduleItemType: 'goal'
    }
    const taskDateList =  await apiTs.schedule.list(req);
    const goalList = taskDateList.find(element => element.date === DateUtils.getDateStr(props.currentDate))?.schedules || [];
    setStoredData(key,goalList);
    const map = {};
    goalList.forEach(item => map[item.id] = item);
    goalMap.value = map;
  } catch (error) {
    console.error('加载用户所有目标失败', error);
    goalMap.value = {};
  }
}

// ✅ 2. 定义需要向父组件透传的事件 - 所有任务相关事件原样透出
const emit = defineEmits([
  'check-task',
  'delay-click',
  'toggle-select',
  'goal-title-click' // 目标标题点击事件
])

// ✅ 3. 组件内部独立方法 - 分组折叠/展开 (原页面逻辑不变)
const toggleGoalGroup = (index) => {
  props.goalTaskList[index].isCollapse = !props.goalTaskList[index].isCollapse;
}

// ✅ 4. 目标标题点击跳转日历 - 触发事件给父组件，父组件统一处理跳转逻辑
const handleGoalTitleClick = (goalId) => {
  emit('goal-title-click', goalId)
}

watch(
    [() => props.currentMember, () => props.currentDate],
    async () => {
      await fetchUserAllGoal();
    },
    { immediate: true, deep: true }
)
</script>

<style scoped>
/* ✅ 完整复制原页面的分组样式，样式独立，不影响其他组件 */
.goal-group-root {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.task-group-wrap {
  width: 100%;
  border-radius: 16rpx;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}
.task-group-wrap:active {
  transform: scale(0.995);
  box-shadow: 0 1rpx 8rpx rgba(0, 0, 0, 0.06);
}
/* 分组标题栏 - 渐变+图标+圆角+点击反馈 */
.goal-group-title {
  background: linear-gradient(90deg, #f8fbff 0%, #f0f7ff 100%);
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  border-bottom: 1px solid #f5f8ff;
}
.goal-title-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.goal-icon {
  font-size: 32rpx;
  line-height: 1;
}
.goal-title-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d2129;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
/* 折叠/展开图标 */
.goal-collapse-icon {
  font-size: 36rpx;
  color: #86909c;
  font-weight: bold;
  transition: all 0.2s ease;
  line-height: 1;
}
.icon-fold {
  transform: rotate(0deg);
}
/* 任务列表容器内边距适配 */
.goal-task-content {
  padding: 8rpx 0;
  transition: all 0.3s ease-in-out;
}
.empty-task {
  text-align: center;
  font-size: 28rpx;
  color: #999;
  margin-top: 100rpx;
}
</style>