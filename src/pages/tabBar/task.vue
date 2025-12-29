<template>
  <view class="page-container">
    <view class="task-stats-card">
      <view class="stats-row">
        <view class="stat-block">
          <text class="stat-number">{{ completedCount }}/{{ totalCount }}</text>
          <text class="stat-label">今日任务</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-block" @click="handleHistoryClick">
          <text class="stat-number">{{ pointBalance || 0 }}</text>
          <text class="stat-label">总积分</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-block">
          <text class="stat-number">{{ todayPoints }}</text>
          <text class="stat-label">今日积分</text>
        </view>
      </view>
    </view>
    <!-- 内容区域 -->
    <view class="content-container">

      <!-- 任务列表 -->
      <view v-show="listShow" class="task-list">
        <view v-if="taskList.length === 0" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">今天没有任务，来创建一个吧！</text>
        </view>

        <view v-for="task in taskList" :key="task.id"> <!-- 添加 key 提高性能 -->
          <TaskCard
              @item-click="onTaskItemClick"
              @edit-task="onEditTask"
              @check-task="onTaskCheck"
              @delay-click="onTaskDelay"
              :task="task"
          />
        </view>
      </view>
    </view>

    <!-- 底部栏 -->
    <schedule-bottom-bar
        :buttons="buttons"
        :top-side-config = "barTopSideConfig"
        @member-change="handleMemberChange"
        @buttonClick="handleButtonClick"/>
  </view>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import apiTs from '../../utils/apiTs'
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue'
import TaskCard from '../../components/task/task-card.vue'
import DateUtils from "../../utils/util";
import {onLoad, onPullDownRefresh, onShow} from "@dcloudio/uni-app";
import {getStoredData, removeStoredData, STORAGE_KEYS} from "../../utils/storageManager";

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
const pointBalance = ref(0)
const taskList = ref<Task[]>([])
const currentDate = ref(new Date())
const listShow = ref(true)
const isLoadingMore = ref(false)
const buttons = ref<object[]>([{code: 'addEvent', text: '添加任务'}])
const barTopSideConfig = ref<{}>({left:{text:'←前一天',code:'lastDay'},center:{text:`${DateUtils.getDateStr(currentDate.value)}`,code:'date-refresh'},right:{text:'后一天→',code:'nextDay'}})

const currentMember =ref<object>()
const currentGroup =ref<object>()

const flowType = 'POINTS';



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
  await Promise.all([fetchPointBalance(), fetchTaskList()])
}



async function fetchPointBalance() {
  if (!currentMember.value || !currentGroup.value) {
    console.warn('Member or Group not selected, skipping balance fetch.');
    return;
  }
  const req = {
    flowType: flowType,
    targetUserId: currentMember.value.userId,
    groupId: currentGroup.value.id
  }
  try {
    pointBalance.value = await apiTs.flow.balance(req)
  } catch (error) {
    console.error('获取余额失败:', error);
    // 可以设置一个默认值或提示用户
  }

}

