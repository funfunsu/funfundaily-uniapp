<template>
  <view class="bottom-bar-wrapper" :style="getBarStyle()">
  <view class="bottom-bar-inner" >

    <view class="bottom-bar-top" v-if="topSideConfig">
      <!-- 左侧：群组信息 + 成员选择器 -->
      <view class="left-section" @click="handleButtonClick(topSideConfig.left.code)" v-if="topSideConfig.left">
        <text class="nav-icon">{{topSideConfig.left.text}}</text>
      </view>
      <view class="center-section" @click="handleButtonClick(topSideConfig.center.code)" v-if="topSideConfig.center">
        {{topSideConfig.center.text}}
      </view>
      <!-- 右侧：两个按钮（靠右） -->
      <view class="right-section" v-if="topSideConfig.right">
        <text class="nav-icon" @click="handleButtonClick(topSideConfig.right.code)">{{topSideConfig.right.text}}</text>
      </view>
    </view>
    <view class="bottom-bar-content">
      <!-- 左侧：群组信息 + 成员选择器 -->
      <view class="left-section" >
        <!-- 群组信息 -->
        <view class="group-info" v-if="showGroup">
          <view class="member-switcher">
            <picker
                @change="handleGroupChange"
                :value="displayGroupIndex"
                :range="displayGroupList.map(u => u.groupName || '未知')"
            >
              <view class="member-selector">
                <text class="member-name">
                  {{ displayGroup?.groupName || '' }}
                  <text class="arrow-icon">›</text>
                </text>
              </view>
            </picker>
          </view>
        </view>

        <!-- 成员选择器 -->
        <view class="member-switcher" v-if="!showAllOfMine & showGroupMember" >
          <picker
              @change="handleMemberChange"
              :value="displayMemberIndex"
              :range="displayUserList.map(u => u.userInfo.nickname || '还没有设置昵称')"
          >
            <view class="member-selector">
              <text class="member-name" v-if="_loginUser?.id === displayMember?.userId">
                {{ '我' }}
                <text class="arrow-icon">›</text>
              </text>
              <text class="member-name" v-else>
                {{ displayMember?.userInfo.nickname || '还没有设置昵称' }}
                <text class="arrow-icon">›</text>
              </text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 右侧：两个按钮（靠右） -->
      <view class="right-section">
        <view v-for="item in buttons" >
          <button v-if="item.type === 'share'" open-type="share" class="bottom-add-btn">
            <text class="add-text" >{{ item.text || '-' }}</text>
          </button>
          <button v-if="item.type !== 'share'" class="bottom-add-btn" @click="handleButtonClick(item.code)">
            <text class="add-text" >{{ item.text || '-' }}</text>
          </button>
        </view>
      </view>
    </view>
  </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '../utils/apiTs'
// ===== 引入存储管理模块 =====
import { STORAGE_KEYS, getStoredData, setStoredData, removeStoredData } from '../utils/storageManager';

// ===== Props 定义 =====
const props = defineProps({
  userList: { type: Array, default: () => [] },
  currentMemberIndex: { type: Number, default: 0 },
  currentGroupIndex: { type: Number, default: 0 },
  currentMember: { type: Object, default: null },
  autoLoadMembers: { type: Boolean, default: true },
  buttons:{type: Array, default: () => []},
  topSideConfig:{type: Object, default: null },
  showGroup: { type: Boolean, default: true },
  showGroupMember: { type: Boolean, default: true },
  isTabBarPage: { type: Boolean, default: true },
  allSelectAllMember: { type: Boolean, default: false }
})

const loadAllOfMine = 'ALL_OF_MINE'

const showAllOfMine = ref(false);

//topSideConfig = {left:{text:'',code:''},center:{text:'',code:''},right:{text:'',code:''}}

// ===== Emits 定义 =====
const emit = defineEmits(['member-change', 'button-click', 'members-loaded'])

// ===== 响应式数据 =====
const _groupList = ref([])
const _userList = ref([])
const _currentMemberIndex = ref(0)
const _currentGroupIndex = ref(0)
const _currentMember = ref(null)
const _currentGroup = ref(null)
const _loginUser = ref(null)

