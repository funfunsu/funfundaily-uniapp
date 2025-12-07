<template>
  <view class="page-container">
    <view class="page-content-container">
      <!-- 引入schedule-content组件 -->
      <schedule-content ref="schedule"
                        :dates="dates" :eventList="events"
                        @eventClick="handleEventClick"
                        @selection-change="onSelectionChange"/>
    </view>

    <!-- 底部固定栏 -->
    <view class="bottom-bar" v-if="isLoginSuccessful">
      <schedule-bottom-bar
          :buttons="buttons"
          @member-change="handleMemberChange"
          @buttonClick="handleButtonClick"/>
    </view>
  </view>
</template>

<script lang="ts">
import operationBottomBar from '../../components/operation-bottom-bar.vue'
import ScheduleBottomBar from '../../components/schedule-bottom-bar.vue'
import scheduleContent from "../../components/schedule/schedule-content.vue";
import apiTs from '../../utils/apiTs'
import { autoLogin } from '../../utils/auth'
import {getShareToken, removeShareToken, setShareToken} from '../../utils/token'

import {
  ScheduleAddRequest, ScheduleCopyRequest
} from '../../types/schedule'
import {ApiResponse} from "../../types/type";
import {normalizeUniAppXAppConfig} from "@dcloudio/uni-cli-shared";


export default {
  name: 'ShareDemo', // PascalCase 推荐
  components: {
    scheduleContent,
    ScheduleBottomBar
    // scheduleEdit 在模板中未使用，可移除
  },
  data() {
    return {
      events: {}, // 存储日期 -> 事件列表 的映射
      dates: [],  // 从 events 的 key 中提取并排序
      selectedCount: 0,
      totalEvents: 0,
      buttons: [{code: 'copy', text: '添加到日程'},{code: 'copyToNewMember', text: '添加到新成员的日程'}],
      isLoginSuccessful : false,
      currentMember : null,
      currentGroup : null
    };
  },

  async onLoad(query) {
    console.log("🚀 页面 onLoad 参数:", query);
    if (query.token) {
      setShareToken(query.token)
      try {
        // 等待 autoLogin 完成
        const loginToken = await autoLogin(query.token);
        console.log("✅ 自动登录成功, 获取到 token:", loginToken);
        this.isLoginSuccessful = true;
      } catch (loginError) {
        // 处理自动登录失败
        uni.showToast({
          title: "自动登录失败，请尝试手动登录", // 更具体的提示
          icon: "none",
          duration: 3000 // 稍长一些的显示时间
        });
      }
      if (this.isLoginSuccessful) {
        // 如果必须登录：
        console.log("➡️ 准备获取分享内容...");
        await this.fetchSharedContent(query.token);
      } else {
        console.log("🛑 由于未登录，暂不加载需要登录的分享内容。");
      }
    } else {
      console.warn("⚠️ 缺少分享令牌");
      uni.showToast({ title: "缺少分享令牌", icon: "none" });
    }
  },

  methods: {

    // 处理成员切换
    handleMemberChange(e) {
      this.currentMember = e.currentMember;
      this.currentGroup = e.currentGroup;
      console.log(this.currentGroup,this.currentMember)
    },
    handleEventClick(event) {
      // 可根据需要处理点击事件
      console.log("📅 点击了事件:", event);
    },

    onSelectionChange(selectedEvents) {
      this.selectedCount = selectedEvents.length;
      console.log("✅ 选中事件数量变化:", this.selectedCount);
    },

    async handleButtonClick(buttonCode) {

      if (buttonCode === 'copy') {
        const groupList = await apiTs.group.list()
        const selectedGroup = groupList[0];
        //todo 如果groupList 不止一个需要用户选择哪一个

        const members = await apiTs.group.user.list({ groupId: selectedGroup.id })
        //todo members 不止一个需要用户选择哪一个
        const selectedMember = members[0];

        const req: ScheduleCopyRequest = {
          targetUserId: selectedMember.id,
          groupId: selectedGroup.id,
          shareToken: getShareToken()
        }
        const resp: ApiResponse<boolean> = await apiTs.schedule.copy(req);
        if (resp){
          removeShareToken()
          await uni.switchTab({
            url: '/pages/tabBar/schedule'
          });
        }
      }else if(buttonCode === 'copyToNewMember') {
        // 第一步：输入昵称
        uni.showModal({
          title: '添加新成员',
          placeholderText: '请输入昵称',
          editable: true,
          success: async(res1) => {
            if (res1.confirm && res1.content.trim()) {
              const nickname = res1.content.trim()
              const userResp = await apiTs.group.user.add({ groupId: this.currentGroup.id, nickname: nickname })
              const req: ScheduleCopyRequest = {
                targetUserId: userResp.userId,
                groupId: this.currentGroup.id,
                shareToken: getShareToken()
              }
              const resp: ApiResponse<boolean> = await apiTs.schedule.copy(req);
              if (resp){
                removeShareToken()
                await uni.switchTab({
                  url: '/pages/tabBar/schedule'
                });
              }
            }
          },
          fail: () => {}
        })
      }
    },

    async fetchSharedContent(token) {
      uni.showLoading({ title: "加载中..." });
      try {
        // 1. 调用后端接口获取分享内容
        const response = await apiTs.share.getContent(token);
        console.log(response)
        // 2. 假设后端返回结构为 { events: [...] }
        // 其中每个 event 包含 date 字段
        this.events = response || [];
        this.totalEvents = this.events.length;

        console.log("✅ 分享内容加载完成:", {
          events: this.events,
          dates: this.dates,
          total: this.totalEvents
        });

      } catch (err) {
        console.error("❌ 获取分享内容失败:", err);
        uni.showToast({
          title: "加载失败，请稍后重试",
          icon: "none"
        });
      } finally {
        uni.hideLoading();
      }
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
  height: calc(100% - 60px);
  display: flex;
  flex-direction: column;
}
</style>