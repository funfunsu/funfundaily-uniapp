<!-- pages/profile/index.vue -->
<template>
  <view class="profile-container">
    <!-- 用户信息区域 -->
    <view class="user-info-section">
      <view class="avatar">
        <text class="avatar-text">U</text>
      </view>
      <view class="user-details">
        <text class="user-name">{{ userInfo.username || '未知用户' }}</text>
      </view>
      <view class="group-selector-container">
        <view class="group-label">当前群组：</view>
        <view class="group-picker-wrapper">
          <picker
              class="group-picker"
              @change="bindGroupChange"
              :value="selectedGroupIdx"
              :range="groupList"
              range-key="groupName"
          >
            <view class="picker-value">
              {{ groupList[selectedGroupIdx]?.groupName || '请选择群组' }}
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
        <view class="add-group-btn" @click="showCreateGroupForm">
          <text class="add-icon">+</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单区域 -->
    <view class="menu-section">
      <view class="menu-item" @click="handleGroupManageClick">
        <view class="menu-left">
          <text class="menu-title">群组管理</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="handleGroupMembersClick">
        <view class="menu-left">
          <text class="menu-title">成员管理</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 创建群组表单弹窗 -->
    <view v-if="showGroupForm" class="group-form-modal" @click="cancelCreateGroup">
      <view class="group-form-container" @click.stop>
        <view class="group-form-header">
          <text class="group-form-title">创建新群组</text>
        </view>
        <view class="group-form-body">
          <view class="form-item">
            <text class="form-label">群组名称 *</text>
            <input
                ref="groupNameInput"
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
          <button
              class="submit-btn"
              :class="{ disabled: !newGroupName.trim() }"
              @click="submitCreateGroup"
              :disabled="!newGroupName.trim()"
          >
            创建
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import api from '../../utils/apiTs'

export default {
  data() {
    return {
      userInfo: {},
      groupList: [],
      selectedGroupIdx: 0,
      showGroupForm: false,
      newGroupName: '',
      inputFocus: false
    }
  },
  mounted() {
    this.fetchUserInfo()
    this.fetchGroupList()
  },
  methods: {
    async fetchUserInfo() {
      try {
        const res = await api.user.getInfo()
        this.userInfo = res.data || {}
      } catch (err) {
        console.error('获取用户信息失败', err)
        uni.showToast({ title: '获取用户信息失败', icon: 'none' })
      }
    },

    async fetchGroupList() {
      try {
        const res = await api.group.list()
        this.groupList = Array.isArray(res) ? res : []
        // 如果有群组，默认选中第一个
        if (this.groupList.length > 0) {
          this.selectedGroupIdx = 0
        }
      } catch (err) {
        console.error('获取群组列表失败', err)
        uni.showToast({ title: '获取群组失败', icon: 'none' })
      }
    },

    bindGroupChange(e) {
      this.selectedGroupIdx = e.detail.value
    },

    handleGroupManageClick() {
      uni.navigateTo({
        url: '/pages/profile/group-manage'
      })
    },

    handleGroupMembersClick() {
      const currentGroup = this.groupList[this.selectedGroupIdx]
      if (!currentGroup) {
        uni.showToast({ title: '请先选择或创建群组', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/pages/profile/group-member?groupId=${currentGroup.id}&groupName=${encodeURIComponent(currentGroup.groupName)}`
      })
    },

    showCreateGroupForm() {
      this.showGroupForm = true
      this.newGroupName = ''
      this.$nextTick(() => {
        // 自动聚焦输入框（App/小程序支持有限，但尽量尝试）
        const input = this.$refs.groupNameInput
        if (input && typeof input.focus === 'function') {
          input.focus()
        }
        // 滚动到可视区域（可选）
        uni.createSelectorQuery()
            .select('.group-form-container')
            .boundingClientRect((rect) => {
              if (rect && rect.top < 0) {
                uni.pageScrollTo({ scrollTop: 0, duration: 200 })
              }
            })
            .exec()
      })
    },

    cancelCreateGroup() {
      this.showGroupForm = false
      this.newGroupName = ''
      this.inputFocus = false
    },

    async submitCreateGroup() {
      const name = this.newGroupName.trim()
      if (!name) {
        uni.showToast({ title: '请输入群组名称', icon: 'none' })
        return
      }

      try {
        uni.showLoading({ title: '创建中...' })
        const res = await api.group.add({ groupName: name })
        // 假设返回 { id, groupName }
        const newGroup = { id: res.id, groupName: name }
        this.groupList.push(newGroup)
        this.selectedGroupIdx = this.groupList.length - 1

        uni.showToast({ title: '群组创建成功', icon: 'success' })
        this.cancelCreateGroup()
      } catch (error) {
        console.error('创建群组失败:', error)
        uni.showToast({ title: '创建失败，请重试', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  }
}
</script>

<style scoped>
.profile-container {
  background-color: #f8f9fa;
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
}

/* 用户信息区域 */
.user-info-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #007aff, #00bfff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.avatar-text {
  color: white;
  font-size: 48rpx;
  font-weight: bold;
}

.user-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 30rpx;
}

.group-selector-container {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 500rpx;
  background: #f0f7ff;
  border-radius: 16rpx;
  padding: 16rpx 20rpx;
}

.group-label {
  font-size: 26rpx;
  color: #666;
  white-space: nowrap;
  margin-right: 12rpx;
}

.group-picker-wrapper {
  flex: 1;
  position: relative;
}

.group-picker {
  width: 100%;
}

.picker-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  color: #333;
  padding: 12rpx 0;
}

.picker-arrow {
  font-size: 20rpx;
  color: #999;
  transform: scaleY(0.7);
}

.add-group-btn {
  margin-left: 16rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background-color: #e6f0ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #007aff;
  font-size: 40rpx;
  font-weight: bold;
}

/* 菜单区域 */
.menu-section {
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 40rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-title {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.menu-arrow {
  font-size: 36rpx;
  color: #007aff;
}

/* 创建群组弹窗 */
.group-form-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.group-form-container {
  width: 85%;
  max-width: 520rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.group-form-header {
  text-align: center;
  padding: 36rpx 0;
  background: #f8f9fa;
}

.group-form-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.group-form-body {
  padding: 0 40rpx 30rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.form-input {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #007aff;
  outline: none;
}

.placeholder-text {
  color: #aaa;
}

.group-form-footer {
  display: flex;
  height: 96rpx;
  border-top: 1rpx solid #f0f0f0;
}

.cancel-btn,
.submit-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  border: none;
  background: transparent;
  cursor: pointer;
}

.cancel-btn {
  color: #666;
  border-right: 1rpx solid #f0f0f0;
}

.submit-btn {
  color: #007aff;
  font-weight: 600;
}

.submit-btn.disabled {
  color: #ccc;
  opacity: 1;
}
</style>