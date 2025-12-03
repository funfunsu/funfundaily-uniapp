<!-- pages/index/index.vue -->
<template>
  <view>
    <!-- 主内容 -->
    <view v-if="isLoggedIn">欢迎回来！</view>

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

const isLoggedIn = ref(false)
const showPhoneAuth = ref(false)

onMounted(async () => {
  try {
    const token = await autoLogin();
    if (token) {
      isLoggedIn.value = true;
      await uni.switchTab({
        url: '/pages/tabBar/schedule'
      });
    }
  } catch (err: any) {
    if (err?.needPhoneAuth) {
      showPhoneAuth.value = true; // 弹出授权
    }
  }
})

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