<template>
	<view class="schedule-edit-container">
		<view class="edit-content">
			<!-- 基本信息 -->
			<view class="form-section">
				<text class="section-title">基本信息</text>

				<view class="form-item">
					<text class="label">标题 *</text>
					<input class="input" v-model="schedule.itemTitle" placeholder="请输入日程标题" />
				</view>
				<text class="label expand-trigger" @click="toggleDescription">
					更多信息 <text class="expand-icon">{{ showDescription ? '收起' : '展开' }}</text>
				</text>
				<view v-if="showDescription">
					<view class="form-item">
						<text class="label">
							描述
						</text>
						<view class="expand-container">
							<textarea class="textarea" v-model="schedule.itemDesc" placeholder="请输入日程描述" />
						</view>
					</view>

					<view class="form-item">
						<text class="label">
							地点
						</text>
						<view class="expand-container">
							<input class="input" v-model="schedule.location" placeholder="请输入地点" />
						</view>
					</view>
				</view>
			</view>

			<!-- 重复设置 -->
			<view class="form-section">
				<text class="section-title">重复设置</text>
				<view class="uni-flex uni-row">
					<view class="form-item" style="width: 20%;">
						<text class="label">重复类型</text>
						<picker class="picker" mode="selector" :range="repeatTypeOptions"
							:value="getRepeatTypeIndex(schedule.repeatType)" @change="handleRepeatTypeChange">
							<view class="picker-display">{{ getRepeatTypeText(schedule.repeatType) }}</view>
						</picker>
					</view>

					<!-- 重复时间范围 - 仅在设置重复时显示 -->
					<view class="uni-row" v-if="schedule.repeatType !== 'none'" style="width: 80%;">
						<view class="form-item form-item-row" style="width:50%">
							<text class="label">重复开始日期</text>
							<picker class="picker" mode="date" :value="formatDate(schedule.repeatStartDay)"
								start="2023-01-01" end="2030-12-31"
								@change="(e) => handleDateChange(e, 'repeatStartDay')">
								<view class="picker-display">{{ formatDate(schedule.repeatStartDay) }}</view>
							</picker>
						</view>

						<view class="form-item form-item-row" style="width:50%">
							<text class="label">重复结束日期</text>
							<picker class="picker" mode="date" :value="formatDate(schedule.repeatEndDay)"
								start="2023-01-01" end="2030-12-31"
								@change="(e) => handleDateChange(e, 'repeatEndDay')">
								<view class="picker-display">{{ formatDate(schedule.repeatEndDay) }}</view>
							</picker>
						</view>
					</view>
				</view>



				<!-- 不重复：日期+时间 -->
				<view class="form-item" v-if="schedule.repeatType === 'none'">
					<text class="label">日期 *</text>
					<picker class="picker" mode="date" :value="formatDate(schedule.startTime)" start="2023-01-01"
						end="2030-12-31" @change="(e) => handleEventDateChange(e)">
						<view class="picker-display">{{ formatDate(schedule.startTime) }}</view>
					</picker>
				</view>
				<!-- 每周重复：周几+时间 -->
				<view v-else-if="schedule.repeatType === 'weekly'">
					<text class="label">重复星期</text>
					<view class="week-days-container uni-row">
						<view v-for="(day, index) in weekDays" :key="index" class="week-day-item"
							:class="{ selected: schedule.repeatKeys.includes(index.toString()) }"
							@click="toggleWeekDay(index)">
							{{ day }}
						</view>
					</view>
				</view>

				<view class="form-item" v-else-if="schedule.repeatType === 'monthly'">
					<text class="label">日期 *</text>
					<picker class="picker" mode="selector" :range="monthDays"
						:value="getMonthDayIndex(schedule.repeatKeys[0])"
						@change="(e) => handleMonthDayChange(e, 'startTime')">
						<view class="picker-display">{{ schedule.repeatKeys[0] }}日</view>
					</picker>
				</view>

				<!-- 每年重复：月/日 + 时间 -->
				<view class="form-item" v-else-if="schedule.repeatType === 'yearly'">
					<text class="label">日期 *</text>
					<picker class="picker" mode="date" :value="schedule.repeatKeys[0]" fields="month-day"
						@change="(e) => handleYearDateChange(e)">
						<view class="picker-display">{{ (schedule.repeatKeys[0]) }}</view>
					</picker>
				</view>

				<view class="uni-flex uni-row" v-if="schedule.itemType != 'task'">
					<view class="form-item form-item-row" style="width:50%">
						<text class="label">开始时间 *</text>
						<picker class="picker" mode="time" :value="getTimeOnly(schedule.startTime)" start="00:00"
							end="23:59" @change="(e) => handleTimeChange(e, 'startTime')">
							<view class="picker-display">{{ getTimeOnly(schedule.startTime) }}</view>
						</picker>
					</view>

					<view class="form-item form-item-row" style="width:50%">
						<text class="label">结束时间 *</text>
						<picker class="picker" mode="time" :value="getTimeOnly(schedule.endTime)" start="00:00"
							end="23:59" @change="(e) => handleTimeChange(e, 'endTime')">
							<view class="picker-display">{{ getTimeOnly(schedule.endTime) }}</view>
						</picker>
					</view>
				</view>
			</view>


			<!-- 时间设置 -->


			<!-- 类型设置 -->
			<view class="form-section" v-if="schedule.itemType != 'task'">
				<text class="section-title">类型设置</text>

				<view class="form-item">
					<text class="label">日程类型</text>
					<picker class="picker" mode="selector" :range="itemTypeOptions"
						:value="getItemTypeIndex(schedule.itemType)" @change="handleItemTypeChange">
						<view class="picker-display">{{ getItemTypeText(schedule.itemType) }}</view>
					</picker>
				</view>
			</view>
			<!-- 积分设置 -->
			<view class="form-section" v-if="schedule.itemType == 'task'">
				<text class="section-title">积分设置</text>

				<view class="form-item">
					<text class="label">积分数量</text>
					<input class="input" v-model="schedule.score" placeholder="积分" />
				</view>
				<view class="form-item">
					<text class="label">奖励机制</text>
					<input class="input" v-model="schedule.scoreType" placeholder="积分" />
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'schedule-edit',
		props: {
			schedule: Object
		},
		data() {
			return {
				scheduleData: {},
				// 重复类型选项
				repeatTypeOptions: ['不重复', '每天', '每周', '每月', '每年'],
				repeatTypeValues: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
				// 星期选项
				weekDays: ['日', '一', '二', '三', '四', '五', '六'],
				// 月份天数选项（1-31）
				monthDays: Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
				// 日程类型选项
				itemTypeOptions: ['学校', 'task'],
				itemTypeValues: ['school', 'task'],
				// 控制描述字段显示状态
				showDescription: false,
				// 控制地点字段显示状态
				showLocation: false
			};
		},
		computed: {
			isEditMode() {
				return this.schedule !== null && this.schedule !== undefined;
			}
		},
		methods: {
			// 获取时间部分（HH:MM格式）
			getTimeOnly(dateTimeStr) {
				if (!dateTimeStr) return '00:00';
				const date = new Date(dateTimeStr);
				if (isNaN(date.getTime())) return '00:00';
				return `${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
			},

			// 获取月份中的日期
			getMonthDay(dateTimeStr) {
				if (!dateTimeStr) return 1;
				const date = new Date(dateTimeStr);
				if (isNaN(date.getTime())) return 1;
				return date.getDate();
			},

			// 获取月份日期索引
			getMonthDayIndex(dateTimeStr) {
				const day = this.getMonthDay(dateTimeStr);
				return day - 1;
			},

			// 格式化月日显示（MM-DD）
			formatMonthDay(dateTimeStr) {
				if (!dateTimeStr) return '01-01';
				const date = new Date(dateTimeStr);
				if (isNaN(date.getTime())) return '01-01';
				return `${this.padZero(date.getMonth() + 1)}-${this.padZero(date.getDate())}`;
			},

			// 处理时间变更
			handleTimeChange(e, field) {
				const timeValue = e.detail.value;
				this.schedule[field] = this.getDatePart(this.schedule[field]) + ' ' + timeValue+':00';
				console.log(this.schedule[field])
			},

			// 处理每月日期变更
			handleMonthDayChange(e, field) {
				const dayIndex = e.detail.value;
				this.schedule.repeatKeys[0] = this.monthDays[dayIndex];

			},

			// 处理每年日期变更（只保留月日）
			handleYearDateChange(e) {
				const dateStr = e.detail.value;
				const [year, month, day] = dateStr.split('-');
				this.schedule.repeatKeys[0] = month+'-'+day
			},

			bindTimeChange(e, field) {
				this.time = e.detail.value;
			},

			// 切换描述字段显示状态
			toggleDescription() {
				this.showDescription = !this.showDescription;
			},

			// 切换地点字段显示状态
			toggleLocation() {
				this.showLocation = !this.showLocation;
			},
			// 格式化日期时间显示
			formatDateTime(dateTimeStr) {
				if (!dateTimeStr) return '';
				const date = new Date(dateTimeStr);
				if (isNaN(date.getTime())) return '';
				return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}-${this.padZero(date.getDate())} ${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
			},

			// 格式化日期显示
			formatDate(dateTimeStr) {
				if (!dateTimeStr) return '';
				const date = new Date(dateTimeStr);
				if (isNaN(date.getTime())) return '';
				return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}-${this.padZero(date.getDate())}`;
			},

			// 补零
			padZero(num) {
				return num < 10 ? `0${num}` : num;
			},

			// 获取重复类型索引
			getRepeatTypeIndex(type) {
				return this.repeatTypeValues.indexOf(type) || 0;
			},

			// 获取重复类型文本
			getRepeatTypeText(type) {
				const index = this.repeatTypeValues.indexOf(type);
				return index !== -1 ? this.repeatTypeOptions[index] : this.repeatTypeOptions[0];
			},

			// 获取日程类型索引
			getItemTypeIndex(type) {
				return this.itemTypeValues.indexOf(type) || 0;
			},

			// 获取日程类型文本
			getItemTypeText(type) {
				const index = this.itemTypeValues.indexOf(type);
				return index !== -1 ? this.itemTypeOptions[index] : this.itemTypeOptions[0];
			},

			// 处理日期变更
			handleDateChange(e, field) {
				const dateStr = e.detail.value;
				this.schedule[field] = dateStr;
			},
			getTimePart(dateTimeStr) {
				return dateTimeStr.split(' ')[1] || '00:00'
			},
			getDatePart(dateTimeStr) {
				return dateTimeStr.split(' ')[0]
			},
			handleEventDateChange(e) {
				const dateStr = e.detail.value;
				this.schedule['startTime'] = dateStr + ' ' + this.getTimePart(this.schedule['startTime'])
				this.schedule['endTime'] = dateStr + ' ' + this.getTimePart(this.schedule['endTime'])
			},

			// 处理重复类型变更
			handleRepeatTypeChange(e) {
				const index = e.detail.value;
				this.schedule.repeatType = this.repeatTypeValues[index];
				// 如果不是每周重复，清空重复星期
				if (this.schedule.repeatType !== 'weekly') {
					this.schedule.repeatKeys = [];
				}
			},

			// 处理日程类型变更
			handleItemTypeChange(e) {
				const index = e.detail.value;
				this.schedule.itemType = this.itemTypeValues[index];
			},

			// 切换星期选择
			toggleWeekDay(dayIndex) {
				const key = dayIndex.toString();
				const index = this.schedule.repeatKeys.indexOf(key);
				if (index > -1) {
					this.schedule.repeatKeys.splice(index, 1);
				} else {
					this.schedule.repeatKeys.push(key);
				}
				// 排序
				this.schedule.repeatKeys.sort((a, b) => parseInt(a) - parseInt(b));
			}
		}
	};
