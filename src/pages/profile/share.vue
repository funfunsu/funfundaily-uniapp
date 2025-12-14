<template>
  <view class="container">
    <!-- 卡片式内容区域 -->
    <view class="card" v-if="!hasJoinedGroup">
      <!-- 欢迎信息 -->
      <view  class="welcome-text">{{ shareFrom.creatorNickname }} 邀请你加入 {{ shareGroup.groupName }}</view>
      <!-- 昵称设置表单 -->
      <view class="form-section">
        <button class="submit-button" @click="join">好的，我加入</button>
      </view>
    </view>
    <!-- 卡片式内容区域 -->
    <view class="card" v-if="hasJoinedGroup">
      <!-- 欢迎信息 -->
      <view  class="welcome-text">你已加入过 {{ shareGroup.groupName }}</view>
      <!-- 昵称设置表单 -->
      <view class="form-section">
        <button class="submit-button" @click="goHome">好的，现在去主页看看</button>
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

// 存储用户信息
const userInfo = ref<{ nickname?: string }>({});
// 存储重定向路径
const redirectPath = ref<string | null>(null);

const shareToken =  ref({});
const shareFrom =  ref({});
const shareGroup =  ref({});
const hasJoinedGroup =  ref(false);

// --- 生命周期 ---
/**
 * 页面加载时获取查询参数
 */
onLoad(async (query) => {
  if (query.token) {
    shareToken.value = query.token;

    const shareInfo = await apiTs.share.getContent(shareToken.value);
    shareFrom.value = {
      creatorNickname: shareInfo.creatorNickname
    }
    shareGroup.value = shareInfo.data

    const  groupList = await apiTs.group.list();
    hasJoinedGroup.value = groupList.some(group => group.id === shareGroup.value.groupId);

  } else {
    console.warn("⚠️ 缺少分享令牌");
    await uni.showToast({title: "缺少分享令牌", icon: "none"});
  }
});

/**
 * 页面挂载后自动登录并检查用户信息
 */
onMounted(async () => {
  try {
    await autoLogin();
  } catch (err: any) {
    console.error('Index page - Auto login or fetch user info failed:', err);
  }
});


/**
 * 更新用户昵称
 */
const join = async () => {
  try {
    const acceptResp = await apiTs.share.accept(shareToken.value);
    console.log(acceptResp)
  }catch (e){
    if (e.response.code === '4030001'){
      await uni.redirectTo({url: '/pages/index/index?redirect=/pages/tabBar/profile'});
    }
    console.log(e)
  }

  await uni.redirectTo({url: '/pages/index/index?redirect=/pages/tabBar/profile'});
};

const goHome= async () => {
  await uni.redirectTo({url: '/pages/index/index?redirect=/pages/tabBar/schedule'});
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
}

/* --- 内容区域样式 --- */
.welcome-text {
  color: #007aff;
  text-align: center;
  margin-bottom: 25px;
}

.form-section {
  display: flex;
  flex-direction: column;
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
  padding: 12px 15px; /* 使用 padding 控制高度和内容间距 */
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
  /* margin 已经在 scoped style 中调整 */
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