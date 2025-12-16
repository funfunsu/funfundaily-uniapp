<template>
  <!-- 顶部固定栏 -->
  <view class="top-bar">
    <view class="task-stats-card">
      <view class="stats-row">
        <view class="stat-block">
          <text class="stat-number">{{ completedCount }}/{{ totalCount }}</text>
          <text class="stat-label">今日任务</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-block" @click="handleHistoryClick">
          <text class="stat-number">{{ point.count || 0 }}</text>
          <text class="stat-label">总积分</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-block">
          <text class="stat-number">{{ todayPoints }}</text>
          <text class="stat-label">今日积分</text>
        </view>
      </view>
    </view>
  </view>

  <!-- 中间内容区域 -->
  <view class="content-container">
    <view class="content-wrapper">
      <view v-if="taskList.length === 0" class="empty-state">
        <text class="empty-icon">📋</text>
        <text class="empty-text">今天没有任务，休息一下吧！</text>
      </view>

      <view v-for="task in taskList" :key="task.id"> <!-- 添加 key -->
        <TaskCard
            @item-click="onTaskItemClick"
            @edit-task="onEditTask"
            @check-task="onTaskCheck"
            :task="task"
        />
      </view>
    </view>
  </view>
</template>


<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import apiTs from '../../utils/apiTs'
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue'
import TaskCard from '../../components/task/task-card.vue'
import DateUtils from "../../utils/util";
import {onLoad} from "@dcloudio/uni-app";
import {getStoredData, STORAGE_KEYS} from "../../utils/storageManager";

// =============== 类型定义 ===============
interface Task {
  id: string | number
  itemTitle?: string
  itemDesc?: string
  extra?: {
    score?: number | string
  }
  isCompleted?: boolean
  completedTime?: number | string | null,
}

interface PointData {
  count: number
}

// =============== 响应式状态 ===============
const point = ref<PointData>({ count: 0 })
const taskList = ref<Task[]>([])
const currentDate = ref(new Date())
const listShow = ref(true)
const isLoadingMore = ref(false)
const buttons = ref<object[]>([{code: 'addEvent', text: '添加任务'}, {code: 'toShare', text: '分享'}])
const barTopSideConfig = ref<{}>({left:{text:'←前一天',code:'lastDay'},center:{text:DateUtils.getDateStr(currentDate.value),code:'date'},right:{text:'后一天→',code:'nextDay'}})

const currentMember =ref<object>()
const currentGroup =ref<object>()


// =============== 计算属性 ===============
const formattedCurrentDate = computed(() => {
  const d = currentDate.value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const totalCount = computed(() => taskList.value.length)

const completedCount = computed(() =>
    taskList.value.filter(t => t.isCompleted).length
)

const todayPoints = computed(() =>
    taskList.value
        .filter(t => t.isCompleted && t.extra?.score)
        .reduce((sum, t) => sum + (Number(t.extra.score) || 0), 0)
)


// --- 生命周期 ---

// 页面加载时获取 groupId 参数
onLoad(async (query) => {
  // await fetchTaskList();
});

// =============== 方法 ===============
async function fetchAllData() {
  await Promise.all([fetchPoint(), fetchTaskList()])
}

async function fetchPoint() {
  const req = {
    userId: currentMember.value.userId,
    groupId: currentGroup.value.id
  }
  const member = await apiTs.group.user.get(req)
  point.value = {
    count:member.score
  }

}

async function handleButtonClick(buttonCode) {
  if (buttonCode === 'addEvent') {
    // 跳转到日程编辑页面
    uni.navigateTo({
      url: '/pages/task/edit'
    });
  }else if(buttonCode === 'lastDay'){
    updateDate(-1)
  }else if(buttonCode === 'nextDay'){
    updateDate(1)
  }
}
// 处理成员切换
async function handleMemberChange(e) {
  currentMember.value = e.currentMember;
  currentGroup.value = e.currentGroup;
  await fetchAllData()
}

// 事件处理函数
const onTaskItemClick = (taskId) => {
  console.log('点击了任务:', taskId)
}

const onEditTask = (task) => {
  // 跳转到日程编辑页面
  uni.navigateTo({
    url: `/pages/task/edit?id=${task.id}`
  });
}

const onTaskCheck = ({ task, completed }) => {
  console.log('任务完成状态变更:', task.id, completed)
  const updatedTask: Task = {
    ...task,
    isCompleted: true,
    completedTime: Date.now()
  }

  // 替换数组项（响应式安全）
  const index = taskList.value.findIndex(t => t.id === task.id)
  if (index !== -1) {
    taskList.value.splice(index, 1, updatedTask)
  }

  const  data = {
    taskId:task.id,
    userId: currentMember.value.userId,
    groupId: currentGroup.value.id
  }

  apiTs.checkin.task.complete(data)
}



async function fetchTaskList() {
  try {
    if(!currentMember.value || !currentGroup.value){
      return;
    }
    const req = {
      fromDate: DateUtils.getDateStr(currentDate.value),
      toDate: DateUtils.getDateStr(DateUtils.getDayOff(currentDate.value,1)),
      userId: currentMember.value.userId,
      groupId: currentGroup.value.id
    }
    const [taskListResp, recordResp] = await Promise.all([
      apiTs.checkin.task.list(req),
      apiTs.checkin.list(req)
    ])

    const tasks = taskListResp || []
    const records = recordResp || []

    const recordMap = new Map()
    records.forEach((r: any) => {
      if (r.taskId) recordMap.set(r.taskId, r)
    })

    taskList.value = tasks.map(task => {
      const record = recordMap.get(task.id)
      return {
        ...task,
        isCompleted: !!record,
        completedTime: record ? record.createTime : null
      }
    })
  } catch (error) {
    console.error('获取任务失败', error)
    taskList.value = []
  }
}

function handleNextDayClick() {
  updateDate(1)
}

function handleLastDayClick() {
  updateDate(-1)
}

async function updateDate(days: number) {
  currentDate.value = DateUtils.getDayOff(currentDate.value,days)
  barTopSideConfig.value.center.text = DateUtils.getDateStr(currentDate.value);
  await fetchTaskList()
}


// =============== 导航方法 ===============
function handleHistoryClick() {
  uni.navigateTo({ url: '/pages/point/history' })
}

function handleEditTaskClick(id: string | number) {
  uni.navigateTo({ url: `/pages/task/edit?id=${id}` })
}

function handleAddClick() {
  uni.navigateTo({ url: '/pages/task/edit' })
}

function itemClick(id: string | number) {
  console.log('任务点击:', id)
}

function onScrollTolower() {
  if (isLoadingMore.value) return
  isLoadingMore.value = true
  setTimeout(() => {
    // 模拟加载更多（实际应分页请求）
    isLoadingMore.value = false
  }, 500)
}

function formatTime(timestamp: number | string | null): string {
  if (!timestamp) return ''
  const d = new Date(timestamp as number)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// =============== 生命周期 ===============
onMounted(() => {
  fetchAllData()
})
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
</style>