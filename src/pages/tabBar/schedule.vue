<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <schedule-content ref="schedule"
                        :event-list="events"
                        :share-mode="shareMode"
                        @eventClick="handleEventClick"
                        @selection-change="onSelectionChange"/>
    </view>

    <!-- 底部固定栏 -->
    <schedule-bottom-bar
        :buttons="buttons"
        :show-group-member="!shareMode"
        :top-side-config = "barTopSideConfig"
        @member-change="handleMemberChange"
        @buttonClick="handleButtonClick"/>
  </view>
</template>

<script>
import apiTs from '../../utils/apiTs'
import DateUtils from '../../utils/util'; // 导入日期工具类

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
      events: [],
      shareMode: false,
      currentGroup: {},
      currentMember: {},
      // 新日程表单数据
      newEventForm: {
        title: '',
        date: '',
        time: '',
        member: null
      },
      selectedCount: 0,
      totalEvents: 0,
      buttons: [{code: 'addEvent', text: '添加事件'}, {code: 'toShare', text: '分享'}],
      barTopSideConfig : {left:{text:'←上一周',code:'lastWeek'},center:{text:'',code:'date'},right:{text:'下一周→',code:'nextWeek'}},
      currentDate : new Date()
    };
  },
  onLoad(query) {
    if(query.refresh){
      this.fetchScheduleData();
    }
    this.initSideConfig()
  },
  computed: {},
  onShareAppMessage(res) {
    const uniqueById = (array) => {
      return [...new Map(array.map(item => [item.id, item])).values()];
    };

    // 只处理来自页面按钮的分享请求
    if (res.from !== 'button') {
      return false;
    }

    // 获取选中事件
    let selected = this.$refs.schedule?.getSelectedEventObjects?.() || [];
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
          await uni.showToast({title: '生成分享链接失败', icon: 'none'});
          resolve({});
        }
      } catch (err) {
        console.error('生成分享 token 失败:', err);
        await uni.showToast({title: '网络错误，请重试', icon: 'none'});
        resolve({});
      }
    });
  },
  mounted() {
    this.fetchScheduleData();
    // this.initDate();
  },
  onReady() {
  },
  methods: {
    handleEventClick(event) {
      // 跳转到日程编辑页面
      uni.navigateTo({
        url: `/pages/schedule/edit?id=${event.id}&title=${event.itemTitle}`
      });
    },
    initSideConfig(){
      this.barTopSideConfig.center.text = DateUtils.getDateStr(this.currentDate);
    },
    handleButtonClick(buttonCode) {
      console.log(buttonCode)
      if (buttonCode === 'addEvent') {
        this.handleAddClick();
      } else if (buttonCode === 'toShare') {
        this.enterShareMode()
      } else if (buttonCode === 'selectAll') {
        this.selectAll()
      } else if (buttonCode === 'toggleSelectAll') {
        this.toggleSelectAll()
      } else if (buttonCode === 'cancelShare') {
        this.exitShareMode()
      }else if (buttonCode === 'nextWeek') {
        this.currentDate = DateUtils.getDayOff(this.currentDate,7)
        this.handleCurrentDateChange()
      }else if (buttonCode === 'lastWeek') {
        this.currentDate = DateUtils.getDayOff(this.currentDate,-7)
        this.handleCurrentDateChange()
      }
    },
    handleCurrentDateChange(){
      this.initSideConfig();
      this.fetchScheduleData();
    },
    // 处理成员切换
    handleMemberChange(e) {
      this.currentMember = e.currentMember;
      this.currentGroup = e.currentGroup;
      console.log(this.currentGroup,this.currentMember)

      this.fetchScheduleData();
    },
    // 处理添加按钮点击
    handleAddClick() {
      // 跳转到日程编辑页面
      uni.navigateTo({
        url: '/pages/schedule/edit'
      });
    },
    onSelectionChange(keys) {
      this.selectedCount = keys.length;
    },
    enterShareMode() {
      this.buttons = [{code: 'cancelShare', text: '取消'}, {code: 'selectAll', text: '全选'}, {code: 'toggleSelectAll', text: '反选'}, {
        code: 'doShare',
        type: 'share',
        text: '去分享'
      }]
      this.shareMode = true;
      this.$nextTick(() => {
        this.totalEvents = this.$refs.schedule.getTotalEventCount();
      });
    },
    exitShareMode() {
      this.shareMode = false;
      this.buttons =  [{code: 'addEvent', text: '添加事件'}, {code: 'toShare', text: '分享'}]
    },
    selectAll() {
      this.$refs.schedule.selectAll();
    },
    toggleSelectAll() {
      this.$refs.schedule.toggleSelectAll();
    },
    // 获取日程数据
    async fetchScheduleData() {
      try {
        if(!this.currentMember || !this.currentMember.userId){
          return;
        }
        const requestData = {
          fromDate: DateUtils.getMondayStr(this.currentDate),
          toDate: DateUtils.getSundayStr(this.currentDate),
          userId: this.currentMember.userId,
          groupId: this.currentGroup.id
        }

        // 修复5: 明确声明响应数据的类型
        const res = await apiTs.schedule.list(requestData);
        this.events =  res || [];
      } catch (e) {
        console.error('获取日程信息失败:', e);
      }
    },
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
}
</style>