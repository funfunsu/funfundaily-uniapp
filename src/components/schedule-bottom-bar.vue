<template>
  <view class="bottom-bar">
    <view class="bottom-bar-content">
      <!-- 左侧：群组信息 + 成员选择器 -->
      <view class="left-section">
        <!-- 群组信息 -->
        <view class="group-info">
          <text class="member-name">
            {{ _currentGroup?.groupName}}
          </text>
        </view>

        <!-- 成员选择器 -->
        <view class="member-switcher">
          <picker
              @change="handleMemberChange"
              :value="displayMemberIndex"
              :range="displayUserList.map(u => u.nickname || '未知用户')"
          >
            <view class="member-selector">
              <text class="member-name">
                {{ displayMember?.nickname || '选择成员' }}
                <text class="arrow-icon">›</text>
              </text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 右侧：两个按钮（靠右） -->
      <view class="right-section">
        <button v-if="addButtonText" class="bottom-add-btn" @click="handleAddClick">
          <text class="add-text">{{ addButtonText || '添加日程' }}</text>
        </button>
        <button v-if="shareButtonText" class="bottom-add-btn" @click="handleShareClick">
          <text class="add-text">{{ shareButtonText || '分享' }}</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '../utils/apiTs'

// ===== Props 定义 =====
const props = defineProps({
  userList: { type: Array, default: () => [] },
  currentMemberIndex: { type: Number, default: 0 },
  currentMember: { type: Object, default: null },
  addButtonText: { type: String},
  shareButtonText: { type: String},
  autoLoadMembers: { type: Boolean, default: true }
})

// ===== Emits 定义 =====
const emit = defineEmits(['member-change', 'add-click', 'share-click', 'members-loaded'])

// ===== 响应式数据 =====
const _groupList = ref([])
const _userList = ref([])
const _currentMemberIndex = ref(0)
const _currentMember = ref(null)
const _currentGroup = ref(null)

// ===== 计算属性 =====
const displayUserList = computed(() => {
  return props.userList.length > 0 ? props.userList : _userList.value
})
const displayMemberIndex = computed(() => {
  if (props.userList.length > 0) {
    return Math.max(0, props.currentMemberIndex)
  }
  return _currentMemberIndex.value || 0
})

const displayMember = computed(() => {
  if (props.userList.length > 0) {
    if (props.currentMember) return props.currentMember
    if (props.userList[props.currentMemberIndex]) return props.userList[props.currentMemberIndex]
    return props.userList[0]
  }
  return _currentMember.value
})

// ===== 方法 =====
const fetchGroupMembers = async () => {
  try {
    const groupRes = await api.group.list()
    _groupList.value = groupRes || []

    if (_groupList.value.length > 0) {
      _currentGroup.value = _groupList.value[0]
      const res = await api.group.user.list({ groupId: _currentGroup.value.id })
      const members = res || []

      _userList.value = members
      if (members.length > 0) {
        _currentMemberIndex.value = 0
        _currentMember.value = members[0]
      } else {
        _currentMemberIndex.value = -1
        _currentMember.value = null
      }

      emit('members-loaded', {
        userList: _userList.value,
        currentMemberIndex: _currentMemberIndex.value,
        currentMember: _currentMember.value
      })
    }
  } catch (e) {
    console.error('获取群组成员失败:', e)
  }
}

const handleMemberChange = (e) => {
  const index = parseInt(e.detail.value, 10)
  const member = displayUserList.value[index] || null

  _currentMemberIndex.value = index
  _currentMember.value = member
  console.log("handleMemberChange",_currentMember)

  emit('member-change', {
    index,
    member,
    currentGroup: _currentGroup.value
  })
}

const handleAddClick = () => emit('add-click')
const handleShareClick = () => emit('share-click')

// ===== 生命周期 & Watchers =====
onMounted(() => {
  if (props.autoLoadMembers && props.userList.length === 0) {
    fetchGroupMembers()
  } else {
    _userList.value = [...props.userList]
    if (props.userList.length > 0) {
      const idx = Math.max(0, props.currentMemberIndex)
      _currentMemberIndex.value = idx
      _currentMember.value = props.currentMember || props.userList[idx] || props.userList[0]
    }
  }
})
//
// watch(
//     () => props.userList,
//     (newList) => {
//       if (Array.isArray(newList)) {
//         _userList.value = [...newList]
//         if (newList.length > 0) {
//           const idx = Math.max(0, props.currentMemberIndex)
//           _currentMemberIndex.value = idx
//           _currentMember.value = props.currentMember || newList[idx] || newList[0]
//         } else {
//           _currentMemberIndex.value = -1
//           _currentMember.value = null
//         }
//       }
//     },
//     { deep: true, immediate: true }
// )
//
// watch(
//     () => props.currentMember,
//     (newMember) => {
//       if (newMember) {
//         _currentMember.value = newMember
//         const index = displayUserList.value.findIndex(
//             u => (u.userId && u.userId === newMember.userId) || (u.id && u.id === newMember.id)
//         )
//         if (index >= 0) {
//           _currentMemberIndex.value = index
//         }
//       }
//     }
// )
</script>

<style scoped>
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  height: 60px;
  z-index: 100;
}

.bottom-bar-content {
  height: 100%;
  padding: 0 16px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  /* 不使用 justify-content，靠 margin-left: auto 实现右对齐 */
}

/* —————— 左侧区域 —————— */
.left-section {
  flex-shrink: 0; /* 不收缩 */
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0; /* 允许内部文本省略 */
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
  background-color: #f5f5f5;
  border-radius: 16px;
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
  background-color: #007aff;
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
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.3);
  flex-shrink: 0;
}

.bottom-add-btn::after {
  border: none;
}

.bottom-add-btn:active {
  transform: scale(0.97);
  box-shadow: 0 1px 3px rgba(0, 122, 255, 0.3);
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