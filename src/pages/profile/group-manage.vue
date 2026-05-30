<template>
  <view class="group-member">
    <view class="content">
      <view class="section group-section">
        <view class="member-item">
          <view class="member-avatar">
            <text>群</text>
          </view>
          <view class="member-info">
            <text class="member-name ">{{ currentGroup.groupName }}</text>
          </view>
          <view class="member-actions">
            <text class="action-btn invite-btn" @click="editGroup(currentGroup)">修改群组名</text>
          </view>
        </view>
      </view>
      <view class="section">
        <view class="member-list">
          <view class="member-item" v-for="(member, index) in members" :key="index">
            <view class="member-avatar">
              <text>{{ member.userInfo.nickname?.charAt(0) || 'U' }}</text>
            </view>
            <view class="member-info">
              <text class="member-name">{{ member.userInfo.nickname || '未知用户' }}
                <text v-if="member.userId === loginUser.id" class="owner-tag" >我</text>
                <text v-if="member.role === 'Creator'" class="owner-tag" >群主</text>
              </text>
              <text class="member-role">{{ member.role || '成员' }}</text>
            </view>
            <view class="member-actions">
              <!-- 非群主才显示操作按钮 -->
              <template v-if="isAdminRole(myRole)">
                <button
                    v-if="member.bindType === 'None' && member.userId !== loginUser.id"
                    class="action-btn invite-btn bind-share-btn"
                    open-type="share"
                    @click="prepareBindShare(member)">邀请绑定</button>
                <text
                    v-if="member.bindType === 'None' && member.userId !== loginUser.id"
                    class="action-btn edit-nick-btn"
                    @click="editMemberNickname(member)">改昵称</text>
                <template  v-if="member.role !== 'Creator'">
                  <text class="action-btn remove-btn" v-if="member.userId === loginUser.id" @click="removeMember(member.userId)">退出</text>
                  <text class="action-btn remove-btn" v-else @click="removeMember(member.userId)">移除</text>
                </template>
                <text class="action-btn set-role-btn" v-if="!isAdminRole(member.role) &  member.bindType !== 'None'" @click="setRole(member.userId,'Admin')">设为管理员</text>
              </template>
            </view>
          </view>
        </view>
      </view>

      <!-- 新增：两个并排按钮 -->
      <view class="action-buttons">
        <button class="btn add-btn" @click="addMember">添加成员</button>
        <button class="btn invite-link-btn" open-type="share" @click="prepareInviteShare">邀请加入</button>
      </view>
    </view>
  </view>
<!--  <share-card v-if="showShareModel" :fields="shareField"></share-card>-->
</template>

<script setup>
// --- 导入部分 ---
import {ref} from 'vue'; // computed 可能后面会用到
import {onLoad, onShareAppMessage} from '@dcloudio/uni-app'; // 导入 onShareAppMessage
import api from '../../utils/apiTs';
import {getStoredData, setStoredData, STORAGE_KEYS} from "../../utils/storageManager";
import scheduleBottomBar from "../../components/schedule-bottom-bar.vue";
import ShareCard from "../../components/share-card.vue";
import {getConstantType} from "@vue/compiler-core";

// --- 响应式状态 ---
const groupName = ref('加载中...');
const members = ref([]);
const currentGroupId = ref('');

// --- 新增：用于控制分享内容的状态 ---
const isSharingInvite = ref(false);
const shareGroupId = ref('');
const shareGroupName = ref('');
const currentGroup = ref({});
// 分享模式：'invite' = 邀请加入（创建新成员）；'bind' = 邀请绑定（把对方 openid 绑到占位成员）
const shareMode = ref('invite');
const bindTarget = ref(null);

const loginUser = ref({});
const myRole = ref('');

const buttons =ref([]);
const showShareModel =ref(false);
const shareField = ref([
  { key: 'title', label: '锄禾日当午' },
  { key: 'category', label: 'Category', type: 'select', options: [{ label: 'Option 1', value: 'opt1' }, { label: 'Option 2', value: 'opt2' }] }
])


