<template>
  <view class="page-container">
    <view class="task-stats-card">
      <view class="stats-row">
        <view class="stat-block">
<!--          <text class="stat-number">¥{{ formatAmount(todayIncome) }}</text>-->
<!--          <text class="stat-label">累计收入</text>-->
        </view>
        <view class="stat-divider"></view>
        <view class="stat-block">
          <text class="stat-number">¥{{ formatAmount(point) }}</text>
          <text class="stat-label">余额</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-block">
<!--          <text class="stat-number">¥{{ formatAmount(todayExpense) }}</text>-->
<!--          <text class="stat-label">累计支出</text>-->
        </view>
      </view>
    </view>
    <!-- 内容区域 -->
    <view class="content-container">
      <!-- 任务列表 -->
      <view v-show="listShow" class="task-list">
        <view v-if="flowList.length === 0" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">还没有记录任何流水，开始记录吧</text>
        </view>

        <view v-for="transaction in flowList" :key="transaction.id">
          <LedgerItem
              :transaction="transaction"
          />
        </view>
      </view>
    </view>

    <!-- 底部栏 -->
    <schedule-bottom-bar
        :buttons="buttons"
        :top-side-config="barTopSideConfig"
        :is-tab-bar-page="false"
        @member-change="handleMemberChange"
        @buttonClick="handleButtonClick"/>
  </view>
</template>

<script setup>
import {computed, onMounted, ref} from 'vue'
import apiTs from '../../../../utils/apiTs'
import scheduleBottomBar from '../../../../components/schedule-bottom-bar.vue'
import DateUtils from "../../../../utils/util";
import {onLoad, onShow} from "@dcloudio/uni-app";
import {getStoredData, removeStoredData, STORAGE_KEYS} from "../../../../utils/storageManager";
import LedgerItem from "../../components/LedgerItem.vue";

// =============== 响应式状态 ===============
const point = ref(0); // 余额
const flowList = ref([])
const currentDate = ref(new Date())
const listShow = ref(true)
// 修改按钮文字和功能
const buttons = ref([
  { code: 'add-income', text: '添加收入' },
  { code: 'add-expense', text: '添加支出' }
])
const barTopSideConfig = ref({
  left: { text: '←上一页', code: 'lastPage' },
  right: { text: '下一页→', code: 'nextPage' }
})

const currentMember = ref({})
const currentGroup = ref({})
const currentPage = ref(1)
const pageSize  = 100;

const currentPageUri = ref('/subPackages/study-tools/pages/ledger/index')

const flowType = 'CASH';

// =============== 计算属性 ===============

// =============== 方法 ===============
async function fetchAllData() {
  await Promise.all([fetchBalance(), fetchFlowList()])
}

async function fetchBalance() {
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
    point.value = await apiTs.flow.balance(req)
  } catch (error) {
    console.error('获取余额失败:', error);
    // 可以设置一个默认值或提示用户
  }
}

async function handleButtonClick(buttonCode) {
  switch (buttonCode) {
    case 'add-income':
      // 跳转到添加流水页面，传入类型
      await uni.navigateTo({
        url: `/subPackages/study-tools/pages/ledger/edit?flowType=INCOME&groupId=${currentGroup.value.id}&userId=${currentMember.value.userId}`
      });
      return;
    case 'add-expense':
      // 跳转到添加流水页面，传入类型
      await uni.navigateTo({
        url: `/subPackages/study-tools/pages/ledger/edit?flowType=EXPENSE&groupId=${currentGroup.value.id}&userId=${currentMember.value.userId}`
      });
      return;
    case 'subtract':
      return; // 如果不再需要此功能，可以移除或保留
    case 'add':
      return; // 如果不再需要此功能，可以移除或保留
    case 'lastPage':
      await updatePage(-1);
      return;
    case 'nextPage':
      await updatePage(1);
      return;
    case 'date-refresh':
    {
      currentDate.value = new Date();
      barTopSideConfig.value.center.text = DateUtils.getDateStr(currentDate.value);
      await fetchAllData()
      return;
    }
  }
}

// 处理成员切换
async function handleMemberChange(e) {
  currentMember.value = e.currentMember;
  currentGroup.value = e.currentGroup;
  await fetchAllData()
}

async function fetchFlowList() {
  try {
    if (!currentMember.value || !currentGroup.value) {
      console.warn('Member or Group not selected, skipping flow list fetch.');
      flowList.value = [];
      return;
    }
    const req = {
      pageNo:currentPage.value,
      pageSize:pageSize,
      targetUserId: currentMember.value.userId,
      groupId: currentGroup.value.id,
      flowType: flowType,
    }
    const data = await apiTs.flow.list(req)
    // 确保数据按时间倒序排列，最新的在前
    flowList.value = Array.isArray(data) ? data.sort((a, b) => new Date(b.time) - new Date(a.time)) : [];
  } catch (error) {
    console.error('获取流水列表失败', error)
    flowList.value = []
  }
}

async function updatePage(diffPage) {
  if (flowList.value.length < pageSize && diffPage>0){
    console.log("没有数据，不能翻页了")
    return
  }
  if (currentPage.value === 1 && diffPage<0){
    console.log("currentPage.value = 1，不能往前翻页了")
    return
  }
  currentPage.value = currentPage.value + diffPage
  await fetchFlowList();
}

// 格式化金额
const formatAmount = (valueInFen) => {
  if (typeof valueInFen !== 'number') {
    return '¥0.00';
  }
  // 将分转换为元 (除以100)，取绝对值，保留两位小数，添加千分位分隔符
  const yuanValue = Math.abs(valueInFen) / 100;
  return yuanValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// =============== 生命周期 ===============
onMounted(() => {
  // 初始加载时可能没有 currentMember 和 currentGroup，可以在 handleMemberChange 中触发
  // fetchAllData()
})

/**
 * 页面每次显示时调用
 */
onShow(() => {
  const refreshUri = getStoredData(STORAGE_KEYS.REFRESH_TAB)
  if (!refreshUri) {
    return
  }
  if (refreshUri === currentPageUri.value) {
    fetchAllData()
    removeStoredData(STORAGE_KEYS.REFRESH_TAB)
  }
});

// 页面加载时获取参数（如果需要）
onLoad(async (query) => {
  // 例如，可以从 query 中获取默认的日期等
  // 如果需要在加载时就获取数据，需要确保 currentMember 和 currentGroup 已设置
  // await fetchAllData(); // 不建议在此处直接调用，除非能保证上下文已就绪
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
  z-index:100
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
  color: #333; /* 统一颜色 */
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
  padding: 0; /* 内部组件已处理 padding */
  flex-grow: 1;
}

/* --- 空状态 --- */
.empty-state {
  text-align: center;
  padding: 80rpx 40rpx; /* 增加垂直 padding */
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