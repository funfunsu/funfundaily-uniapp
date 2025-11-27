<template>
	<view class="profile-container">
		<!-- 用户信息区域 -->
		<view class="user-info-section">
			<view class="avatar">
				<text class="avatar-text">用户</text>
			</view>
			<view class="user-details">
				<text class="user-id">{{userInfo.username}}</text>
			</view>
			<!-- 积分设置 -->
			<view class="my-menu-item uni-row">
				<view class="uni-list-cell">
					<view class="uni-list-cell-left">当前群组</view>
					<view class="uni-list-cell-db">
						<picker class="picker-selector" @change="bindGroupChange" :value="selectedGroupIdx" :range="groupList" range-key="groupName">
							<view class="picker-selector--value uni-row">{{groupList[selectedGroupIdx]?.groupName}}<uni-icons type="right" style="margin-left: 10px;"></uni-icons></view>
						</picker>
					</view>
				</view>
				<view @click="showCreateGroupForm">
					<uni-icons type="plusempty" size="20" color="#007aff"></uni-icons>
				</view>
			</view>
			
		</view>
		<!-- 功能菜单区域 -->
		

		<!-- 功能菜单区域 -->
		<view class="menu-section">
			<!-- 群组管理 -->
			<view class="menu-item uni-row" @click="handleGroupManageClick">
				<view class="menu-left uni-row">
					<uni-icons type="vip" size="20"></uni-icons>
					<view class="stat-divider" ></view>
					<text class="menu-title">群组管理</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
			<!-- 群组成员 -->
			<view class="menu-item uni-row" @click="handleGroupMembersClick">
				<view class="menu-left uni-row">
					<uni-icons type="staff" size="20"></uni-icons>
					<view class="stat-divider" ></view>
					<text class="menu-title">成员管理</text>
				</view>
				<view class="menu-right">
					<text class="menu-arrow">›</text>
				</view>
			</view>
		</view>
		
		<!-- 创建群组表单弹窗 -->
		<view v-if="showGroupForm" class="group-form-modal">
			<view class="group-form-container">
				<view class="group-form-header">
					<text class="group-form-title">创建新群组</text>
				</view>
				<view class="group-form-body">
					<view class="form-item">
						<text class="form-label">群组名称</text>
						<input 
							class="form-input" 
							v-model="newGroupName" 
							placeholder="请输入群组名称" 
							placeholder-class="placeholder-text"
							@focus="inputFocus = true"
							@blur="inputFocus = false"
						/>
					</view>
				</view>
				<view class="group-form-footer">
					<button class="cancel-btn" @click="cancelCreateGroup">取消</button>
					<button class="submit-btn" @click="submitCreateGroup" :disabled="!newGroupName.trim()">创建</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import api from '../../utils/api.js'
	
	export default {
		data() {
			return {
				// 模拟积分数据
				points: 1280,
				selectedGroupIdx:0,
				groupList: [],
				// 创建群组相关数据
				showGroupForm: false,
				newGroupName: '',
				inputFocus: false,
				userInfo:{}
			}
		},
		mounted() {
			this.fetchGroupList();
			this.fetchUserInfo();
		},
		methods: {
			// 获取群组成员
			async fetchUserInfo() {
				const userRes = await api.user.getInfo();
				this.userInfo = userRes.data || []
				console.log(this.groupList)
			},
			// 获取群组成员
			async fetchGroupList() {
				const groupRes = await api.group.list();
				this.groupList = groupRes.data || []
				console.log(this.groupList)
			},
			bindGroupChange(e){
				this.selectedGroupIdx = e.detail.value;
				
			},
			// 处理积分点击，跳转到积分兑换页面
			handleGroupManageClick() {
				// 根据项目结构，跳转到群组成员页面
				uni.navigateTo({
					url: '/pages/profile/group-manage'
				});
			},

			// 处理群组成员点击，跳转到成员管理页面
			handleGroupMembersClick() {
				console.log(1)
				// 根据项目结构，跳转到群组成员页面
				uni.navigateTo({
					url: '/pages/profile/group-member'
				});
			},

			// 处理设置点击
			handleSettingsClick() {
				uni.showToast({
					title: '设置功能待实现',
					icon: 'none'
				});
			},
			
			// 显示创建群组表单
			showCreateGroupForm() {
				this.showGroupForm = true;
				this.newGroupName = '';
				// 延迟聚焦输入框
				setTimeout(() => {
					uni.createSelectorQuery().select('.form-input').boundingClientRect((rect) => {
						uni.pageScrollTo({
							top: Math.max(0, rect.top - 100),
							duration: 300
						});
					}).exec();
				}, 300);
			},
			
			// 取消创建群组
			cancelCreateGroup() {
				this.showGroupForm = false;
				this.newGroupName = '';
				this.inputFocus = false;
			},
			
			// 提交创建群组
			async submitCreateGroup() {
				if (!this.newGroupName.trim()) {
					uni.showToast({
						title: '请输入群组名称',
						icon: 'none'
					});
					return;
				}
				
				try {
					const requestData = {'groupName':this.newGroupName.trim()}
					const groupRes = await api.group.add(requestData)
					// 调用创建群组API（实际项目中替换为真实接口）
					// 这里模拟创建成功
					const newGroup = {
						id: Date.now(),
						groupName: this.newGroupName.trim()
					};
					
					// 添加到群组列表
					this.groupList.push(newGroup);
					// 切换到新创建的群组
					this.selectedGroupIdx = this.groupList.length - 1;
					
					// 显示成功提示
					uni.showToast({
						title: '群组创建成功',
						icon: 'success'
					});
					
					// 关闭表单
					this.cancelCreateGroup();
				} catch (error) {
					uni.showToast({
						title: '创建失败，请重试',
						icon: 'none'
					});
				}
			}
		}
	}
