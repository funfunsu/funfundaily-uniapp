<!-- pages/profile/index.vue -->
<template>
  <view class="profile-container">
    <!-- 用户信息区域 -->
    <view class="user-info-section">
      <view class="avatar">
        <text class="avatar-text">{{ userInfo.nickname?.charAt(0) || '?' }}</text>
      </view>
      <view class="user-details">
        <text class="user-name">{{ userInfo.nickname || '未知用户' }}</text>
      </view>
    </view>

    <!-- 功能菜单区域 -->
    <view>
      <view class="menu-section group-section" v-for="(group, index) in groupList" :key="group.id">
        <view class="menu-item" @click="handleGroupMembersClick(group)">
          <view class="menu-left">
            <text v-if="groupList.length > 1">群组{{ index + 1 }}-</text>
            <text class="menu-title">{{ group.groupName }}</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
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
                ref="groupNameInputRef"
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
    <view class="contact-service-section">
      <button class="create-btn" @click="showCreateGroupForm">
        <text class="contact-icon">+</text> <!-- 可选：添加一个聊天气泡图标 -->
        <text>创建群组</text>
      </button>
    </view>
    <view class="contact-service-section">
      <button class="contact-service-btn" open-type="contact">
        <text class="contact-icon">&#x1F4AC;</text> <!-- 可选：添加一个聊天气泡图标 -->
        <text>联系客服</text>
      </button>
    </view>
  </view>
</template>

<script setup>
// 导入必要的 Vue 3 Composition API 函数
import { ref, onMounted, nextTick } from 'vue'
// 导入 uni-app 提供的页面跳转等 API
import { onLoad, onShow } from '@dcloudio/uni-app'

// --- 响应式状态 ---
const userInfo = ref({})
const groupList = ref([])
const selectedGroupIdx = ref(0)
const showGroupForm = ref(false)
const newGroupName = ref('')
const inputFocus = ref(false)

// --- 模板引用 ---
const groupNameInputRef = ref(null)

// --- 导入工具和组件 ---
import api from '../../utils/apiTs'
import { STORAGE_KEYS, getStoredData, setStoredData, removeStoredData } from '../../utils/storageManager'
// import scheduleBottomBar from "../../components/schedule-bottom-bar.vue"; // 如果需要底部栏组件，可以在这里导入并使用

// --- 方法定义 ---

const fetchUserInfo = async () => {
  try {
    const res = await api.user.getInfo()
    userInfo.value = res || {}
  } catch (err) {
    console.error('获取用户信息失败', err)
    uni.showToast({ title: '获取用户信息失败', icon: 'none' })
  }
}

const editGroup = async (group) => {
  // 编辑群组逻辑
  // 第一步：输入昵称
  uni.showModal({
    title: '修改群组',
    placeholderText: group.groupName,
    editable: true,
    success: async (res1) => {
      if (res1.confirm && res1.content?.trim()) {
        const groupName = res1.content.trim()
        try {
          await api.group.modify({ id: group.id, groupName: groupName })
          await fetchGroupList() // 刷新列表
        } catch (error) {
          console.error('修改群组失败:', error)
          uni.showToast({ title: '修改失败', icon: 'none' })
        }
      }
    },
    fail: () => {
      console.log("编辑群组操作被取消或失败");
    }
  })
}


const fetchGroupList = async () => {
  try {
    const res = await api.group.list()
    groupList.value = Array.isArray(res) ? res : [] // 确保是数组
    setStoredData(STORAGE_KEYS.GROUP_LIST, groupList.value)
    // 如果有群组，默认选中第一个
    if (groupList.value.length > 0) {
      selectedGroupIdx.value = 0
    }
  } catch (err) {
    console.error('获取群组列表失败', err)
    // 可以从本地存储加载缓存数据作为备选
    // const cachedGroups = getStoredData(STORAGE_KEYS.GROUP_LIST);
    // if (Array.isArray(cachedGroups)) {
    //   groupList.value = cachedGroups;
    // }
  }
}

// const bindGroupChange = (e) => { // 如果使用 picker
//   selectedGroupIdx.value = e.detail.value
// }

const handleGroupManageClick = () => {
  uni.navigateTo({
    url: '/pages/profile/group-manage'
  })
}

