<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 日程预览（只读） -->
      <schedule-content ref="scheduleRef"
                        :event-list="events"
                        @eventClick="handleEventClick"/>
    </view>

    <!-- 底部固定栏：只保留群组选择 + 收下按钮 -->
    <view class="bottom-bar" v-if="isLoginSuccessful">
      <schedule-bottom-bar
          :buttons="buttons"
          :is-tab-bar-page="false"
          :show-group-member="false"
          @member-change="handleMemberChange"
          @buttonClick="handleButtonClick"/>
    </view>

    <!-- 成员选择弹窗：选择 / 新建成员来收下（与任务分享一致） -->
    <MemberSelectPopup
        :visible="popupVisible"
        :group-id="currentGroup?.id"
        @close="popupVisible = false"
        @select="onSelectMember"
        @create="onCreateMember"/>
  </view>
</template>
<script setup>
import {ref, nextTick} from 'vue';
import {onLoad} from '@dcloudio/uni-app';
import ScheduleBottomBar from '../../components/schedule-bottom-bar.vue';
import scheduleContent from "../../components/schedule/schedule-content.vue";
import MemberSelectPopup from '../../components/member-select-popup.vue';
import apiTs from '../../utils/apiTs';
import {autoLogin} from '../../utils/auth';
import {getShareToken, setShareToken} from '../../utils/token';
import {setStoredData, STORAGE_KEYS} from "../../utils/storageManager";
import {ensureCurrentGroup} from "../../utils/currentGroupResolver";

// --- 响应式数据 ---
const events = ref([]); // 后端 schedule_share 返回按天分组的 [{date, schedules}] 数组
const isLoginSuccessful = ref(false);
const currentGroup = ref(null);
const currentMember = ref(null);
const popupVisible = ref(false);
const scheduleRef = ref(null);

const buttons = [
  { code: 'receive', text: '收下' }
];

// --- 方法定义 ---

// 底部栏群组切换
const handleMemberChange = (e) => {
  currentGroup.value = e.currentGroup;
  currentMember.value = e.currentMember;
};

const handleEventClick = () => { /* 预览态，点击事件不做处理 */ };

// 点击「收下」：先确保有可用群组，再弹出成员选择弹窗
const handleButtonClick = async (buttonCode) => {
  if (buttonCode !== 'receive') return;
  const token = getShareToken();
  if (!token) {
    uni.showToast({ title: '缺少分享令牌', icon: 'none' });
    return;
  }
  if (!currentGroup.value) {
    const group = await ensureCurrentGroup();
    if (!group) {
      uni.showToast({ title: '你还没有小队，请先在 App 创建小队', icon: 'none' });
      return;
    }
    currentGroup.value = group;
  }
  popupVisible.value = true;
};

// 选择已有成员收下
const onSelectMember = async (member) => {
  popupVisible.value = false;
  await receiveToUser(member.userId, currentGroup.value.id);
};

// 新建成员并收下（多用于给小朋友收）
const onCreateMember = async (nickname) => {
  try {
    uni.showLoading({ title: '创建成员中...', mask: true });
    const userResp = await apiTs.group.user.add({ groupId: currentGroup.value.id, nickname });
    popupVisible.value = false;
    uni.hideLoading();
    await receiveToUser(userResp.userId, currentGroup.value.id);
  } catch (e) {
    uni.hideLoading();
    console.error('新建成员失败:', e);
    uni.showToast({ title: e?.message || '新建成员失败', icon: 'none' });
  }
};

// 把分享的日程收下给目标成员（按 token 服务端复制）
const receiveToUser = async (targetUserId, groupId) => {
  const token = getShareToken();
  if (!token) {
    uni.showToast({ title: '缺少分享令牌', icon: 'none' });
    return;
  }
  try {
    uni.showLoading({ title: '收下中...', mask: true });
    await apiTs.schedule.copy({ targetUserId, groupId, shareToken: token });
    uni.hideLoading();
    uni.showToast({ title: '已收下', icon: 'success' });
    setTimeout(() => switchToScheduleTab(), 800);
  } catch (error) {
    uni.hideLoading();
    console.error('收下失败:', error);
    uni.showToast({ title: error?.message || '收下失败，请重试', icon: 'none' });
  }
};

const switchToScheduleTab = () => {
  const uri = '/pages/tabBar/schedule';
  setStoredData(STORAGE_KEYS.REFRESH_TAB, uri);
  uni.switchTab({ url: uri });
};

// 获取分享内容
const fetchSharedContent = async (token) => {
  uni.showLoading({ title: '加载中...' });
  try {
    const res = await apiTs.share.getContent(token);
    events.value = Array.isArray(res) ? res : [];
    // 内容就位后把视口定位到上午 8 点
    nextTick(() => scheduleRef.value?.focusToMorning?.());
  } catch (err) {
    console.error('获取分享内容失败:', err);
    uni.showToast({ title: err?.message || '加载失败，请稍后重试', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

// --- 生命周期钩子 ---
onLoad(async (query) => {
  const token = query && query.token;
  if (!token) {
    uni.showToast({ title: '缺少分享令牌', icon: 'none' });
    return;
  }
  setShareToken(token);
  try {
    await autoLogin(token);
    isLoginSuccessful.value = true;
  } catch (loginError) {
    console.error('自动登录失败:', loginError);
    uni.showToast({ title: loginError?.message || '自动登录失败，请尝试手动登录', icon: 'none', duration: 3000 });
  }
  if (isLoginSuccessful.value) {
    // 预解析当前群组，收下时弹窗直接可用
    ensureCurrentGroup().then(g => { if (g && !currentGroup.value) currentGroup.value = g });
    await fetchSharedContent(token);
  }
});
</script>

<style scoped>
/* 根容器：使用flex布局，占据整个屏幕 */
.page-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 禁止整体滚动 */
  box-sizing: border-box;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}


/* 底部固定栏：高度60px */
.bottom-bar {
  height: 60px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
  /* 防止被压缩 */
  z-index: 100;
  /* 确保在顶层 */
}

.bottom-bar-title {
  color: white;
}

/* 内容容器样式 */
.page-content-container {
  height: calc(100% - 60px);
  display: flex;
  flex-direction: column;
}
</style>
