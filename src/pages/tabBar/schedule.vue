<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <schedule-content ref="scheduleRef"
                        :event-list="events"
                        :currentUser = "currentMember.userId"
                        :share-mode="shareMode"
                        @eventClick="handleEventClick"
                        @selection-change="onSelectionChange"/>
    </view>

    <!-- 底部固定栏 -->
    <schedule-bottom-bar
        :buttons="buttons"
        :all-select-all-member="true"
        :show-group-member="!shareMode"
        :top-side-config = "barTopSideConfig"
        @member-change="handleMemberChange"
        @buttonClick="handleButtonClick"/>
  </view>
</template>


<script setup>
import { ref, onMounted, nextTick } from 'vue';
import apiTs from '../../utils/apiTs';
import DateUtils from '../../utils/util';
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue';
import scheduleContent from '../../components/schedule/schedule-content.vue';
import {onShareAppMessage, onLoad, onShow} from '@dcloudio/uni-app';
import {getStoredData, removeStoredData, STORAGE_KEYS} from "../../utils/storageManager"; // 引入必要的生命周期钩子

// =============== 响应式数据 (使用 ref) ===============
const events = ref([]);
const shareMode = ref(false);
const currentGroup = ref({});
const currentMember = ref({});
const newEventForm = ref({
  title: '',
  date: '',
  time: '',
  member: null
});
const selectedCount = ref(0);
const totalEvents = ref(0);

const buttons = ref([
  { code: 'addEvent', text: '添加事件' },
  { code: 'toShare', text: '分享' }
]);

const barTopSideConfig = ref({
  left: { text: '←上一周', code: 'lastWeek' },
  center: { text: '', code: 'date-refresh' },
  right: { text: '下一周→', code: 'nextWeek' }
});

const currentDate = ref(new Date());

const scheduleRef = ref(null); // 用于访问子组件实例


// =============== 计算属性 (如果需要的话) ===============
// 如果原来有计算属性，可以在这里用 computed 定义


// =============== 生命周期 ===============
onLoad((query) => {
  if (query.refresh) {
    fetchScheduleData();
  }
  initSideConfig();
});

onMounted(() => {
  fetchScheduleData();
});

/**
 * 页面每次显示时调用
 */
onShow(() => {
  const currentTab = '/pages/tabBar/schedule'
  const refreshUri = getStoredData(STORAGE_KEYS.REFRESH_TAB)
  if (!refreshUri){
    return
  }
  if (refreshUri === currentTab){
    fetchScheduleData()
    removeStoredData(STORAGE_KEYS.REFRESH_TAB)
  }
});


// =============== 方法 ===============
function handleEventClick(event) {
  uni.navigateTo({
    url: `/pages/schedule/edit?id=${event.id}&title=${encodeURIComponent(event.itemTitle || '')}`
  });
}

function initSideConfig() {
  barTopSideConfig.value.center.text = `${DateUtils.getDateStr(currentDate.value)}`;
}

async function handleButtonClick(buttonCode) {
  console.log(buttonCode);
  switch (buttonCode) {
    case 'addEvent':
      handleAddClick();
      break;
    case 'toShare':
      enterShareMode();
      break;
    case 'selectAll':
      selectAll();
      break;
    case 'toggleSelectAll':
      toggleSelectAll();
      break;
    case 'cancelShare':
      exitShareMode();
      break;
    case 'nextWeek':
      currentDate.value = DateUtils.getDayOff(currentDate.value, 7);
      handleCurrentDateChange();
      break;
    case 'lastWeek':
      currentDate.value = DateUtils.getDayOff(currentDate.value, -7);
      handleCurrentDateChange();
      break;
    case 'date-refresh':
      currentDate.value = new Date();
      await fetchScheduleData();
      break;
    default:
      console.warn(`Unknown button code: ${buttonCode}`);
  }
}

function handleCurrentDateChange() {
  initSideConfig();
  fetchScheduleData();
}

