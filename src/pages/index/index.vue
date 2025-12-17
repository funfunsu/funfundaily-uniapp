<template>
  <view class="container">
    <!-- 卡片式内容区域 -->
    <view class="card">
      <!-- 登录加载区域 -->
      <view v-if="isInLoginLoading" class="login-loading">
        <text class="loading-text">登录中</text>
        <view class="loading-dots">
          <text class="dot dot-1">.</text>
          <text class="dot dot-2">.</text>
          <text class="dot dot-3">.</text>
        </view>
      </view>

      <!-- 昵称设置区域 -->
      <view v-else-if="showProfileUpdate">
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
          <button class="submit-button" @click="updateNickname">提交</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// --- 导入部分 ---
import { ref, onMounted } from 'vue';
// 导入 onLoad 生命周期钩子
import { onLoad } from '@dcloudio/uni-app'; // 确保路径正确，根据你的项目配置
import { autoLogin } from '../../utils/auth';
import apiTs from '../../utils/apiTs';
import { STORAGE_KEYS, setStoredData } from '../../utils/storageManager';

// --- 响应式状态 ---
// 控制是否显示昵称设置区域
const showProfileUpdate = ref(false);
const isInLoginLoading = ref(true);
// 存储用户信息
const userInfo = ref<{ nickname?: string }>({});
// 存储重定向路径
const redirectPath = ref<string | null>(null);

// --- 生命周期 ---
/**
 * 页面加载时获取查询参数
 */
onLoad((query) => {
  // query 是一个包含所有查询参数的对象
  // 例如，URL 是 /pages/index/index?redirect=/pages/target/target
  // 那么 query.redirect 就是 "/pages/target/target"
  if (query && query.redirect) {
    // decodeURIComponent 用于解码 URL 编码的字符，如 %2F -> /
    redirectPath.value = decodeURIComponent(query.redirect);
    console.log('Redirect path captured:', redirectPath.value);
  }
});

/**
 * 页面挂载后自动登录并检查用户信息
 */
onMounted(async () => {
  try {
    const token = await autoLogin();
    if (token) {
      isInLoginLoading.value = false;
      const fetchedUserInfo = await apiTs.user.getInfo();
      userInfo.value = fetchedUserInfo;

      if (!fetchedUserInfo?.nickname) {
        showProfileUpdate.value = true;
      } else {
        // 如果已有昵称，存储信息
        setStoredData(STORAGE_KEYS.USER_INFO, fetchedUserInfo);
        // --- 跳转逻辑 ---
        performRedirect();
      }
    }
  } catch (err: any) {
    console.error('Index page - Auto login or fetch user info failed:', err);
    // 即使出错，也应停止加载状态，或显示错误信息
    isInLoginLoading.value = false;
    // 可以在这里添加错误提示
    uni.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
  }
});

// --- 方法 ---
/**
 * 执行重定向跳转
 */
const performRedirect = () => {
  let targetUrl = '/pages/tabBar/schedule'; // 默认跳转地址

  if (redirectPath.value) {
    // 如果存在捕获到的 redirect 参数，则使用它
    targetUrl = redirectPath.value;
  }
  if (targetUrl.includes('tabBar')) {
    uni.switchTab({ url: targetUrl });
  } else {
    uni.redirectTo({ url: targetUrl });
    // uni.navigateTo({ url: targetUrl }); // 如果需要保留当前页面栈
  }
};

/**
 * 更新用户昵称
 */
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
    // --- 成功后跳转 ---
    performRedirect(); // 使用封装好的跳转逻辑
  } catch (err: any) {
    console.error('Index page - Update nickname failed:', err);
    uni.showToast({ title: '更新昵称失败，请重试', icon: 'none' });
  }
};

/**
 * 监听输入框变化，实时更新 userInfo 中的昵称
 */
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
  display: flex; /* 添加 */
  align-items: center; /* 添加 */
  justify-content: center; /* 添加 */
  min-height: 200px; /* 添加，防止卡片过小 */
}

/* --- 登录加载动画样式 --- */
.login-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
}

.loading-text {
  margin-right: 5px; /* 文字和点之间的间距 */
}

.loading-dots {
  display: flex;
  align-items: center;
  height: 24px; /* 给容器一个固定高度，使点居中 */
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
  width: 100%; /* 确保表单占满卡片宽度 */
}

.label {
  font-size: 16px;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 10px;
  display: block;
}

/* --- 表单控件样式 --- */
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
  margin: 10px 0px;
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
  background-color: #007aff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.045);
  padding: 12px; /* 添加内边距 */
}

.submit-button:hover {
  background-color: #3399ff;
}

.submit-button:active {
  background-color: #006ae6;
  transform: translateY(1px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.045);
}
</style>