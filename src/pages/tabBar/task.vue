<template>
	<!-- 页面根容器：三段式布局 -->
	<view class="page-container">

		<!-- 中间内容区域 -->
		<view class="content-container">
			<!-- 今日任务统计 -->
			<view class="task-stats">
				<scroll-view direction="horizontal" class="stats-scroll" show-scrollbar="false">
					<view class="uni-flex uni-row">
						<view class="stat-item" style="width:30%">
							<text class="stat-number">{{ completedTasks?.length || 0 }}/{{ todayTasks?.length || 0 }}</text>
							<text class="stat-label">今日任务</text>
						</view>
						<view class="stat-divider"></view>
						<view class="stat-item" @click="handleHistoryClick()" style="width:30%">
							<text class="stat-number">{{ point?.count || 0 }}</text>
							<text class="stat-label">总积分</text>
						</view>
						<view class="stat-divider"></view>
						<view class="stat-item" style="width:30%">
							<text class="stat-number">{{ totalPoints || 0 }}</text>
							<text class="stat-label">今日积分</text>
						</view>
					</view>
					<view class="date-row">
						<view class="uni-flex uni-row">
							<view class="stat-item" style="width:30%">
								<text class="date-icon" @click="handleLastDayClick()">←</text>
							</view>
							<view class="stat-divider"></view>
							<view class="stat-item" style="width:30%">
								<text class="stat-label">{{getDateToShow(currentDate)}}</text>
							</view>
							<view class="stat-divider"></view>
							<view class="stat-item" style="width:30%">
								<text class="date-icon" @click="handleNextDayClick()">→</text>
							</view>
						</view>
					</view>
				</scroll-view>
			</view>

			<!-- 任务列表 -->
		<scroll-view v-show="list_show" id="listview" class="task-list" show-scrollbar="false"
			@scrolltolower="onScrollTolower">
			<!-- 空状态提示 -->
			<view v-if="taskList.length === 0" class="empty-tip">
				<text class="empty-icon">📋</text>
				<text class="empty-text">今天没有任务，休息一下吧！</text>
			</view>

			<!-- 任务项 -->
			<view v-for="(task, index) in taskList" :key="index" :id="'item_'+index" class="task-item"
				@click="itemClick(index)">
					<!-- 任务内容和状态在一行显示 -->
					<view class="task-content-row uni-flex uni-row">
						<!-- 任务信息：标题和描述在一行 -->
						<view class="task-info-section">
							<view class="uni-flex uni-row">
								<text class="task-title">{{ task.itemTitle || '任务标题' }}</text>
								<text class="task-point">+{{task.extra.pointCnt}}</text>
								<text class="edit-icon" @click="handleEditTaskclick(index)">⚙️</text>
							</view>
							<text class="task-desc"> {{ task.itemDesc || '暂无任务描述' }}</text>
						</view>
						<!-- 任务状态 -->
						<view class="task-status">
							<switch style="transform:scale(0.7)" :checked="task.isCompleted || false"
								@change="handleTaskCheck($event, task)" class="task-checkbox"
								:disabled="task.isCompleted || false" />
						</view>
						<view v-if="task.isCompleted" class="task-complete-info">
							<text class="completed-text">✓ <text
									class="task-point-completed">+{{task.extra.pointCnt}}</text></text>
							<text class="completed-time">{{ formatTime(task.completedTime) }}</text>
						</view>

					</view>

					<!-- 任务完成信息 -->

				</view>
		</scroll-view>
		</view>
		<!-- 底部固定栏 -->
		<view class="bottom-bar">
			<schedule-bottom-bar add-button-text="任务" @add-click="handleAddClick" />
		</view>
	</view>
</template>

<script>
	import apiTs from '../../utils/apiTs'
	import scheduleBottomBar from '../../components/schedule-bottom-bar.vue'
