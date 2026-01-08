<template>
  <view class="page-container">
    <view class="task-stats-card">
      <view class="stats-row">
        <view class="stat-block">
          <text class="stat-number">{{ totalCount }}</text>
          <text class="stat-label">分享任务</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-divider"></view>
      </view>
    </view>
    <!-- 内容区域 -->
    <view class="content-container">

      <!-- 任务列表 -->
      <view v-show="listShow" class="task-list">
        <view v-if="taskList.length === 0" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">今天没有任务，来创建一个吧！</text>
        </view>

        <view v-for="task in taskList" :key="task.id"> <!-- 添加 key 提高性能 -->
          <TaskCard
              @toggle-select="toggleSelect"
              :mode="mode"
              :is-selected="isTaskSelected(task)"
              :task="task"
          />
        </view>
      </view>
    </view>

    <!-- 底部栏 -->
    <schedule-bottom-bar
        :buttons="buttons"
        @member-change="handleMemberChange"
        @buttonClick="handleButtonClick"/>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import apiTs from '../../utils/apiTs'
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue'
import TaskCard from '../../components/task/task-card.vue'
import DateUtils from "../../utils/util";
import { onLoad, onShow } from "@dcloudio/uni-app";
import {getStoredData, removeStoredData, setStoredData, STORAGE_KEYS} from "../../utils/storageManager";
import {setShareToken} from "../../utils/token";
import {autoLogin} from "../../utils/auth";

// =============== 响应式状态 ===============
const pointBalance = ref(0)
const taskList = ref([]) // Task[] 类型会自动推断
const currentDate = ref(new Date())
const listShow = ref(true)
const isLoginSuccessful = ref(false);

const buttons = ref([
  { code: 'copy', text: '收下' },
  { code: 'copyToNewMember', text: '新成员收下' }
])

const currentMember = ref(null) // object 类型
const currentGroup = ref(null) // object 类型

const mode = ref('share');
// 新增：存储选中的任务 ID
const selectedTaskIds = ref(new Set());

const flowType = 'POINTS';

// =============== 计算属性 ===============

const totalCount = computed(() => taskList.value.length)


// =============== 方法 ===============

async function fetchAllData() {
  await Promise.all([fetchPointBalance(), fetchTaskList()])
  // 退出分享模式时，清空选中状态
  if (mode.value !== 'share') {
    selectedTaskIds.value.clear();
  }
}

async function fetchPointBalance() {
  if (!currentMember.value || !currentGroup.value) {
    console.warn('Member or Group not selected, skipping balance fetch.');
    return;
  }
  const req = {
    flowType: flowType,
    targetUserId: currentMember.value.userId,
    groupId: currentGroup.value.id
  }
  try {
    pointBalance.value = await apiTs.flow.balance(req)
  } catch (error) {
    console.error('获取余额失败:', error);
    // 可以设置一个默认值或提示用户
  }

}

async function handleButtonClick(buttonCode) {
  switch (buttonCode) {
    case 'selectAll':
      // 全选
      selectedTaskIds.value.clear();
      taskList.value.forEach(task => {
        selectedTaskIds.value.add(task.id);
      });
      break;
    case 'toggleSelectAll':
      // 反选
      const newSelectedIds = new Set();
      taskList.value.forEach(task => {
        if (!selectedTaskIds.value.has(task.id)) {
          // 未完成且未被选中 -> 选中它
          newSelectedIds.add(task.id);
        } else if (selectedTaskIds.value.has(task.id)) {
          // 已被选中 -> 不包含在新集合中（即取消选中）
        }
      });
      selectedTaskIds.value = newSelectedIds;
      break;
    case 'copyToNewMember' :
      // 添加新成员并复制
      uni.showModal({
        title: '添加新成员',
        placeholderText: '请输入昵称',
        editable: true,
        success: async (res1) => {
          if (res1.confirm && res1.content && res1.content.trim()) {
            const nickname = res1.content.trim();
            const userResp = await apiTs.group.user.add({ groupId: currentGroup.value.id, nickname: nickname });
            await receiveToUser(userResp.userId, currentGroup.value.id);
          } else if(res1.cancel) {
            // 用户取消输入
          }
        },
        fail: (failRes) => {
          console.error("Modal 失败:", failRes);
          uni.showToast({ title: "操作中断", icon: "none" });
        }
      });
      break;
    case 'copy':
      await receiveToUser(currentMember.value.userId,currentGroup.value.id)
      break;
    default:
      // 可以选择在这里处理未知的 buttonCode，或者什么都不做
      console.warn('Unknown button code:', buttonCode);
      break;
  }
}



