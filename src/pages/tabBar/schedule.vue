<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <schedule-content ref="scheduleRef"
                        :event-list="events"
                        :currentUser = "currentMember?.userId"
                        :share-mode="shareMode"
                        @grid-click="handleGridClick"
                        @eventClick="handleEventClick"
                        @selection-change="onSelectionChange"/>

    </view>

    <!-- 底部固定栏 -->
    <schedule-bottom-bar
        :buttons="buttons"
        :all-select-all-member="true"
        :show-group="!shareMode"
        :show-group-member="!shareMode"
        :top-side-config = "barTopSideConfig"
        @member-change="handleMemberChange"
        @load-all-of-mine = "handleLoadAllOfMine"
        @buttonClick="handleButtonClick"/>

    <!-- 日程新建/编辑：底部弹层 -->
    <schedule-edit-sheet
        :visible="sheetVisible"
        :edit-id="sheetEditId"
        :date="sheetDate"
        :hour="sheetHour"
        :cur-date="currentDate"
        :group-id="currentGroup?.id || ''"
        :target-user-id="currentMember?.userId || ''"
        @close="sheetVisible = false"
        @saved="onSheetSaved"
        @deleted="onSheetSaved"/>

    <!-- 日程分享海报：课程表长图 + 二维码（公共组件） -->
    <share-poster
        :visible="posterVisible"
        renderer="scheduleTimetable"
        :payload="posterSchedules"
        :qr-source="posterQr"
        :creator-name="posterCreator"
        :show-link="true"
        @close="posterVisible = false"/>
  </view>
</template>


<script setup>
import {ref, onMounted, nextTick, computed} from 'vue';
import apiTs from '../../utils/apiTs';
import DateUtils from '../../utils/util';
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue';
import scheduleContent from '../../components/schedule/schedule-content.vue';
import scheduleEditSheet from '../../components/schedule/schedule-edit-sheet.vue';
import sharePoster from '../../components/share/share-poster.vue';
import {onShareAppMessage, onLoad, onShow} from '@dcloudio/uni-app';
import {getStoredData, removeStoredData, STORAGE_KEYS} from "../../utils/storageManager"; // 引入必要的生命周期钩子
import {base64ToImageSource} from "../../utils/imageHelper";

// =============== 响应式数据 (使用 ref) ===============
const events = ref([]);
const shareMode = ref(false);
const currentGroup = ref({});
const currentMember = ref({});
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

// 日程编辑底部弹层状态
const sheetVisible = ref(false);
const sheetEditId = ref(null);
const sheetDate = ref('');
const sheetHour = ref('');

// 分享海报（长图 + 二维码）状态
const posterVisible = ref(false);
const posterSchedules = ref([]);
const posterQr = ref('');
const posterCreator = ref('我');
// 缓存最近一次生成的分享 token，转发链接时复用，保证「图片」与「链接」指向同一内容
const lastShare = ref({ content: '', token: '' });

function openScheduleSheet({ editId = null, date = '', hour = '' } = {}) {
  sheetEditId.value = editId;
  sheetDate.value = date;
  sheetHour.value = hour;
  sheetVisible.value = true;
}

function onSheetSaved() {
  sheetVisible.value = false;
  fetchScheduleData();
}


// =============== 计算属性 (如果需要的话) ===============


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
const handleGridClick = (date,hour)=>{
  openScheduleSheet({ date, hour });
}
function handleEventClick(event) {
  // 「收到的邀请」(invRecv) 只读：打开邀请函详情查看，不进入日程编辑
  if (event.itemType === 'invRecv') {
    uni.navigateTo({
      url: `/subPackages/invitation/pages/preview?id=${event.id}`
    });
    return;
  }
  openScheduleSheet({ editId: event.id });
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
    case 'doShare':
      doShare();
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
  if (e.currentGroup.id === 'ALL_OF_MINE'){
    currentGroup.value = null;
    currentMember.value = null;
  }else{
    currentGroup.value = e.currentGroup;
    if (e.currentMember.userId === 'ALL'){
      currentMember.value = null;
    }else{
      currentMember.value = e.currentMember;
    }

  }
  console.log(currentGroup.value, currentMember.value);
  fetchScheduleData();
}

