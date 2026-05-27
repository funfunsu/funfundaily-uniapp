<template>
  <view class="page">
    <!-- 头部卡片 -->
    <view class="head-card">
      <text class="head-title">{{ event.itemTitle || '戒断日记' }}</text>
      <view class="head-streak">
        <text class="head-streak-num">{{ streakDays }}</text>
        <text class="head-streak-unit">天</text>
        <text class="head-streak-label">连续坚持</text>
      </view>
      <view class="head-stats">
        <view class="stat"><text class="stat-num stat-num--persist">{{ persistCount }}</text><text class="stat-label">坚持</text></view>
        <view class="stat"><text class="stat-num stat-num--relapse">{{ relapseCount }}</text><text class="stat-label">破戒</text></view>
        <view class="stat"><text class="stat-num">{{ daysSinceStart }}</text><text class="stat-label">累计天数</text></view>
      </view>
    </view>

    <!-- 统计日历 -->
    <view class="cal-wrap">
      <feedback-calendar
        :status-map="statusMap"
        :init-year="displayYear"
        :init-month="displayMonth"
        @monthChange="onMonthChange"
      />
    </view>

    <!-- 分享 -->
    <view class="share-bar">
      <button class="share-btn share-btn--ghost" open-type="share">
        <text class="share-btn__text">🔗 链接分享</text>
      </button>
      <button class="share-btn share-btn--primary" @click="openImageShare">
        <text class="share-btn__text">🖼 图片分享</text>
      </button>
    </view>

    <abstain-calendar-poster
      :visible="posterVisible"
      :title="event.itemTitle"
      :streak-days="streakDays"
      :year="displayYear"
      :month="displayMonth"
      :status-map="statusMap"
      :qr-source="posterQr"
      :creator-name="creatorName"
      @close="posterVisible = false"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import apiTs from '../../../../utils/apiTs'
import FeedbackCalendar from '../../../../components/fun-components/feedback-calendar.vue'
import AbstainCalendarPoster from '../../../../components/abstain/abstain-calendar-poster.vue'
import { buildFeedbackMap, calcStreakDays, recordFeedback, toDateKey, diffDays, FEEDBACK_PERSIST, FEEDBACK_RELAPSE } from '../../../../utils/abstainUtil'
import { base64ToImageSource } from '../../../../utils/imageHelper'
import { STORAGE_KEYS, getStoredData } from '../../../../utils/storageManager'

const SHARE_PAGE = 'subPackages/abstain/pages/share/index'

const event = ref({ id: null, itemTitle: '', itemDesc: '', startTime: '', endTime: '' })
const groupId = ref('')
const targetUserId = ref('')
const records = ref([])

const now = new Date()
const displayYear = ref(now.getFullYear())
const displayMonth = ref(now.getMonth() + 1)

const posterVisible = ref(false)
const posterQr = ref('')
const creatorName = ref('我')

const shareToken = ref('')

const statusMap = computed(() => buildFeedbackMap(records.value))
const streakDays = computed(() => calcStreakDays(event.value.startTime, records.value))
const persistCount = computed(() => records.value.filter(r => recordFeedback(r) === FEEDBACK_PERSIST).length)
const relapseCount = computed(() => records.value.filter(r => recordFeedback(r) === FEEDBACK_RELAPSE).length)
const daysSinceStart = computed(() => {
  const startKey = toDateKey(event.value.startTime)
  if (!startKey) return 0
  return Math.max(0, diffDays(startKey, toDateKey(new Date())) + 1)
})

function onMonthChange(e) {
  displayYear.value = e.year
  displayMonth.value = e.month
}

async function fetchRecords() {
  if (!event.value.id) return
  try {
    const res = await apiTs.checkin.list({
      groupId: groupId.value,
      targetUserId: targetUserId.value,
      taskId: event.value.id,
      fromDate: '2000-01-01',
      toDate: tomorrowKey()
    })
    records.value = Array.isArray(res) ? res : []
  } catch (e) {
    console.error('加载反馈记录失败:', e)
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  }
}

// 创建分享 token（content = {event, records}），用于链接分享 / 图片二维码
async function ensureShareToken() {
  if (shareToken.value) return shareToken.value
  const content = JSON.stringify({
    event: {
      id: event.value.id,
      itemTitle: event.value.itemTitle,
      itemDesc: event.value.itemDesc,
      startTime: event.value.startTime,
      endTime: event.value.endTime
    },
    records: records.value
  })
  const res = await apiTs.share.create({ content, sceneCode: 'abstain_share' })
  shareToken.value = res?.token || ''
  return shareToken.value
}

