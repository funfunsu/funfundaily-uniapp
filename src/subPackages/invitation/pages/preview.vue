<template>
  <view class="container">
    <view v-if="!loaded" class="state">
      <view class="state-text">邀请函加载中…</view>
    </view>

    <template v-else-if="data">
      <!-- 信封：受邀人点击邀请函消息后自动展开，无需再点一次 -->
      <view v-if="!opened" class="intro">
        <view class="intro-envelope" :class="{ 'is-opening': opening }">
          <view class="intro-envelope__flap"></view>
          <view class="intro-envelope__seal">✉</view>
          <view class="intro-envelope__name">「{{ recipientLabel }}」亲启</view>
        </view>
      </view>

      <!-- 拆开后：邀请函像一封展开的信，竖直居中、内容逐字浮现 -->
      <view v-else class="stage">
        <view
          class="letter letter-unfold"
          :style="{ background: letterStyle.cardBg, borderColor: letterStyle.dividerColor }"
        >
          <view class="letter-content">
            <InvitationCard
              :content="{
                title: data.title,
                eventTime: cardTime,
                address: data.address,
                body: data.body,
                recipientName: data.recipientName,
                creatorNickname: creatorNickname,
              }"
              :styleId="data.cardStyle"
              :reveal="!idMode"
              :reveal-delay="700"
              :allow-copy-address="true"
            />
          </view>
        </view>

        <!-- 只读查看时，若原邀请函有过时间/地点变更，列出变更记录 -->
        <view v-if="idMode && changeList.length" class="change-banner">
          <text class="change-banner__title">🔔 活动信息有更新</text>
          <view
            v-for="(c, idx) in changeList"
            :key="idx"
            class="change-banner__item"
          >
            <text class="change-banner__time">{{ (c.changeTime || '').replace('T', ' ').slice(0, 16) }}</text>
            <text class="change-banner__summary">{{ c.summary }}</text>
          </view>
        </view>

        <!-- 收下邀请：把这封邀请存进「我收到的」，并与原邀请函建立关联 -->
        <view v-if="data.invitationId" class="accept-block">
          <view
            v-if="!accepted"
            class="accept-btn"
            :class="{ 'accept-btn--loading': accepting }"
            :style="{ background: letterStyle.titleColor }"
            @click="acceptInvitation"
          >
            <text class="accept-btn__icon">💌</text>
            <text class="accept-btn__text">{{ accepting ? '收下中…' : '收下邀请' }}</text>
          </view>
          <view v-else class="accepted-tip">
            <text class="accepted-tip__icon">✅</text>
            <text class="accepted-tip__text">已收下，可在邀请函主页「我收到的」查看</text>
          </view>
        </view>

        <view
          v-if="!idMode"
          class="cta-create"
          :style="{ color: letterStyle.titleColor, borderColor: letterStyle.dividerColor }"
          @click="goCreate"
        >
          <text class="cta-create__icon">✨</text>
          <text class="cta-create__text">我也要制作邀请函</text>
        </view>
        <!-- 让收到邀请函的新用户顺势了解小程序的更多亲子功能 -->
        <view v-if="!idMode" class="cta-explore" :style="{ color: letterStyle.titleColor }" @click="goMore">
          <text class="cta-explore__text">逛逛更多亲子小工具</text>
          <text class="cta-explore__arrow">›</text>
        </view>
      </view>
    </template>

    <view v-else class="card-wrapper placeholder">
      <view class="placeholder-text">邀请函不存在或已过期</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import apiTs from '../../../utils/apiTs'
import { autoLogin } from '../../../utils/auth'
import { removeToken } from '../../../utils/token'
import InvitationCard from '../components/InvitationCard.vue'
import { resolveCardStyle } from '../utils/cardStyles'
import type { InvitationShareContent, InvitationChange } from '../types/invitation'

const data = ref<InvitationShareContent | null>(null)
const creatorNickname = ref('')
const loaded = ref(false)
const opened = ref(false)
const opening = ref(false)
const accepting = ref(false)
const accepted = ref(false)
// id 模式：从日程表点开「收到的邀请」时只读查看（无信封动画、无收下按钮、无引导入口）
const idMode = ref(false)
const changeList = ref<InvitationChange[]>([])

const recipientLabel = computed(() => data.value?.recipientName || '亲爱的朋友')
// 信纸主题跟随邀请函样式模版（cardBg / dividerColor 等都从模版取）。
const letterStyle = computed(() => resolveCardStyle(data.value?.cardStyle))