const handleLoadAllOfMine = ()=>{

}

// 处理添加按钮点击
function handleAddClick() {
  openScheduleSheet();
}

function onSelectionChange(keys) {
  selectedCount.value = keys.length;
}

function enterShareMode() {
  buttons.value = [
    { code: 'cancelShare', text: '取消' },
    { code: 'selectAll', text: '全选' },
    { code: 'toggleSelectAll', text: '反选' },
    { code: 'doShare', text: '去分享' }
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
    // 仅展示本周一~周日 7 天：后端 generateDates 含首尾，故 toDate 取周日（周一+6天），
    // 避免把下周一作为第 8 列带出来。
    const monday = DateUtils.getMonday(currentDate.value);
    const requestData = {
      fromDate: DateUtils.getDayStartTimeStr(monday),
      toDate: DateUtils.getDayStartTimeStr(DateUtils.getDayOff(monday, 6)),
    };

    if (currentGroup.value && currentGroup.value.id){
      requestData.groupId = currentGroup.value.id;
    }

    if (currentMember.value && currentMember.value.userId){
      requestData.targetUserId = currentMember.value.userId;
    }

    const res = await apiTs.schedule.list(requestData);
    events.value = res || [];
  } catch (e) {
    console.error('获取日程信息失败:', e);
    // 可以在这里添加用户提示，比如 uni.showToast
  }
}

// =============== 分享处理 ===============
const uniqueById = (array) => {
  return [...new Map(array.map(item => [item.id, item])).values()];
};

// 收集当前选中的日程（去重）
function collectSelectedSchedules() {
  let selected = [];
  if (scheduleRef.value && typeof scheduleRef.value.getSelectedEventObjects === 'function') {
    selected = scheduleRef.value.getSelectedEventObjects() || [];
  }
  if (!Array.isArray(selected)) selected = [];
  return uniqueById(selected);
}

// 「去分享」：生成课程表长图 + 小程序码，弹出海报弹层（内含「图片分享」与「转发链接」两种方式）
async function doShare() {
  const selected = collectSelectedSchedules();
  if (selected.length === 0) {
    uni.showToast({ title: '请先选择要分享的日程', icon: 'none' });
    return;
  }
  uni.showLoading({ title: '生成课程表...', mask: true });
  try {
    const content = JSON.stringify(selected);
    const resData = await apiTs.share.create({
      content,
      sceneCode: 'schedule_share'
    });
    if (!resData?.token) throw new Error('生成分享链接失败');
    lastShare.value = { content, token: resData.token };

    const qr = await apiTs.share.qrcode({ token: resData.token, page: 'pages/schedule/share' });
    const qrSrc = await base64ToImageSource(qr.qrBase64, qr.contentType);

    posterSchedules.value = selected;
    posterQr.value = qrSrc;
    posterCreator.value = currentMember.value?.userInfo?.nickname || '我';
    posterVisible.value = true;
  } catch (e) {
    console.error('生成分享图失败:', e);
    uni.showToast({ title: e?.message || '生成失败，请重试', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

onShareAppMessage((res) => {

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

  // 若「去分享」已为同一份内容生成过 token，直接复用，避免重复建 token 且与课程表图片一致
  if (lastShare.value.token && lastShare.value.content === uniqueSelectedJsonString) {
    return {
      title: shareTitle,
      path: `/pages/schedule/share?token=${lastShare.value.token}`,
      imageUrl: ''
    };
  }

  // 返回 Promise，动态生成分享配置
  return new Promise(async (resolve) => {
    try {
      const resData = await apiTs.share.create({
        content: uniqueSelectedJsonString,
        sceneCode: 'schedule_share'
      });

      if (resData?.token) {
        lastShare.value = { content: uniqueSelectedJsonString, token: resData.token };
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
  position: relative; /* 为按钮定位提供参考 */
}

</style>