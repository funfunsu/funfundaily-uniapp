<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <schedule-edit :schedule="editingSchedule" :schedule-type="'task'" />
    </view>
    <!-- 底部固定栏 -->
    <view class="bottom-bar">
      <schedule-bottom-bar @add-click="handleAddClick" add-button-text="保存" />
    </view>
  </view>
</template>

<script lang = "ts">
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue'
import scheduleEdit from '../../components/schedule/schedule-edit.vue'
import apiTs from '../../utils/apiTs'

import {
  Schedule,ScheduleInfoRequest,ScheduleAddRequest
} from '../../types/schedule'
import {
  ApiResponse
} from '../../types/type'
export default {
  name: 'edit-demo',
  components: {
    scheduleEdit,scheduleBottomBar
  },
  data() {
    return {
      editingSchedule: {}
    };
  },
  onLoad(query) {
    // 模拟数据加载
    this.loadSchedule(query.id);
  },
  methods: {
    // 加载模拟数据
    async loadSchedule(id) {
      const req :ScheduleInfoRequest = {
        id:id
      }
      const resp:Schedule = await apiTs.schedule.info(req)
      this.editingSchedule = resp
    },

    // 处理添加按钮点击
    handleAddClick() {
      const req:ScheduleAddRequest = {
        userId:"1",
        groupId:"1",
        items:[this.editingSchedule]
      }
      console.log('submit!', this.editingSchedule)
      const resp:ApiResponse<boolean>  = apiTs.schedule.add(req);
    },
  }
};
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
  height: calc(100% - 120px);
  display: flex;
  flex-direction: column;
}
</style>