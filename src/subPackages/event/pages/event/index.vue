<template>
  <view class="event-page">
    <!-- 页面标题 -->
    <view class="page-header" v-if="currentView === 'top'">
      <text class="page-subtitle">记录生活中的重要时刻</text>
    </view>
    <view class="page-header nav-header" v-else>
      <view class="back-btn" @click="currentView = 'top'">
        <text class="back-icon">←</text> 返回
      </view>
      <text class="page-title nav-title">{{ activeGoalObj?.itemTitle }}</text>
    </view>

    <!-- 顶层视图: 有关联事件的目标分类 -->
    <view class="goal-list-container" v-if="currentView === 'top' && activeGoals.length > 0">
      <view class="goal-grid">
        <view class="goal-card" v-for="goal in activeGoals" :key="goal.id" @click="enterGoal(goal)">
          <view class="goal-card-content">
            <view class="goal-text">
              <text class="goal-name">{{ goal.itemTitle }}</text>
              <text class="goal-count">{{ getGoalEventCount(goal.id) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 事件列表 - 炫酷卡片式布局 -->
    <view class="event-list" v-if="displayEvents.length > 0">
      <view 
        v-for="(item, index) in displayEvents" 
        :key="index" 
        class="event-card"
        :class="{ 'recent-event': isRecentEvent(item) }"
        @click="showEventDetail(item)"
      >
        <!-- 事件头部 -->
        <view class="event-header">
          <!-- 事件图标 -->
          <view class="event-icon">
            {{ getEventIcon(item) }}
          </view>
          
          <!-- 事件信息 -->
          <view class="event-info">
            <view class="event-title-row">
              <text class="event-title">{{ item.itemTitle || '未命名事件' }}</text>
              <view class="event-duration" :class="{ 'recent-duration': isRecentEvent(item) }">
                <text class="duration-text">{{ item.daysDesc }}</text>
              </view>
            </view>
            <text class="event-time">开始于 {{ formatEventTime(item.startTime || item.repeatStartDay) }}</text>
          </view>
        </view>
        
        <!-- 分享按钮 -->
        <view class="event-share" @click.stop="openWatermarkCamera(item)">
          <text class="share-text">拍照分享</text>
        </view>
      </view>
    </view>

    <!-- 顶层视图: 无关联事件的目标分类 -->
    <view class="goal-list-container" style="margin-top: 10rpx;" v-if="currentView === 'top' && emptyGoals.length > 0">
      <view class="goal-grid">
        <view class="goal-card empty-goal-card" v-for="goal in emptyGoals" :key="goal.id" @click="enterGoal(goal)">
          <view class="goal-card-content">
            <view class="goal-text">
              <text class="goal-name">{{ goal.itemTitle }}</text>
              <text class="goal-count">0</text>
            </view>
          </view>
          <text class="goal-arrow">></text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="(currentView === 'top' && goalList.length === 0 && displayEvents.length === 0) || (currentView === 'detail' && displayEvents.length === 0)">
      <text class="empty-icon">📅</text>
      <text class="empty-text">{{ currentView === 'detail' ? '该分类下还没有事件' : '还没有记录事件' }}</text>
      <text class="empty-subtext">点击下方按钮添加</text>
    </view>

    <!-- 底部栏 -->
    <schedule-bottom-bar
        :buttons="buttons"
        @member-change="handleMemberChange"
        @buttonClick="handleButtonClick"
    />
    <drawer-right-btn
        ref="drawerRef"
        :circle-translate="40"
        btn-top="50%"
        :circle-size="120"
        main-color="#007AFF"
        :radius="140"
        :is-open="isDrawerBtnOpen"
    >
      <template #default="{circleSize, mainColor, radius}">
        <DrawerBtnItem btnText="日程" :angle="85" :radius="radius" :circleSize="100"
                       @btn-click="performRedirect('/pages/tabBar/schedule')"/>
        <DrawerBtnItem btnText="打卡" :angle="30" :radius="radius" :circleSize="100"
                       @btn-click="performRedirect('/pages/tabBar/task')"/>
        <DrawerBtnItem btnText="更多" :angle="-85" :radius="radius" :circleSize="100"
                       @btn-click="performRedirect('/pages/tabBar/more')"/>
        <DrawerBtnItem btnText="添加事件" :angle="-30" :radius="radius" :circleSize="100"
                       @btn-click="onAddEventClick"/>
      </template>
    </drawer-right-btn>

    <!-- 事件详情弹窗 -->
    <BottomSheet
      :visible="showDetailPopup"
      :title="selectedEvent?.itemTitle || '事件详情'"
      :show-footer="false"
      @close="closeDetailPopup"
    >
      <view class="detail-content">
        <view class="detail-item">
          <text class="detail-label">开始时间</text>
          <text class="detail-value">{{ formatEventTime(selectedEvent?.startTime || selectedEvent?.repeatStartDay) }}</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">已开始</text>
          <text class="detail-value detail-value--accent">{{ selectedEvent?.daysDesc }}</text>
        </view>
        <view class="detail-item" v-if="selectedEvent?.parentId">
          <text class="detail-label">所属目标</text>
          <text class="detail-value">{{ getGoalName(selectedEvent?.parentId) }}</text>
        </view>
      </view>
      <view class="detail-actions">
        <button class="detail-action-btn detail-action-btn--ghost" @click="editEvent(selectedEvent)">
          ✏️ 编辑事件
        </button>
        <button class="detail-action-btn detail-action-btn--primary" @click="onShareFromDetail(selectedEvent)">
          📷 拍照分享
        </button>
      </view>
    </BottomSheet>

    <!-- 添加/编辑事件弹窗 -->
    <BottomSheet
      :visible="isShowAddEventPopup"
      :title="editingEvent ? '编辑事件' : '添加新事件'"
      accent="primary"
      :confirm-text="editingEvent ? '保存修改' : '确认保存'"
      @close="closeAddEventPopup"
      @confirm="submitEventForm"
    >
      <view class="field">
        <text class="field__label">事件名称</text>
        <input
          v-model="eventForm.name"
          class="field__input"
          placeholder="请输入事件名称（必填）"
          type="text"
        />
      </view>
      <view class="field">
        <text class="field__label">事件时间</text>
        <DatePicker
          v-model="eventForm.datetime"
          mode="date"
          placeholder="请选择事件时间"
          title="选择事件时间"
          @confirm="onDatetimeConfirm"
        />
      </view>
      <view class="field">
        <text class="field__label">所属目标</text>
        <GoalSelect
          v-model="eventForm.parentId"
          :goal-list="goalList"
        />
      </view>
    </BottomSheet>

    <!-- 分享弹窗 -->
    <view v-if="showSharePopup" class="popup-mask" @click="closeSharePopup">
      <view class="share-popup" @click.stop>
        <view class="share-header">
          <text class="share-title">重要事件</text>
          <text class="share-close" @click="closeSharePopup">×</text>
        </view>
        <view class="share-content">
          <text class="share-event-title">{{ sharingEvent?.itemTitle }}</text>
          <text class="share-event-desc">{{ sharingEvent?.daysDesc }}</text>
          
        </view>
        <view class="share-footer">
          
        </view>
      </view>
    </view>

    <WatermarkCamera
      v-if="showWatermarkCamera"
      :fullscreen="true"
      :initialWatermarkName="watermarkText"
      :initialWatermarkTime="watermarkTime"
      @photoTaken="handleWatermarkPhoto"
      @shareRequested="handleShareRequested"
      @close="handleWatermarkClose"
    />
  </view>
</template>

<script setup>
import {ref, computed, onMounted} from "vue";
import {onShareAppMessage, onShareTimeline} from "@dcloudio/uni-app";
import apiTs from '../../../../utils/apiTs';
import DatePicker from "../../../../components/fun-components/date-picker.vue";
import DateUtils from "../../../../utils/util";
import {getStoredData, getStoredKey, STORAGE_KEYS} from "../../../../utils/storageManager";
import GoalSelect from "../../../../components/fun-components/goal-select.vue";
import ScheduleBottomBar from "../../../../components/schedule-bottom-bar.vue";
import WatermarkCamera from "../../../../components/fun-components/WatermarkCamera.vue";
import BottomSheet from "../../../../components/fun-components/bottom-sheet.vue";
import DrawerRightBtn from "../../../../components/fun-components/drawer-btn/drawer-right-btn.vue";
import DrawerBtnItem from "../../../../components/fun-components/drawer-btn/drawer-btn-item.vue";
import { performRedirect } from "../../../../utils/router";


// 响应式数据
const currentMember = ref(null);
const currentDate = ref(new Date())
const eventList = ref([])
const goalList = ref([])
const goalMap = ref({})
const buttons = ref([  {code: 'addEvent', text: '添加事件'}
]);

// 视图状态层级
const currentView = ref('top');
const activeGoalObj = ref(null);

const activeGoals = computed(() => {
  return goalList.value.filter(g => getGoalEventCount(g.id) > 0);
});

const emptyGoals = computed(() => {
  return goalList.value.filter(g => getGoalEventCount(g.id) === 0);
});

const displayEvents = computed(() => {
  if (currentView.value === 'top') {
    return eventList.value.filter(e => !e.parentId || Number(e.parentId) === 0);
  } else {
    return eventList.value.filter(e => e.parentId === activeGoalObj.value?.id);
  }
});

const getGoalEventCount = (goalId) => {
  return eventList.value.filter(e => e.parentId === goalId).length;
};

function enterGoal(goal) {
  activeGoalObj.value = goal;
  currentView.value = 'detail';
}

// 弹窗相关
const isShowAddEventPopup = ref(false);
const showDetailPopup = ref(false);
const showSharePopup = ref(false);
const selectedEvent = ref(null);
const sharingEvent = ref(null);
const editingEvent = ref(null);
const shareImageUrl = ref('');
const showWatermarkCamera = ref(false);
const watermarkText = ref('');
const watermarkTime = ref('');
const lastWatermarkPhoto = ref('');
const watermarkShareImageUrl = ref('');
const watermarkShareTitle = ref('水印照片');

// 表单数据
const eventForm = ref({
  name: '',
  datetime: '',
  parentId: 0
});

// 页面加载时获取成员信息
onMounted(() => {
  // 模拟获取当前成员（实际项目中应从全局状态或存储中获取）
  const mockMember = {
    userId: 1,
    groupId: 1,
    userName: '当前用户'
  };
  handleMemberChange({currentMember: mockMember});
});

// 打开添加事件弹窗
function onAddEventClick() {
  editingEvent.value = null;
  eventForm.value = {
    name: '',
    datetime: '',
    parentId: currentView.value === 'detail' && activeGoalObj.value ? activeGoalObj.value.id : 0
  };
  isShowAddEventPopup.value = true;
}

// 打开编辑事件弹窗
function editEvent(event) {
  editingEvent.value = event;
  eventForm.value = {
    name: event.itemTitle || '',
    datetime: event.repeatStartDay || DateUtils.getDateStr(new Date(event.startTime)),
    parentId: event.parentId || 0
  };
  isShowAddEventPopup.value = true;
  closeDetailPopup();
}

// 关闭添加事件弹窗
function closeAddEventPopup() {
  isShowAddEventPopup.value = false;
  editingEvent.value = null;
}

// 显示事件详情
function showEventDetail(event) {
  selectedEvent.value = event;
  showDetailPopup.value = true;
}

// 关闭事件详情弹窗
function closeDetailPopup() {
  showDetailPopup.value = false;
  selectedEvent.value = null;
}

// 打开分享弹窗
function shareEvent(event) {
  sharingEvent.value = event;
  generateShareImage(event);
  showSharePopup.value = true;
  closeDetailPopup();
}

// 从详情弹窗直接进入水印拍照
function onShareFromDetail(event) {
  if (!event) return
  closeDetailPopup()
  openWatermarkCamera(event)
}

// 关闭分享弹窗
function closeSharePopup() {
  showSharePopup.value = false;
  sharingEvent.value = null;
  shareImageUrl.value = '';
}

// 生成分享图片
function generateShareImage(event) {
  // 模拟生成分享图片URL（实际项目中可使用canvas生成）
  const title = encodeURIComponent(event.itemTitle || '未命名事件');
  const daysDesc = encodeURIComponent(event.daysDesc || '');
  shareImageUrl.value = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=A%20beautiful%20event%20share%20card%20with%20title%20${title}%20and%20description%20${daysDesc}%2C%20minimalist%20design%2C%20soft%20colors&image_size=square_hd`;
}

// 分享到朋友圈
function shareToMoments() {
  // 实际项目中使用uni.share API
  uni.showToast({title: '分享功能已触发', icon: 'success'});
  closeSharePopup();
}

function openWatermarkCamera(event) {
  const title = event?.itemTitle || '事件'
  const dayText = getEventDayText(event)
  watermarkText.value = `${title}`
  watermarkTime.value = `${dayText}`
  showWatermarkCamera.value = true
}

function handleWatermarkClose() {
  showWatermarkCamera.value = false
}

function handleWatermarkPhoto(imgPath) {
  lastWatermarkPhoto.value = imgPath
  showWatermarkCamera.value = false
}

function handleShareRequested(payload) {
  watermarkShareImageUrl.value = payload?.imageUrl || ''
  watermarkShareTitle.value = payload?.title || '水印照片'
}

onShareAppMessage(() => {
  if (!watermarkShareImageUrl.value) return
  const data = {
    title: watermarkShareTitle.value,
    path: '/subPackages/study-tools/pages/event/index',
    imageUrl: watermarkShareImageUrl.value
  }
  setTimeout(() => {
    watermarkShareImageUrl.value = ''
    watermarkShareTitle.value = '水印照片'
  }, 0)
  return data
})

onShareTimeline(() => {
  if (!watermarkShareImageUrl.value) return
  const data = {
    title: watermarkShareTitle.value,
    query: '',
    imageUrl: watermarkShareImageUrl.value
  }
  setTimeout(() => {
    watermarkShareImageUrl.value = ''
    watermarkShareTitle.value = '水印照片'
  }, 0)
  return data
})


function handleButtonClick(buttonCode) {
  switch (buttonCode) {
    case 'addEvent': onAddEventClick(); break;
  }
}

// 复制分享文本
function copyShareText() {
  const shareText = `【重要事件】${sharingEvent.value?.itemTitle}\n${sharingEvent.value?.daysDesc}`;
  uni.setClipboardData({
    data: shareText,
    success: () => {
      uni.showToast({title: '复制成功', icon: 'success'});
    }
  });
}

// 计算距今时间描述
const calcDaysDesc = (eventTimeStr) => {
  if (!eventTimeStr) return '时间未知';
  const start = new Date(eventTimeStr);
  const now = new Date();
  
  const timeDiff = Math.abs(now.getTime() - start.getTime());
  const totalDays = Math.floor(timeDiff / 86400000) + 1;
  
  let d1 = start <= now ? start : now;
  let d2 = start <= now ? now : start;
  
  let years = d2.getFullYear() - d1.getFullYear();
  let months = d2.getMonth() - d1.getMonth();
  let days = d2.getDate() - d1.getDate();
  
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  
  if (years > 0 || months > 0) {
    let desc = '第';
    if (years > 0) desc += `${years}年`;
    if (months > 0) desc += `${months}个月`;
    if (days > 0 & days < 10){desc += `零${days}天`} else if(days>10){desc += `${days}天`};
    // desc += `（${totalDays}天）`;
    return desc;
  }
  
  return `第${totalDays}天`;
};

const getEventDayText = (event) => {
  const timeStr = event?.startTime || event?.repeatStartDay;
  if (!timeStr) return '第1天';
  return calcDaysDesc(timeStr);
}

// 格式化事件时间
const formatEventTime = (timeStr) => {
  if (!timeStr) return '未知时间';
  const date = new Date(timeStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

// 获取事件图标
const getEventIcon = (event) => {
  const icons = ['🎯', '✨', '🎉', '📅', '🌟', '🔥', '💎', '🌈'];
  const index = event.id ? parseInt(event.id.toString().slice(-1)) % icons.length : Math.floor(Math.random() * icons.length);
  return icons[index];
};

// 判断是否为近期事件
const isRecentEvent = (event) => {
  if (!event.startTime && !event.repeatStartDay) return false;
  const eventTime = new Date(event.startTime || event.repeatStartDay);
  const now = new Date();
  const daysDiff = Math.floor(Math.abs(now.getTime() - eventTime.getTime()) / 86400000);
  return daysDiff <= 30;
};

// 获取近期事件数量
const getRecentEventsCount = () => {
  return eventList.value.filter(item => isRecentEvent(item)).length;
};

// 获取目标名称
const getGoalName = (goalId) => {
  return goalMap.value[goalId]?.itemTitle || '未分类';
};

// 获取所有数据（目标和事件）
async function fetchAllData() {
  try {
    if (!currentMember.value) return;
    const reqBase = {
      fromDate: DateUtils.getDateStr(currentDate.value),
      toDate: DateUtils.getNextDayStr(currentDate.value),
      targetUserId: currentMember.value.userId,
      groupId: currentMember.value.groupId,
    };
    
    const [goalRes, eventRes] = await Promise.all([
      apiTs.checkin.task.list({ ...reqBase, scheduleItemType: 'goal' }),
      apiTs.checkin.task.list({ ...reqBase, scheduleItemType: 'event' })
    ]);

    const rawGoals = goalRes.find(element => element.date === DateUtils.getDateStr(currentDate.value))?.schedules || [];
    const rawEvents = eventRes.find(element => element.date === DateUtils.getDateStr(currentDate.value))?.schedules || [];
    
    // 处理目标数据
    goalList.value = rawGoals;
    const map = {};
    rawGoals.forEach(item => map[item.id] = item);
    goalMap.value = map;
    
    // 处理事件数据
    eventList.value = rawEvents.map(item => ({
      ...item,
      daysDesc: calcDaysDesc(item.startTime || item.repeatStartDay)
    })).sort((a, b) => {
      // 按开始时间倒序排列
      const timeA = new Date(a.startTime || a.repeatStartDay).getTime();
      const timeB = new Date(b.startTime || b.repeatStartDay).getTime();
      return timeB - timeA;
    });
  } catch (error) {
    console.error('获取数据失败', error);
    uni.showToast({title: '获取数据失败', icon: 'none'});
  }
}

// 提交事件表单
async function submitEventForm() {
  // 表单校验
  if (!eventForm.value.name.trim()) {
    uni.showToast({title: '请输入事件名称', icon: 'none'});
    return;
  }
  if (!eventForm.value.datetime) {
    uni.showToast({title: '请选择事件时间', icon: 'none'});
    return;
  }
  if (!currentMember.value) {
    uni.showToast({title: '请先选择成员', icon: 'none'});
    return;
  }

  try {
    const eventTime = new Date(eventForm.value.datetime);
    const endDate = DateUtils.getDayOff(eventTime, 365 * 20);
    const item = {
      endTime: DateUtils.getDayStartTimeStr(endDate),
      itemTitle: eventForm.value.name.trim(),
      itemType: "event",
      repeatEndDay: DateUtils.getDateStr(endDate),
      repeatStartDay: DateUtils.getDateStr(eventTime),
      startTime: DateUtils.getDayStartTimeStr(eventTime),
      repeatType: 'none',
      parentId: eventForm.value.parentId
    };

    // 如果是编辑模式，添加id
    if (editingEvent.value) {
      item.id = editingEvent.value.id;
    }

    const req = {
      targetUserId: currentMember.value.userId,
      groupId: currentMember.value.groupId,
      items: [item]
    };
    
    await apiTs.schedule.save(req);
    uni.showToast({title: editingEvent.value ? '事件更新成功' : '事件添加成功', icon: 'success'});
    closeAddEventPopup();
    await fetchAllData();
  } catch (error) {
    console.error('保存事件失败', error);
    uni.showToast({title: '保存失败，请重试', icon: 'none'});
  }
}

// 处理成员变更
async function handleMemberChange(e) {
  currentMember.value = e.currentMember;
  await fetchAllData();
}

const onDatetimeConfirm = (value) => {
  console.log('选中的时间：', value);
};
</script>

<style scoped>
/* 页面主容器 */
.event-page {
  min-height: 100vh;
  padding: 24rpx 20rpx;
  padding-bottom: 200rpx;
  box-sizing: border-box;
  background: #f6f7fb;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 28rpx;
}

.nav-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.back-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: #4b5563;
  padding: 10rpx;
}

.back-icon {
  font-size: 32rpx;
  margin-right: 4rpx;
}

.nav-title {
  font-size: 36rpx !important;
  margin-top: 10rpx;
}

.section-heading {
  font-size: 32rpx;
  font-weight: 700;
  color: #1d2129;
  margin: 20rpx 0 16rpx 10rpx;
  display: block;
}

.goal-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.goal-card {
  position: relative;
  background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
  border-radius: 16rpx;
  padding: 32rpx 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 6rpx 16rpx rgba(0, 122, 255, 0.05);
  border: 1rpx solid rgba(0, 122, 255, 0.1);
  transition: all 0.2s;
  overflow: hidden;
}

.goal-card::after {
  content: '';
  position: absolute;
  right: -30rpx;
  bottom: -30rpx;
  width: 120rpx;
  height: 120rpx;
  background: radial-gradient(circle, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

.empty-goal-card {
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
  box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.03);
  border: 1rpx solid #e5e7eb;
}

.empty-goal-card::after {
  background: radial-gradient(circle, rgba(156, 163, 175, 0.08) 0%, rgba(156, 163, 175, 0) 70%);
}

.goal-card:active {
  transform: scale(0.98);
}

.goal-card-content {
  display: flex;
  align-items: center;
  gap: 16rpx;
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.goal-text {
  display: flex;
  align-items: center;
  gap: 12rpx;
  width: 100%;
}

.goal-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 0 1 auto;
}

.goal-count {
  flex-shrink: 0;
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
  background: #007AFF;
  min-width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  text-align: center;
  padding: 0 10rpx;
  border-radius: 18rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 122, 255, 0.3);
  box-sizing: border-box;
}

.empty-goal-card .goal-count {
  color: #fff;
  background: #d1d5db;
  box-shadow: none;
}

.goal-arrow {
  color: #cbd5e1;
  font-size: 28rpx;
  font-weight: bold;
  position: relative;
  z-index: 1;
}

.page-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #1d2129;
  margin-bottom: 10rpx;
  display: block;
}

.page-subtitle {
  font-size: 24rpx;
  color: #6b7280;
}

/* 统计卡片 */
.stats-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 8rpx 20rpx rgba(15, 23, 42, 0.08);
}

.stats-item {
  text-align: center;
}

.stats-number {
  font-size: 40rpx;
  font-weight: 700;
  color: #111827;
  display: block;
}

.stats-label {
  font-size: 24rpx;
  color: #6b7280;
  margin-top: 10rpx;
  display: block;
}

.stats-divider {
  width: 1rpx;
  background: #e5e6eb;
  margin: 0 20rpx;
}

/* 事件列表 */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 0 4rpx;
}

/* 事件卡片 */
.event-card {
  position: relative;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.08);
  border: 1rpx solid #eef0f4;
  overflow: hidden;
}

/* 卡片悬停效果 */
.event-card:hover {
  transform: translateY(-4rpx);
  box-shadow: 0 14rpx 28rpx rgba(15, 23, 42, 0.12);
}

/* 近期事件特殊样式 */
.recent-event {
  border: 2rpx solid rgba(0, 122, 255, 0.25);
}

/* 卡片装饰元素 */
.event-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4rpx;
  background: linear-gradient(90deg, #bbd6fb 0%, #d8e5f8 100%);
  border-radius: 20rpx 20rpx 0 0;
}

.recent-event::before {
  background: linear-gradient(90deg, #007AFF 0%, #0056b3 100%);
}

/* 事件头部 */
.event-header {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 24rpx;
}

.event-title-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

/* 事件图标 */
.event-icon {
  font-size: 56rpx;
  margin-right: 20rpx;
  width: 86rpx;
  height: 86rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2ff;
  border-radius: 20rpx;
  color: #4f46e5;
  box-shadow: none;
  flex-shrink: 0;
}

.recent-event .event-icon {
  background: #e6f1ff;
  color: #007AFF;
}

/* 事件信息 */
.event-info {
  flex: 1;
  min-width: 0;
}

.event-title {
  font-size: 30rpx;
  font-weight: 400;
  color: #111827;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
  flex: 0 1 auto;
  max-width: 60%;
}

.event-time {
  font-size: 24rpx;
  color: #6b7280;
  display: block;
  line-height: 1.2;
}

/* 持续时间 - 突出显示 */
.event-duration {
  position: relative;
  background: #e6f1ff;
  color: #007AFF;
  padding: 6rpx 12rpx 6rpx 26rpx;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 10rpx rgba(0, 122, 255, 0.1);
  transition: all 0.3s ease;
  flex-shrink: 0;
  margin-left: 2rpx;
}

.event-duration:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 6rpx 12rpx rgba(0, 122, 255, 0.15);
}

.event-duration::before {
  content: '';
  position: absolute;
  left: 10rpx;
  top: 50%;
  width: 8rpx;
  height: 8rpx;
  margin-top: -4rpx;
  border-radius: 50%;
  background: #66b2ff;
  box-shadow: none;
}

/* 近期事件持续时间 */
.recent-duration {
  background: rgba(0, 122, 255, 0.15);
  color: #0056b3;
  box-shadow: 0 4rpx 10rpx rgba(0, 122, 255, 0.18);
}

.recent-duration:hover {
  box-shadow: 0 6rpx 12rpx rgba(0, 122, 255, 0.22);
}

.duration-text {
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1;
}

/* 分享按钮 */
.event-share {
  position: absolute;
  bottom: 20rpx;
  right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #007AFF;
  box-shadow: 0 8rpx 18rpx rgba(0, 122, 255, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
}

.event-share:hover {
  transform: translateY(-4rpx);
  box-shadow: 0 12rpx 24rpx rgba(0, 122, 255, 0.3);
}

.share-icon {
  font-size: 36rpx;
  margin-bottom: 4rpx;
}

.share-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 500;
}

/* 卡片底部装饰 */
.event-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 120rpx;
  height: 120rpx;
  background: radial-gradient(circle at 40% 40%, rgba(79, 70, 229, 0.12) 0%, rgba(79, 70, 229, 0.02) 70%);
  border-radius: 50% 0 24rpx 0;
  pointer-events: none;
}

.recent-event::after {
  background: radial-gradient(circle at 40% 40%, rgba(0, 122, 255, 0.12) 0%, rgba(0, 122, 255, 0.02) 70%);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 100rpx 0;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20rpx;
  margin-top: 50rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 20rpx;
  display: block;
}

.empty-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 10rpx;
  display: block;
}

.empty-subtext {
  font-size: 24rpx;
  color: #86909c;
  display: block;
}

/* 底部添加按钮 */
.add-button-container {
  position: fixed;
  bottom: 30rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600rpx;
}

.add-button {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%);
  color: white;
  border: none;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.4);
  transition: all 0.3s ease;
}

.add-button:hover {
  transform: translateY(-5rpx);
  box-shadow: 0 12rpx 32rpx rgba(0, 122, 255, 0.5);
}

.add-icon {
  font-size: 40rpx;
  margin-right: 10rpx;
  line-height: 1;
}

/* 分享弹窗仍保留旧 popup-mask 实现，BottomSheet 已接管编辑/详情弹窗 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx 20rpx;
  box-sizing: border-box;
}

/* 详情弹窗内容（套在 BottomSheet 内）*/
.detail-content {
  padding: 4rpx 0 16rpx;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 26rpx;
  color: #94a3b8;
  font-weight: 500;
}

.detail-value {
  font-size: 28rpx;
  color: #0f172a;
  font-weight: 500;
  text-align: right;
  flex: 1;
  margin-left: 20rpx;
}

.detail-value--accent {
  color: #4f46e5;
  font-weight: 600;
}

.detail-actions {
  display: flex;
  gap: 14rpx;
  margin-top: 20rpx;
}

.detail-action-btn {
  flex: 1;
  height: 88rpx;
  line-height: 1;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.detail-action-btn::after {
  border: none;
}

.detail-action-btn--ghost {
  background: #f1f5f9;
  color: #475569;
}

.detail-action-btn--primary {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: #fff;
}

/* 分享弹窗 */
.share-popup {
  width: 90%;
  max-width: 800rpx;
  min-height: 70vh;
  background: linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%);
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 32rpx 64rpx rgba(0, 0, 0, 0.3);
  border: 4rpx solid rgba(102, 126, 234, 0.2);
}

.share-header {
  padding: 40rpx;
  border-bottom: 2rpx solid #e5e6eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.share-title {
  font-size: 42rpx;
  font-weight: 700;
  color: white;
}

.share-close {
  font-size: 50rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1;
  padding: 10rpx;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.share-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.share-content {
  padding: 60rpx 40rpx;
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.share-event-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #1d2129;
  margin-bottom: 30rpx;
  display: block;
  line-height: 1.2;
  max-width: 90%;
}

.share-event-desc {
  font-size: 36rpx;
  font-weight: 600;
  color: #007AFF;
  margin-bottom: 60rpx;
  display: block;
  line-height: 1.2;
  padding: 20rpx 40rpx;
  background: rgba(0, 122, 255, 0.1);
  border-radius: 50rpx;
}

.share-image {
  width: 90%;
  height: 400rpx;
  margin-bottom: 60rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #f5f5f5;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.15);
  border: 2rpx solid #e5e6eb;
}

.share-image image {
  width: 100%;
  height: 100%;
}

.share-tip {
  font-size: 28rpx;
  color: #86909c;
  margin-bottom: 40rpx;
  padding: 20rpx;
  background: rgba(134, 144, 156, 0.1);
  border-radius: 16rpx;
  line-height: 1.4;
}

.share-footer {
  padding: 0 40rpx 60rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.share-btn {
  width: 100%;
  height: 100rpx;
  line-height: 100rpx;
  border-radius: 50rpx;
  font-size: 36rpx;
  border: 3rpx solid #007AFF;
  color: #007AFF;
  background: white;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.1);
}

.share-btn:hover {
  background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%);
  color: white;
  transform: translateY(-4rpx);
  box-shadow: 0 16rpx 48rpx rgba(0, 122, 255, 0.3);
}

/* 分享弹窗内容容器 */
.share-popup {
  display: flex;
  flex-direction: column;
}

.share-content {
  flex: 1;
}

.share-footer {
  margin-top: auto;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
  .event-card {
    padding: 20rpx;
  }
  
  .event-icon {
    font-size: 50rpx;
    width: 70rpx;
    height: 70rpx;
  }
  
  .event-title {
    font-size: 28rpx;
  }
  
  .stats-card {
    padding: 20rpx;
  }
  
  .stats-number {
    font-size: 32rpx;
  }
}
</style>