async function openImageShare() {
  uni.showLoading({ title: '生成中...', mask: true })
  try {
    const token = await ensureShareToken()
    posterQr.value = ''
    if (token) {
      try {
        const qr = await apiTs.share.qrcode({ token, page: SHARE_PAGE })
        if (qr?.qrBase64) {
          posterQr.value = await base64ToImageSource(qr.qrBase64, qr.contentType || 'image/png')
        }
      } catch (qrErr) {
        // 二维码失败（如 dev 占位/未配置 appid）不阻断，海报画灰块占位
        console.warn('生成二维码失败，继续出图:', qrErr)
      }
    }
    uni.hideLoading()
    posterVisible.value = true
  } catch (e) {
    uni.hideLoading()
    console.error('图片分享失败:', e)
    uni.showToast({ title: e?.message || '生成失败', icon: 'none' })
  }
}

function tomorrowKey() {
  const d = new Date(); d.setDate(d.getDate() + 1); return toDateKey(d)
}

onLoad(async (query) => {
  event.value = {
    id: query.id ? Number(query.id) : null,
    itemTitle: query.title ? decodeURIComponent(query.title) : '',
    itemDesc: query.itemDesc ? decodeURIComponent(query.itemDesc) : '',
    startTime: query.startTime ? decodeURIComponent(query.startTime) : '',
    endTime: query.endTime ? decodeURIComponent(query.endTime) : ''
  }
  groupId.value = query.groupId || ''
  targetUserId.value = query.targetUserId || ''
  const user = getStoredData(STORAGE_KEYS.USER_INFO)
  creatorName.value = user?.nickname || '我'
  uni.setNavigationBarTitle({ title: event.value.itemTitle || '戒断统计' })
  await fetchRecords()
  // 预创建分享 token，使「链接分享」的 onShareAppMessage 可同步拿到 path
  ensureShareToken().catch(err => console.warn('预创建分享 token 失败:', err))
})

// 微信「链接分享」：转发给好友，path 带 scene=token，收下页只读渲染日历
onShareAppMessage(() => {
  const token = shareToken.value
  const path = token
    ? `/${SHARE_PAGE}?scene=${token}`
    : `/${SHARE_PAGE}`
  return {
    title: `我在「${event.value.itemTitle || '戒断日记'}」已坚持 ${streakDays.value} 天`,
    path
  }
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f6f8; padding: 24rpx 24rpx 160rpx; box-sizing: border-box; }
.head-card { background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 24rpx; padding: 36rpx 32rpx; color: #fff; box-shadow: 0 8rpx 24rpx rgba(16,185,129,0.25); }
.head-title { font-size: 36rpx; font-weight: 800; display: block; }
.head-streak { display: flex; align-items: baseline; gap: 8rpx; margin: 16rpx 0; }
.head-streak-num { font-size: 72rpx; font-weight: 800; line-height: 1; }
.head-streak-unit { font-size: 30rpx; font-weight: 600; }
.head-streak-label { font-size: 24rpx; opacity: 0.85; margin-left: 10rpx; }
.head-stats { display: flex; gap: 40rpx; margin-top: 12rpx; }
.stat { display: flex; flex-direction: column; }
.stat-num { font-size: 36rpx; font-weight: 700; }
.stat-num--persist { color: #d1fae5; }
.stat-num--relapse { color: #fee2e2; }
.stat-label { font-size: 22rpx; opacity: 0.85; margin-top: 4rpx; }
.cal-wrap { margin-top: 24rpx; }
.share-bar { display: flex; gap: 20rpx; margin-top: 28rpx; }
.share-btn { flex: 1; height: 88rpx; border-radius: 44rpx; border: none; display: flex; align-items: center; justify-content: center; }
.share-btn::after { border: none; }
.share-btn--ghost { background: #fff; box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05); }
.share-btn--ghost .share-btn__text { color: #10b981; font-size: 28rpx; font-weight: 600; }
.share-btn--primary { background: #10b981; }
.share-btn--primary .share-btn__text { color: #fff; font-size: 28rpx; font-weight: 600; }
</style>
