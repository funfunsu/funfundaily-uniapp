<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <schedule-edit :schedule="editingSchedule" />
    </view>
    <!-- 底部固定栏 -->
    <schedule-bottom-bar :buttons="buttons"
                         :is-tab-bar-page="false"
                         @member-change="handleMemberChange"
                         @buttonClick="handleButtonClick" />
  </view>
</template>

<script setup>
import { ref } from 'vue'; // 导入 ref
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue'
import scheduleEdit from '../../components/schedule/schedule-edit.vue'
import apiTs from '../../utils/apiTs'
import { onLoad } from '@dcloudio/uni-app';
import {setStoredData, STORAGE_KEYS} from "../../utils/storageManager";
import DateUtils from "../../utils/util"; // 导入 onLoad 生命周期

// =============== 响应式数据 (使用 ref) ===============
const editingSchedule = ref({ itemType: 'schedule' }); // 初始化为一个带有 itemType 的对象
const buttons = ref([{ code: 'save', text: '保存' }]);
const currentMember = ref({});
const currentGroup = ref({});


// =============== 生命周期 ===============
onLoad((query) => {
  if (query.id) {
    buttons.value =  [{ code: 'delete', text: '删除' },{ code: 'save', text: '保存' }]
    loadSchedule(query.id);
  }else{
    let startTime;
    if (query.date && query.hour){
      startTime = DateUtils.getDateTime(query.date,query.hour);
    }else {
      startTime = new Date()
    }
    const date = new Date(startTime);
    date.setMinutes(date.getMinutes() + 45);
    editingSchedule.value.startTime = DateUtils.formatDateTime(startTime);
    editingSchedule.value.endTime = DateUtils.formatDateTime(date);

    editingSchedule.value.itemType = 'schedule';
    editingSchedule.value.extra = {};
  }
});


// =============== 方法 ===============
// 加载数据
async function loadSchedule(id) {
  try {
    const req = {
      id: id
    };
    // 假设 apiTs.schedule.info 返回一个符合 editingSchedule 结构的对象
    const scheduleData = await apiTs.schedule.info(req);
    // 更新 ref 的 value
    editingSchedule.value = scheduleData;
  } catch (error) {
    console.error('加载日程信息失败:', error);
    // 可以在这里添加用户提示，比如 uni.showToast
  }
}

const switchToTab = ()=>{
  const uri = '/pages/tabBar/schedule'
  setStoredData(STORAGE_KEYS.REFRESH_TAB,uri)
  uni.switchTab({
    url: uri // 确保路径正确
  });
}


const save = async () => {
  try {
    const req = {
      targetUserId: currentMember.value.userId,
      groupId: currentGroup.value.id,
      items: [editingSchedule.value] // 使用 .value 获取当前值
    };

    console.log('提交的数据:', editingSchedule.value);

    const res = await apiTs.schedule.save(req);

    if (res) {
      switchToTab();
      // 如果需要刷新，可以在 /pages/tabBar/schedule 页面的 onLoad 中检查来源或使用全局事件/状态
    } else {
      await uni.showToast({ title: '保存失败', icon: 'none' });
    }

  } catch (error) {
    console.error('保存失败:', error);
    // 可以添加错误提示逻辑
  }
}


const deleteItem = async () => {
  try {
    await apiTs.schedule.delete(editingSchedule.value.id);
    switchToTab();
  } catch (error) {
    console.error('删除失败:', error);
    // 可以添加错误提示逻辑
  }
}

// 处理底部按钮点击
async function handleButtonClick(buttonCode) {
  switch (buttonCode){
    case 'save':await save();return;
    case 'delete':await deleteItem();return;
  }
}

// 处理成员切换
function handleMemberChange(e) {
  currentMember.value = e.currentMember;
  currentGroup.value = e.currentGroup;
  console.log('当前成员:', currentMember.value, '当前群组:', currentGroup.value);
}
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
  margin-bottom: 60px;
}
</style>