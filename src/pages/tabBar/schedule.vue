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
    <view class="bottom-bar">
      <schedule-bottom-bar
          :buttons="buttons"
          @member-change="handleMemberChange"
          @buttonClick="handleButtonClick"/>
    </view>
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
      events: {},
      shareMode: false,
      currentGroup: null,
      currentMember: null,
      // 新日程表单数据
      newEventForm: {
        title: '',
        date: '',
        time: '',
        member: null
      },
      selectedCount: 0,
      totalEvents: 0,
      buttons: [{code: 'addEvent', text: '添加事件'}, {code: 'toShare', text: '分享'}]
    };
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
    handleButtonClick(buttonCode) {
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
      }
    },
    // 处理成员切换
    handleMemberChange(e) {
      debugger
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
    clearSelection() {
      this.$refs.schedule.clearSelection();
    },
    // 获取日程数据
    async fetchScheduleData() {
      try {
        const requestData = {
          fromDate: DateUtils.getMondayStr(),
          toDate: DateUtils.getSundayStr(),
          userId: this.currentMember.id,
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