async function handleButtonClick(buttonCode) {
  if (buttonCode === 'addEvent') {
    // 跳转到日程编辑页面
    await uni.navigateTo({
      url: '/pages/task/edit'
    });
  }else if(buttonCode === 'lastDay'){
    await updateDate(-1)
  }else if(buttonCode === 'nextDay'){
    await updateDate(1)
  }else if(buttonCode === 'date-refresh'){
    currentDate.value = new Date();
    await fetchAllData()
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
  uni.navigateTo({
    url: `/pages/task/edit?id=${task.id}`
  });
}

const onTaskDelay = async (task) => {
  const startDate = DateUtils.getDateFromDateTimeStr(task.startTime,null);
  task.startTime = DateUtils.replaceDatePart(task.startTime,DateUtils.getDateStr(DateUtils.getDayOff(new Date(startDate),1)))
  const endDate = DateUtils.getDateFromDateTimeStr(task.endTime,null);
  task.endTime = DateUtils.replaceDatePart(task.endTime,DateUtils.getDateStr(DateUtils.getDayOff(new Date(endDate),1)))

  try {
    const req = { // 移除了类型注解
      targetUserId: currentMember.value.userId, // 访问 ref 的值
      groupId: currentGroup.value.id,          // 访问 ref 的值
      items: [task]           // 访问 ref 的值
    };
    await apiTs.schedule.save(req);
    await fetchTaskList()
  }catch (e){

  }
}

const onTaskCheck = ({ task, completed }) => {
  console.log('任务完成状态变更:', task.id, completed)
  const updatedTask: Task = {
    ...task,
    isCompleted: true,
    completedTime: Date.now()
  }



  const  data = {
    taskId:task.id,
    targetUserId: currentMember.value.userId,
    groupId: currentGroup.value.id,
    taskTime: DateUtils.formatDateTime(currentDate.value)
  }

  apiTs.checkin.task.complete(data)
  // 替换数组项（响应式安全）
  const index = taskList.value.findIndex(t => t.id === task.id)
  if (index !== -1) {
    taskList.value.splice(index, 1, updatedTask)
  }
  pointBalance.value = pointBalance.value+task.extra.score
}



async function fetchTaskList() {
  try {
    if(!currentMember.value || !currentGroup.value){
      return;
    }
    const req = {
      fromDate: DateUtils.getDayStartTimeStr(currentDate.value),
      toDate: DateUtils.getDayEndTimeStr(currentDate.value),
      targetUserId: currentMember.value.userId,
      groupId: currentGroup.value.id
    }
    const [taskListResp, recordResp] = await Promise.all([
      apiTs.checkin.task.list(req),
      apiTs.checkin.list(req)
    ])

    const taskDateList = taskListResp || []

    const tasks = taskDateList.find(element => element.date === DateUtils.getDateStr(currentDate.value)).schedules;
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
        completedTime: record ? record.completeTime : null
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
  await fetchAllData()
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

onPullDownRefresh(async () => {
  debugger
  console.log('触发下拉刷新');
  try {
    await fetchAllData(); // 执行刷新数据的逻辑
    await uni.showToast({
      title: '刷新成功',
      icon: 'success'
    });
  } catch (error) {
    console.error('刷新失败:', error);
    await uni.showToast({
      title: '刷新失败',
      icon: 'none'
    });
  } finally {
    // *** 关键：无论成功与否，都需要调用 uni.stopPullDownRefresh() ***
    // 这会停止下拉刷新的动画，收回下拉区域
    uni.stopPullDownRefresh();
  }
});

// =============== 生命周期 ===============
onMounted(() => {
  fetchAllData()
})


/**
 * 页面每次显示时调用
 */
onShow(() => {
  const currentTab = '/pages/tabBar/task'
  const refreshUri = getStoredData(STORAGE_KEYS.REFRESH_TAB)
  if (!refreshUri){
    return
  }
  if (refreshUri === currentTab){
    fetchAllData()
    removeStoredData(STORAGE_KEYS.REFRESH_TAB)
  }
});
</script>
<style scoped>
/* --- 全局容器 --- */
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

/* --- 内容容器 --- */
.content-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* 或者保持 flex: 1; 但要确保父级 page-container 是 flex column */
  overflow-y: auto; /* 启用滚动 */
  -webkit-overflow-scrolling: touch; /* 平滑滚动 */
  box-sizing: border-box; /* 确保 padding 不增加总高度 */
  margin-top: 84px;
  padding-top: 10px;
  padding-bottom: 84px;
}

/* --- 任务统计卡片 --- */
.task-stats-card {
  background: white;
  border-radius: 16rpx;
  padding: 24rpx 20rpx;
  margin: 0 0 20rpx 0;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  position: fixed;
  width: 100%;
  height: 60px;
  z-index:100
}

/* --- 任务统计卡片内部样式 --- */
.stats-row{
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-block {
  text-align: center;
  flex: 1;
}

.stat-number {
  font-size: 36rpx;
  font-weight: bold;
  color: #2196f3;
  display: block;
}

.stat-label {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}

.stat-divider {
  width: 2rpx;
  height: 40rpx;
  background: #eee;
}

.task-list {
  padding: 0 16rpx; /* 左右 padding 保留 */
  flex-grow: 1;
}


/* --- 空状态 --- */
.empty-state {
  text-align: center;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.empty-icon {
  font-size: 72rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}


/* --- 小屏适配 --- */
@media (max-width: 375px) {
  .stat-number {
    font-size: 32rpx;
  }
}

</style>