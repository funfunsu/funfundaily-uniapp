<template>
  <view class="page-container">
    <!-- 右侧抽屉式悬浮按钮组 -->
    <drawer-right-btn
        ref="drawerRef"
        :circle-translate="40"
        btn-top="50%"
        :circle-size="120"
        main-color="#007AFF"
        :radius="140"
        :is-open="isDrawerBtnOpen"
    >
      <template #default="{circleSize, mainColor, radius}">
        <DrawerBtnItem btnText="任务日历" :angle="85" :radius="radius" :circleSize="100"
                       @btn-click="switchToCalendarClick"/>
        <DrawerBtnItem btnText="打卡日历" :angle="30" :radius="radius" :circleSize="100"
                       @btn-click="switchToCheckinCalendarClick"/>
        <DrawerBtnItem btnText="大事件" :angle="-85" :radius="radius" :circleSize="100"
                       @btn-click="handleBtn3Click"/>
        <DrawerBtnItem btnText="拍照记录" :angle="-30" :radius="radius" :circleSize="100"
                       @btn-click="handleBtn4Click"/>
      </template>
    </drawer-right-btn>

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

    <!-- 内容区域 - ✅核心改造：只保留一行组件调用，其他全部抽离 -->
    <view class="content-container" @click="drawerShow && (drawerShow = false)">
      <task-goal-group-list
          v-show="listShow"
          :goal-task-list="goalTaskList"
          :current-date="currentDate"
          :current-member="currentMember"
          :mode="mode"
          :selected-task-ids="selectedTaskIds"
          @check-task="onTaskCheck"
          @delay-click="onTaskDelay"
          @toggle-select="toggleSelect"
          @goal-title-click="switchToCalendarClick"
          @create-task="onAddTaskClick"
      />
    </view>

    <!-- 水印拍照全屏弹窗 -->
    <WatermarkCamera
      v-if="showWatermarkCamera"
      :fullscreen="true"
      @shareRequested="handleShareRequested"
      @photoTaken="handlePhotoTaken"
      @close="handleWatermarkClose"
    />

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
import DateUtils from "../../utils/util";
import {onLoad, onShareAppMessage, onShow} from "@dcloudio/uni-app";
import {getStoredData, getStoredKey, removeStoredData, setStoredData, STORAGE_KEYS} from "../../utils/storageManager";
import DrawerRightBtn from "../../components/fun-components/drawer-btn/drawer-right-btn.vue";
import DrawerBtnItem from "../../components/fun-components/drawer-btn/drawer-btn-item.vue";
// ✅✅✅ 导入抽离的公共组件
import TaskGoalGroupList from "../../components/task/task-goal-group-list.vue";
import TaskUtil from "../../utils/taskUtil";
import WatermarkCamera from "../../components/fun-components/WatermarkCamera.vue";

const drawerRef = ref(null);

// =============== 响应式状态 ===============
const pointBalance = ref(0)
const taskList = ref([])
const goalTaskList = ref([])
const currentDate = ref(new Date())
const listShow = ref(true)
const isDrawerBtnOpen = ref(false)
const buttons = ref([
  {code: 'toShare', text: '分享'},
  {code: 'addEvent', text: '添加任务'}
])
const barTopSideConfig = ref({
  left: {text: '←前一天', code: 'lastDay'},
  center: {text: `${DateUtils.getDateStr(currentDate.value)}`, code: 'date-refresh'},
  right: {text: '后一天→', code: 'nextDay'}
})

const currentMember = ref(null)
const currentGroup = ref(null)
const mode = ref('normal');
const selectedTaskIds = ref(new Set());
const drawerShow = ref(false);
const flowType = 'POINTS';
const showWatermarkCamera = ref(false);
const lastWatermarkPhoto = ref('');
const watermarkShareImageUrl = ref('');
const watermarkShareTitle = ref('水印照片');

// =============== 计算属性 ===============
const totalCount = computed(() => taskList.value.length)
const completedCount = computed(() => taskList.value.filter(t => t.isCompleted).length)
const todayPoints = computed(() =>
    taskList.value
        .filter(t => t.isCompleted && t.extra?.score)
        .reduce((sum, t) => sum + (Number(t.extra.score) || 0), 0)
)

// =============== 生命周期 ===============
onLoad(async (query) => {});

