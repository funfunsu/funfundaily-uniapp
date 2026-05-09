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
        <DrawerBtnItem btnText="汉字笔顺" :angle="-85" :radius="radius" :circleSize="100"
                       @btn-click="handleBtn3Click"/>
        <DrawerBtnItem btnText="日程管理" :angle="-30" :radius="radius" :circleSize="100"
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

    <!-- 内容区域 -->
    <view class="content-container" @click="drawerShow && (drawerShow = false)">
      <!-- ✅✅✅ 核心修改：按【目标分组】遍历渲染，每个分组带目标标题 -->
      <view v-show="listShow" class="task-group-wrap" v-for="(goalGroup, idx) in goalTaskList" :key="idx">
        <!-- 目标分组标题栏 - 可点击折叠/展开 + 精美样式 -->
        <view class="goal-group-title" @click="toggleGoalGroup(idx)">
          <view class="goal-title-left">
            <text class="goal-icon">🎯</text>
            <text class="goal-title-text">{{ goalMap[goalGroup.parentId]?.itemTitle || `` }}</text>
          </view>
          <text class="goal-collapse-icon" :class="{'icon-fold': goalGroup.isCollapse}">
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
              @check-task="onTaskCheck"
              @delay-click="onTaskDelay"
              @toggle-select="toggleSelect"
          />
        </view>

      </view>
      <!-- 无任务兜底 -->
      <view v-show="listShow && goalTaskList.length === 0" class="empty-task">今日暂无任务</view>
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
import DateUtils from "../../utils/util";
import {onLoad, onShareAppMessage, onShow} from "@dcloudio/uni-app";
import {getStoredData, getStoredKey, removeStoredData, setStoredData, STORAGE_KEYS} from "../../utils/storageManager";
import DrawerRightBtn from "../../components/fun-components/drawer-btn/drawer-right-btn.vue";
import DrawerBtnItem from "../../components/fun-components/drawer-btn/drawer-btn-item.vue";
import TaskListContainer from "../../components/task/task-list-container.vue";
import TaskUtil from "../../utils/taskUtil";
const drawerRef = ref(null);
const allUserGoalList = ref(null)


// =============== 响应式状态 ===============
const pointBalance = ref(0)
const taskList = ref([])
const goalTaskList = ref([]) // ✅ 核心：[{parentId:目标ID, title:目标标题, taskList:该目标下的任务数组}]
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

const goalMap = ref({});

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
const toggleGoalGroup = (index) => {
  goalTaskList.value[index].isCollapse = !goalTaskList.value[index].isCollapse;
}

function onAddTaskClick() {
  uni.navigateTo({ url: '/pages/task/edit' });
}
function switchToCalendarClick() {
  uni.navigateTo({ url: '/pages/task/calendar' });
}
function switchToCheckinCalendarClick() {
  uni.navigateTo({ url: '/pages/task/checkin-calendar' });
}

