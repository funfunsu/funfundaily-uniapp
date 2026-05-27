<template>
  <view class="page">
    <view class="content">
      <!-- 顶部 hero -->
      <view class="abstain-hero">
        <view class="abstain-hero__text">
          <text class="abstain-hero__title">戒断日记</text>
          <text class="abstain-hero__sub">{{ eventList.length ? `${eventList.length} 个目标坚持中 · 今天也要加油 💪` : '记录每一次自律，见证更好的自己' }}</text>
        </view>
        <view class="abstain-hero__badge"><text class="abstain-hero__emoji">🌿</text></view>
      </view>

      <view v-if="!loading && eventList.length === 0" class="empty">
        <view class="empty__art"><text class="empty__icon">🚭</text></view>
        <text class="empty__title">还没有戒断事件</text>
        <text class="empty__text">点击右下角「新建」，立下第一个戒断目标，<br/>每天给自己一个「达成」的勋章 ✨</text>
      </view>

      <abstain-event-card
        v-for="ev in eventList"
        :key="ev.id"
        :event="ev"
        :streak-days="streakOf(ev)"
        :today-feedback="todayFeedbackOf(ev)"
        @open-calendar="openCalendar"
        @edit="openEdit"
        @delete="onDelete"
        @feedback="onFeedback"
      />
    </view>

    <!-- 底部栏：群组/成员切换 + 新建 -->
    <schedule-bottom-bar
      :buttons="buttons"
      @member-change="handleMemberChange"
      @button-click="handleButtonClick"
    />

    <!-- 新建 / 修改 弹窗 -->
    <abstain-edit-sheet
      :visible="editVisible"
      :event="editingEvent"
      :saving="saving"
      @close="editVisible = false"
      @save="onSave"
    />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import apiTs from '../../../../utils/apiTs'
import scheduleBottomBar from '../../../../components/schedule-bottom-bar.vue'
import AbstainEventCard from '../../../../components/abstain/abstain-event-card.vue'
import AbstainEditSheet from '../../../../components/abstain/abstain-edit-sheet.vue'
import { buildFeedbackMap, calcStreakDays, toDateKey } from '../../../../utils/abstainUtil'
import { STORAGE_KEYS, getStoredData } from '../../../../utils/storageManager'

const eventList = ref([])
const recordsByTask = ref({})   // taskId -> records[]
const loading = ref(false)
const saving = ref(false)

const currentGroup = ref(null)
const currentMember = ref(null)

const buttons = ref([{ code: 'create', text: '+ 新建' }])

const editVisible = ref(false)
const editingEvent = ref(null)

// 底部栏初始化/切换群组成员后触发加载
function handleMemberChange(e) {
  currentGroup.value = e.currentGroup
  currentMember.value = e.currentMember
  fetchAll()
}

function handleButtonClick(code) {
  if (code === 'create') openCreate()
}

function ctxReady() {
  return currentGroup.value && currentGroup.value.id && currentMember.value && (currentMember.value.userId || currentMember.value.id)
}
function targetUserId() {
  return currentMember.value?.userId ?? currentMember.value?.id
}