function onAddTaskClick() {
  uni.navigateTo({ url: '/pages/task/edit' });
}
function switchToCalendarClick(goalId) {
  if (goalId){
    uni.navigateTo({ url: `/pages/task/calendar?goalId=${goalId}` });
    return
  }
  uni.navigateTo({ url: '/pages/task/calendar' });
}
function switchToCheckinCalendarClick() {
  uni.navigateTo({ url: '/pages/task/checkin-calendar' });
}
function handleBtn3Click() {
  uni.navigateTo({ url: '/subPackages/event/pages/event/index' });
}
function handleBtn4Click() {
  showWatermarkCamera.value = true;
}

function handleWatermarkClose() {
  showWatermarkCamera.value = false;
}

function handlePhotoTaken(imgPath) {
  lastWatermarkPhoto.value = imgPath;
  showWatermarkCamera.value = false;
  // TODO: 后续可在此处做上传或本地记录
}

async function fetchAllData() {
  await Promise.all([fetchPointBalance(), fetchTaskList()])
  if (mode.value !== 'share') {
    selectedTaskIds.value.clear();
  }
}

async function fetchPointBalance() {
  if (!currentMember.value || !currentGroup.value) return;
  const req = { flowType, targetUserId: currentMember.value.userId, groupId: currentGroup.value.id }
  try { pointBalance.value = await apiTs.flow.balance(req) }
  catch (error) { console.error('获取余额失败:', error); }
}

function handleButtonClick(buttonCode) {
  switch (buttonCode) {
    case 'addEvent': onAddTaskClick(); break;
    case 'lastDay': updateDate(-1); break;
    case 'nextDay': updateDate(1); break;
    case 'date-refresh': currentDate.value = new Date(); fetchAllData(); break;
    case 'cancelShare':
      mode.value = 'normal'; selectedTaskIds.value.clear();
      buttons.value = [{code: 'addEvent', text: '添加任务'}, {code: 'toShare', text: '分享'}];
      break;
    case 'toShare':
      mode.value = 'share';
      buttons.value = [{code: 'cancelShare', text: '取消'},{code: 'selectAll', text: '全选'},{code: 'toggleSelectAll', text: '反选'},{code: 'doShare', type: 'share', text: '去分享'}];
      break;
    case 'selectAll':
      selectedTaskIds.value.clear();
      taskList.value.forEach(task => selectedTaskIds.value.add(task.id));
      break;
    case 'toggleSelectAll':
      const newSelectedIds = new Set();
      taskList.value.forEach(task => !selectedTaskIds.value.has(task.id) && newSelectedIds.add(task.id));
      selectedTaskIds.value = newSelectedIds;
      break;
    default: console.warn('Unknown button code:', buttonCode); break;
  }
}

const toggleSelect = (task) => {
  if (mode.value !== 'share') return;
  selectedTaskIds.value.has(task.id) ? selectedTaskIds.value.delete(task.id) : !task.isCompleted && selectedTaskIds.value.add(task.id);
};

async function handleMemberChange(e) {
  currentMember.value = e.currentMember; currentGroup.value = e.currentGroup;
  await fetchAllData()
}

const onTaskDelay = async (task) => {
  taskList.value = taskList.value.filter(item => item.id !== task.id)
  goalTaskList.value.forEach(item => {
    item.taskList = item.taskList.filter(t => t.id !== task.id)
  })
}

const onTaskCheck = ({task, completed}) => {
  if (completed) pointBalance.value = pointBalance.value + Number(task.extra?.score || 0)
}

// ✅✅✅ 核心优化：删除异步请求标题，直接从goalMap取值，组装分组数据，性能最优
async function fetchCheckinRecordList() {
  const itemKeyList = taskList.value.map(task => task.showExtra?.itemKey).filter(Boolean);
  // 无任务时也要清空分组数据，否则切换成员后会残留上一个成员的任务
  if (!itemKeyList.length) { goalTaskList.value = []; return }
  const req = { targetUserId: currentMember.value.userId, groupId: currentGroup.value.id, taskKeys: itemKeyList }
  const records = await apiTs.checkin.listV2(req)
  const recordMap = new Map()
  records.forEach((r) => {
    const taskKey = r.taskKey ? r.taskKey : r.taskId
    if (recordMap.has(taskKey)) {
      const existR = recordMap.get(taskKey)
      if (r.extra.count > existR.extra.count) recordMap.set(taskKey, r)
    } else recordMap.set(taskKey, r)
  })
  taskList.value.forEach(task => {
    const record = recordMap.get(task.showExtra?.itemKey)
    task.isCompleted = record ? record.extra.count >= task.extra.totalCount :false;
    task.completedTime = record ? record.completeTime : null
    task.recordExtra = record ? record.extra : {}
  })

  // 直接分组+赋值标题，无需异步
  goalTaskList.value = Object.values(
      taskList.value.reduce((acc, item) => {
        const {parentId} = item;
        if (!acc[parentId]) {
          acc[parentId] = {parentId, taskList: [], isCollapse: false}; // 默认展开
        }
        acc[parentId].taskList.push(item);
        return acc;
      }, {})
  );
}

