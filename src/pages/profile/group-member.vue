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
<!--                <button class="action-btn invite-btn" v-if="member.bindType === 'None'" open-type="share">邀请绑定</button>-->
                <text class="action-btn remove-btn" v-if="member.role !== 'Creator'" @click="removeMember(member.userId)">移除</text>
                <text class="action-btn set-role-btn" v-if="!isAdminRole(member.role) &  member.bindType !== 'None'" @click="setAdmin(member.userId)">设为管理员</text>
              </template>
            </view>
          </view>
        </view>
      </view>

      <!-- 新增：两个并排按钮 -->
      <view class="action-buttons">
        <button class="btn add-btn" @click="addMember">添加成员</button>
        <button class="btn invite-link-btn"  open-type="share">邀请加入</button>
      </view>
    </view>
  </view>
</template>

<script setup>
// --- 导入部分 ---
import {ref} from 'vue'; // computed 可能后面会用到
import {onLoad, onShareAppMessage} from '@dcloudio/uni-app'; // 导入 onShareAppMessage
import api from '../../utils/apiTs';
import {getStoredData, setStoredData, STORAGE_KEYS} from "../../utils/storageManager";
import scheduleBottomBar from "../../components/schedule-bottom-bar.vue";

// --- 响应式状态 ---
const groupName = ref('加载中...');
const members = ref([]);
const currentGroupId = ref('');

// --- 新增：用于控制分享内容的状态 ---
const isSharingInvite = ref(false);
const shareGroupId = ref('');
const shareGroupName = ref('');
const currentGroup = ref({});

const loginUser = ref({});
const myRole = ref('');

const buttons =ref([]);



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

  const shareData = {
    groupId:currentGroup.value.id,
    groupName:currentGroup.value.groupName,
    role:'member',
    label:'parents'
  }

  const shareContent = JSON.stringify(shareData);
  const shareTitle = `邀请您加入${currentGroup.value.groupName}`;


  // 返回 Promise，动态生成分享配置
  return new Promise(async (resolve) => {
    try {
      const resData = await api.share.create({
        content: shareContent,
        sceneCode: 'member_share'
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
  return myMemberInfo ? myMemberInfo.role : 'member';
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

// ========== 新增：准备邀请分享 ==========
const prepareInviteShare = () => {
  uni.showModal({
    title: '邀请加入',
    content: '将生成群邀请卡片，您可以发送给好友。',
    showCancel: false, // 只显示确定按钮，因为点击按钮本身就是要分享
    confirmText: '知道了', // 或者 '去分享'
    success: (res) => {
      if (res.confirm) {
        // --- 关键步骤：设置分享标志和数据 ---
        isSharingInvite.value = true;
        shareGroupId.value = currentGroupId.value;
        shareGroupName.value = groupName.value;

        // --- 可选：提示用户去点击分享 ---
        // 由于使用了 open-type="share"，点击按钮就会直接触发分享菜单
        // 但如果想更明确，可以加个提示 (虽然通常不需要)
        // uni.showToast({ title: '请点击弹出的菜单进行分享', icon: 'none', duration: 2000 });

        // --- 可选：主动调用 wx.showShareMenu (增强兼容性或定制菜单) ---
        // #ifdef MP-WEIXIN
        if (typeof wx !== 'undefined' && wx.showShareMenu) {
          wx.showShareMenu({
            withShareTicket: false, // 是否获取转发详情 (群信息等)，一般设为 false
            menus: ['shareAppMessage', 'shareTimeline'] // 显示的菜单项
          });
        }
        // #endif
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
        try {
          await api.group.user.add({ groupId: currentGroup.value.id, nickname: nickname });
          await loadMembers(currentGroup.value.id); // 重新加载列表
          uni.showToast({ title: '添加成功', icon: 'success' });
        } catch (err) {
          console.error('添加成员失败:', err);
          uni.showToast({ title: '添加失败', icon: 'none' });
        }
      }
    },
    fail: () => {}
  });
};

// ========== 邀请成员（重新发送邀请）==========
const inviteMember = (memberId) => {
  console.log('inviteMember',memberId)
};
const setAdmin = (memberId) => {
  console.log('setAdmin',memberId)
  uni.showModal({
    title: '设置管理员',
    content: '确定要设置成管理员吗？',
    success: async (res) => {
      if (res.confirm) {
        // 实际调用移除接口 (模拟)
        await api.group.user.remove({groupId: currentGroupId.value, memberId})
        await uni.showToast({title: '移除成功', icon: 'success'});
      }
    }
  });
};

// ========== 移除成员 ==========
const removeMember = (memberId) => {
  uni.showModal({
    title: '确认移除',
    content: '确定要移除该成员吗？',
    success: async (res) => {
      if (res.confirm) {
        // 实际调用移除接口 (模拟)
        await api.group.user.remove({groupId: currentGroup.value.id, memberId})
        members.value = members.value.filter(m => m.id !== memberId);
        await uni.showToast({title: '移除成功', icon: 'success'});
      }
    }
  });
};

// ========== 设为管理员 (示例方法) ==========
const setRole = (memberId) => {
  uni.showModal({
    title: '设置角色',
    content: '确认将该成员设为管理员吗？',
    success: (res) => {
      if (res.confirm) {
        // 实际调用设置角色接口 (模拟)
        // await api.group.setUserRole({ groupId: currentGroupId.value, memberId, role: 'admin' })
        const member = members.value.find(m => m.id === memberId);
        if (member) {
          member.role = '管理员'; // 更新本地显示
        }
        uni.showToast({ title: '设置成功', icon: 'success' });
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