<template>
  <view class="page">
    <view v-if="loadError" class="empty">
      <text class="empty__icon">🚭</text>
      <text class="empty__text">分享已过期或加载失败</text>
    </view>

    <template v-else>
      <view class="head-card">
        <text class="head-from">来自 {{ creatorName || '好友' }} 的坚持</text>
        <text class="head-title">{{ event.itemTitle || '戒断日记' }}</text>
        <view class="head-streak">
          <text class="head-streak-num">{{ streakDays }}</text>
          <text class="head-streak-unit">天</text>
          <text class="head-streak-label">连续坚持</text>
        </view>
        <text v-if="event.itemDesc" class="head-desc">{{ event.itemDesc }}</text>
      </view>

      <view class="cal-wrap">
        <feedback-calendar
          :status-map="statusMap"
          @monthChange="() => {}"
        />
      </view>

      <view class="tip">
        <text class="tip-text">想记录自己的戒断坚持？在「发现」页打开「戒断日记」开始吧</text>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import apiTs from '../../../../utils/apiTs'
import FeedbackCalendar from '../../../../components/fun-components/feedback-calendar.vue'
import { buildFeedbackMap, calcStreakDays } from '../../../../utils/abstainUtil'
import { setShareToken } from '../../../../utils/token'
import { autoLogin } from '../../../../utils/auth'

const event = ref({ itemTitle: '', itemDesc: '', startTime: '', endTime: '' })
const records = ref([])
const creatorName = ref('')
const loadError = ref(false)

const statusMap = computed(() => buildFeedbackMap(records.value))
const streakDays = computed(() => calcStreakDays(event.value.startTime, records.value))

function resolveShareToken(query) {
  let raw = (query && (query.token || query.scene)) || ''
  // #ifdef MP-WEIXIN
  if (!raw && typeof wx !== 'undefined') {
    try {
      const enter = (wx.getEnterOptionsSync && wx.getEnterOptionsSync())
        || (wx.getLaunchOptionsSync && wx.getLaunchOptionsSync()) || {}
      const q = enter.query || {}
      raw = q.token || q.scene || ''
    } catch (e) { /* ignore */ }
  }
  // #endif
  if (raw) { try { raw = decodeURIComponent(raw) } catch (e) { /* token 为纯 hex */ } }
  return raw
}

async function fetchShared(token) {
  uni.showLoading({ title: '加载中...' })
  try {
    const res = await apiTs.share.getContent(token)
    let data = null
    if (res && res.data) {
      data = res.data
      creatorName.value = res.creatorNickname || ''
    } else if (typeof res === 'string') {
      data = JSON.parse(res)
    }
    if (data && data.event) {
      event.value = data.event
      records.value = Array.isArray(data.records) ? data.records : []
      loadError.value = false
    } else {
      loadError.value = true
    }
  } catch (e) {
    console.error('获取分享内容失败:', e)
    loadError.value = true
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

onLoad(async (query) => {
  const token = resolveShareToken(query)
  if (!token) {
    loadError.value = true
    uni.showToast({ title: '缺少分享令牌', icon: 'none' })
    return
  }
  setShareToken(token)
  try {
    await autoLogin(token)
  } catch (e) {
    console.error('自动登录失败:', e)
    uni.showToast({ title: e?.message || '自动登录失败', icon: 'none' })
  }
  await fetchShared(token)
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f6f8; padding: 24rpx 24rpx 60rpx; box-sizing: border-box; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 160rpx 40rpx; }
.empty__icon { font-size: 96rpx; margin-bottom: 24rpx; }
.empty__text { font-size: 28rpx; color: #94a3b8; }
.head-card { background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 24rpx; padding: 36rpx 32rpx; color: #fff; box-shadow: 0 8rpx 24rpx rgba(16,185,129,0.25); }
.head-from { font-size: 24rpx; opacity: 0.9; display: block; }
.head-title { font-size: 36rpx; font-weight: 800; display: block; margin-top: 8rpx; }
.head-streak { display: flex; align-items: baseline; gap: 8rpx; margin: 16rpx 0 8rpx; }
.head-streak-num { font-size: 72rpx; font-weight: 800; line-height: 1; }
.head-streak-unit { font-size: 30rpx; font-weight: 600; }
.head-streak-label { font-size: 24rpx; opacity: 0.85; margin-left: 10rpx; }
.head-desc { font-size: 26rpx; opacity: 0.92; display: block; }
.cal-wrap { margin-top: 24rpx; }
.tip { margin-top: 28rpx; text-align: center; }
.tip-text { font-size: 24rpx; color: #94a3b8; }
</style>
