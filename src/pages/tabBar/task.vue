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

				<view class="date-control-row">
					<view class="date-nav" @click="handleLastDayClick">
						<text class="nav-icon">←</text>
					</view>
					<view class="current-date">
						<text class="date-text">{{ formattedCurrentDate }}</text>
					</view>
					<view class="date-nav" @click="handleNextDayClick">
						<text class="nav-icon">→</text>
					</view>
				</view>
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
					:key="task.id"
					class="task-item"
					:class="{ 'task-item--completed': task.isCompleted }"
					@click="itemClick(task.id)"
				>
					<view class="task-header">
						<view class="task-title-section">
							<text class="task-title">{{ task.itemTitle || '任务标题' }}</text>
							<text class="task-point">+{{ task.extra?.pointCnt || 0 }}</text>
						</view>
						<view class="task-actions">
							<text class="edit-icon" @click.stop="handleEditTaskClick(task.id)">⚙️</text>
							<switch
								:checked="!!task.isCompleted"
								:disabled="!!task.isCompleted"
								@change="handleTaskCheck($event, task)"
								class="task-switch"
							/>
						</view>
					</view>

					<text class="task-desc">{{ task.itemDesc || '暂无任务描述' }}</text>

					<view v-if="task.isCompleted" class="task-completion-info">
						<text class="completed-text">
							✓ <text class="point-earned">+{{ task.extra?.pointCnt }}</text>
						</text>
						<text class="completed-time">{{ formatTime(task.completedTime) }}</text>
					</view>
				</view>
			</scroll-view>
		</view>

		<!-- 底部栏 -->
		<view class="bottom-bar">
			<schedule-bottom-bar add-button-text="任务" @add-click="handleAddClick" />
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import apiTs from '@/utils/apiTs'
import scheduleBottomBar from '@/components/schedule-bottom-bar.vue'

// =============== 类型定义 ===============
interface Task {
	id: string | number
	itemTitle?: string
	itemDesc?: string
	extra?: {
		pointCnt?: number | string
	}
	isCompleted?: boolean
	completedTime?: number | string | null
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
		.filter(t => t.isCompleted && t.extra?.pointCnt)
		.reduce((sum, t) => sum + (Number(t.extra.pointCnt) || 0), 0)
)

// =============== 方法 ===============
async function fetchAllData() {
	await Promise.all([fetchPoint(), fetchTaskList()])
}

async function fetchPoint() {
	try {
		const resp = await apiTs.point.get({})
		point.value = resp.data || { count: 0 }
	} catch (err) {
		console.error('获取积分失败', err)
	}
}

async function fetchTaskList() {
	try {
		const req = { date: currentDate.value }
		const [taskListResp, recordResp] = await Promise.all([
			apiTs.task.list(req),
			apiTs.task.records(req)
		])

		const tasks = taskListResp || []
		const records = recordResp || []

		const recordMap = new Map()
		records.forEach((r: any) => {
			if (r.relatedItemId) recordMap.set(r.relatedItemId, r)
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

function updateDate(days: number) {
	const newDate = new Date(currentDate.value)
	newDate.setDate(newDate.getDate() + days)
	currentDate.value = newDate
	fetchTaskList()
}

function handleTaskCheck(e: any, task: Task) {
	const isChecked = e.detail.value
	if (!isChecked) return // 实际不可取消（因 disabled）

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

	// TODO: 调用 API 提交完成状态
	// await apiTs.task.complete({ id: task.id })
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

/* 任务项 */
.task-item {
	background: white;
	border-radius: 16rpx;
	padding: 28rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
	transition: transform 0.2s;
}

.task-item:active {
	transform: translateY(-4rpx);
}

.task-item--completed {
	opacity: 0.85;
}

/* 任务头部 */
.task-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 16rpx;
}

.task-title-section {
	flex: 1;
	display: flex;
	align-items: center;
	overflow: hidden;
}

.task-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	flex: 1;
}

.task-point {
	margin-left: 16rpx;
	padding: 6rpx 16rpx;
	background: #f0f5ff;
	color: #2196f3;
	border-radius: 20rpx;
	font-size: 24rpx;
	font-weight: bold;
	flex-shrink: 0;
}

.task-actions {
	display: flex;
	align-items: center;
	margin-left: 20rpx;
}

.edit-icon {
	font-size: 32rpx;
	color: #999;
	margin-right: 16rpx;
}

.task-switch {
	transform: scale(0.85);
}

/* 任务描述 */
.task-desc {
	font-size: 26rpx;
	color: #666;
	line-height: 1.5;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

/* 完成信息 */
.task-completion-info {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 16rpx;
	padding-top: 16rpx;
	border-top: 1rpx solid #f0f0f0;
}

.completed-text {
	font-size: 26rpx;
	color: #4caf50;
	font-weight: 500;
}

.point-earned {
	color: #007aff;
}

.completed-time {
	font-size: 24rpx;
	color: #999;
}

/* 底部栏 */
.bottom-bar {
	height: 100rpx;
	background: white;
	box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.1);
	z-index: 10;
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