// 卡片「时间：」展示的起止时间，格式友好化（同一天只显示一次日期）
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const parseParts = (raw?: string) => {
  if (!raw) return null
  const [dateStr, timeStr] = raw.split(' ')
  const [y, m, d] = (dateStr || '').split('-').map(Number)
  if (!y || !m || !d) return null
  const hhmm = (timeStr || '').slice(0, 5)
  const dt = new Date(y, m - 1, d)
  return { y, m, d, hhmm, weekday: WEEKDAYS[dt.getDay()] || '' }
}
const cardTime = computed(() => {
  const s = parseParts(data.value?.startTime)
  if (!s) return '时间待定'
  const head = `${s.m}月${s.d}日 ${s.weekday}${s.hhmm ? ' ' + s.hhmm : ''}`
  const e = parseParts(data.value?.endTime)
  if (!e) return head
  if (e.y === s.y && e.m === s.m && e.d === s.d) {
    return e.hhmm ? `${head} ~ ${e.hhmm}` : head
  }
  return `${head} ~ ${e.m}月${e.d}日${e.hhmm ? ' ' + e.hhmm : ''}`
})

onLoad(async (query: any) => {
  // #ifdef MP-WEIXIN
  // 邀请函是私密消息：关闭「转发 / 分享到朋友圈」入口，不支持二次分享。
  uni.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] } as any)
  // #endif

  // 日程表点开「收到的邀请」：按 id 只读加载，无需 token / 信封流程
  if (query?.id) {
    idMode.value = true
    await loadById(query.id)
    return
  }

  if (!query?.token) {
    loaded.value = true
    uni.showToast({ title: '缺少邀请令牌', icon: 'none' })
    return
  }

  try {
    // 受邀人可能是新用户，或很久没打开小程序、本地 token 已过期。
    // autoLogin 只要本地存在 token 就会直接复用，不会校验是否失效——
    // 因此先清掉本地 token，强制用 shareToken 重新登录，确保 getContent
    // 不会带着过期 token 被 401 打回登录页、最终显示「邀请函不存在或已过期」。
    removeToken()
    await autoLogin(query.token)
    const resp: any = await apiTs.share.getContent(query.token)
    if (resp?.data) {
      data.value = resp.data as InvitationShareContent
      // 优先使用邀请人在创建时自定义的落款；缺省时回退到分享人昵称。
      creatorNickname.value = (resp.data as InvitationShareContent).signature || resp.creatorNickname || ''
      // 自动展开信封，无需用户再点一次。短暂停顿让用户看清信封正面。
      setTimeout(openEnvelope, 1000)
    }
  } catch (err) {
    console.error('加载邀请函失败:', err)
  } finally {
    loaded.value = true
  }
})

const openEnvelope = () => {
  if (opening.value || opened.value) return
  opening.value = true
  // 先播信封拆开动画，再切到逐字浮现的卡片。
  setTimeout(() => {
    opened.value = true
  }, 640)
}

const copyAddress = () => {
  const address = data.value?.address
  if (!address) return
  uni.setClipboardData({
    data: address,
    success: () => uni.showToast({ title: '地址已复制', icon: 'success' })
  } as any)
}
void copyAddress

// 只读加载：按 schedule_item id 取邀请函详情（用于日程表点开「收到的邀请」）。
const loadById = async (id: string | number) => {
  try {
    const dto: any = await apiTs.invitation.get(id)
    if (dto) {
      data.value = {
        title: dto.title,
        startTime: dto.startTime,
        endTime: dto.endTime,
        address: dto.address,
        body: dto.body,
        recipientName: dto.recipientName || '',
        cardStyle: dto.cardStyle,
        signature: dto.signature
        // 不设置 invitationId → 不显示「收下」按钮（这本就是用户自己已收下的记录）
      }
      creatorNickname.value = dto.signature || ''
      changeList.value = dto.changes || []
      opened.value = true // 直接展开，跳过信封动画
    }
  } catch (err) {
    console.error('加载邀请函详情失败:', err)
  } finally {
    loaded.value = true
  }
}

// 受邀人「收下邀请」：以原邀请 id 在后端生成一条「收到的邀请」（parentId 指向原邀请）。
const acceptInvitation = async () => {
  if (accepting.value || accepted.value) return
  const invitationId = data.value?.invitationId
  if (!invitationId) {
    uni.showToast({ title: '该邀请暂不支持收下', icon: 'none' })
    return
  }
  accepting.value = true
  try {
    await apiTs.invitation.accept({
      invitationId,
      recipientName: data.value?.recipientName
    })
    accepted.value = true
    uni.showToast({ title: '已收下邀请', icon: 'success' })
  } catch (err) {
    console.error('收下邀请失败:', err)
  } finally {
    accepting.value = false
  }
}

const goCreate = () => {
  uni.reLaunch({ url: '/subPackages/invitation/pages/list?autoCreate=1' })
}

// 受邀人多为新用户：提供一个轻量入口去「更多」页了解小程序的其它功能
const goMore = () => {
  uni.switchTab({ url: '/pages/tabBar/more' })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f3eefe 0%, #fdeef4 60%, #f0f2f5 100%);
  padding: 24rpx;
  box-sizing: border-box;
}

