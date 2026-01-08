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
        <view v-if="taskList.length === 0" class="no-tasks-container">
          <!-- 引导创建任务的按钮 -->
          <button class="create-task-btn" @click="onAddTaskClick">
            + 添加一个任务
          </button>
        </view>

        <view v-for="task in taskList" :key="task.id"> <!-- 添加 key 提高性能 -->
          <TaskCard
              @item-click="onTaskItemClick"
              @edit-task="onEditTask"
              @check-task="onTaskCheck"
              @delay-click="onTaskDelay"
              @toggle-select="toggleSelect"
              :mode="mode"
              :is-selected="isTaskSelected(task)"
              :task="task"
          />
        </view>
      </view>
    </view>

    <!-- 底部栏 -->
    <schedule-bottom-bar
        :buttons="buttons"
        :show-group-member="mode !== 'share'"
        :top-side-config="barTopSideConfig"
        @member-change="handleMemberChange"
        @buttonClick="handleButtonClick"/>
  </view>
</template>

<script setup>
import {computed, onMounted, ref} from 'vue'
import apiTs from '../../utils/apiTs'
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue'
import TaskCard from '../../components/task/task-card.vue'
import DateUtils from "../../utils/util";
import {onLoad, onShareAppMessage, onShow} from "@dcloudio/uni-app";
import {getStoredData, removeStoredData, STORAGE_KEYS} from "../../utils/storageManager";

// =============== 响应式状态 ===============
const pointBalance = ref(0)
const taskList = ref([]) // Task[] 类型会自动推断
const currentDate = ref(new Date())
const listShow = ref(true)
const isLoadingMore = ref(false)
const buttons = ref([
  {code: 'toShare', text: '分享'},
  {code: 'addEvent', text: '添加任务'}
])
const barTopSideConfig = ref({
  left: {text: '←前一天', code: 'lastDay'},
  center: {text: `${DateUtils.getDateStr(currentDate.value)}`, code: 'date-refresh'},
  right: {text: '后一天→', code: 'nextDay'}
})

const currentMember = ref(null) // object 类型
const currentGroup = ref(null) // object 类型

const mode = ref('normal');
// 新增：存储选中的任务 ID
const selectedTaskIds = ref(new Set());

const flowType = 'POINTS';

// =============== 计算属性 ===============

const totalCount = computed(() => taskList.value.length)

const completedCount = computed(() =>
    taskList.value.filter(t => t.isCompleted).length
)

const todayPoints = computed(() =>
    taskList.value
        .filter(t => t.isCompleted && t.extra?.score)
        .reduce((sum, t) => sum + (Number(t.extra.score) || 0), 0)
)

// =============== 生命周期 ===============

// 页面加载时获取 groupId 参数
onLoad(async (query) => {
  // await fetchTaskList();
});

// =============== 方法 ===============

function onAddTaskClick() {
  uni.navigateTo({
    url: '/pages/task/edit'
  });
}

