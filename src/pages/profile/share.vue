<template>
  <view class="container">
    <!-- 卡片式内容区域 -->
    <view class="card" v-if="!hasJoinedGroup">
      <!-- 欢迎信息 -->
      <view  class="welcome-text">{{ shareFrom.creatorNickname }} 邀请你成为「{{ shareGroup.groupName }}」小队的队友</view>
      <view v-if="isBindShare" class="bind-hint">点击「接受」即可将本微信绑定到该账号，登录后自动以该账号身份进入</view>
      <!-- 昵称设置表单 -->
      <view class="form-section">
        <button class="submit-button" @click="join">{{ isBindShare ? '好的，我接受' : '好的，我加入' }}</button>
      </view>
    </view>
    <!-- 卡片式内容区域 -->
    <view class="card" v-if="hasJoinedGroup">
      <!-- 欢迎信息 -->
      <view  class="welcome-text">你已是「{{ shareGroup.groupName }}」小队的队友</view>
      <!-- 昵称设置表单 -->
      <view class="form-section">
        <button class="submit-button" @click="goHome">好的，现在去主页看看</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// --- 导入部分 ---
import { ref, computed, onMounted } from 'vue';
// 导入 onLoad 生命周期钩子
import { onLoad } from '@dcloudio/uni-app'; // 确保路径正确，根据你的项目配置
import { autoLogin } from '../../utils/auth';
import apiTs from '../../utils/apiTs';
import {setShareToken, removeToken} from "../../utils/token";

// 存储用户信息
const userInfo = ref<{ nickname?: string }>({});
// 存储重定向路径
const redirectPath = ref<string | null>(null);

const shareToken =  ref('');
const shareFrom =  ref({});
const shareGroup =  ref<any>({});
const hasJoinedGroup =  ref(false);
const sceneCode = ref<string>('');
const isBindShare = computed(() => sceneCode.value === 'member_bind');

// --- 生命周期 ---
/**
 * 页面加载时获取查询参数
 */
onLoad(async (query) => {
  if (query.token) {
    shareToken.value = query.token;
    setShareToken(query.token);

    const shareInfo = await apiTs.share.getContent(shareToken.value);
    shareFrom.value = {
      creatorNickname: shareInfo.creatorNickname
    }
    shareGroup.value = shareInfo.data
    sceneCode.value = shareInfo.sceneCode || '';

    // member_bind 场景下，"已加入" 的判断改为 "占位账号已绑定微信"。
    // 但当前用户也无法直接探知占位账号状态，这里保留 group 维度的判断，
    // 不强求精细：若当前 wx 用户恰好已在该群（极少见），按已加入提示即可。
    const groupList = await apiTs.group.list();
    hasJoinedGroup.value = Array.isArray(groupList) && groupList.some(group => String(group.id) === String(shareGroup.value?.groupId));

  } else {
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
 * 接受分享：member_share 进群；member_bind 把当前 wx openid 转移到占位账号。
 * member_bind 接受成功后，需要清掉当前 token 重新 wx_login —— 这样后端按 openid
 * 解析到的就是新绑定的占位账号，恢复其群组身份。
 */
const join = async () => {
  try {
    const acceptResp = await apiTs.share.accept(shareToken.value);
    console.log(acceptResp)
  }catch (e){
    if (e?.response?.code === '4030001'){
      await uni.redirectTo({url: '/pages/index/index?redirect=/pages/tabBar/profile'});
      return;
    }
    console.log(e)
    await uni.showToast({title: '接受失败，请稍后重试', icon: 'none'});
    return;
  }

  if (isBindShare.value) {
    // 绑定完成：当前 session 仍指向已被腾空 openid 的旧 wx 用户。
    // 清 token 后跳 index，index 会重新走 autoLogin（wx.login → 后端按新 openid 解析到占位账号）。
    removeToken();
    await uni.showToast({title: '绑定成功', icon: 'success'});
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
  margin-bottom: 12px;
}

.bind-hint {
  font-size: 13px;
  color: #86909c;
  text-align: center;
  margin-bottom: 20px;
  line-height: 1.4;
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