async function fetchAll() {
  if (!ctxReady()) return
  loading.value = true
  try {
    const groupId = currentGroup.value.id
    const userId = targetUserId()
    const [events, records] = await Promise.all([
      apiTs.schedule.activeList({ groupId, targetUserId: userId, scheduleItemType: 'abstain' }),
      apiTs.checkin.list({ groupId, targetUserId: userId, fromDate: '2000-01-01', toDate: tomorrowKey() })
    ])
    eventList.value = Array.isArray(events) ? events : []
    const map = {}
    for (const r of (Array.isArray(records) ? records : [])) {
      const tid = String(r.taskId)
      if (!map[tid]) map[tid] = []
      map[tid].push(r)
    }
    recordsByTask.value = map
  } catch (e) {
    console.error('加载戒断事件失败:', e)
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function recordsOf(ev) {
  return recordsByTask.value[String(ev.id)] || []
}
function streakOf(ev) {
  return calcStreakDays(ev.startTime, recordsOf(ev))
}
function todayFeedbackOf(ev) {
  const map = buildFeedbackMap(recordsOf(ev))
  return map[toDateKey(new Date())] || ''
}

// ---- 新建 / 修改 ----
function openCreate() {
  if (!ctxReady()) {
    uni.showToast({ title: '请先选择群组与成员', icon: 'none' })
    return
  }
  editingEvent.value = null
  editVisible.value = true
}
function openEdit(ev) {
  editingEvent.value = ev
  editVisible.value = true
}

function localDateTime(dateKey, hms) {
  return `${dateKey}T${hms}`
}

async function onSave(payload) {
  if (!ctxReady()) return
  saving.value = true
  try {
    const isEdit = !!payload.id
    const startTime = isEdit && editingEvent.value?.startTime
      ? editingEvent.value.startTime
      : localDateTime(toDateKey(new Date()), nowHms())
    const item = {
      id: payload.id || null,
      itemTitle: payload.itemTitle,
      itemDesc: payload.itemDesc || '',
      itemType: 'abstain',
      repeatType: 'none',
      startTime,
      endTime: localDateTime(payload.endDate, '23:59:59'),
      parentId: 0
    }
    await apiTs.schedule.save({
      targetUserId: targetUserId(),
      groupId: currentGroup.value.id,
      items: [item]
    })
    editVisible.value = false
    uni.showToast({ title: '已保存', icon: 'success' })
    await fetchAll()
  } catch (e) {
    console.error('保存戒断事件失败:', e)
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function onDelete(ev) {
  uni.showModal({
    title: '删除戒断事件',
    content: `确定删除「${ev.itemTitle || ''}」吗？历史反馈记录将不再展示。`,
    confirmColor: '#ef4444',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await apiTs.schedule.delete(ev.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        await fetchAll()
      } catch (e) {
        console.error('删除失败:', e)
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    }
  })
}

// ---- 反馈：达成 / 破戒 ----
async function onFeedback({ event, feedback }) {
  if (!ctxReady()) return
  try {
    await apiTs.checkin.feedback({
      groupId: currentGroup.value.id,
      targetUserId: targetUserId(),
      taskId: event.id,
      taskTime: localDateTime(toDateKey(new Date()), '00:00:00'),
      extra: { feedback }
    })
    uni.showToast({ title: feedback === 'persist' ? '已记录坚持 💪' : '已记录破戒', icon: 'none' })
    await fetchAll()
  } catch (e) {
    console.error('反馈失败:', e)
    uni.showToast({ title: e?.message || '反馈失败', icon: 'none' })
  }
}

// ---- 进入统计日历 ----
function openCalendar(ev) {
  const q = [
    `id=${ev.id}`,
    `groupId=${currentGroup.value.id}`,
    `targetUserId=${targetUserId()}`,
    `title=${encodeURIComponent(ev.itemTitle || '')}`,
    `startTime=${encodeURIComponent(ev.startTime || '')}`,
    `endTime=${encodeURIComponent(ev.endTime || '')}`,
    `itemDesc=${encodeURIComponent(ev.itemDesc || '')}`
  ].join('&')
  uni.navigateTo({ url: `/subPackages/abstain/pages/calendar/index?${q}` })
}

// 工具
function tomorrowKey() {
  const d = new Date(); d.setDate(d.getDate() + 1); return toDateKey(d)
}
function nowHms() {
  const d = new Date()
  const p = (n) => `${n}`.padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

onShow(() => {
  // 从缓存恢复上下文（底部栏也会在挂载后 emit member-change 覆盖）
  const g = getStoredData(STORAGE_KEYS.CURRENT_GROUP)
  const m = getStoredData(STORAGE_KEYS.CURRENT_MEMBER)
  if (g) currentGroup.value = g
  if (m) currentMember.value = m
  if (ctxReady()) fetchAll()
})
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #ecfdf5 0%, #f5f6f8 280rpx); display: flex; flex-direction: column; }
.content { flex: 1; padding: 24rpx 24rpx 200rpx; box-sizing: border-box; }

/* 顶部 hero */
.abstain-hero {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 24rpx; padding: 30rpx 32rpx; margin-bottom: 24rpx;
  box-shadow: 0 10rpx 28rpx rgba(16, 185, 129, 0.28);
}
.abstain-hero__text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.abstain-hero__title { font-size: 38rpx; font-weight: 900; color: #ffffff; }
.abstain-hero__sub { font-size: 24rpx; color: rgba(255, 255, 255, 0.92); margin-top: 8rpx; }
.abstain-hero__badge {
  width: 88rpx; height: 88rpx; border-radius: 50%; flex-shrink: 0; margin-left: 16rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex; align-items: center; justify-content: center;
}
.abstain-hero__emoji { font-size: 48rpx; line-height: 1; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 90rpx 40rpx; }
.empty__art {
  width: 180rpx; height: 180rpx; border-radius: 50%; margin-bottom: 28rpx;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0) 70%);
  display: flex; align-items: center; justify-content: center;
}
.empty__icon { font-size: 96rpx; }
.empty__title { font-size: 32rpx; color: #1f2937; font-weight: 700; margin-bottom: 12rpx; }
.empty__text { font-size: 26rpx; color: #94a3b8; text-align: center; line-height: 1.7; }
</style>
