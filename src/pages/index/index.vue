<template>
  <view class="container">
    <view v-if="isInLoginLoading" class="login-loading">
      <view class="loading-dots">
        <text class="dot dot-1">.</text>
        <text class="dot dot-2">.</text>
        <text class="dot dot-3">.</text>
      </view>
    </view>

    <!-- 卡片式内容区域 -->
    <view v-else-if="showProfileUpdate" class="card">
      <view>
        <view class="welcome-text">欢迎回来！</view>

        <!-- 昵称设置表单 -->
        <view class="form-section">
          <text class="label">请设置昵称</text>
          <input
              class="nickname-input"
              type="nickname"
              placeholder="请输入您的昵称"
              :value="userInfo.nickname || ''"
              @blur="setCustomNickname"
          />
          <button class="submit-button primary" @click="updateNickname">提交</button>
          <button class="submit-button secondary" @click="skipNicknameSetup">我先逛逛</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// --- 导入部分 ---
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { autoLogin } from '../../utils/auth';
import apiTs from '../../utils/apiTs';
import {STORAGE_KEYS, setStoredData, getStoredData} from '../../utils/storageManager';
import {getShareToken} from "../../utils/token";
import { performRedirect } from '../../utils/router';

// --- 响应式状态 ---
const showProfileUpdate = ref(false);
const isInLoginLoading = ref(true);
const userInfo = ref<{ nickname?: string }>({});
const redirectPath = ref<string | null>(null);

// --- 生命周期 ---
onLoad((query) => {
  if (query && query.redirect) {
    redirectPath.value = decodeURIComponent(query.redirect);
    console.log('Redirect path captured:', redirectPath.value);
  }
});

onMounted(async () => {
  try {
    const token = await autoLogin(null);
    if (token) {
      isInLoginLoading.value = false;
      const fetchedUserInfo = await apiTs.user.getInfo();

      const registerTime = new Date(fetchedUserInfo.createTime)
      const now = new Date();
      const diffInMs = now.getTime() - registerTime.getTime(); // 毫秒差
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24); // 转换为天数

      const N = 7;
      userInfo.value = fetchedUserInfo;

      if (!fetchedUserInfo?.nickname && diffInDays > N) {
        showProfileUpdate.value = true;
      } else {
        setStoredData(STORAGE_KEYS.USER_INFO, fetchedUserInfo);
        performRedirect(redirectPath.value);
      }
    }
  } catch (err: any) {
    console.error('Index page - Auto login or fetch user info failed:', err);
    isInLoginLoading.value = false;
  }
});

// --- 方法 ---
const updateNickname = async () => {
  if (!userInfo.value.nickname?.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' });
    return;
  }

  try {
    const data = {
      nickname: userInfo.value.nickname.trim(),
    };
    const updatedUser = await apiTs.user.update(data);
    setStoredData(STORAGE_KEYS.USER_INFO, updatedUser);
    performRedirect(redirectPath.value);
  } catch (err: any) {
    console.error('Index page - Update nickname failed:', err);
    uni.showToast({ title: '更新昵称失败，请重试', icon: 'none' });
  }
};

const skipNicknameSetup = () => {
  // 不保存昵称，直接跳转
  // 可选：记录用户已跳过（用于后续提醒）
  uni.setStorageSync('hasSkippedNickname', true);
  performRedirect(redirectPath.value);
};

const setCustomNickname = (e: any) => {
  userInfo.value.nickname = e.detail.value;
};
</script>

<style scoped>
/* --- 容器与卡片样式 --- */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  background-color: #f0f2f5;
  padding: 20px;
  box-sizing: border-box;
}

.card {
  width: 100%;
  max-width: 400px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow:
      0 6px 16px 0 rgba(0, 0, 0, 0.08),
      0 3px 6px -4px rgba(0, 0, 0, 0.12),
      0 9px 28px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  padding: 30px 25px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

/* --- 登录加载动画样式 --- */
.login-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #1d2129;
}

.loading-dots {
  display: flex;
  align-items: center;
  color: #007aff;
  height: 24px;
  font-weight: bold;
}

.dot {
  font-size: 22px;
  line-height: 1;
  animation: bounce 1.5s infinite ease-in-out both;
}

.dot-1 {
  animation-delay: -0.32s;
}

.dot-2 {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.7;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* --- 欢迎文本样式 --- */
.welcome-text {
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
  text-align: center;
  margin-bottom: 25px;
}

/* --- 表单区域样式 --- */
.form-section {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.label {
  font-size: 16px;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 10px;
  display: block;
}

.nickname-input {
  padding: 12px 15px;
  font-size: 16px;
  height: 100%;
  color: #1d2129;
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  margin-bottom: 20px;
  box-sizing: border-box;
  transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1),
  box-shadow 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.nickname-input:focus {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
}

.nickname-input::placeholder {
  color: #86909c;
}

.submit-button {
  margin: 10px 0;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 12px;
  width: 100%;
  box-sizing: border-box;
}

.primary {
  background-color: #007aff;
  color: #ffffff;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.045);
}

.primary:hover {
  background-color: #3399ff;
}

.primary:active {
  background-color: #006ae6;
  transform: translateY(1px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.045);
}

.secondary {
  background-color: #f5f5f5;
  color: #666666;
  border: 1px solid #ddd;
}

.secondary:hover {
  background-color: #e9e9e9;
}

.secondary:active {
  background-color: #dcdcdc;
}
</style>