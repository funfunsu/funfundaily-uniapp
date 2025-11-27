<template>
  <view class="bottom-bar">
    <view class="bottom-bar-content uni-flex uni-row">
      <!-- 群组信息 -->
      <view class="group-info">
        <view class="group-name">{{ _currentGroup?.groupName || 'VV家庭' }}</view>
      </view>
      
      <!-- 成员选择器 -->
      <view class="member-switcher">
        <picker @change="handleMemberChange" :value="displayMemberIndex" :range="displayUserList.map(u => u.nickname || '未知用户')">
          <view class="member-selector">
            <text class="member-name">{{ displayMember ? (displayMember.nickname || '未知用户') : '选择成员' }}<text class="arrow-icon">›</text></text>
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

<script>
import api from '../utils/apiTs'
export default {
  name: 'schedule-bottom-bar',
  props: {
    // 群组名称
    groupName: {
      type: String,
      default: 'VV家庭'
    },
    // 可选：传入用户列表（保持向后兼容）
    userList: {
      type: Array,
      default: () => []
    },
    // 可选：传入当前选中的成员索引（保持向后兼容）
    currentMemberIndex: {
      type: Number,
      default: 0
    },
    // 可选：传入当前选中的成员对象（保持向后兼容）
    currentMember: {
      type: Object,
      default: null
    },
    // 添加按钮文本
    addButtonText: {
      type: String,
      default: '添加日程'
    },
    // 是否自动获取群组成员
    autoLoadMembers: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      // 群组列表
      _groupList: [],
      // 内部成员列表（优先使用props传入的数据）
      _userList: [],
      // 内部当前成员索引
      _currentMemberIndex: 0,
      // 内部当前成员对象
      _currentMember: null,
	  _currentGroup:null
    }
  },
  emits: ['member-change', 'add-click', 'members-loaded'],
  computed: {
    // 合并props和内部数据的用户列表
    displayUserList() {
      return this.userList.length > 0 ? this.userList : this._userList
    },
    // 合并props和内部数据的当前成员索引
    displayMemberIndex() {
      if (this.currentMemberIndex >= 0 && this.userList.length > 0) {
        return this.currentMemberIndex
      }
      return this._currentMemberIndex
    },
    // 合并props和内部数据的当前成员对象
    displayMember() {
      return this.currentMember || this._currentMember
    }
  },
  mounted() {
    // 如果启用了自动获取成员且没有通过props传入成员列表，则自动获取
    if (this.autoLoadMembers && this.userList.length === 0) {
      this.fetchGroupMembers()
    } else if (this.userList.length > 0) {
      // 如果传入了成员列表，更新内部状态
      this._userList = [...this.userList]
      this._currentMemberIndex = this.currentMemberIndex || 0
      this._currentMember = this.currentMember || this.userList[this._currentMemberIndex] || null
    }
  },
  watch: {
    // 监听外部传入的成员列表变化
    userList: {
      handler(newList) {
        if (newList && newList.length > 0) {
          this._userList = [...newList]
          // 更新当前成员
          if (this.currentMember) {
            this._currentMember = this.currentMember
          } else if (this.currentMemberIndex >= 0 && newList[this.currentMemberIndex]) {
            this._currentMember = newList[this.currentMemberIndex]
            this._currentMemberIndex = this.currentMemberIndex
          } else if (newList[0]) {
            this._currentMember = newList[0]
            this._currentMemberIndex = 0
          }
        }
      },
      deep: true
    },
    // 监听外部传入的当前成员索引变化
    currentMemberIndex(newIndex) {
      if (newIndex >= 0 && this.displayUserList[newIndex]) {
        this._currentMemberIndex = newIndex
        this._currentMember = this.displayUserList[newIndex]
      }
    },
    // 监听外部传入的当前成员对象变化
    currentMember(newMember) {
      if (newMember) {
        this._currentMember = newMember
        // 查找对应的索引
        const index = this.displayUserList.findIndex(u => u.userId === newMember.userId || u.id === newMember.id)
        if (index >= 0) {
          this._currentMemberIndex = index
        }
      }
    }
  },
  methods: {
    // 获取群组成员
    async fetchGroupMembers() {
      try {
		const groupRes = await api.group.list();
		const groups = groupRes.data || []
		this._groupList = groups
		this._currentGroup = groups[0]
        // 调用API获取成员列表
		const requestData = {'groupId':this._currentGroup.grouId}
        const res = await api.group.user.list(requestData);
        const members = res.data || []
        
        // 更新内部状态
        this._userList = members
        
        // 设置默认选中第一个成员
        if (members.length > 0) {
          this._currentMemberIndex = 0
          this._currentMember = members[0]
        } else {
          this._currentMemberIndex = -1
          this._currentMember = null
        }
        
        // 触发成员加载完成事件
        this.$emit('members-loaded', {
          userList: this._userList,
          currentMemberIndex: this._currentMemberIndex,
          currentMember: this._currentMember
        })
      } catch (e) {
        console.error('获取群组成员失败:', e)
      }
    },
    
    // 处理成员切换
    handleMemberChange(e) {
      const index = e.detail.value
      
      // 更新内部状态
      this._currentMemberIndex = index
      this._currentMember = this.displayUserList[index] || null
      
      // 触发事件，传递更新后的数据
      this.$emit('member-change', {
        ...e,
		currentGroup:this._currentGroup,
        currentMemberIndex: index,
        currentMember: this._currentMember
      })
    },
    
    // 处理添加按钮点击
    handleAddClick() {
      this.$emit('add-click');
    }
  }
};
</script>

<style scoped>
/* 固定底栏 */
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

/* 底栏内容容器 */
.bottom-bar-content {
  height: 100%;
  width:100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 16px;
  box-sizing: border-box;
  max-width: 100%;
  gap: 12px;
}

/* 群组信息区域 */
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

/* 成员选择器 */
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

/* 添加事件按钮 */
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