// ===== 计算属性 =====
const displayUserList = computed(() => {
  if (props.userList.length > 0 ){
    return props.userList;
  }
  if (props.allSelectAllMember){
    return [{ userId: 'ALL', userInfo: { nickname: '全部' } }, ..._userList.value]
  }
  return _userList.value
})

const displayGroupList = computed(() => {
  if (_groupList.value.length >1 && props.allSelectAllMember){
    return [ ..._groupList.value,{ id: loadAllOfMine, groupName: '我所有的日程' }]
  }
  return _groupList.value
})

const displayMemberIndex = computed(() => {
  if (props.userList.length > 0) {
    return Math.max(0, props.currentMemberIndex)
  }
  return _currentMemberIndex.value || 0
})
const displayGroupIndex = computed(() => {
  if (props.userList.length > 0) {
    return Math.max(0, props.currentGroupIndex)
  }
  return _currentGroupIndex.value || 0
})

const displayMember = computed(() => {
  if (props.userList.length > 0) {
    if (props.currentMember) return props.currentMember
    if (props.userList[props.currentMemberIndex]) return props.userList[props.currentMemberIndex]
    return props.userList[0]
  }
  return _currentMember.value
})
const displayGroup = computed(() => {
  return _currentGroup.value
})

const fetchMembers = async () => {
  if (_currentGroup.value.id === loadAllOfMine){
    emit('member-change', {
      currentMember: _currentMember.value,
      currentGroup: _currentGroup.value
    })
    return
  }
  const res = await api.group.user.list({ groupId: _currentGroup.value.id })
  const members = res || []

  _userList.value = members

  setStoredData(STORAGE_KEYS.MEMBER_LIST,_userList.value)

  let memberToSet = null;
  if (members.length > 0) {
    // 尝试从存储恢复上次选中的 Member
    const storedCurrentMember = getStoredData(STORAGE_KEYS.CURRENT_MEMBER);
    if (storedCurrentMember && members.some(m => m.id === storedCurrentMember.id)) {
      memberToSet = storedCurrentMember;
    } else {
      memberToSet = members[0]; // 默认第一个
    }
    _currentMemberIndex.value = members.findIndex(m => m.id === memberToSet.id);
    _currentMember.value = memberToSet;

    // 更新存储
    setStoredData(STORAGE_KEYS.CURRENT_MEMBER, _currentMember.value);

  } else {
    _currentMemberIndex.value = -1;
    _currentMember.value = null;
    // 清除存储中的成员
    removeStoredData(STORAGE_KEYS.CURRENT_MEMBER);
  }

  emit('member-change', {
    currentMember: _currentMember.value,
    currentGroup: _currentGroup.value
  })

}

// ===== 方法 =====

/**
 * 从后端获取群组和成员列表，并更新本地存储
 */
const fetchGroupAndMembers = async () => {
  try {
    const groupRes = await api.group.list()
    _groupList.value = groupRes || []
    setStoredData(STORAGE_KEYS.GROUP_LIST, _groupList.value); // 更新存储

    if (_groupList.value.length > 0) {
      // 尝试从存储恢复上次选中的 Group
      const storedCurrentGroup = getStoredData(STORAGE_KEYS.CURRENT_GROUP);
      if (storedCurrentGroup && _groupList.value.some(g => g.id === storedCurrentGroup.id)) {
        _currentGroup.value = storedCurrentGroup;
      } else {
        _currentGroup.value = _groupList.value[0]; // 默认第一个
        setStoredData(STORAGE_KEYS.CURRENT_GROUP, _currentGroup.value); // 更新存储
      }
      await fetchMembers();
    }
  } catch (e) {
    console.error('[Component] 获取群组成员失败:', e)
  }
}


