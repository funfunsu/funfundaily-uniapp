<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <schedule-edit :schedule="editingSchedule" :schedule-type="'schedule'" />
    </view>
    <!-- 底部固定栏 -->
    <schedule-bottom-bar :buttons="buttons"
                         :is-tab-bar-page="false"
                         @member-change="handleMemberChange"
                         @buttonClick="handleButtonClick" />
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
      editingSchedule: {itemType:'schedule'},
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
          targetUserId:this.currentMember.userId,
          groupId:this.currentGroup.id,
          items:[this.editingSchedule]
        }
        console.log('submit!', this.editingSchedule)
        const res = await apiTs.schedule.save(req);
        if(res){
          // 跳转到日程编辑页面
          await uni.switchTab({
            url: '/pages/tabBar/schedule?refresh=true' // 请确保此路径是你在 pages.json 中配置的 tabBar 页面路径
          });
        }
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