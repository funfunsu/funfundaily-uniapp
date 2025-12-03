<template>
	<!-- 顶部固定栏 -->
	<view class="top-bar">
		<view class="flex-row" style="width: 100%;">
			<!-- 左侧时间轴表头占位 -->
			<view class="day-column-header" style="width: 12%; flex-shrink: 0;">
				<view class="schedule-header"></view>
			</view>
			<!-- 右侧固定日期表头 -->
			<view class="dates-header" style="width: 88%;">
				<view class="flex-row" >
					<view class="day-column-header" v-for="(date, dateIndex) in dates" :key="dateIndex"
						style="width: 14%;">
						<view class="schedule-header">
							<view class="schedule-header-item">
								<text>{{ weekDays[new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1] }}</text>
								<text class="date-label">{{ date.split('-').slice(1).join('-') }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>

	<!-- 中间内容区域 -->
	<view class="content-container">
		<view class="content-wrapper">
			<view class="flex-row">
				<!-- 左侧时间轴 -->
				<view class="time-axis" style="width: 12%; flex-shrink: 0;">
					<view class="flex-column">
						<view class="flex-item-V schedule-time" v-for="(hour, index) in hours" :key="index">
							<view class="time-line-top">{{ hour }}</view>
						</view>
					</view>
				</view>

				<!-- 右侧日期区域 -->
				<view class="dates-container" style="width: 88%;">
					<view class="flex-row">
						<view class="day-column" v-for="(date, dateIndex) in dates" :key="dateIndex"
							style="width: 14%;">
							<view class="flex-column">
								<!-- 背景时间格子 -->
								<view v-for="(hour, hourIndex) in hours" :key="hourIndex"
									class="flex-item-V schedule-item">
									<view class="time-slot"></view>
								</view>

								<!-- 绝对定位的事件层 -->
								<view class="events-layer">
									<view v-for="(event,index) in getAllEventsForDate(date)"
										:key="event.id || `${date}-${event.startHour}-${event.title}`"
										:class="['event-container', `event-${event.color}`]"
										:style="getEventStyle(event)" @click="handleEventClick(date,index)">
										<view class="event-title">{{ event.title }}</view>
                    <checkbox></checkbox>
									</view>
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>
<script>
export default {
		props: {
			dates: {
				type: Array,
				default: () => []
			},
			events: {
				type: Object,
				default: () => ({})
			},
			weekDays: {
				type: Array,
				default: () => ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
			},
			hours: {
				type: Array,
				default: () => ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']
			}
		},
		methods: {
			handleEventClick(date, index) {
				const schedules = this.events[date] || [];
				this.$emit('event-click', schedules[index]);
			},
			// 获取特定日期的所有事件
			getAllEventsForDate(date) {
				const eventsForDate = [];
				const scheduleForDate = this.events[date] || [];
				scheduleForDate.forEach(schedule => {
					// 格式化时间显示
					const startTime = schedule.startTime.split(' ')[1].slice(0, 5);
					const endTime = schedule.endTime.split(' ')[1].slice(0, 5);

					// 根据课程类型设置不同颜色
					let color = 'blue';

					// 计算事件持续时间（分钟）
					const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
					const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
					const durationMinutes = endMinutes - startMinutes;
					const durationHours = durationMinutes / 60;
					const event = {
						id: schedule.id,
						title: schedule.itemTitle,
						startHour: parseInt(startTime.split(':')[0]),
						startMinute: parseInt(startTime.split(':')[1]),
						durationHours: durationHours,
						durationMinutes: durationMinutes,
						color: color
					}
					eventsForDate.push(event);
				})
				return eventsForDate;
			},
			// 计算事件卡片的样式（位置和高度）
			getEventStyle(event) {
				// 每个小时格子高度为60px
				const hourHeight = 60;
				// 计算顶部偏移量（考虑分钟部分）
				const topOffset = (event.startHour - 8) * hourHeight + (event.startMinute / 60) * hourHeight;
				// 计算事件卡片高度（基于持续时间）
				const eventHeight = event.durationHours * hourHeight;

				return {
					position: 'absolute',
					top: `${topOffset}px`,
					height: `${eventHeight}px`,
					zIndex: 10
				};
			}
		}
	};
</script>

<style scoped>
	/* 顶部固定栏：高度40px，蓝色背景 */
	.top-bar {
		height: 40px;
		/* 蓝色背景 */
		color: white;
		display: flex;
		justify-content: center;
		font-size: 16px;
		font-weight: bold;
		flex-shrink: 0;
		/* 防止被压缩 */
		z-index: 100;
		/* 确保在顶层 */
	}

	/* 中间内容区域：自适应高度，可滚动 */
	.content-container {
		flex: 1;
		/* 占据剩余空间 */
		overflow-y: auto;
		/* 允许上下滚动 */
		-webkit-overflow-scrolling: touch;
		/* iOS上的滚动优化 */
		position: relative;
	}

	.content-wrapper {
		margin-right: -6px;
		/* 抵消滚动条宽度，确保与content-container等宽 */
	}

	/* 滚动条样式优化 */
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

	.dates-header {
		overflow-x: auto;
		/* 允许表头横向滚动 */
		flex-shrink: 0;
	}

	.day-column-header {
		display: inline-flex;
		flex-direction: column;
		border-right: 1px solid #eee;
		
		border-top: 1px solid #eee;
	}

	/* 左侧时间轴 */
	.time-axis {
		background: #f7f8fa;
		border-right: 1px solid #eee;
	}

	.schedule-time {
		height: 60px;
		line-height: 60px;
		font-size: 12px;
		color: #888;
		text-align: center;
		border-bottom: 1px solid #eee;
	}

	/* 右侧日期容器 */
	.dates-container {
		flex-shrink: 0;
		/* 防止被压缩，保证列宽稳定 */
	}

	/* 每日日期列 */
	.day-column {
		display: inline-flex;
		flex-direction: column;
		border-right: 1px solid #eee;
		
		border-right: 1px solid #eee;
	}

	/* 日期表头 */
	.schedule-header {
		height: 40px;
		line-height: 20px;
		background: #f7f8fa;
		border-bottom: 1px solid #eee;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.schedule-header-item {
		font-size: 14px;
		color: #2196f3;
		font-weight: bold;
		text-align: center;
	}

	.date-label {
		display: block;
		font-size: 12px;
		color: #888;
		font-weight: normal;
	}

	/* 时间格子和事件卡片 */
	
	.day-column {
		position: relative;
	}

	.schedule-item {
		height: 60px;
		border-bottom: 1px solid #eee;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.time-slot {
		width: 100%;
		height: 100%;
	}

	.events-layer {
		position: absolute;
		top: 0;
		/* 表头高度 */
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		pointer-events: none;
		height: calc(100% - 40px);
	}

	.event-container {
		border-radius: 8px;
		padding: 0;
		color: #fff;
		font-size: 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin: 0 auto;
		pointer-events: auto;
		overflow: hidden;
		width: 100%;
	}

	.event-blue {
		background: #2196f3;
	}

	.event-orange {
		background: #ff9800;
	}

	.event-title {
		margin-bottom: 2px;
		text-align: center;
		font-size: small;
	}

	.time-line-top {
		top: -23px;
		font-size: small;
		padding-left: 6px;
		color: #2196f3;
	}

	/* 小屏幕适配 */
	@media (max-width: 375px) {
		.day-column {
			width: 90px !important;
			/* 窄屏时缩小列宽 */
		}

		.day-column-header {
			width: 90px !important;
		}
	}
	/* 新增：替代 uni-ui 的布局类 */
.flex-row {
	display: flex;
	flex-direction: row;
}

.flex-column {
	display: flex;
	flex-direction: column;
}
</style>