const handleGroupChange = async (e) => {

  const index = parseInt(e.detail.value, 10)
  const group = displayGroupList.value[index] || null
  if (group.id === loadAllOfMine){
    showAllOfMine.value = true;
  }else{
    showAllOfMine.value = false;
  }

  _currentGroupIndex.value = index
  _currentGroup.value = group

  // 更新本地存储
  if(group) {
    setStoredData(STORAGE_KEYS.CURRENT_GROUP, group);
  } else {
    removeStoredData(STORAGE_KEYS.CURRENT_GROUP);
  }
  await fetchMembers();
}

const getBarStyle = () => {
  let barHeight = 60;
  if (props.topSideConfig){
    barHeight = 100;
  }
  let bottom = 0;


  /* #ifdef H5 */
  /* 在 H5 平台，可能没有复杂的系统 UI 占据底部，
     或者为了在浏览器中调试时不被模拟器底部遮挡，
     你可以设置一个特定的值，甚至可能是 0。
     （注意：这只是为了 H5 调试方便，真机以 MP 为准） */
  bottom = '40px';
  /* #endif */

  if (!props.isTabBarPage){
    bottom = 0;
  }
  return {
    height: `${barHeight}px`,
    bottom: bottom
  };
}

/**
 * 处理成员选择变化
 */
const handleMemberChange = (e) => {
  const index = parseInt(e.detail.value, 10)
  const member = displayUserList.value[index] || null

  _currentMemberIndex.value = index
  _currentMember.value = member

  // 更新本地存储
  if(member) {
    setStoredData(STORAGE_KEYS.CURRENT_MEMBER, member);
  } else {
    removeStoredData(STORAGE_KEYS.CURRENT_MEMBER);
  }

  console.log("[Component] handleMemberChange", _currentMember.value)

  emit('member-change', {
    currentMember: member,
    currentGroup: _currentGroup.value
  })
}

/**
 * 处理按钮点击
 */
const handleButtonClick = (buttonCode) => emit('button-click', buttonCode)


// ===== 生命周期 & Watchers =====

/**
 * 组件挂载时初始化数据
 */
onMounted(() => {
  _loginUser.value = getStoredData(STORAGE_KEYS.USER_INFO)
  if (props.autoLoadMembers && props.userList.length === 0) {

    // 1. 首先尝试从本地存储加载基础数据
    const storedGroups = getStoredData(STORAGE_KEYS.GROUP_LIST);

    if (storedGroups && Array.isArray(storedGroups) && storedGroups.length > 0) {
      _groupList.value = storedGroups;

      const storedCurrentGroup = getStoredData(STORAGE_KEYS.CURRENT_GROUP);
      if(storedCurrentGroup && storedGroups.some(g => g.id === storedCurrentGroup.id)) {
        _currentGroup.value = storedCurrentGroup;

        // 如果有缓存的 Group，可以立即加载其成员列表
        api.group.user.list({ groupId: _currentGroup.value.id }).then(res => {
          const members = res || [];
          _userList.value = members;

          const storedCurrentMember = getStoredData(STORAGE_KEYS.CURRENT_MEMBER);
          if(storedCurrentMember && members.some(m => m.userId === storedCurrentMember.userId)) {
            _currentMember.value = storedCurrentMember;
            _currentMemberIndex.value = members.findIndex(m => m.userId === storedCurrentMember.userId);
          } else if(members.length > 0) {
            _currentMember.value = members[0];
            _currentMemberIndex.value = 0;
            // 更新存储为默认选中的成员
            setStoredData(STORAGE_KEYS.CURRENT_MEMBER, _currentMember.value);
          } else {
            _currentMember.value = null;
            _currentMemberIndex.value = -1;
            removeStoredData(STORAGE_KEYS.CURRENT_MEMBER);
          }
          // 触发一次初始的 member-change 事件，通知父组件当前状态
          emit('member-change', {
            currentMember: _currentMember.value,
            currentGroup: _currentGroup.value
          });
        }).catch(err => {
          console.error("[Component] 加载缓存群组的成员失败:", err);
          fetchGroupAndMembers();
        });

      } else {
        fetchGroupAndMembers();
      }

    } else {
      fetchGroupAndMembers();
    }

  } else {
    _userList.value = [...props.userList]
    if (props.userList.length > 0) {
      const idx = Math.max(0, props.currentMemberIndex)
      _currentMemberIndex.value = idx
      _currentMember.value = props.currentMember || props.userList[idx] || props.userList[0]
    }
  }
})