// --- 生命周期 ---

// 页面加载时获取 groupId 参数
onLoad((query) => {
  console.log('onLoad query:', query);
  currentGroup.value = getStoredData(STORAGE_KEYS.CURRENT_GROUP);
  loginUser.value = getStoredData(STORAGE_KEYS.USER_INFO)

  loadMembers(currentGroup.value.id);
});



// --- 新增：配置微信小程序原生分享 ---
// #ifdef MP-WEIXIN
onShareAppMessage((res) => {
  console.log('onShareAppMessage triggered, res:', res);
  // res.from === 'menu' (右上角菜单) 或 'button' (open-type="share"的按钮)
  // res.target 是触发分享的来源信息

  if(!res.from === 'button'){
    return ;
  }

  const isBind = shareMode.value === 'bind' && bindTarget.value;
  const groupName = currentGroup.value.groupName;
  const shareTitle = `邀请您加入${groupName}`;

  let shareContent;
  let sceneCode;
  if (isBind) {
    sceneCode = 'member_bind';
    shareContent = JSON.stringify({
      groupId: currentGroup.value.id,
      groupName,
      targetUserId: String(bindTarget.value.userId),
      targetNickname: bindTarget.value.nickname || ''
    });
  } else {
    sceneCode = 'member_share';
    shareContent = JSON.stringify({
      groupId: currentGroup.value.id,
      groupName,
      role: 'Member',
      label: 'parents'
    });
  }

  // 返回 Promise，动态生成分享配置
  return new Promise(async (resolve) => {
    try {
      const resData = await api.share.create({
        content: shareContent,
        sceneCode
      });

      if (resData?.token) {
        resolve({
          title: shareTitle,
          path: `/pages/profile/share?token=${resData.token}`,
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
    } finally {
      // 一次分享结束后复位，避免下次默认携带上次的 bind 目标
      shareMode.value = 'invite';
      bindTarget.value = null;
    }
  });
});
// #endif

// --- 方法 ---

const isAdminRole = (role)=>{
  return role === 'Admin' | role === 'Creator';
}
const getMyRole = ()=>{
  // 使用 find 方法查找 userId 匹配 loginUser.value.id 的成员对象
  const myMemberInfo = members.value.find(item => item.userId === loginUser.value.id);

  // 如果找到了该成员，则返回其角色；否则返回默认值（例如 'guest' 或 undefined）
  // 这里假设 '成员' 是找不到时的默认角色，你可以根据需要更改
  return myMemberInfo ? myMemberInfo.role : 'Member';
}

const  editGroup = async (group) =>{
  // 编辑群组逻辑
  // 第一步：输入昵称
  uni.showModal({
    title: '修改群组',
    placeholderText: group.groupName,
    editable: true,
    success: async(res1) => {
      if (res1.confirm && res1.content.trim()) {
        const groupName = res1.content.trim()
        await api.group.modify({ id: group.id, groupName: groupName })
        currentGroup.value.groupName = groupName;
        await fetchGroupList();
      }
    },
    fail: () => {}
  })
}

const fetchGroupList = async ()=> {
  try {
    const groupList = await api.group.list();
    setStoredData(STORAGE_KEYS.GROUP_LIST,groupList)
  } catch (err) {
    console.error('获取群组列表失败', err)
  }
}

// 加载群成员
const loadMembers = async (groupId) => {
  try {
    await uni.showLoading({title: '加载中...'});
    // 假设 api.group.user.list 返回成员数组
    const res = await api.group.user.list({ groupId });
    members.value = res || [];
    myRole.value = getMyRole()
  } catch (error) {
    console.error('加载成员失败:', error);
    await uni.showToast({title: '加载失败', icon: 'none'});
  } finally {
    uni.hideLoading();
  }
};

const goBack = () => {
  uni.navigateBack();
};

// ========== 准备邀请分享（普通：创建新成员） ==========
const prepareInviteShare = () => {
  shareMode.value = 'invite';
  bindTarget.value = null;
};

// ========== 准备邀请绑定分享（把对方 openid 绑到该占位成员） ==========
const prepareBindShare = (member) => {
  shareMode.value = 'bind';
  bindTarget.value = {
    userId: member.userId,
    nickname: member.userInfo?.nickname || ''
  };
};

// ========== 群主/管理员修改未绑定成员昵称 ==========
const editMemberNickname = (member) => {
  const current = member.userInfo?.nickname || '';
  uni.showModal({
    title: '修改昵称',
    placeholderText: current || '请输入新昵称',
    editable: true,
    success: async (res) => {
      if (!res.confirm) return;
      const nickname = (res.content || '').trim();
      if (!nickname) {
        await uni.showToast({title: '昵称不能为空', icon: 'none'});
        return;
      }
      if (nickname === current) return;
      try {
        await api.user.updateMemberNickname({
          groupId: String(currentGroup.value.id),
          targetUserId: String(member.userId),
          nickname
        });
        await loadMembers(currentGroup.value.id);
        await uni.showToast({title: '修改成功', icon: 'success'});
      } catch (e) {
        console.error('修改昵称失败:', e);
        await uni.showToast({title: '修改失败', icon: 'none'});
      }
    }
  });
};

// ========== 添加成员（简易输入）==========
const addMember = async () => {
  uni.showModal({
    title: '添加成员',
    placeholderText: '请输入昵称',
    editable: true,
    success: async (res1) => {
      if (res1.confirm && res1.content.trim()) {
        const nickname = res1.content.trim();
        await api.group.user.add({ groupId: currentGroup.value.id, nickname: nickname });
        await loadMembers(currentGroup.value.id); // 重新加载列表
        await uni.showToast({title: '添加成功', icon: 'success'});
      }
    },
    fail: () => {}
  });
};

// ========== 邀请成员（重新发送邀请）==========
const inviteMember = (memberId) => {
  console.log('inviteMember',memberId)
};

// ========== 移除成员 ==========
const removeMember = (memberId) => {
  uni.showModal({
    title: '确认移除',
    content: '确定要移除该成员吗？',
    success: async (res) => {
      if (res.confirm) {
        // 实际调用移除接口 (模拟)
        await api.group.user.remove({groupId: currentGroup.value.id, userId:memberId})
        members.value = members.value.filter(m => m.userId !== memberId);
        await uni.showToast({title: '移除成功', icon: 'success'});
      }
    }
  });
};

// ========== 设为管理员 (示例方法) ==========
const setRole = (memberId,role) => {
  uni.showModal({
    title: '设置角色',
    content: '确认将该成员设为管理员吗？',
    success: async (res) => {
      if (res.confirm) {
        // 实际调用设置角色接口 (模拟)
        await api.group.user.update({groupId: currentGroup.value.id, userId:memberId, role: role})
        const member = members.value.find(m => m.id === memberId);
        if (member) {
          member.role = role; // 更新本地显示
        }
        await uni.showToast({title: '设置成功', icon: 'success'});
      }
    }
  });
};

// --- 暴露给模板 ---
// 注意：在 <script setup> 中，顶层定义的变量和函数会自动暴露给模板
// 所以不需要显式的 return
// 但如果需要暴露 ref 或特定计算属性，确保它们在顶层定义
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

.group-section{
  margin-bottom: 10px;
  border:solid;
  border-color: #007aff;
  font-weight: bold;
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

/* 邀请绑定按钮：原生 button 但保留药丸样式 */
.bind-share-btn {
  border: none;
  line-height: 1.4;
  min-height: auto;
  margin: 0;
}
.bind-share-btn::after {
  border: none;
}

.edit-nick-btn {
  color: #34c759;
  background-color: #e8f8ed;
}

.remove-btn {
  color: #ff3b30;
  background-color: #fff0f0;
}

.set-role-btn {
  color: #ff9800;
  background-color: #fff0f0;
}
.me{
  font-size: 13px;
  color: #007aff;
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