async function fetchAllData() {
  await Promise.all([fetchPointBalance(), fetchTaskList()])
  // 退出分享模式时，清空选中状态
  if (mode.value !== 'share') {
    selectedTaskIds.value.clear();
  }
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
 function handleButtonClick(buttonCode) {
  switch (buttonCode) {
    case 'addEvent':
      onAddTaskClick()
      break;
    case 'lastDay':
      updateDate(-1);
      break;
    case 'nextDay':
      updateDate(1);
      break;
    case 'date-refresh':
      currentDate.value = new Date();
      fetchAllData();
      break;
    case 'cancelShare':
      // 退出分享模式
      mode.value = 'normal';
      selectedTaskIds.value.clear(); // 清空选中状态
      buttons.value = [
        {code: 'addEvent', text: '添加任务'},
        {code: 'toShare', text: '分享'}
      ];
      break;
    case 'toShare':
      // 进入分享模式
      mode.value = 'share';
      buttons.value = [
        {code: 'cancelShare', text: '取消'},
        {code: 'selectAll', text: '全选'},
        {code: 'toggleSelectAll', text: '反选'},
        {code: 'doShare', type: 'share', text: '去分享'}
      ];
      break;
    case 'selectAll':
      // 全选
      selectedTaskIds.value.clear();
      taskList.value.forEach(task => {
        selectedTaskIds.value.add(task.id);
      });
      break;
    case 'toggleSelectAll':
      // 反选
      const newSelectedIds = new Set();
      taskList.value.forEach(task => {
        if (!selectedTaskIds.value.has(task.id)) {
          // 未完成且未被选中 -> 选中它
          newSelectedIds.add(task.id);
        } else if (selectedTaskIds.value.has(task.id)) {
          // 已被选中 -> 不包含在新集合中（即取消选中）
        }
      });
      selectedTaskIds.value = newSelectedIds;
      break;
    default:
      // 可以选择在这里处理未知的 buttonCode，或者什么都不做
      console.warn('Unknown button code:', buttonCode);
      break;
  }
}

// 判断任务是否被选中
const isTaskSelected = (task) => {
  return selectedTaskIds.value.has(task.id);
};

// 切换单个任务的选中状态
const toggleSelect = (task) => {
  if (mode.value !== 'share') return; // 只在分享模式下有效

  if (selectedTaskIds.value.has(task.id)) {
    selectedTaskIds.value.delete(task.id);
  } else {
    if (!task.isCompleted) { // 可选：不允许选中已完成的任务
      selectedTaskIds.value.add(task.id);
    }
  }
  console.log('Selected IDs:', selectedTaskIds.value);
};

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
  const startDate = DateUtils.getDateFromDateTimeStr(task.startTime, null);
  task.startTime = DateUtils.replaceDatePart(task.startTime, DateUtils.getDateStr(DateUtils.getDayOff(new Date(startDate), 1)))
  const endDate = DateUtils.getDateFromDateTimeStr(task.endTime, null);
  task.endTime = DateUtils.replaceDatePart(task.endTime, DateUtils.getDateStr(DateUtils.getDayOff(new Date(endDate), 1)))

  try {
    const req = { // 移除了类型注解
      targetUserId: currentMember.value.userId, // 访问 ref 的值
      groupId: currentGroup.value.id,          // 访问 ref 的值
      items: [task]           // 访问 ref 的值
    };
    await apiTs.schedule.save(req);
    await fetchTaskList()
  } catch (e) {
    console.error('延迟任务失败:', e);
  }
}

const onTaskCheck = ({task, completed}) => {
  console.log('任务完成状态变更:', task, completed)
  task.recordExtra.count = task.recordExtra.count? task.recordExtra.count+1 : 1;
  const completeFlag = task.extra.taskType === 'Time'?true : task.recordExtra.count >= task.extra.totalCount
  const updatedTask = {
    ...task,
    isCompleted: completeFlag,
    completedTime: Date.now(),
  }

  const data = {
    taskId: task.id,
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
  if (completeFlag){
    pointBalance.value = pointBalance.value + Number(task.extra?.score || 0) // 确保加的是数字
  }
}

async function fetchCheckinRecordList() {
  const itemKeyList = taskList.value.map(task => task.showExtra.itemKey);
  if (!itemKeyList || itemKeyList.length <= 0) {
    return
  }
  const req = {
    targetUserId: currentMember.value.userId,
    groupId: currentGroup.value.id,
    taskKeys: itemKeyList
  }
  const  records = await apiTs.checkin.listV2(req)

  const recordMap = new Map()
  records.forEach((r) => {
    const taskKey = r.taskKey?r.taskKey : r.taskId
    if (recordMap.has(taskKey)){
      const existR = recordMap.get(taskKey)
      if (r.extra.count > existR.extra.count){
        recordMap.set(taskKey, r)
      }
    }else{
      recordMap.set(taskKey, r)
    }
  })

  taskList.value.forEach(task => {
    const record = recordMap.get(task.showExtra.itemKey)
    task.isCompleted = task.extra.taskType === 'Time'?!!record  : record && record.extra.count >= task.extra.totalCount;
    task.completedTime =  record ? record.completeTime : null
    task.recordExtra = record? record.extra : {}
  })
}

async function fetchTaskList() {
  try {
    if (!currentMember.value || !currentGroup.value) {
      return;
    }
    const req = {
      fromDate: DateUtils.getDayStartTimeStr(currentDate.value),
      toDate: DateUtils.getDayEndTimeStr(currentDate.value),
      targetUserId: currentMember.value.userId,
      groupId: currentGroup.value.id
    }

    const taskDateList = await apiTs.checkin.task.list(req);

    taskList.value = taskDateList.find(element => element.date === DateUtils.getDateStr(currentDate.value))?.schedules || [];

    await fetchCheckinRecordList()
  } catch (error) {
    console.error('获取任务失败', error)
    taskList.value = []
  }
}

async function updateDate(days) { // 移除类型注解
  currentDate.value = DateUtils.getDayOff(currentDate.value, days)
  barTopSideConfig.value.center.text = DateUtils.getDateStr(currentDate.value);
  await fetchAllData()
}


// =============== 导航方法 ===============
function handleHistoryClick() {
  uni.navigateTo({url: '/pages/point/history'})
}


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
  if (!refreshUri) {
    return
  }
  if (refreshUri === currentTab) {
    fetchAllData()
    removeStoredData(STORAGE_KEYS.REFRESH_TAB)
  }
});