// ===== 可选：监听 _currentGroup 变化并更新存储 =====
watch(_currentGroup, (newGroup) => {
  if(newGroup) {
    setStoredData(STORAGE_KEYS.CURRENT_GROUP, newGroup);
  } else {
    removeStoredData(STORAGE_KEYS.CURRENT_GROUP);
  }
});

// ===== 可选：监听 _groupList 变化并更新存储 =====
watch(_groupList, (newList) => {
  setStoredData(STORAGE_KEYS.GROUP_LIST, newList);
}, { deep: true });

</script>

<style scoped>
/* 主题色可被页面覆盖（在底栏的父节点上定义即可，默认沿用品牌蓝）：
 *   --bar-accent         按钮背景 / 顶部条文字色
 *   --bar-accent-shadow  按钮投影色
 * 例：戒断页 .page { --bar-accent:#10b981; --bar-accent-shadow:rgba(16,185,129,.3); } */
.bottom-bar-wrapper {
  position: fixed;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  z-index: 100;
  background: transparent; /* 背景交给内部元素 */
  box-sizing: border-box;
}

/* --- Inner: 包含你的原始内容 --- */
.bottom-bar-inner {
  flex-shrink: 0; /* 防止被压缩 */
  display: flex;
  flex-direction: column;
  border-top-left-radius: 10px; /* 示例圆角 */
  border-top-right-radius: 10px;
}

.bottom-bar-top {
  height: 40px;
  display: flex;          /* 设置为 Flex 容器 */
  align-items: center;    /* 垂直居中 */
  /* justify-content: space-between; */ /* 移除这个 */
  box-sizing: border-box;
  background-color: rgba(255, 255, 255, 0.6);
  width: 100%;
  padding-left: 16px;    /* 控制内容与边界距离 */
  padding-right: 16px;
  gap: 10px;
  color: var(--bar-accent, #007aff);
}

.bottom-bar-content {
  height: 60px;
  padding: 0 16px;
  padding-bottom: 15px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  background: #ffffff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

/* —————— 左侧区域 —————— */
.left-section {
  flex-shrink: 0; /* 不收缩 */
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0; /* 允许内部文本省略 */
}

.center-section {
  text-align: center;    /* 关键：让内部内容（文字）在此区域内居中 */
  flex: 1;               /* 关键：占据所有可用的剩余空间 */
  min-width: 0;          /* 允许内部文本溢出时被省略 */
}

.group-info {
  white-space: nowrap;
}

.group-name {
  font-size: 15px;
  color: #333;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 60px;   /* 防止过窄 */
  max-width: 120px;  /* 防止过长撑开布局 */
}

.member-switcher {
  min-width: 80px;   /* 保证可点击区域 */
  max-width: 140px;
}

.member-selector {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  height: 32px;
  font-size: 13px;
  width: 100%;
}

.member-name {
  color: #333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.arrow-icon {
  font-size: 16px;
  color: #666;
  margin-left: 4px;
}

.member-selector:active {
  background-color: #e9e9e9;
}

/* —————— 右侧区域 —————— */
.right-section {
  margin-left: auto;     /* 👈 关键：推到最右边 */
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;        /* 按钮不被压缩 */
}

.bottom-add-btn {
  background-color: var(--bar-accent, #007aff);
  color: #fff;
  border-radius: 20px;
  font-size: 13px;
  padding: 0 16px;
  height: 32px;
  line-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 2px 6px var(--bar-accent-shadow, rgba(0, 122, 255, 0.3));
  flex-shrink: 0;
}

.bottom-add-btn::after {
  border: none;
}

.bottom-add-btn:active {
  transform: scale(0.97);
  box-shadow: 0 1px 3px var(--bar-accent-shadow, rgba(0, 122, 255, 0.3));
}

.add-icon {
  font-size: 16px;
  font-weight: bold;
  margin-right: 4px;
}

.add-text {
  font-weight: 500;
}


</style>