// 处理成员切换
function handleMemberChange(e) {
  currentMember.value = e.currentMember;
  currentGroup.value = e.currentGroup;
  console.log(currentGroup.value, currentMember.value);
  fetchScheduleData();
}

// 处理添加按钮点击
function handleAddClick() {
  uni.navigateTo({
    url: '/pages/schedule/edit'
  });
}

function onSelectionChange(keys) {
  selectedCount.value = keys.length;
}

function enterShareMode() {
  buttons.value = [
    { code: 'cancelShare', text: '取消' },
    { code: 'selectAll', text: '全选' },
    { code: 'toggleSelectAll', text: '反选' },
    { code: 'doShare', type: 'share', text: '去分享' }
  ];
  shareMode.value = true;
  nextTick(() => {
    if (scheduleRef.value && typeof scheduleRef.value.getTotalEventCount === 'function') {
      totalEvents.value = scheduleRef.value.getTotalEventCount();
    }
  });
}

function exitShareMode() {
  shareMode.value = false;
  buttons.value = [
    { code: 'addEvent', text: '添加事件' },
    { code: 'toShare', text: '分享' }
  ];
}

function selectAll() {
  if (scheduleRef.value && typeof scheduleRef.value.selectAll === 'function') {
    scheduleRef.value.selectAll();
  }
}

function toggleSelectAll() {
  if (scheduleRef.value && typeof scheduleRef.value.toggleSelectAll === 'function') {
    scheduleRef.value.toggleSelectAll();
  }
}

// 获取日程数据
async function fetchScheduleData() {
  try {
    if (!currentMember.value || !currentMember.value.userId) {
      return;
    }
    const requestData = {
      fromDate: DateUtils.getMondayStr(currentDate.value),
      toDate: DateUtils.getSundayStr(currentDate.value),
      userId: currentMember.value.userId,
      groupId: currentGroup.value.id
    };

    const res = await apiTs.schedule.list(requestData);
    events.value = res || [];
  } catch (e) {
    console.error('获取日程信息失败:', e);
    // 可以在这里添加用户提示，比如 uni.showToast
  }
}

// =============== 分享处理 ===============
onShareAppMessage((res) => {
  const uniqueById = (array) => {
    return [...new Map(array.map(item => [item.id, item])).values()];
  };

  // 只处理来自页面按钮的分享请求
  if (res.from !== 'button') {
    return false;
  }

  // 获取选中事件
  let selected = [];
  if (scheduleRef.value && typeof scheduleRef.value.getSelectedEventObjects === 'function') {
    selected = scheduleRef.value.getSelectedEventObjects() || [];
  }
  if (!Array.isArray(selected)) selected = [];

  if (selected.length === 0) {
    uni.showToast({ title: '请先选择要分享的日程', icon: 'none' });
    return false;
  }

  const uniqueSelected = uniqueById(selected);
  const uniqueSelectedJsonString = JSON.stringify(uniqueSelected);
  const shareTitle = `分享 ${uniqueSelected.length} 个日程`;

  // 返回 Promise，动态生成分享配置
  return new Promise(async (resolve) => {
    try {
      const resData = await apiTs.share.create({
        content: uniqueSelectedJsonString,
        sceneCode: 'schedule_share'
      });

      if (resData?.token) {
        resolve({
          title: shareTitle,
          path: `/pages/schedule/share?token=${resData.token}`,
          imageUrl: '' // 可选
        });
      } else {
        await uni.showToast({ title: '生成分享链接失败', icon: 'none' });
        resolve({});
      }
    } catch (err) {
      console.error('生成分享 token 失败:', err);
      await uni.showToast({ title: '网络错误，请重试', icon: 'none' });
      resolve({});
    }
  });
});
</script>
<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh; /* 占满整个视口高度 */
  box-sizing: border-box;
}

/* 内容容器样式 */
.page-content-container {
  flex: 1; /* 让内容区域占据所有可用空间 */
  overflow-y: auto; /* 允许滚动 */
  -webkit-overflow-scrolling: touch; /* 平滑滚动 */
}
</style>