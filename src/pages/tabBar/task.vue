<template>
	<view class="page-container">
		<!-- 内容区域 -->
		<view class="content-container">
			<!-- 任务统计卡片 -->
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

<!--				<view class="date-control-row">-->
<!--					<view class="date-nav" @click="handleLastDayClick">-->
<!--						<text class="nav-icon">←</text>-->
<!--					</view>-->
<!--					<view class="current-date">-->
<!--						<text class="date-text">{{ formattedCurrentDate }}</text>-->
<!--					</view>-->
<!--					<view class="date-nav" @click="handleNextDayClick">-->
<!--						<text class="nav-icon">→</text>-->
<!--					</view>-->
<!--				</view>-->
			</view>

			<!-- 任务列表 -->
			<scroll-view
				v-show="listShow"
				class="task-list"
				scroll-y
				:scroll-with-animation="true"
				@scrolltolower="onScrollTolower"
				show-scrollbar="false"
			>
				<view v-if="taskList.length === 0" class="empty-state">
					<text class="empty-icon">📋</text>
					<text class="empty-text">今天没有任务，休息一下吧！</text>
				</view>

				<view
					v-for="task in taskList"
				>
          <TaskCard
              @item-click="onTaskItemClick"
              @edit-task="onEditTask"
              @check-task="onTaskCheck"
              :task=task
          />
				</view>
			</scroll-view>
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

const onEditTask = (taskId) => {
  console.log('编辑任务:', taskId)
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
/* 全局容器 */
.page-container {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background-color: #f5f5f5;
	overflow: hidden;
}

.content-container {
	flex: 1;
	overflow-y: auto;
	padding: 0 16rpx 20rpx;
}

/* 任务统计卡片 */
.task-stats-card {
	background: white;
	border-radius: 16rpx;
	padding: 24rpx 20rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.stats-row,
.date-control-row {
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

/* 日期控制 */
.date-control-row {
	margin-top: 24rpx;
}

.date-nav {
	flex: 1;
	text-align: center;
}

.nav-icon {
	font-size: 32rpx;
	color: #666;
}

.current-date {
	flex: 2;
	text-align: center;
}

.date-text {
	font-size: 28rpx;
	font-weight: 500;
	color: #333;
}

/* 任务列表 */
.task-list {
	padding-top: 10rpx;
}

.empty-state {
	text-align: center;
	padding: 120rpx 40rpx 80rpx;
}

.empty-icon {
	font-size: 72rpx;
	margin-bottom: 20rpx;
}

.empty-text {
	font-size: 28rpx;
	color: #999;
}


/* 小屏适配 */
@media (max-width: 375px) {
	.stat-number {
		font-size: 32rpx;
	}
	.task-title {
		font-size: 30rpx;
	}
	.task-desc {
		font-size: 24rpx;
	}
}
</style>