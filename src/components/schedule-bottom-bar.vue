<template>
  <view class="bottom-bar">
    <view class="bottom-bar-content uni-flex uni-row">
      <!-- 群组信息 -->
      <view class="group-info">
        <view class="group-name">{{ _currentGroup?.groupName || 'VV家庭' }}</view>
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
              {{ displayMember ? (displayMember.nickname || '未知用户') : '选择成员' }}
              <text class="arrow-icon">›</text>
            </text>
          </view>
        </picker>
      </view>

      <!-- 添加事件按钮 -->
      <button class="bottom-add-btn uni-flex uni-row" @click="handleAddClick">
        <text class="add-icon">+</text>
        <text class="add-text">{{ addButtonText || '添加日程' }}</text>
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '../utils/apiTs'

// ===== Props 定义 =====
const props = defineProps({
  groupName: { type: String, default: 'VV家庭' },
  userList: { type: Array, default: () => [] },
  currentMemberIndex: { type: Number, default: 0 },
  currentMember: { type: Object, default: null },
  addButtonText: { type: String, default: '添加日程' },
  autoLoadMembers: { type: Boolean, default: true }
})

// ===== Emits 定义 =====
const emit = defineEmits(['member-change', 'add-click', 'members-loaded'])

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
  if (props.currentMemberIndex >= 0 && props.userList.length > 0) {
    return props.currentMemberIndex
  }
  return _currentMemberIndex.value
})

const displayMember = computed(() => {
  return props.currentMember || _currentMember.value
})

// ===== 方法 =====
const fetchGroupMembers = async () => {
  try {
    const groupRes = await api.group.list()
    _groupList.value = groupRes || []

    // 修复：使用 _groupList.value 而非未定义的 groups
    if (_groupList.value.length > 0) {
      _currentGroup.value = _groupList.value[0]
      const requestData = { groupId: _currentGroup.value.id } // 修正拼写：grouId → groupId
      const res = await api.group.user.list(requestData)
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
  const index = e.detail.value
  _currentMemberIndex.value = index
  _currentMember.value = displayUserList.value[index] || null

  emit('member-change', {
    ...e,
    currentGroup: _currentGroup.value,
    currentMemberIndex: index,
    currentMember: _currentMember.value
  })
}

const handleAddClick = () => {
  emit('add-click')
}

// ===== 生命周期 & Watchers =====
onMounted(() => {
  if (props.autoLoadMembers && props.userList.length === 0) {
    fetchGroupMembers()
  } else if (props.userList.length > 0) {
    _userList.value = [...props.userList]
    _currentMemberIndex.value = props.currentMemberIndex || 0
    _currentMember.value = props.currentMember || props.userList[_currentMemberIndex.value] || null
  }
})

// 监听 userList 变化
watch(
    () => props.userList,
    (newList) => {
      if (newList && newList.length > 0) {
        _userList.value = [...newList]
        if (props.currentMember) {
          _currentMember.value = props.currentMember
        } else if (props.currentMemberIndex >= 0 && newList[props.currentMemberIndex]) {
          _currentMember.value = newList[props.currentMemberIndex]
          _currentMemberIndex.value = props.currentMemberIndex
        } else if (newList[0]) {
          _currentMember.value = newList[0]
          _currentMemberIndex.value = 0
        }
      }
    },
    { deep: true }
)

// 监听 currentMemberIndex 变化
watch(
    () => props.currentMemberIndex,
    (newIndex) => {
      if (newIndex >= 0 && displayUserList.value[newIndex]) {
        _currentMemberIndex.value = newIndex
        _currentMember.value = displayUserList.value[newIndex]
      }
    }
)

// 监听 currentMember 变化
watch(
    () => props.currentMember,
    (newMember) => {
      if (newMember) {
        _currentMember.value = newMember
        const index = displayUserList.value.findIndex(
            u => u.userId === newMember.userId || u.id === newMember.id
        )
        if (index >= 0) {
          _currentMemberIndex.value = index
        }
      }
    }
)
</script>

<style scoped>
/* 样式保持不变 */
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  height: 60px;
  z-index: 100;
  width: auto;
  box-sizing: border-box;
}

.bottom-bar-content {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 16px;
  box-sizing: border-box;
  max-width: 100%;
  gap: 12px;
}

.group-info {
  display: flex;
  align-items: center;
  flex-shrink: 1;
  min-width: 0;
}

.group-name {
  font-size: 15px;
  color: #333;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-switcher {
  flex: 1;
  min-width: 0;
  max-width: 140px;
}

.member-selector {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background-color: #f5f5f5;
  border-radius: 16px;
  font-size: 13px;
  height: 32px;
}

.arrow-icon {
  font-size: 16px;
  color: #666;
  margin-left: 4px;
}

.member-selector:active {
  background-color: #e9e9e9;
}

.member-name {
  color: #333;
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bottom-add-btn {
  background-color: #007aff;
  color: #fff;
  border-radius: 20px;
  font-size: 13px;
  padding: 0 16px;
  height: 32px;
  line-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.3);
}

.bottom-add-btn:active {
  transform: scale(0.97);
  box-shadow: 0 1px 3px rgba(0, 122, 255, 0.3);
}

.bottom-add-btn::after {
  border: none;
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