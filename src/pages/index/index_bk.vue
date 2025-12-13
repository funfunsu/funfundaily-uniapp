<!-- pages/index/index.vue -->
<template>
  <view class="container">    <!-- 主内容 -->
    <view v-if="isLoggedIn">欢迎回来！</view>
    <button v-if="showProfileAuth" @tap="onLoginTap">点击获取昵称和头像</button>
    <!-- 手机号授权弹窗（仅首次） -->
    <view v-if="showPhoneAuth" class="auth-modal">
      <button open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
        授权手机号登录
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { autoLogin } from '../../utils/auth'
import apiTs from '../../utils/apiTs'

import {STORAGE_KEYS,setStoredData,getStoredData} from '../../utils/storageManager'

const isLoggedIn = ref(false)
const showPhoneAuth = ref(false)
const showProfileAuth = ref(false)

onMounted(async () => {
  try {
    const token = await autoLogin();
    if (token) {
      const userInfo = await apiTs.user.getInfo();
      if (!userInfo.nickname){
        showProfileAuth.value = true;
      }else{
        setStoredData(STORAGE_KEYS.USER_INFO,userInfo)
        await uni.switchTab({
          url: '/pages/tabBar/schedule'
        });
      }

    }
  } catch (err: any) {
    if (err?.needPhoneAuth) {
      showPhoneAuth.value = true; // 弹出授权
    }
  }
})

const onLoginTap= async (e: any) => {
  console.log("按钮被点击，即将调用 uni.getUserProfile");
  // 直接在按钮点击事件处理函数中调用 uni.getUserProfile
  uni.getUserProfile({
    desc: '用于完善用户资料', // 必填，声明获取用户信息后的用途
    success: (res) => {
      console.log('uni.getUserProfile 成功:', res);
      const user = apiTs.user.updateProfile(res);
      setStoredData(STORAGE_KEYS.USER_INFO,user)
      uni.switchTab({
        url: '/pages/tabBar/schedule'
      });
    },
    fail: (err) => {
      console.error('uni.getUserProfile 失败:', err);
      // 用户拒绝授权或其他错误
      if (err.errMsg && err.errMsg.indexOf('auth deny') > -1) {
        uni.showToast({ title: '您拒绝了授权', icon: 'none' });
      } else {
        uni.showToast({ title: '获取用户信息失败', icon: 'none' });
      }
    }
  });
}

const onGetPhoneNumber = async (e: any) => {
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    uni.showToast({ title: '授权失败', icon: 'none' });
    return;
  }

  try {
    // 调用后端完成注册/绑定
    // const res = await api.auth.bindPhone({
    //   encryptedData: e.detail.encryptedData,
    //   iv: e.detail.iv,
    //   openid: /* 之前保存的 openid */
    // });
    //
    // uni.setStorageSync('token', res.data.token);
    showPhoneAuth.value = false;
    isLoggedIn.value = true;
  } catch (err) {
    uni.showToast({ title: '绑定失败', icon: 'none' });
  }
}
</script>


<style>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

button {
  padding: 12px 24px;
  font-size: 16px;
  background-color: #07c160; /* 微信绿 */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>