</script>

<style scoped>
	.schedule-edit-container {
		height: 100%;
		background-color: #f5f5f5;
		display: flex;
		flex-direction: column;
	}

	.edit-header {
		height: 50px;
		background-color: #2196f3;
		color: white;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 15px;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-title {
		font-size: 18px;
		font-weight: bold;
	}

	.header-actions {
		display: flex;
		gap: 10px;
	}

	.btn-cancel,
	.btn-save {
		padding: 5px 15px;
		border: none;
		border-radius: 4px;
		font-size: 14px;
	}

	.btn-cancel {
		background-color: transparent;
		color: white;
	}

	.btn-save {
		background-color: white;
		color: #2196f3;
		font-weight: bold;
	}

	.edit-content {
		flex: 1;
		overflow-y: auto;
		padding: 15px;
	}

	.form-section {
		background-color: white;
		border-radius: 8px;
		padding: 15px;
		margin-bottom: 15px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.section-title {
		font-size: 16px;
		font-weight: bold;
		color: #333;
		margin-bottom: 15px;
		display: block;
	}

	.form-item {
		margin-bottom: 15px;
	}

	.label {
		display: block;
		font-size: 14px;
		color: #666;
		margin-bottom: 8px;
	}

	.expand-trigger {
		cursor: pointer;
		color: #2196f3;
		transition: color 0.3s;
	}

	.expand-trigger:active {
		color: #1976d2;
	}

	.expand-icon {
		font-size: 12px;
		color: #999;
		margin-left: 5px;
	}

	.expand-container {
		animation: slideDown 0.2s ease-out;
	}

	.input,
	.textarea {
		width: 100%;
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
		box-sizing: border-box;
	}

	.textarea {
		height: 100px;
		resize: none;
	}

	.picker {
		width: 100%;
	}

	.picker-display {
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 14px;
		background-color: white;
	}

	.week-days-container {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.week-day-item {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background-color: #f5f5f5;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		color: #666;
		transition: all 0.3s;
	}

	.week-day-item.selected {
		background-color: #2196f3;
		color: white;
	}

	/* 展开动画 */
	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* 适配小屏幕 */
	@media (max-width: 375px) {
		.edit-content {
			padding: 10px;
		}

		.form-section {
			padding: 12px;
		}
	}

	.form-item-row {
		padding-left: 10px;
		padding-right: 10px;
	}
</style>