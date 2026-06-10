<template>
  <view class="page-container">
    <view class="task-stats-card">
      <view class="stats-row">
        <view class="stat-block">
          <text class="stat-number">{{ totalCount }}</text>
          <text class="stat-label">分享任务</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-block">
          <text class="stat-name">{{ creatorName || '好友' }}</text>
          <text class="stat-label">来自</text>
        </view>
      </view>
    </view>

    <!-- 内容区域 -->
    <view class="content-container">
      <view v-show="listShow" class="task-list">
        <view v-if="taskList.length === 0" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">{{ loadError ? '加载失败或分享已过期' : '没有可收下的任务' }}</text>
        </view>

        <view v-for="task in taskList" :key="task.id">
          <TaskCard
              @toggle-select="toggleSelect"
              :mode="mode"
              :is-selected="isTaskSelected(task)"
              :task="task"
          />
        </view>
      </view>
    </view>

    <!-- 底部栏：只保留群组选择 + 收下相关按钮 -->
    <schedule-bottom-bar
        :buttons="buttons"
        :show-group-member="false"
        @member-change="handleMemberChange"
        @buttonClick="handleButtonClick"/>

    <!-- 成员选择弹窗：选择/新建成员来收下 -->
    <MemberSelectPopup
        :visible="popupVisible"
        :group-id="currentGroup?.id"
        @close="popupVisible = false"
        @select="onSelectMember"
        @create="onCreateMember"/>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import apiTs from '../../utils/apiTs'
import scheduleBottomBar from '../../components/schedule-bottom-bar.vue'
import TaskCard from '../../components/task/task-card.vue'
import MemberSelectPopup from '../../components/member-select-popup.vue'
import { onLoad } from "@dcloudio/uni-app";
import { setStoredData, STORAGE_KEYS } from "../../utils/storageManager";
import { setShareToken } from "../../utils/token";
import { autoLogin } from "../../utils/auth";
import { ensureCurrentGroup } from "../../utils/currentGroupResolver";

// =============== 响应式状态 ===============
const taskList = ref([])
const listShow = ref(true)
const isLoginSuccessful = ref(false)
const loadError = ref(false)
const creatorName = ref('')

const buttons = ref([
  { code: 'selectAll', text: '全选' },
  { code: 'toggleSelectAll', text: '反选' },
  { code: 'receive', text: '收下' }
])

const currentGroup = ref(null)
const currentMember = ref(null)
const mode = ref('share')
const selectedTaskIds = ref(new Set())
const popupVisible = ref(false)

// =============== 计算属性 ===============
const totalCount = computed(() => taskList.value.length)

// =============== 选择逻辑 ===============
const isTaskSelected = (task) => selectedTaskIds.value.has(task.id)

const toggleSelect = (task) => {
  if (mode.value !== 'share') return
  if (selectedTaskIds.value.has(task.id)) selectedTaskIds.value.delete(task.id)
  else selectedTaskIds.value.add(task.id)
}

function selectAll() {
  selectedTaskIds.value.clear()
  taskList.value.forEach(t => selectedTaskIds.value.add(t.id))
}
function toggleSelectAll() {
  const next = new Set()
  taskList.value.forEach(t => { if (!selectedTaskIds.value.has(t.id)) next.add(t.id) })
  selectedTaskIds.value = next
}

function handleButtonClick(buttonCode) {
  switch (buttonCode) {
    case 'selectAll': selectAll(); break
    case 'toggleSelectAll': toggleSelectAll(); break
    case 'receive': openReceive(); break
    default: console.warn('Unknown button code:', buttonCode); break
  }
}

// 打开成员选择弹窗（先确保有可用群组）
async function openReceive() {
  if (selectedTaskIds.value.size === 0) {
    uni.showToast({ title: '请先选择要收下的任务', icon: 'none' })
    return
  }
  if (!currentGroup.value) {
    const group = await ensureCurrentGroup()
    if (!group) {
      uni.showToast({ title: '你还没有小队，请先在 App 创建小队', icon: 'none' })
      return
    }
    currentGroup.value = group
  }
  popupVisible.value = true
}

// 选择已有成员收下
async function onSelectMember(member) {
  popupVisible.value = false
  await receiveToUser(member.userId, currentGroup.value.id)
}

// 新建成员并收下（多用于给小朋友收）
async function onCreateMember(nickname) {
  try {
    uni.showLoading({ title: '创建成员中...', mask: true })
    const userResp = await apiTs.group.user.add({ groupId: currentGroup.value.id, nickname })
    popupVisible.value = false
    uni.hideLoading()
    await receiveToUser(userResp.userId, currentGroup.value.id)
  } catch (e) {
    uni.hideLoading()
    console.error('新建成员失败:', e)
    uni.showToast({ title: e?.message || '新建成员失败', icon: 'none' })
  }
}