</script>

<style scoped>
	.profile-container {
		background-color: #f5f5f5;
		padding-bottom: 20rpx;
		min-height: calc(100% - 60px);
		display: flex;
		flex-direction: column;
	}

	/* 用户信息区域 */
	.user-info-section {
		display: flex;
		align-items: center;
		padding-top: 20px;
		padding-left: 20px;
		padding-right: 20px;
		padding-bottom: 10px;
		background-color: #fff;
		margin-bottom: 20px;
	}

	.avatar {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background-color: #007aff;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-text {
		color: #fff;
		font-weight: bold;
	}

	.user-details {
		flex: 1;
		margin-bottom:20px;
		margin-top:20px;
	}

	.user-name {
		font-weight: bold;
		color: #333;
		margin-bottom: 10rpx;
		display: block;
		margin-top:10px;
		text-align:center;
	}

	.user-id {
		color: #999;
	}

	/* 菜单区域 */
	.menu-section {
		background-color: #fff;
	}

	.my-menu-item{
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top:10rpx;
		padding-bottom:10rpx;
		border-top: 1rpx solid #f0f0f0;
		width: 80%;
	}

	.menu-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 30rpx 40rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.menu-item:last-child {
		border-bottom: none;
	}

	.menu-left {
		display: flex;
		align-items: center;
	}

	.menu-icon {
		margin-right: 30rpx;
		width: 50rpx;
		text-align: center;
	}

	.menu-title {
		color: #333;
	}

	.menu-right {
		display: flex;
		align-items: center;
	}

	.points-value {
		color: #007aff;
		margin-right: 10rpx;
	}

	.menu-arrow {
		color: #007aff;
		font-size:20px;
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
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
}
.picker-selector--value{
	width: 100px;
}

/* 创建群组表单样式 */
.group-form-modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.group-form-container {
	width: 80%;
	max-width: 500rpx;
	background-color: #fff;
	border-radius: 20rpx;
	overflow: hidden;
}

.group-form-header {
	padding: 30rpx 40rpx;
	border-bottom: 1rpx solid #f0f0f0;
	text-align: center;
}

.group-form-title {
	font-weight: bold;
	color: #333;
}

.group-form-body {
	padding: 40rpx;
}

.form-item {
	margin-bottom: 30rpx;
}

.form-label {
	display: block;
	font-size: 28rpx;
	color: #333;
	margin-bottom: 15rpx;
}

.form-input {
	width: 100%;
	height: 80rpx;
	border: 2rpx solid #ddd;
	border-radius: 10rpx;
	padding: 0 20rpx;
	box-sizing: border-box;
	font-size: 28rpx;
}

.form-input:focus {
	border-color: #007aff;
}

.placeholder-text {
	color: #999;
}

.group-form-footer {
	display: flex;
	border-top: 1rpx solid #f0f0f0;
}

.cancel-btn,
.submit-btn {
	flex: 1;
	height: 90rpx;
	line-height: 90rpx;
	text-align: center;
	font-size: 28rpx;
	background: none;
	border: none;
}

.cancel-btn {
	color: #666;
	border-right: 1rpx solid #f0f0f0;
}

.submit-btn {
	color: #007aff;
}

.submit-btn:disabled {
	color: #999;
	opacity: 0.6;
}

/* 确保输入框聚焦时有良好的视觉反馈 */
.form-input:focus {
	border-color: #007aff;
	box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.stat-divider {
  display: inline-block;
  width: 1px;
  height: 24px;
  background-color: #eee;
  margin: 0 10px;
  vertical-align: middle;
}
</style>
