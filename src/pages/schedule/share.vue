<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <schedule-content ref="schedule"
                        :dates="dates" :eventList="events"
                        @eventClick="handleEventClick"
                        @selection-change="onSelectionChange"/>
    </view>

    <!-- 底部固定栏 -->
    <view class="bottom-bar" v-if="isLoginSuccessful">
      <schedule-bottom-bar
          :buttons="buttons"
          :is-tab-bar-page="false"
          @member-change="handleMemberChange"
          @buttonClick="handleButtonClick"/>
    </view>
  </view>
</template>
<script setup>
// 引入必要的依赖和组件
import {computed, ref} from 'vue';
import {onLoad} from '@dcloudio/uni-app'; // 用于页面生命周期
import ScheduleBottomBar from '../../components/schedule-bottom-bar.vue';
import scheduleContent from "../../components/schedule/schedule-content.vue";
import apiTs from '../../utils/apiTs';
import {autoLogin} from '../../utils/auth';
import {getShareToken, removeShareToken, setShareToken} from '../../utils/token';

// --- 组件声明 ---
// 注意：defineOptions 需要插件支持或特定 Vue 版本，在纯 JS 中可能不直接可用
// 如果 defineOptions 不工作，可以在 script 标签外或通过其他方式设置 name
// defineOptions({
//   name: 'ShareDemo' // 组件名称
// });

// --- 响应式数据 ---
const events = ref({}); // 存储日期 -> 事件列表 的映射
const dates = computed(() => Object.keys(events.value).sort()); // 从 events 的 key 中提取并排序
const selectedCount = ref(0);
const totalEvents = computed(() => {
  // 计算总事件数，假设 events 是一个对象，值是数组
  return Object.values(events.value).reduce((acc, dayEvents) => acc + (dayEvents ? dayEvents.length : 0), 0);
});
const buttons = [
  { code: 'copy', text: '收下' },
  { code: 'copyToNewMember', text: '新成员收下' }
];
const isLoginSuccessful = ref(false);
const currentMember = ref(null);
const currentGroup = ref(null);

// --- 方法定义 ---

// 处理成员切换
const handleMemberChange = (e) => {
  currentMember.value = e.currentMember;
  currentGroup.value = e.currentGroup;
  console.log('Current Group:', currentGroup.value, 'Current Member:', currentMember.value);
};

// 处理事件点击
const handleEventClick = (event) => {
  // 可根据需要处理点击事件
  console.log("📅 点击了事件:", event);
};

// 处理选中事件变化
const onSelectionChange = (selectedEvents) => {
  selectedCount.value = selectedEvents.length;
  console.log("✅ 选中事件数量变化:", selectedCount.value);
};

const receiveToUser = async (targetUserId,groupId,token) => {
  try {
    await uni.showLoading({title: "处理中..."});
    const req = {
      targetUserId: targetUserId, // 假设 currentMember.value 有 userId
      groupId: groupId,          // 假设 currentGroup.value 有 id
      shareToken: token
    };
    await apiTs.schedule.copy(req);
    await uni.showToast({title: "收下成功", icon: "success"});
  } catch (error) {
    console.error("❌ 收下失败:", error);
    await uni.showToast({title: error.message || "操作失败", icon: "none"});
  } finally {
    uni.hideLoading();
  }

}

// 处理底部按钮点击
const handleButtonClick = async (buttonCode) => {
  const token = getShareToken();
  if (!token) {
    await uni.showToast({title: "缺少分享令牌", icon: "none"});
    return;
  }
  if (buttonCode === 'copy') {
    uni.showModal({
      title: '确认收下',
      content: `确定要将日程收下给 ${currentGroup.value.groupName || '未知群组'} 的 ${currentMember.value.userInfo.nickname || '未知成员'} 吗？`,
      confirmColor: "#007AFF", // 可选，自定义确认按钮颜色
      success: async function (modalRes) {
        if (modalRes.confirm) {
          console.log('用户点击确定');
          // 用户点击了“确定”按钮，继续执行后续操作

          await receiveToUser(currentMember.value.userId, currentGroup.value.id, token);
        } else if (modalRes.cancel) {
          console.log('用户点击取消');
        }
      },
      fail: function (failRes) {
        console.error("Modal 失败:", failRes);
        uni.showToast({ title: "无法显示确认框", icon: "none" });
      }
    });
  } else if (buttonCode === 'copyToNewMember') {
    // 添加新成员并复制
    uni.showModal({
      title: '添加新成员',
      placeholderText: '请输入昵称',
      editable: true,
      success: async (res1) => {
        if (res1.confirm && res1.content && res1.content.trim()) {
          const nickname = res1.content.trim();
          const userResp = await apiTs.group.user.add({ groupId: currentGroup.value.id, nickname: nickname });
          await receiveToUser(userResp.userId, currentGroup.value.id, token);
        } else if(res1.cancel) {
          // 用户取消输入
        }
      },
      fail: (failRes) => {
        console.error("Modal 失败:", failRes);
        uni.showToast({ title: "操作中断", icon: "none" });
      }
    });
  }
};

// 获取分享内容
const fetchSharedContent = async (token) => {
  await uni.showLoading({title: "加载中..."});
  try {
    // 1. 调用后端接口获取分享内容
    events.value = await apiTs.share.getContent(token)

  } catch (err) {
    console.error("❌ 获取分享内容失败:", err);
    await uni.showToast({
      title: err.message || "加载失败，请稍后重试",
      icon: "none"
    });
  } finally {
    uni.hideLoading();
  }
};

// --- 生命周期钩子 ---

onLoad(async (query) => {
  console.log("🚀 页面 onLoad 参数:", query);
  const token = query && query.token;
  if (token) {
    setShareToken(token);
    try {
      // 等待 autoLogin 完成
      const loginToken = await autoLogin(token);
      console.log("✅ 自动登录成功, 获取到 token:", loginToken);
      isLoginSuccessful.value = true;
    } catch (loginError) {
      // 处理自动登录失败
      console.error("❌ 自动登录失败:", loginError);
      await uni.showToast({
        title: loginError.message || "自动登录失败，请尝试手动登录", // 更具体的提示
        icon: "none",
        duration: 3000 // 稍长一些的显示时间
      });
      // 即使登录失败，也可以考虑是否加载公开部分或给出提示
    }

    if (isLoginSuccessful.value) {
      // 如果必须登录：
      console.log("➡️ 准备获取分享内容...");
      await fetchSharedContent(token);
    } else {
      console.log("🛑 由于未登录，暂不加载需要登录的分享内容。");
      // 可能需要显示登录提示或其他UI状态
    }
  } else {
    console.warn("⚠️ 缺少分享令牌");
    await uni.showToast({title: "缺少分享令牌", icon: "none"});
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


/* 底部固定栏：高度60px，绿色背景 */
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