// 把选中的任务保存给目标成员
const receiveToUser = async (targetUserId, groupId) => {
  const selected = taskList.value.filter(t => selectedTaskIds.value.has(t.id))
  if (selected.length === 0) {
    uni.showToast({ title: '请先选择要收下的任务', icon: 'none' })
    return
  }
  // 收下=新建副本：清空 id；parentId 指向分享者的目标，在本群组不存在，归零避免悬挂
  const items = selected.map(t => ({ ...t, id: null, parentId: 0 }))
  try {
    uni.showLoading({ title: '收下中...', mask: true })
    await apiTs.schedule.save({ targetUserId, groupId, items })
    uni.hideLoading()
    uni.showToast({ title: `已收下 ${items.length} 个任务`, icon: 'success' })
    setTimeout(() => switchToTab(), 800)
  } catch (e) {
    uni.hideLoading()
    console.error('收下失败:', e)
    uni.showToast({ title: e?.message || '收下失败，请重试', icon: 'none' })
  }
}

const switchToTab = () => {
  const uri = '/pages/tabBar/task'
  setStoredData(STORAGE_KEYS.REFRESH_TAB, uri)
  uni.switchTab({ url: uri })
}

// 底部栏群组切换
function handleMemberChange(e) {
  currentGroup.value = e.currentGroup
  currentMember.value = e.currentMember
}

// =============== 加载分享内容 ===============
const fetchSharedContent = async (token) => {
  uni.showLoading({ title: '加载中...' })
  try {
    const res = await apiTs.share.getContent(token)
    // 新结构：{ creatorNickname, data: [...] }；兼容旧的裸 JSON 字符串
    let list = []
    if (typeof res === 'string') {
      list = JSON.parse(res)
    } else if (res && Array.isArray(res.data)) {
      list = res.data
      creatorName.value = res.creatorNickname || ''
    } else if (Array.isArray(res)) {
      list = res
    }
    taskList.value = Array.isArray(list) ? list : []
    selectAll()
    loadError.value = taskList.value.length === 0
  } catch (err) {
    console.error("获取分享内容失败:", err)
    loadError.value = true
    uni.showToast({ title: err?.message || "加载失败，请稍后重试", icon: "none" })
  } finally {
    uni.hideLoading()
  }
}

// 解析分享 token，覆盖三种进入方式：
// 1) 旧链接转发：query.token
// 2) 扫小程序码：query.scene（getUnlimitedQRCode 的 scene，URL 编码）
// 3) 冷启动扫码：scene 只在小程序启动参数里（页面 onLoad query 为空时兜底）
function resolveShareToken(query) {
  let raw = (query && (query.token || query.scene)) || ''
  // #ifdef MP-WEIXIN
  if (!raw && typeof wx !== 'undefined') {
    try {
      const enter = (wx.getEnterOptionsSync && wx.getEnterOptionsSync())
          || (wx.getLaunchOptionsSync && wx.getLaunchOptionsSync()) || {}
      const q = enter.query || {}
      raw = q.token || q.scene || ''
      console.log('[share] enterOptions:', JSON.stringify(enter))
    } catch (e) { console.warn('[share] getEnterOptionsSync 失败:', e) }
  }
  // #endif
  if (raw) { try { raw = decodeURIComponent(raw) } catch (e) { /* token 为纯 hex，理论不会抛 */ } }
  return raw
}

onLoad(async (query) => {
  console.log('[share] onLoad query:', JSON.stringify(query))
  const token = resolveShareToken(query)
  if (!token) {
    loadError.value = true
    uni.showToast({ title: "缺少分享令牌", icon: "none" })
    return
  }
  setShareToken(token)
  try {
    await autoLogin(token)
    isLoginSuccessful.value = true
  } catch (loginError) {
    console.error("自动登录失败:", loginError)
    uni.showToast({ title: loginError?.message || "自动登录失败", icon: "none", duration: 3000 })
  }
  if (isLoginSuccessful.value) {
    // 预解析当前群组，收下时弹窗直接可用
    ensureCurrentGroup().then(g => { if (g && !currentGroup.value) currentGroup.value = g })
    await fetchSharedContent(token)
  }
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}
.content-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
  margin-top: 84px;
  padding-top: 10px;
  padding-bottom: 84px;
}
.task-stats-card {
  background: white;
  border-radius: 16rpx;
  padding: 24rpx 20rpx;
  margin: 0 0 20rpx 0;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  position: fixed;
  width: 100%;
  height: 60px;
  z-index: 100;
}
.stats-row { display: flex; align-items: center; justify-content: space-between; }
.stat-block { text-align: center; flex: 1; }
.stat-number { font-size: 36rpx; font-weight: bold; color: #2196f3; display: block; }
.stat-name { font-size: 30rpx; font-weight: bold; color: #1f2937; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stat-label { font-size: 24rpx; color: #888; margin-top: 8rpx; }
.stat-divider { width: 2rpx; height: 40rpx; background: #eee; }
.task-list { padding: 0 16rpx; flex-grow: 1; }
.empty-state {
  text-align: center; padding: 40rpx;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
}
.empty-icon { font-size: 72rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; }
@media (max-width: 375px) { .stat-number { font-size: 32rpx; } }
</style>
