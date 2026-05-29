<template>
  <view class="page">
    <view v-if="loadError" class="empty">
      <text class="empty__icon">🚭</text>
      <text class="empty__text">分享已过期或加载失败</text>
    </view>

    <template v-else>
      <view class="head-card">
        <view class="head-owner">
          <text class="head-owner-emoji">🌿</text>
          <text class="head-owner-name">{{ ownerName }}</text>
          <text class="head-owner-suffix">的戒断坚持</text>
        </view>
        <text class="head-title">{{ event.itemTitle || '戒断日记' }}</text>
        <view class="head-streak">
          <text class="head-streak-num">{{ streakDays }}</text>
          <text class="head-streak-unit">天</text>
          <text class="head-streak-label">连续坚持</text>
        </view>
        <text v-if="event.itemDesc" class="head-desc">{{ event.itemDesc }}</text>
        <text class="head-sharedby">{{ sharedByLabel }}</text>
      </view>

      <view class="cal-wrap">
        <feedback-calendar
          :status-map="statusMap"
          @monthChange="() => {}"
        />
      </view>

      <!-- 互动：新用户可立刻开始同款戒断，并了解更多亲子工具 -->
      <view class="cta">
        <button class="cta-primary" :disabled="creating" @click="createSameEvent">
          <text class="cta-primary-text">{{ creating ? '创建中…' : `🚀 我也要坚持「${event.itemTitle || '戒断'}」` }}</text>
        </button>
        <view class="cta-hook" @click="goExploreTools">
          <text class="cta-hook-text">还有更多亲子小工具，去看看 ›</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import apiTs from '../../../../utils/apiTs'
import FeedbackCalendar from '../../../../components/fun-components/feedback-calendar.vue'
import { buildFeedbackMap, calcStreakDays, toDateKey } from '../../../../utils/abstainUtil'
import { setShareToken } from '../../../../utils/token'
import { autoLogin } from '../../../../utils/auth'
import { ensureCurrentContext } from '../../../../utils/currentGroupResolver'

const event = ref({ itemTitle: '', itemDesc: '', startTime: '', endTime: '', ownerName: '' })
const records = ref([])
const creatorName = ref('')
const loadError = ref(false)
const creating = ref(false)

const statusMap = computed(() => buildFeedbackMap(records.value))
const streakDays = computed(() => calcStreakDays(event.value.startTime, records.value))
// 归属人（戒断的人）；缺失时回落「TA」，避免把分享人误当归属人
const ownerName = computed(() => event.value.ownerName || 'TA')
// 分享人（创建分享链接的人），与归属人区分展示
const sharedByLabel = computed(() => `由 ${creatorName.value || '好友'} 分享给你`)

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

function localNowDateTime() {
  const d = new Date()
  const p = (n) => `${n}`.padStart(2, '0')
  return `${toDateKey(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// 同款事件结束日期：原目标日仍在未来则沿用，缺失/已过则默认 30 天后
function resolveSameEndTime() {
  const todayKey = toDateKey(new Date())
  const srcKey = toDateKey(event.value.endTime)
  if (srcKey && srcKey > todayKey) return event.value.endTime
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return `${toDateKey(d)}T23:59:59`
}

// 立刻为当前用户创建一份「同款」戒断事件（新用户由 group/list 自动建默认群组）
async function createSameEvent() {
  if (creating.value) return
  creating.value = true
  uni.showLoading({ title: '创建中...', mask: true })
  try {
    const ctx = await ensureCurrentContext()
    if (!ctx) {
      uni.hideLoading()
      uni.showToast({ title: '登录信息加载中，请稍后重试', icon: 'none' })
      return
    }
    const targetUserId = ctx.member.userId ?? ctx.member.id
    const item = {
      id: null,
      itemTitle: event.value.itemTitle || '我的戒断',
      itemDesc: event.value.itemDesc || '',
      itemType: 'abstain',
      repeatType: 'none',
      startTime: localNowDateTime(),
      endTime: resolveSameEndTime(),
      parentId: 0
    }
    await apiTs.schedule.save({ targetUserId, groupId: ctx.group.id, items: [item] })
    uni.hideLoading()
    uni.showToast({ title: '已为你创建，开始坚持吧 💪', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/subPackages/abstain/pages/list/index' })
    }, 800)
  } catch (e) {
    uni.hideLoading()
    console.error('创建同款戒断事件失败:', e)
    uni.showToast({ title: e?.message || '创建失败，请重试', icon: 'none' })
  } finally {
    creating.value = false
  }
}

// 钩子：引导新用户了解小程序的其它亲子工具（发现/更多页）
function goExploreTools() {
  uni.switchTab({ url: '/pages/tabBar/more' })
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
.head-owner { display: flex; align-items: baseline; flex-wrap: wrap; }
.head-owner-emoji { font-size: 28rpx; margin-right: 6rpx; }
.head-owner-name { font-size: 30rpx; font-weight: 800; max-width: 360rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.head-owner-suffix { font-size: 26rpx; opacity: 0.92; }
.head-title { font-size: 36rpx; font-weight: 800; display: block; margin-top: 10rpx; }
.head-streak { display: flex; align-items: baseline; gap: 8rpx; margin: 16rpx 0 8rpx; }
.head-streak-num { font-size: 72rpx; font-weight: 800; line-height: 1; }
.head-streak-unit { font-size: 30rpx; font-weight: 600; }
.head-streak-label { font-size: 24rpx; opacity: 0.85; margin-left: 10rpx; }
.head-desc { font-size: 26rpx; opacity: 0.92; display: block; }
.head-sharedby { font-size: 22rpx; opacity: 0.8; display: block; margin-top: 16rpx; }
.cal-wrap { margin-top: 24rpx; }
.cta { margin-top: 32rpx; }
.cta-primary { width: 100%; height: 92rpx; border-radius: 46rpx; border: none; background: #10b981; display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 20rpx rgba(16,185,129,0.3); }
.cta-primary::after { border: none; }
.cta-primary[disabled] { opacity: 0.55; }
.cta-primary-text { color: #fff; font-size: 30rpx; font-weight: 700; }
.cta-hook { margin-top: 22rpx; text-align: center; padding: 12rpx; }
.cta-hook-text { font-size: 26rpx; color: #059669; font-weight: 600; }
</style>
