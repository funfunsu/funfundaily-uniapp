<template>
  <view class="group-member">
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text>返回</text>
      </view>
      <view class="title">{{ groupName }}({{ members.length }})</view>
      <view class="placeholder"></view>
    </view>

    <view class="content">
      <view class="section">
        <view class="member-list">
          <view class="member-item" v-for="(member, index) in members" :key="index">
            <view class="member-avatar">
              <text>{{ member.name?.charAt(0) || 'U' }}</text>
            </view>
            <view class="member-info">
              <text class="member-name">{{ member.nickname || '未知用户' }}</text>
              <text class="member-role">{{ member.role || '成员' }}</text>
            </view>
            <view class="member-actions">
              <!-- 非群主才显示操作按钮 -->
              <template v-if="!member.isOwner">
                <text class="action-btn invite-btn" @click="inviteMember(member.id)">邀请</text>
                <text class="action-btn remove-btn" @click="removeMember(member.id)">移除</text>
                <text class="action-btn set-role-btn" @click="removeMember(member.id)">设为管理员</text>
              </template>
              <!-- 群主显示标签 -->
              <text v-else class="owner-tag">群主</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 新增：两个并排按钮 -->
      <view class="action-buttons">
        <button class="btn add-btn" @click="addMember">添加成员</button>
        <button class="btn invite-link-btn" @click="inviteToJoin">邀请加入</button>
      </view>
    </view>
  </view>
</template>

<script>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import api from '../../utils/apiTs'

export default {
  name: 'GroupMember',
  setup() {
    const groupName = ref('加载中...')
    const members = ref([])
    const currentGroupId = ref('')

    // 页面加载时获取 groupId 参数
    onLoad((query) => {
      console.log('onLoad query:', query)
      if (query.groupId) {
        currentGroupId.value = query.groupId
        groupName.value = query.groupName || '未命名群组'
        loadMembers(currentGroupId.value)
      } else {
        uni.showToast({ title: '缺少群组ID', icon: 'none' })
        goBack()
      }
    })

    // 加载群成员
    const loadMembers = async (groupId) => {
      try {
        uni.showLoading({ title: '加载中...' })
        const res = await api.group.user.list({ groupId })
        // 假设后端返回格式：{ groupName: 'xxx', members: [...] }
        members.value = res || []
      } catch (error) {
        console.error('加载成员失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }

    const goBack = () => {
      uni.navigateBack()
    }

    // ========== 新增：添加成员（简易输入）==========
    const addMember = async () => {
      // 第一步：输入昵称
      uni.showModal({
        title: '添加成员',
        placeholderText: '请输入昵称',
        editable: true,
        success: async(res1) => {
          if (res1.confirm && res1.content.trim()) {
            const nickname = res1.content.trim()
            await api.group.user.add({ groupId: currentGroupId.value, nickname: nickname })
            await loadMembers(currentGroupId.value)
          }
        },
        fail: () => {}
      })
    }

    // ========== 新增：邀请加入（微信分享）==========
    const inviteToJoin = () => {
      uni.showModal({
        title: '邀请加入',
        content: '将生成群邀请链接并通过微信分享给好友，是否继续？',
        success: (res) => {
          if (res.confirm) {
            // 调用微信分享（需配置 share 分享参数）
            uni.share({
              provider: 'weixin',
              scene: 'WXSceneSession', // 聊天界面
              type: 0,
              href: `https://yourdomain.com/join?groupId=${currentGroupId.value}`, // 替换为你的邀请链接
              title: `邀请您加入群组「${groupName.value}」`,
              summary: '点击链接即可加入',
              success: () => {
                console.log('分享成功')
              },
              fail: (err) => {
                console.error('分享失败', err)
                uni.showToast({ title: '分享失败', icon: 'none' })
              }
            })
          }
        }
      })
    }

    const inviteMember = (memberId) => {
      uni.showModal({
        title: '确认邀请',
        content: '是否重新发送邀请？',
        success: (res) => {
          if (res.confirm) {
            // 实际调用邀请接口
            // await api.group.invite({ groupId: currentGroupId.value, memberId })
            uni.showToast({ title: '邀请已发送', icon: 'success' })
          }
        }
      })
    }

    const removeMember = (memberId) => {
      uni.showModal({
        title: '确认移除',
        content: '确定要移除该成员吗？',
        success: (res) => {
          if (res.confirm) {
            // 实际调用移除接口
            // await api.group.removeMember({ groupId: currentGroupId.value, memberId })
            members.value = members.value.filter(m => m.id !== memberId)
            uni.showToast({ title: '移除成功', icon: 'success' })
          }
        }
      })
    }

    return {
      groupName,
      members,
      goBack,
      addMember,
      inviteMember,
      inviteToJoin, // 新增
      removeMember
    }
  }
}
</script>

<style scoped>
.group-member {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
}

.back-btn,
.placeholder {
  width: 60px;
}

.back-btn {
  text-align: left;
  color: #007aff;
  font-size: 16px;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.section {
  background-color: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.member-list {
}

.member-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.member-item:last-child {
  border-bottom: none;
}

.member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: #007aff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 12px;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 15px;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 13px;
  color: #999;
}

/* ===== 操作区域 ===== */
.member-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 110px;
  justify-content: flex-end;
}

.action-btn {
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 14px;
  text-align: center;
  white-space: nowrap;
  user-select: none;
}

.invite-btn {
  color: #007aff;
  background-color: #e6f0ff;
}

.remove-btn {
  color: #ff3b30;
  background-color: #fff0f0;
}

.set-role-btn {
  color: #ff9800;
  background-color: #fff0f0;
}

.owner-tag {
  font-size: 12px;
  color: #007aff;
  background-color: #e3f2fd;
  padding: 2px 10px;
  border-radius: 12px;
  white-space: nowrap;
}

.action-buttons {
   display: flex;
   justify-content: center;
   gap: 16px;
   margin-top: 24px;
   padding: 0 16px;
 }

.action-buttons .btn {
  flex: 1;
  max-width: 180px;
  height: 44px;
  line-height: 44px;
  font-size: 15px;
  border-radius: 22px;
  color: #fff;
}

.add-btn {
  background-color: #007aff;
  border-color: #007aff;
}

.invite-link-btn {
  background-color: #4cd964;
  border-color: #4cd964;
}
</style>