function handleBtn3Click() {
  uni.navigateTo({ url: '/subPackages/study-tools/pages/writing/stroke-order' });
}
function handleBtn4Click() {
  uni.switchTab({ url: '/pages/tabBar/schedule' });
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
async function fetchUserAllGoal() {
  if (!currentMember.value || !currentGroup.value) return;
  // 第一步：先读取【本地缓存】，有缓存直接用，无缓存再请求接口
  const key = getStoredKey(STORAGE_KEYS.USER_ALL_GOAL,currentMember.value.userId)
  const goalList = getStoredData(key);
  if (goalList) {
    const map = {};
    goalList.forEach(item => map[item.id] = item);
    goalMap.value = map;
    return;
  }
  // 第二步：无缓存，调用接口【加载用户所有目标】(用你批量查询目标的接口)
  try {
    if (!currentMember.value || !currentGroup.value) return;
    const nextDay = new Date(currentDate.value);
    nextDay.setDate(nextDay.getDate() + 1);
    const req = {
      fromDate: DateUtils.getDayStartTimeStr(currentDate.value),
      toDate: DateUtils.getDayStartTimeStr(nextDay),
      targetUserId: currentMember.value.userId,
      groupId: currentGroup.value.id,
      scheduleItemType: 'goal'
    }
    const taskDateList =  await apiTs.schedule.list(req);
    const goalList = taskDateList.find(element => element.date === DateUtils.getDateStr(currentDate.value))?.schedules || [];
    setStoredData(key,goalList);
    if (goalList) {
      const map = {};
      goalList.forEach(item => map[item.id] = item);
      goalMap.value = map;
    }
  } catch (error) {
    console.error('加载用户所有目标失败', error);
    allUserGoalList.value = [];
  }
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
  await fetchUserAllGoal()
}
const onTaskDelay = async (task) => {
  taskList.value = taskList.value.filter(item => item.id !== task.id)
  // ✅ 同步更新分组列表中的数据
  goalTaskList.value.forEach(item => {
    item.taskList = item.taskList.filter(t => t.id !== task.id)
  })
}

// task-list-container 的 emit('check-task', task, completed) 是位置参数，这里也按位置接收
const onTaskCheck = (task, completed) => {
  if (completed) {
    // 不再本地累加 task.extra.score，直接拉后端真实余额（来源：transaction_flow 最近一条的 balance）
    fetchPointBalance();
  }
}

// ✅✅✅ 新增：异步加载【目标标题】的核心方法
async function getGoalTitleById(goalId) {
  // if(!goalId) return '无目标';
  // try {
  //   // ========== 核心修改点1：这里替换成你【查询目标标题的真实接口】 ==========
  //   // 传参：goalId = task.parentId 就是目标ID
  //   const res = await apiTs.goal.getById({id: goalId, groupId: currentGroup.value.id});
  //   // 返回目标标题，根据你的真实接口返回字段调整，比如 res.title / res.name
  //   return res?.title || res?.name || `目标(${goalId})`;
  // } catch (error) {
  //   console.error(`获取目标${goalId}标题失败`, error);
  //   return `目标(${goalId})`;
  // }
}

// ✅✅✅ 新增：批量加载分组目标标题 + 组装分组数据
async function assemblyGoalTaskGroup(rawGroupList) {
  const goalTaskArr = [];
  // 遍历分组后的原始数据，异步加载标题
  for (const group of rawGroupList) {
    const goalTitle = await getGoalTitleById(group.parentId);
    goalTaskArr.push({
      parentId: group.parentId,
      title: goalTitle, // 异步加载的目标标题
      taskList: group.taskList // 该目标下的所有任务
    })
  }
  return goalTaskArr;
}

async function rebuildGoalTaskList() {
  const rawGroupList = Object.values(
      taskList.value.reduce((acc, item) => {
        const {parentId} = item;
        const key = parentId == null ? '__none__' : parentId;
        if (!acc[key]) {
          acc[key] = {parentId, taskList: []};
        }
        acc[key].taskList.push(item);
        return acc;
      }, {})
  );
  goalTaskList.value = await assemblyGoalTaskGroup(rawGroupList);
}

async function fetchTaskList() {
  try {
    if (!currentMember.value || !currentGroup.value) return;
    const nextDay = new Date(currentDate.value);
    nextDay.setDate(nextDay.getDate() + 1);
    const baseReq = {
      fromDate: DateUtils.getDayStartTimeStr(currentDate.value),
      toDate: DateUtils.getDayStartTimeStr(nextDay),
      targetUserId: currentMember.value.userId,
      groupId: currentGroup.value.id
    };

    // 后端已经在 ScheduleItemDTO.showExtra 里塞好了 itemKey/dueDate/lastCompleteKey
    // 以及 updateScope.lastCompleteTime，前端直接 filter+sort 即可。
    const taskDateList = await apiTs.checkin.task.list(baseReq);
    const todayStr = DateUtils.getDateStr(currentDate.value);
    const rawList = (Array.isArray(taskDateList) ? taskDateList : [])
        .find(element => element && element.date === todayStr)?.schedules || [];

    taskList.value = rawList
        .filter(item => TaskUtil.isTaskUndo(item, currentDate.value))
        .sort((a, b) => TaskUtil.sortTaskToShow(a, b));

    // 用 listV2（按 taskKey 拉打卡记录）注入 isCompleted；失败不影响任务展示
    await applyCheckinStatusFromKeys();
    await rebuildGoalTaskList();
  } catch (error) {
    console.error('获取任务失败', error);
    taskList.value = [];
    goalTaskList.value = []; // 兜底清空分组列表
  }
}

async function applyCheckinStatusFromKeys() {
  const itemKeyList = taskList.value
      .map(t => t && t.showExtra && t.showExtra.itemKey)
      .filter(Boolean);
  if (!itemKeyList.length) return;
  try {
    const req = {
      targetUserId: currentMember.value.userId,
      groupId: currentGroup.value.id,
      taskKeys: itemKeyList
    };
    const records = await apiTs.checkin.listV2(req);
    if (!Array.isArray(records)) return;
    // 记录可按 taskKey（如有）或 taskId 与 task.showExtra.itemKey 匹配
    const recordMap = new Map();
    records.forEach((r) => {
      const key = r && (r.taskKey || (r.taskId != null ? String(r.taskId) : null));
      if (!key) return;
      const exist = recordMap.get(key);
      const cnt = (r.extra && r.extra.count) || 0;
      const existCnt = (exist && exist.extra && exist.extra.count) || 0;
      if (!exist || cnt > existCnt) recordMap.set(key, r);
    });
    taskList.value.forEach(task => {
      const itemKey = task && task.showExtra && task.showExtra.itemKey;
      let record = recordMap.get(itemKey);
      // 兜底：itemKey 形如 "${taskId}:${period}"，按 taskId 再尝试一次
      if (!record && itemKey && itemKey.indexOf(':') > 0) {
        record = recordMap.get(itemKey.split(':')[0]);
      }
      const totalCount = (task.extra && task.extra.totalCount) || 1;
      task.isCompleted = record ? ((record.extra && record.extra.count) || 0) >= totalCount : false;
      task.completedTime = record ? record.completeTime : null;
      task.recordExtra = record ? record.extra : {};
    });
  } catch (e) {
    console.warn('获取打卡记录失败，按未完成展示：', e);
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

onMounted(() => { fetchAllData();fetchUserAllGoal() })
onShow(() => {
  drawerRef.value?.closeDrawer()
  const currentTab = '/pages/tabBar/task'
  const refreshUri = getStoredData(STORAGE_KEYS.REFRESH_TAB)
  if (refreshUri === currentTab) { fetchAllData(); removeStoredData(STORAGE_KEYS.REFRESH_TAB) }
});

onShareAppMessage((res) => {
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