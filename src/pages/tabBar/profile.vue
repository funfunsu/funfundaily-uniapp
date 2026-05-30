<!-- pages/profile/index.vue -->
<template>
  <view class="profile-container">
    <!-- 用户信息区域 -->
    <view class="user-info-section" @click="editNickname">
      <view class="avatar">
        <text class="avatar-text">{{ userInfo.nickname?.charAt(0) || '?' }}</text>
      </view>
      <view class="user-details">
        <text class="user-name">{{ userInfo.nickname || '还没有设置昵称' }}</text>
        <text class="edit-hint">修改</text>
      </view>
    </view>

    <!-- 功能菜单区域（保持不变） -->
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

    <!-- 客服二维码弹窗 -->
    <view v-if="showQrcodeModal" class="qrcode-modal" @click="closeQrcodeModal">
      <view class="qrcode-container" @click.stop>
        <view class="qrcode-header">
          <text class="qrcode-title">联系开发者</text>
          <text class="close-icon" @click="closeQrcodeModal">×</text>
        </view>
        <view class="qrcode-body">
          <!-- 新增点击事件，添加提示文字 -->
          <image
              class="qrcode-img"
              src="/static/images/kefu-qrcode.png"
              mode="widthFix"
              lazy-load
              @click="previewQrcode"
          ></image>
          <text class="qrcode-desc">长按图片可识别二维码</text>
        </view>
      </view>
    </view>

    <view class="contact-service-section">
      <!-- 移除 open-type="contact"，新增点击事件 -->
      <button class="contact-service-btn" @click="showQrcodeModal = true">
        <text class="contact-icon">&#x1F4AC;</text>
        <text>联系开发者</text>
      </button>
    </view>
  </view>
</template>

<script setup>
// 导入必要的 Vue 3 Composition API 函数
import { ref, onMounted } from 'vue'
// 导入 uni-app 提供的页面跳转等 API
import { onLoad, onShow } from '@dcloudio/uni-app'

// --- 响应式状态 ---
const userInfo = ref({})
const groupList = ref([])
const selectedGroupIdx = ref(0)
// 新增：控制客服二维码弹窗显示
const showQrcodeModal = ref(false)

// --- 导入工具和组件 ---
import api from '../../utils/apiTs'
import { STORAGE_KEYS, getStoredData, setStoredData, removeStoredData } from '../../utils/storageManager'
import apiTs from "../../utils/apiTs";

// --- 方法定义 ---

const previewQrcode = () => {
  // 替换为你的实际二维码图片地址
  const qrcodeUrl = '/static/images/kefu-qrcode.png'

  // 使用uni-app的预览图片API
  uni.previewImage({
    urls: [qrcodeUrl], // 需要预览的图片链接列表
    current: 0, // 当前显示图片的索引
    longPressActions: {
      itemList: ['识别图中二维码', '保存图片', '转发朋友'], // 自定义长按菜单（微信会自动补充识别二维码选项）
      success: function(res) {
        console.log('长按操作：', res.tapIndex)
      },
      fail: function(res) {
        console.log('长按操作失败：', res.errMsg)
      }
    }
  })
}

const fetchUserInfo = async () => {
  try {
    const res = await api.user.getInfo()
    userInfo.value = res || {}
  } catch (err) {
    console.error('获取用户信息失败', err)
    uni.showToast({ title: '获取用户信息失败', icon: 'none' })
  }
}

const editNickname = () => {
  const currentNickname = userInfo.value.nickname || ''

  uni.showModal({
    title: '设置昵称',
    placeholderText: currentNickname,
    editable: true,
    confirmText: '保存',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        const newNick = (res.content || '').trim()
        if (!newNick) {
          await uni.showToast({title: '昵称不能为空', icon: 'none'})
          return
        }
        if (newNick === currentNickname) {
          return // 未修改，不请求
        }

        const data = {
          nickname: newNick,
        };
        const updatedUser = await apiTs.user.update(data);
        setStoredData(STORAGE_KEYS.USER_INFO, updatedUser);
        userInfo.value.nickname = newNick;
      }
    },
    fail: () => {
      console.log('昵称修改取消')
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
  }
}

const handleGroupMembersClick = (group) => {
  setStoredData(STORAGE_KEYS.CURRENT_GROUP, group)
  uni.navigateTo({
    url: `/pages/profile/group-manage?id=${group.id}`
  })
}

// 新增：关闭二维码弹窗方法
const closeQrcodeModal = () => {
  showQrcodeModal.value = false
}

// --- 生命周期钩子 ---
onLoad(async (option) => {
  await fetchUserInfo()
  await fetchGroupList()
})

onShow(() => {
  // 如需刷新数据可在此调用
})
</script>

<style scoped>
/* 原有样式保持不变 */
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
  position: relative;
}

.user-info-section::after {
  content: '';
  position: absolute;
  bottom: 20rpx;
  width: 60rpx;
  height: 6rpx;
  background-color: #007aff;
  border-radius: 3rpx;
  opacity: 0.6;
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
  transition: transform 0.2s;
}

.user-info-section:active .avatar {
  transform: scale(0.95);
}

.avatar-text {
  color: white;
  font-size: 48rpx;
  font-weight: bold;
}

.user-details {
  text-align: center;
}

.user-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 12rpx;
  text-align: center;
  max-width: 80%;
  word-break: break-all;
}

.edit-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
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

.menu-left {
  display: flex;
  align-items: center;
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

.contact-service-section {
  display: flex;
  justify-content: center;
  margin-top: 40rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
}

.contact-service-btn {
  height: 40px;
  width: 100%;
  padding: 24rpx 0;
  background-color: #ffffff;
  border: 2rpx solid #007aff;
  border-radius: 12rpx;
  color: #007aff;
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  box-shadow: 0 4rpx 8rpx rgba(0, 122, 255, 0.1);
  transition: all 0.2s ease;
}

.contact-service-btn:hover,
.contact-service-btn:active {
  background-color: #f0f8ff;
  transform: scale(0.98);
}

.contact-icon {
  font-size: 36rpx;
}

/* 新增：客服二维码弹窗样式 */
.qrcode-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.qrcode-container {
  width: 80%;
  max-width: 500rpx;
  background: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.qrcode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  background: #f8f9fa;
  border-bottom: 1rpx solid #eee;
}

.qrcode-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.close-icon {
  font-size: 40rpx;
  color: #999;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-body {
  padding: 40rpx 30rpx;
  text-align: center;
}

.qrcode-img {
  width: 100%;
  max-width: 300rpx;
  margin: 0 auto;
  border-radius: 10rpx;
}

.qrcode-desc {
  display: block;
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #666;
}
</style>