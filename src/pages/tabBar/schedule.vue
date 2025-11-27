<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <schedule-content :dates="dates" :events="events" @eventClick="handleEventClick" />
    </view>

    <!-- 底部固定栏 -->
    <view class="bottom-bar">
      <schedule-bottom-bar add-button-text="事件" @add-click="handleAddClick" />
    </view>
  </view>
</template>

<script>
import apiTs from '../../utils/apiTs'
import DateUtils from '@/utils/util'; // 导入日期工具类

import scheduleBottomBar from '../../components/schedule-bottom-bar.vue'
import scheduleContent from '../../components/schedule/schedule-content.vue'
export default {
  components: {
    scheduleBottomBar,
    scheduleContent
  },
  data() {
    return {
      // 使用普通对象代替Map，确保Vue响应式正常工作
      events: {},
      currentMemberIndex: 0,
      currentMember: null,
      // 新日程表单数据
      newEventForm: {
        title: '',
        date: '',
        time: '',
        member: null
      },
      dates: []
    };
  },
  mounted() {
    this.fetchScheduleData();
    this.initDate();
  },
  onReady() {
  },
  methods: {
    initDate(){
      // 生成从周一到周日的日期数组，与dateFrom保持一致
      this.dates = DateUtils.getScheduleDates(new Date())
    },
    handleEventClick(event) {
      console.log('AAAAAa',event)
      // 跳转到日程编辑页面
      uni.navigateTo({
        url: `/pages/schedule/edit?id=${event.id}&title=${event.itemTitle}`
      });
    },
    // 处理成员切换
    handleMemberChange(e) {
      this.currentMemberIndex = e.currentMemberIndex;
      this.currentMember = e.currentMember;

      // 更新新日程表单中的成员信息
      if (this.currentMember) {
        this.newEventForm.member = this.currentMember;
      }
    },
    // 处理添加按钮点击
    handleAddClick() {
      // 跳转到日程编辑页面
      uni.navigateTo({
        url: '/pages/schedule/edit'
      });
    },
    // 获取日程数据
    async fetchScheduleData() {
      try {

        const requestData = {
          fromDate: DateUtils.getMondayStr(),
          toDate: DateUtils.getSundayStr(),
          userId: '1',
          groupId: '1'
        }

        // 修复5: 明确声明响应数据的类型
        const res  = await apiTs.schedule.list(requestData);
        const schedules = res || [];


        // 转换mock数据格式为对象形式，确保Vue响应式正常
        const formattedEvents = {};
        // 遍历数组形式的数据
        schedules.forEach((item) => {
          const date = item.date;
          const scheduleList = item.schedules || [];
          formattedEvents[date] = scheduleList;
        });

        this.events = formattedEvents;
      } catch (e) {
        console.error('获取日程信息失败:', e);
      }
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
  height: calc(100% - 60px);
  display: flex;
  flex-direction: column;
}
</style>