async function fetchTaskList() {
  try {
    if (!currentMember.value || !currentGroup.value) return;
    const req = {
      fromDate: DateUtils.getDateStr(currentDate.value),
      toDate: DateUtils.getNextDayStr(currentDate.value),
      targetUserId: currentMember.value.userId,
      groupId: currentGroup.value.id,
      scheduleItemType:'task'
    }
    const taskDateList = await apiTs.checkin.task.list(req);
    const list = taskDateList.find(element => element.date === DateUtils.getDateStr(currentDate.value))?.schedules || [];
    taskList.value = list.filter(item => TaskUtil.isTaskUndo(item,currentDate.value)).sort((a, b) => {return TaskUtil.sortTaskToShow(a,b) })
    await fetchCheckinRecordList()
  } catch (error) {
    console.error('获取任务失败', error);
    taskList.value = [];
    goalTaskList.value = [];
  }
}

async function updateDate(days) {
  currentDate.value = DateUtils.getDayOff(currentDate.value, days)
  barTopSideConfig.value.center.text = DateUtils.getDateStr(currentDate.value);
  await fetchAllData()
}

function handleHistoryClick() {
  uni.navigateTo({url: '/pages/point/history'})
}

onMounted(() => { fetchAllData();})
onShow(() => {
  drawerRef.value?.closeDrawer()
  const currentTab = '/pages/tabBar/task'
  const refreshUri = getStoredData(STORAGE_KEYS.REFRESH_TAB)
  if (refreshUri === currentTab) { fetchAllData(); removeStoredData(STORAGE_KEYS.REFRESH_TAB) }
});

onShareAppMessage((res) => {
  if (watermarkShareImageUrl.value) {
    const data = {
      title: watermarkShareTitle.value,
      path: '/pages/tabBar/task',
      imageUrl: watermarkShareImageUrl.value
    }
    setTimeout(() => {
      watermarkShareImageUrl.value = ''
      watermarkShareTitle.value = '水印照片'
    }, 0)
    return data
  }
  const selectedTasks = taskList.value.filter(task => selectedTaskIds.value.has(task.id));
  if (selectedTasks.length === 0) {
    uni.showToast({ title: '请先选择要分享的任务', icon: 'none' });
    return;
  }
  const uniqueSelectedJsonString = JSON.stringify(selectedTasks);
  const shareTitle = `分享 ${selectedTasks.length} 个任务`;
  return new Promise(async (resolve) => {
    const resData = await apiTs.share.create({ content: uniqueSelectedJsonString, sceneCode: 'task_share' });
    if (resData?.token) {
      resolve({ title: shareTitle, path: `/pages/task/share?token=${resData.token}`, imageUrl: '' });
    } else { await uni.showToast({title: '生成分享链接失败', icon: 'none'}); }
  });
});

function handleShareRequested(payload) {
  watermarkShareImageUrl.value = payload?.imageUrl || ''
  watermarkShareTitle.value = payload?.title || '水印照片'
}
</script>

<style scoped>
/* --- 全局容器 --- */
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  position: relative;
}

/* --- 内容容器 --- */
.content-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
  margin-top: 84px;
  padding-top: 10px;
  padding-bottom: 84px;
  padding-right: 20rpx;
  padding-left: 20rpx;
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
.stats-row { display: flex; align-items: center; justify-content: space-between; }
.stat-block { text-align: center; flex: 1; }
.stat-number { font-size: 36rpx; font-weight: bold; color: #2196f3; display: block; }
.stat-label { font-size: 24rpx; color: #888; margin-top: 8rpx; }
.stat-divider { width: 2rpx; height: 40rpx; background: #eee; }
</style>