const handleGroupMembersClick = (group) => {
  setStoredData(STORAGE_KEYS.CURRENT_GROUP, group)
  uni.navigateTo({
    url: `/pages/profile/group-manage?id=${group.id}` // 推荐传递ID以便目标页面获取最新数据
  })
}

const showCreateGroupForm = () => {
  showGroupForm.value = true
  newGroupName.value = ''
  nextTick(() => {
    // 自动聚焦输入框（App/小程序支持有限，但尽量尝试）
    if (groupNameInputRef.value && typeof (groupNameInputRef.value ).focus === 'function') {
      (groupNameInputRef.value ).focus() // uni-app 特定调用方式
    }
    // 滚动到可视区域（可选）
    // uni.createSelectorQuery()... (这部分在 Vue 3 中可能需要调整，但逻辑类似)
  })
}

const cancelCreateGroup = () => {
  showGroupForm.value = false
  newGroupName.value = ''
  inputFocus.value = false
}

const submitCreateGroup = async () => {
  showGroupForm.value = false
  const name = newGroupName.value.trim()
  if (!name) {
    await uni.showToast({title: '请输入群组名称', icon: 'none'})
    return
  }

  await uni.showLoading({title: '创建中...'})
  const res = await api.group.add({ groupName: name })
  // 假设返回包含 id 和 groupName
  const newGroup = { id: res.id, groupName: name }
  groupList.value.push(newGroup)
  selectedGroupIdx.value = groupList.value.length - 1

  await uni.showToast({title: '群组创建成功', icon: 'success'})
  cancelCreateGroup()
}

// --- 生命周期钩子 ---
// 页面加载时执行
onLoad(async (option) => {
  // 可以在这里处理页面参数 option
  await fetchUserInfo()
  await fetchGroupList()
})

// 页面显示时也可能需要刷新数据（例如从管理页返回）
onShow(() => {
  // 如果需要实时更新，可以考虑在这里调用 fetchGroupList()
  // 但要注意性能，避免不必要的请求。通常由后端推送或手动刷新更好。
})

// 如果需要在组件挂载后立即执行某些 DOM 相关操作（虽然这里不太需要）
// onMounted(() => {
//   console.log('Profile page mounted');
// })

// 将需要在模板中调用的方法暴露出去（在 <script setup> 中通常是隐式暴露的，
// 但如果需要在父组件调用或更复杂的场景下，可以明确导出）
// defineExpose({ fetchUserInfo, fetchGroupList }) // 示例

</script>

<style scoped>
/* ... (你的样式部分保持不变) ... */

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

.group-section{
  padding: 10px 20px;
  margin-bottom:10px;
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

.contact-service-section {
  display: flex;
  justify-content: center;
  margin-top: 40rpx; /* 与上方内容保持一定距离 */
  padding: 0 20rpx; /* 与页面左右边距一致 */
  box-sizing: border-box;
}
.create-btn{
  background-color: #007aff;
  color: white;
  height: 40px;
  width: 100%; /* 或者设置一个固定最大宽度，如 max-width: 600rpx; */
  padding: 24rpx 0;
  border: 2rpx solid #007aff; /* 蓝色边框 */
  border-radius: 12rpx; /* 圆角 */
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx; /* 图标和文字之间的间距 */
  box-shadow: 0 4rpx 8rpx rgba(0, 122, 255, 0.1); /* 可选：轻微阴影 */
  transition: all 0.2s ease; /* 可选：过渡动画 */
}

.contact-service-btn {
  height: 40px;
  width: 100%; /* 或者设置一个固定最大宽度，如 max-width: 600rpx; */
  padding: 24rpx 0;
  background-color: #ffffff; /* 白色背景 */
  border: 2rpx solid #007aff; /* 蓝色边框 */
  border-radius: 12rpx; /* 圆角 */
  color: #007aff; /* 蓝色文字 */
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx; /* 图标和文字之间的间距 */
  box-shadow: 0 4rpx 8rpx rgba(0, 122, 255, 0.1); /* 可选：轻微阴影 */
  transition: all 0.2s ease; /* 可选：过渡动画 */
}

.contact-service-btn:hover,
.contact-service-btn:active { /* 可选：鼠标悬停或按下时的效果 */
  background-color: #f0f8ff; /* 浅蓝色背景 */
  transform: scale(0.98); /* 轻微缩小 */
}

.contact-icon {
  font-size: 36rpx; /* 稍大一点的图标 */
}
</style>