onShareAppMessage((res) => {
  const selectedTasks = taskList.value.filter(task => selectedTaskIds.value.has(task.id));
  if (selectedTasks.length === 0) {
    uni.showToast({
      title: '请先选择要分享的任务',
      icon: 'none'
    });
    return;
  }
  console.log('准备分享任务:', selectedTasks);

  const uniqueSelectedJsonString = JSON.stringify(selectedTasks);
  const shareTitle = `分享 ${selectedTasks.length} 个任务`;

  // 返回 Promise，动态生成分享配置
  return new Promise(async (resolve) => {
    const resData = await apiTs.share.create({
      content: uniqueSelectedJsonString,
      sceneCode: 'task_share'
    });

    if (resData?.token) {
      resolve({
        title: shareTitle,
        path: `/pages/task/share?token=${resData.token}`,
        imageUrl: '' // 可选
      });
    } else {
      await uni.showToast({title: '生成分享链接失败', icon: 'none'});
    }
  });
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
  z-index: 100
}

/* --- 任务统计卡片内部样式 --- */
.stats-row {
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

/* --- 无任务状态容器 --- */
.no-tasks-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40rpx 0; /* 上下留出一些空间 */
  /* 如果你想让按钮占据整个列表区域，可以添加 height: 100vh; 或者具体的高度 */
  /* height: 100vh; */
}

/* --- 创建任务按钮样式 --- */
.create-task-btn {
  width: 60%; /* 按钮宽度占容器的 60% */
  height: 80rpx; /* 按钮高度 */
  line-height: 80rpx; /* 使文字垂直居中 */
  font-size: 28rpx; /* 文字大小 */
  font-weight: bold; /* 文字加粗 */
  color: #007aff; /* 文字颜色为蓝色 */
  background-color: transparent; /* 背景透明 */
  border: none; /* 关键：重置 uniapp 默认边框 */
  border: 2rpx dashed #007aff; /* 自定义蓝色虚线边框 */
  border-radius: 40rpx; /* 按钮圆角 */
  /* 防止按钮在某些平台被点击时有默认的视觉反馈 */
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  box-sizing: border-box; /* 确保 padding/border 不增加总宽高 */
}

/* 按钮点击态效果 (可选) */
.create-task-btn:active {
  opacity: 0.8; /* 点击时透明度降低 */
  background-color: #0062cc; /* 点击时背景色加深 */
  /* 或者使用 transform: scale(0.95); 来实现轻微的缩放效果 */
  /* transform: scale(0.95); */
}


/* --- 小屏适配 --- */
@media (max-width: 375px) {
  .stat-number {
    font-size: 32rpx;
  }
  .create-task-btn {
    width: 70%; /* 在小屏上可以稍微宽一点 */
    height: 70rpx;
    line-height: 70rpx;
    font-size: 26rpx;
  }
}
</style>