const receiveToUser = async (targetUserId,groupId) => {

  taskList.value.forEach(task => {
    task.id = null;
  })

  const req = { // 移除了类型注解
    targetUserId:targetUserId, // 访问 ref 的值
    groupId: groupId,          // 访问 ref 的值
    items: taskList.value          // 访问 ref 的值
  };
  await apiTs.schedule.save(req);
  switchToTab()
}


const switchToTab = ()=>{
  const uri = '/pages/tabBar/task'
  setStoredData(STORAGE_KEYS.REFRESH_TAB,uri)
  uni.switchTab({
    url: uri // 确保路径正确
  });
}

// 判断任务是否被选中
const isTaskSelected = (task) => {
  return selectedTaskIds.value.has(task.id);
};

// 切换单个任务的选中状态
const toggleSelect = (task) => {
  if (mode.value !== 'share') return; // 只在分享模式下有效

  if (selectedTaskIds.value.has(task.id)) {
    selectedTaskIds.value.delete(task.id);
  } else {
    if (!task.isCompleted) { // 可选：不允许选中已完成的任务
      selectedTaskIds.value.add(task.id);
    }
  }
  console.log('Selected IDs:', selectedTaskIds.value);
};

// 处理成员切换
async function handleMemberChange(e) {
  currentMember.value = e.currentMember;
  currentGroup.value = e.currentGroup;
}
// =============== 生命周期 ===============
onMounted(() => {
})

// 获取分享内容
const fetchSharedContent = async (token) => {
  await uni.showLoading({title: "加载中..."});
  try {
    // 1. 调用后端接口获取分享内容
    const content = await apiTs.share.getContent(token)
    taskList.value = JSON.parse(content)

    await handleButtonClick('selectAll');

    console.log(taskList.value)

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
/* --- 全局容器 --- */
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

/* --- 内容容器 --- */
.content-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* 或者保持 flex: 1; 但要确保父级 page-container 是 flex column */
  overflow-y: auto; /* 启用滚动 */
  -webkit-overflow-scrolling: touch; /* 平滑滚动 */
  box-sizing: border-box; /* 确保 padding 不增加总高度 */
  margin-top: 84px;
  padding-top: 10px;
  padding-bottom: 84px;
}

/* --- 任务统计卡片 --- */
.task-stats-card {
  background: white;
  border-radius: 16rpx;
  padding: 24rpx 20rpx;
  margin: 0 0 20rpx 0;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  position: fixed;
  width: 100%;
  height: 60px;
  z-index: 100
}

/* --- 任务统计卡片内部样式 --- */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-block {
  text-align: center;
  flex: 1;
}

.stat-number {
  font-size: 36rpx;
  font-weight: bold;
  color: #2196f3;
  display: block;
}

.stat-label {
  font-size: 24rpx;
  color: #888;
  margin-top: 8rpx;
}

.stat-divider {
  width: 2rpx;
  height: 40rpx;
  background: #eee;
}

.task-list {
  padding: 0 16rpx; /* 左右 padding 保留 */
  flex-grow: 1;
}


/* --- 空状态 --- */
.empty-state {
  text-align: center;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.empty-icon {
  font-size: 72rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}


/* --- 小屏适配 --- */
@media (max-width: 375px) {
  .stat-number {
    font-size: 32rpx;
  }
}
</style>