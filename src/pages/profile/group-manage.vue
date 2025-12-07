<template>
  <view class="group-manage">
    
    <view class="content">
      <view class="section">
        <view class="group-list">
          <view class="group-item" v-for="(group, index) in groups" :key="index">
            <view class="group-info">
              <text class="group-name">{{ group.groupName }}</text>
              <text class="group-desc">{{ group.memberCount }} 成员</text>
            </view>
            <view class="group-actions">
              <text class="action-btn" @click="editGroup(group)">编辑群组名称</text>
<!--              <text class="action-btn delete" @click="deleteGroup(group.id)">删除</text>-->
            </view>
          </view>
        </view>
      </view>
      
<!--      <view class="create-btn">-->
<!--        <button type="primary" @click="createGroup">创建新群组</button>-->
<!--      </view>-->
    </view>
  </view>
</template>

<script>
  import { ref, onMounted } from 'vue'
  import api from '../../utils/apiTs'
  
  export default {
    name: 'GroupManage',
    setup() {
      const groups = ref([])
      
      onMounted(() => {
        loadGroups()
      })
      
      const loadGroups = async () => {
        try {
          // 实际项目中调用API获取群组数据
          const res = await api.group.list()
          groups.value = res
        } catch (error) {
          console.error('加载群组失败:', error)
        }
      }
      
      const goBack = () => {
        uni.navigateBack()
      }
      
      const createGroup = () => {
        // 创建群组逻辑
        uni.showToast({ title: '创建群组', icon: 'none' })
      }
      
      const editGroup = (group) => {
        // 编辑群组逻辑
        uni.showToast({ title: `编辑群组: ${group.name}`, icon: 'none' })
        // 第一步：输入昵称
        uni.showModal({
          title: '修改群组',
          placeholderText: '请输入群组名称',
          editable: true,
          success: async(res1) => {
            if (res1.confirm && res1.content.trim()) {
              const groupName = res1.content.trim()
              await api.group.modify({ id: group.id, groupName: groupName })
            }
          },
          fail: () => {}
        })
      }
      
      const deleteGroup = (groupId) => {
        // 删除群组逻辑
        uni.showModal({
          title: '确认删除',
          content: '确定要删除这个群组吗？',
          success: (res) => {
            if (res.confirm) {
              // 实际项目中调用API删除群组
              groups.value = groups.value.filter(g => g.id !== groupId)
              uni.showToast({ title: '删除成功', icon: 'success' })
            }
          }
        })
      }
      
      return {
        groups,
        goBack,
        createGroup,
        editGroup,
        deleteGroup
      }
    }
  }
</script>

<style scoped>
  .group-manage {
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
  }
  
  .title {
    flex: 1;
    text-align: center;
    font-size: 17px;
    font-weight: 600;
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
    margin-bottom: 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    display: block;
  }
  
  .group-list {
    
  }
  
  .group-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .group-item:last-child {
    border-bottom: none;
  }
  
  .group-info {
    flex: 1;
  }
  
  .group-name {
    font-size: 15px;
    font-weight: 500;
    display: block;
    margin-bottom: 4px;
  }
  
  .group-desc {
    font-size: 13px;
    color: #999;
  }
  
  .group-actions {
    display: flex;
    gap: 16px;
  }
  
  .action-btn {
    font-size: 14px;
    color: #007aff;
  }
  
  .action-btn.delete {
    color: #ff3b30;
  }
  
  .create-btn {
    margin-top: 24px;
  }
  
  .create-btn button {
    height: 44px;
    line-height: 44px;
    font-size: 16px;
  }
</style>