<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <schedule-edit :schedule="editingSchedule" :schedule-type="'task'" />
    </view>
    <!-- 底部固定栏 -->
    <view class="bottom-bar">
      <schedule-bottom-bar :buttons="buttons"
                           @member-change="handleMemberChange"
                           @buttonClick="handleButtonClick" />
    </view>
  </view>
</template>

<script lang = "ts">
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue'
import scheduleEdit from '../../components/schedule/schedule-edit.vue'
import apiTs from '../../utils/apiTs'

import {ScheduleAddRequest, ScheduleInfoRequest} from '../../types/schedule'

export default {
  name: 'edit-demo',
  components: {
    scheduleEdit,scheduleBottomBar
  },
  data() {
    return {
      editingSchedule: {itemType:'task'},
      buttons:[{code: 'save', text: '保存'}],
      currentMember:{},
      currentGroup:{}
    };
  },
  onLoad(query) {
    if(query.id){
      this.loadSchedule(query.id);
    }
  },
  methods: {
    // 加载模拟数据
    async loadSchedule(id) {
      const req :ScheduleInfoRequest = {
        id:id
      }
      this.editingSchedule = await apiTs.schedule.info(req)
    },

    async handleButtonClick(buttonCode) {
      if (buttonCode === 'save') {
        const req:ScheduleAddRequest = {
          targetUserId:"1",
          groupId:"1",
          items:[this.editingSchedule]
        }
        console.log('submit!', this.editingSchedule)
        await apiTs.schedule.add(req);
      }
    },
    async handleMemberChange(e) {
      this.currentMember = e.currentMember;
      this.currentGroup = e.currentGroup;
      console.log(this.currentGroup,this.currentMember)
    }
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