export default {
	components: {
		scheduleBottomBar
	},
		data() {
			return {
			todayTasks: [],
			completedTasks: [],
			point: {},
			totalPoints: 0,
			taskList: [],
				taskRecords: [],
				currentDate: new Date(),
				item_count: 20,
				list_show: true,
				listViewElement: null
			}
		},
		mounted() {
			// 获取任务列表
			this.fetchTaskList();
			this.fetchPoint()
		},
		onReady() {
			this.listViewElement = uni.getElementById('listview');
		},
		methods: {
			async fetchPoint() {
				const resp = await apiTs.point.get({});
				console.log('AAAAAAAAA', resp)
				this.point = resp.data || {}

			},
			getDateToShow(date) {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			},
			handleNextDayClick() {
				const dateObj = new Date();
				dateObj.setDate(this.currentDate.getDate() + 1);
				this.currentDate = dateObj
				this.fetchTaskList();
			},
			handleLastDayClick() {
				const dateObj = new Date();
				dateObj.setDate(this.currentDate.getDate() - 1);
				this.currentDate = dateObj;
				this.fetchTaskList();
			},

			// 获取任务列表
			async fetchTaskList() {
				try {
					const req = { 'date': this.currentDate }
					console.log('taskList')

					// 使用Promise.all并行请求，提高性能
					const [taskListResp, recordResp] = await Promise.all([
						apiTs.task.list(req),
						apiTs.task.records(req)
					]);

					const taskList = taskListResp.data || [];
					const taskRecords = recordResp.data || [];
					// 创建任务记录的映射表，方便快速查找
					const taskRecordMap = new Map();
					taskRecords.forEach(record => {
						// 假设任务记录中包含任务ID字段，这里需要根据实际API返回调整
						if (record.relatedItemId) {
							taskRecordMap.set(record.relatedItemId, record);
						}
					});
					console.log('taskMap', taskRecordMap);
					// 为每个任务添加完成状态和完成时间
					const tasksWithStatus = taskList.map(task => {
						// 假设任务对象中包含ID字段，这里需要根据实际API返回调整
						const taskRecord = taskRecordMap.get(task.id);
						const isCompleted = !!taskRecord;

						return {
							...task,
							isCompleted: isCompleted,
							// 如果任务已完成，记录完成时间
							completedTime: taskRecord ? taskRecord.createTime : null
						};
					});

					// 更新页面数据
					this.taskList = tasksWithStatus;
					this.taskRecords = taskRecords;


				} catch (error) {
					// 如果API调用失败，使用模拟数据
					console.log('使用模拟数据');
				}

				// 更新任务统计信息
				this.updateTaskStats();
			},

			// 更新任务统计信息
			updateTaskStats() {
				// 今日任务总数
				this.todayTasks = this.taskList;
				// 已完成任务
				this.completedTasks = this.taskList.filter(task => task.isCompleted);
				// 计算今日积分
				this.totalPoints = this.taskList
					.filter(task => task.isCompleted && task.extra?.pointCnt)
					.reduce((sum, task) => sum + parseInt(task.extra.pointCnt), 0);
			},
			handleHistoryClick() {
				// 跳转到日程编辑页面
				uni.navigateTo({
					url: '/pages/point/history'
				});
			},
			handleEditTaskclick(index) {
				const task = this.taskList[index]
				// 跳转到日程编辑页面
				uni.navigateTo({
					url: '/pages/task/edit?id=' + task.id
				});
			},

			// 处理任务勾选
			handleTaskCheck(event, task) {
				const isChecked = event.detail.value;
				// 更新任务状态
				task.isCompleted = isChecked;
				// 如果完成任务，记录完成时间
				if (isChecked) {
					task.completedTime = Date.now();
				}
				// 更新统计信息
				this.updateTaskStats();
				// 这里可以添加保存任务状态的逻辑
			},

			// 处理添加按钮点击
			handleAddClick() {
				// 跳转到日程编辑页面
				uni.navigateTo({
					url: '/pages/task/edit'
				});
			},

			// 任务项点击事件
			itemClick(index) {
				console.log("任务点击: " + index);
				// 可以添加任务详情查看逻辑
			},

			// 添加新任务
			addTask() {
				// 这里可以跳转到添加任务页面或显示添加任务弹窗
				uni.showToast({
					title: '添加任务',
					icon: 'none'
				});
			},

			// 滚动到底部加载更多
			onScrollTolower() {
				setTimeout(() => {
					this.item_count += 20;
				}, 300);
			},

			// 格式化时间显示
			formatTime(timestamp) {
				if (!timestamp) return '';
				const date = new Date(timestamp);
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				return `${hours}:${minutes}`;
			}
		}
	}
</script>