.state {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-text {
  font-size: 28rpx;
  color: #94a3b8;
}

/* 关闭的信封 */
.intro {
  min-height: 88vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 56rpx;
}

.intro-envelope {
  position: relative;
  width: 520rpx;
  height: 340rpx;
  border-radius: 18rpx;
  background: linear-gradient(160deg, #fffdf8, #f6ead2);
  box-shadow: 0 24rpx 56rpx rgba(124, 58, 237, 0.18);
  overflow: hidden;
  perspective: 1000rpx;
  transition: transform 0.5s ease, opacity 0.5s ease;
}

.intro-envelope:not(.is-opening) {
  animation: env-breathe 2.6s ease-in-out infinite;
}

.intro-envelope.is-opening {
  transform: translateY(-40rpx) scale(0.94);
  opacity: 0;
}

.intro-envelope__flap {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  border-left: 260rpx solid transparent;
  border-right: 260rpx solid transparent;
  border-top: 180rpx solid #f1dfc0;
  transform-origin: top center;
  transition: transform 0.5s ease;
  z-index: 3;
}

.intro-envelope.is-opening .intro-envelope__flap {
  transform: rotateX(160deg);
}

.intro-envelope__seal {
  position: absolute;
  top: 122rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #e06a8b, #c2185b);
  color: #ffffff;
  font-size: 46rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 18rpx rgba(194, 24, 91, 0.35);
  z-index: 4;
}

.intro-envelope__name {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 54rpx;
  text-align: center;
  font-size: 36rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
  color: #7a5b3a;
  z-index: 2;
}

.intro-hint {
  font-size: 26rpx;
  color: #9a7bd8;
  animation: hint-pulse 1.8s ease-in-out infinite;
}

@keyframes env-breathe {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12rpx);
  }
}

@keyframes hint-pulse {
  0%,
  100% {
    opacity: 0.45;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-6rpx);
  }
}

/* 拆开后：竖直居中的「展开信件」 */
.stage {
  min-height: calc(100vh - 48rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 36rpx;
}

.letter {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  border-radius: 10rpx;
  /* 背景与边框颜色由模版主题动态注入（见 letterStyle 计算属性） */
  border: 1rpx solid transparent;
  box-shadow: 0 24rpx 60rpx rgba(124, 58, 237, 0.16), 0 6rpx 16rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* 信纸从顶部向下「展开」 */
.letter-unfold {
  transform-origin: top center;
  animation: letter-unfold 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes letter-unfold {
  0% {
    opacity: 0;
    transform: perspective(1600rpx) rotateX(-80deg);
  }
  60% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: perspective(1600rpx) rotateX(0deg);
  }
}

.letter-content {
  position: relative;
  z-index: 2;
}

/* 让内部卡片融入信纸：去掉自身底色与阴影 */
.letter-content :deep(.invitation-card) {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

.letter-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 48rpx 36rpx;
}

.letter-action {
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
}

/* 只读查看时的变更记录 */
.change-banner {
  width: 100%;
  box-sizing: border-box;
  background: #fff7ed;
  border-radius: 14rpx;
  padding: 20rpx 24rpx;
}

.change-banner__title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #b45309;
  margin-bottom: 10rpx;
}

.change-banner__item {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  padding: 8rpx 0;
}

.change-banner__time {
  font-size: 20rpx;
  color: #d97706;
}

.change-banner__summary {
  font-size: 24rpx;
  color: #92400e;
  line-height: 1.5;
}

/* 收下邀请按钮 */
.accept-block {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.accept-btn {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 22rpx 64rpx;
  border-radius: 999rpx;
  color: #ffffff;
  box-shadow: 0 10rpx 24rpx rgba(124, 58, 237, 0.28);
}

.accept-btn--loading {
  opacity: 0.7;
}

.accept-btn__icon {
  font-size: 30rpx;
}

.accept-btn__text {
  font-size: 30rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.accepted-tip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: rgba(16, 185, 129, 0.12);
}

.accepted-tip__icon {
  font-size: 26rpx;
}

.accepted-tip__text {
  font-size: 24rpx;
  color: #047857;
}

.cta-create {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 18rpx 36rpx;
  border: 1rpx dashed;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.7);
  font-size: 26rpx;
}

.cta-create__icon {
  font-size: 26rpx;
}

.cta-create__text {
  font-size: 26rpx;
}

/* 次级入口：比「制作邀请函」更轻，引导了解更多功能 */
.cta-explore {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  margin-top: -12rpx;
  padding: 8rpx 12rpx;
  opacity: 0.72;
}

.cta-explore__text {
  font-size: 24rpx;
}

.cta-explore__arrow {
  font-size: 26rpx;
  line-height: 1;
}

.card-wrapper.placeholder {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 48rpx 36rpx;
  text-align: center;
  margin-top: 40rpx;
}

.placeholder-text {
  font-size: 28rpx;
  color: #86909c;
  padding: 60rpx 0;
}
</style>
