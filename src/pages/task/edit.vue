<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <task-edit :schedule="editingSchedule" />
    </view>
    <!-- 底部固定栏 -->
    <schedule-bottom-bar :buttons="buttons"
                         :is-tab-bar-page="false"
                         @member-change="handleMemberChange"
                         @buttonClick="handleButtonClick" />
  </view>
</template>
<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app'; // 引入 uni-app 的生命周期钩子
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue';
import taskEdit from '../../components/schedule/task-edit.vue';
import apiTs from '../../utils/apiTs';
import {setStoredData, STORAGE_KEYS} from "../../utils/storageManager";
import DateUtils from "../../utils/util";

// --- 数据定义 (使用 ref) ---
const editingSchedule = ref({ itemType: 'task' }); // 使用 ref 包裹对象使其具有响应性
const buttons = ref([{ code: 'save', text: '保存' }]);
const currentMember = ref({}); // 使用 ref
const currentGroup = ref({});  // 使用 ref

// --- 生命周期 ---
// onLoad 是 uni-app 特有的，需要从 @dcloudio/uni-app 导入
onLoad((query) => {
  if (query && query.id) {
    buttons.value =  [{ code: 'delete', text: '删除' },{ code: 'save', text: '保存' }]
    loadSchedule(query.id);
  }else{
    const date= new Date();
    editingSchedule.value.startTime = DateUtils.getDayStartTimeStr(date);
    editingSchedule.value.endTime = DateUtils.getDayEndTimeStr(date);
    editingSchedule.value.repeatStartDay = editingSchedule.value.startTime;
    editingSchedule.value.repeatEndDay = editingSchedule.value.endTime;
    editingSchedule.value.itemType = 'task';
    editingSchedule.value.extra = {score:1};
  }
});

// --- 方法定义 (async/await 语法保持不变) ---
const loadSchedule = async (id) => { // 移除了类型注解
  try {
    const req = { // 移除了类型注解
      id: id
    };
    // 因为 editingSchedule 是 ref，所以需要 .value 来访问/修改其内部值
    editingSchedule.value = await apiTs.schedule.info(req);
  } catch (error) {
    console.error('加载计划信息失败:', error);
    // 可以添加错误提示逻辑
  }
};

const switchToTab = ()=>{
  const uri = '/pages/tabBar/task'
  setStoredData(STORAGE_KEYS.REFRESH_TAB,uri)
  uni.switchTab({
    url: uri // 确保路径正确
  });
}

const save = async () => {
  try {
    const req = { // 移除了类型注解
      targetUserId: currentMember.value.userId, // 访问 ref 的值
      groupId: currentGroup.value.id,          // 访问 ref 的值
      items: [editingSchedule.value]           // 访问 ref 的值
    };
    console.log('submit!', editingSchedule.value);

    await apiTs.schedule.save(req);
    switchToTab();
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



  const handleButtonClick = async (buttonCode) => {
  switch (buttonCode){
    case 'save': await save();return;
    case 'delete':await deleteItem(); return;
  }
};

const handleMemberChange = (e) => { // 移除了类型注解
                                    // 修改 ref 的值需要 .value
  currentMember.value = e.currentMember;
  currentGroup.value = e.currentGroup;
  console.log(currentGroup.value, currentMember.value); // 访问 ref 的值
};

// --- 暴露给模板的数据和方法 ---
// 在 <script setup> 中，顶层定义的变量和函数会自动暴露给模板，无需 return
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