<style scoped>
	/* 根容器：使用flex布局，占据整个屏幕 */
	.page-container {
		width: 100%;
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		/* 禁止整体滚动 */
		box-sizing: border-box;
		background-color: #f5f5f5;
	}

	/* 顶部固定栏：高度56px，蓝色背景 */
	.top-bar {
		height: 56px;
		background-color: #2196f3;
		color: white;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 0 16px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		flex-shrink: 0;
		z-index: 100;
	}

	.top-bar-title {
		font-size: 18px;
		font-weight: bold;
		margin-bottom: 2px;
	}

	.top-bar-date {
		font-size: 12px;
		opacity: 0.9;
	}

	/* 中间内容区域：自适应高度，可滚动 */
	.content-container {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		/* iOS滚动优化 */
		position: relative;
	}

	/* 任务统计区域 */
	.task-stats {
		background-color: white;
		padding: 12px 0;
		margin-bottom: 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.stats-scroll {
		white-space: nowrap;
	}

	.stat-item {
		display: inline-flex;
		align-items: center;
		/* height: 40px; */
	}

	.stat-number {
		font-size: 20px;
		font-weight: bold;
		color: #2196f3;
		margin-right: 8px;
		margin-bottom: 10px;
	}

	.stat-label {
		font-size: 14px;
		color: #666;
	}

	.stat-divider {
		display: inline-block;
		width: 1px;
		height: 24px;
		background-color: #eee;
		margin: 0 10px;
		vertical-align: middle;
	}

	/* 任务列表 */
	.task-list {
		padding: 0 16px 16px;
		flex: 1;
	}

	/* 空状态提示 */
	.empty-tip {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		text-align: center;
	}

	.empty-icon {
		font-size: 48px;
		margin-bottom: 16px;
	}

	.empty-text {
		font-size: 14px;
		color: #999;
	}

	/* 任务项 */
	.task-item {
		background-color: white;
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
		transition: transform 0.2s, box-shadow 0.2s;
		overflow: hidden;
		position: relative;
	}

	.task-item:active {
		transform: scale(0.98);
	}

	/*<!-- 任务内容行 -->
	.task-content-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	/* 任务信息区域 */
	.task-info-section {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
	}

	/* 任务标题 */
	.task-title {
		font-size: 16px;
		font-weight: 600;
		color: #333;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 0;
	}

	.task-point {
		color: #c4ccd5;
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 12px;
		font-weight: bold;
		min-width: 30px;
		text-align: center;
		flex-shrink: 0;
	}

	.task-point-completed {
		color: #007aff;
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 12px;
		font-weight: bold;
		min-width: 30px;
		text-align: center;
		flex-shrink: 0;
	}

	/* 任务描述 */
	.task-desc {
		font-size: 12px;
		color: #666;
		margin-top: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
	}


	/* 任务状态 */
	.task-status {
		margin-left: 12px;
		flex-shrink: 0;
	}

	.task-checkbox {
		transform: scale(1.2);
	}

	.task-checkbox[checked] {
		color: #4caf50;
	}

	/* 任务完成信息 */
	.task-complete-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-left: 1px solid #f0f0f0;
		padding-left: 10px;
	}

	.completed-text {
		font-size: 13px;
		color: #4caf50;
		font-weight: 500;
	}

	.completed-time {
		font-size: 12px;
		color: #999;
	}

	/* 底部固定栏 */
	.bottom-bar {
		height: 60px;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		font-weight: bold;
		flex-shrink: 0;
		z-index: 100;
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
	}

	/* 添加任务按钮 */
	.add-task-btn {
		position: fixed;
		bottom: 80px;
		right: 20px;
		width: 56px;
		height: 56px;
		border-radius: 28px;
		background-color: #2196f3;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		box-shadow: 0 4px 16px rgba(33, 150, 243, 0.4);
		z-index: 101;
		transition: transform 0.2s, background-color 0.2s;
	}

	.add-task-btn:active {
		transform: scale(0.95);
		background-color: #1976d2;
	}

	.add-btn-text {
		line-height: 1;
	}

	.date-row {
		margin-top: 20px;
	}
	
	.date-icon {
		font-size: 18px;
		color: #666;
		padding: 5px;
	}
	
	.edit-icon {
		font-size: 16px;
		margin-left: 5px;
	}

	/* 适配小屏幕 */
	@media (max-width: 375px) {
		.stat-item {
			padding: 0 16px;
		}

		.stat-number {
			font-size: 20px;
		}

		.task-list {
			padding: 0 12px 0px;
		}

		.task-item {
			padding: 14px;
		}

		.task-title {
			font-size: 15px;
		}

		.task-desc {
			font-size: 13px;
		}
	}
</style>