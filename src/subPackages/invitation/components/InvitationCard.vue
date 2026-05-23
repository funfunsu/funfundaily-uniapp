<template>
  <view class="invitation-card" :style="{ background: style.cardBg }">
    <!-- 称呼 -->
    <view
      v-show="started('salutation')"
      class="lt-salutation"
      :style="{ color: style.titleColor }"
    ><text selectable user-select>{{ shown('salutation') }}</text><text v-if="typingKey === 'salutation'" class="tw-caret">▋</text></view>

    <!-- 邀请开场：诚邀你参加「活动标题」 -->
    <view
      v-show="started('opening')"
      class="lt-opening"
      :style="{ color: style.bodyColor }"
    ><text selectable user-select>{{ shown('opening') }}</text><text v-if="typingKey === 'opening'" class="tw-caret">▋</text></view>

    <!-- 正文 -->
    <view
      v-show="started('body')"
      class="lt-body"
      :style="{ color: style.bodyColor }"
    ><text selectable user-select>{{ shown('body') }}</text><text v-if="typingKey === 'body'" class="tw-caret">▋</text></view>

    <!-- 时间 / 地点 -->
    <view v-show="started('time')" class="lt-meta">
      <view
        class="lt-meta-line"
        :style="{ color: style.metaColor }"
      ><text selectable user-select>{{ shown('time') }}</text><text v-if="typingKey === 'time'" class="tw-caret">▋</text></view>
      <view
        v-show="started('address')"
        class="lt-meta-line lt-address-line"
        :style="{ color: style.metaColor }"
      ><text selectable user-select>{{ shown('address') }}</text><text v-if="typingKey === 'address'" class="tw-caret">▋</text><text
          v-if="showCopyAddress"
          class="lt-copy-btn"
          :style="{ background: style.badgeBg, color: style.badgeColor }"
          @click="copyAddress"
        >复制</text></view>
    </view>

    <!-- 落款 -->
    <view
      v-if="content.creatorNickname"
      v-show="started('signature')"
      class="lt-signature"
      :style="{ color: style.titleColor }"
    ><text selectable user-select>{{ shown('signature') }}</text><text v-if="typingKey === 'signature'" class="tw-caret">▋</text></view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { resolveCardStyle, CARD_STYLES } from '../utils/cardStyles'
import type { CardStyle } from '../utils/cardStyles'

interface CardContent {
  title?: string
  recipientName?: string
  eventTime?: string
  address?: string
  body?: string
  creatorNickname?: string
}

const props = withDefaults(
  defineProps<{
    content: CardContent
    styleId?: string
    // 开启后，卡片内容会逐字浮现（用于受邀人首次拆信时）；
    // 默认关闭，预览/列表场景立即显示完整内容。
    reveal?: boolean
    // 逐字浮现前的延迟（ms），可用于先播完信纸展开动画再开始书写。
    revealDelay?: number
    // 是否在地址行显示「复制」按钮（仅受邀人预览页需要）。
    allowCopyAddress?: boolean
  }>(),
  { reveal: false, revealDelay: 0, allowCopyAddress: false }
)

const style = computed<CardStyle>(() => resolveCardStyle(props.styleId))
void CARD_STYLES

interface Segment {
  key: string
  text: string
  start: number
  end: number
}

// 按照写信的顺序：称呼 → 邀请开场 → 正文 → 时间 → 地点 → 落款
const segments = computed<Segment[]>(() => {
  const c = props.content
  const out: Segment[] = []
  let acc = 0
  const push = (key: string, text?: string) => {
    if (!text) return
    out.push({ key, text, start: acc, end: acc + text.length })
    acc += text.length
  }
  push('salutation', `亲爱的 ${c.recipientName || '朋友'}：`)
  push('opening', `诚邀你参加「${c.title || '活动标题'}」`)
  push('body', c.body || '邀请正文…')
  push('time', `时间：${c.eventTime || '时间待定'}`)
  push('address', `地点：${c.address || '地址待定'}`)
  push('signature', c.creatorNickname ? `${c.creatorNickname} 敬上` : '')
  return out
})

const totalChars = computed(() => segments.value.reduce((n, s) => Math.max(n, s.end), 0))
const segMap = computed<Record<string, Segment>>(() => {
  const m: Record<string, Segment> = {}
  segments.value.forEach((s) => {
    m[s.key] = s
  })
  return m
})

const revealed = ref(0)

const shown = (key: string): string => {
  const s = segMap.value[key]
  if (!s) return ''
  if (!props.reveal || revealed.value >= s.end) return s.text
  if (revealed.value <= s.start) return ''
  return s.text.slice(0, revealed.value - s.start)
}
const started = (key: string): boolean => {
  const s = segMap.value[key]
  if (!s) return false
  if (!props.reveal) return true
  return revealed.value > s.start
}
const typingKey = computed<string>(() => {
  if (!props.reveal) return ''
  for (const s of segments.value) {
    if (revealed.value > s.start && revealed.value < s.end) return s.key
  }
  return ''
})

// 复制按钮：调用方开启 allowCopyAddress、有地址、且地址行已写完（typing 已过 address 段）时显示。
const showCopyAddress = computed<boolean>(() => {
  if (!props.allowCopyAddress) return false
  if (!props.content.address) return false
  const seg = segMap.value['address']
  if (!seg) return false
  return revealed.value >= seg.end
})

let timer: ReturnType<typeof setInterval> | null = null
let delayTimer: ReturnType<typeof setTimeout> | null = null
const stopReveal = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (delayTimer) {
    clearTimeout(delayTimer)
    delayTimer = null
  }
}
const startReveal = () => {
  stopReveal()
  const total = totalChars.value
  revealed.value = 0
  if (!total) return
  const run = () => {
    // 控制总时长在 1.2s~3.2s，内容越长每帧揭示越多字，避免受邀人等得不耐烦。
    const targetMs = Math.min(3200, Math.max(1200, total * 22))
    const tickMs = 30
    const ticks = Math.max(1, Math.round(targetMs / tickMs))
    const step = Math.max(1, Math.ceil(total / ticks))
    timer = setInterval(() => {
      revealed.value = Math.min(total, revealed.value + step)
      if (revealed.value >= total) stopReveal()
    }, tickMs)
  }
  if (props.revealDelay > 0) delayTimer = setTimeout(run, props.revealDelay)
  else run()
}

const applyMode = () => {
  if (props.reveal) startReveal()
  else {
    stopReveal()
    revealed.value = totalChars.value
  }
}

onMounted(applyMode)
onUnmounted(stopReveal)
watch(() => props.reveal, applyMode)

const copyAddress = () => {
  const address = props.content.address
  if (!address) return
  uni.setClipboardData({
    data: address,
    success: () => uni.showToast({ title: '地址已复制', icon: 'success' })
  } as any)
}
</script>

<style scoped>
.invitation-card {
  padding: 60rpx 48rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
}

/* 「亲爱的 XXX：」 */
.lt-salutation {
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 28rpx;
}

/* 「诚邀你参加「活动标题」」 */
.lt-opening {
  font-size: 28rpx;
  line-height: 1.8;
  text-indent: 2em;
  margin-bottom: 18rpx;
}

/* 正文 */
.lt-body {
  font-size: 28rpx;
  line-height: 1.85;
  text-indent: 2em;
  white-space: pre-wrap;
  margin-bottom: 40rpx;
  opacity: 0.92;
}

/* 时间 / 地点 */
.lt-meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 28rpx;
}

.lt-meta-line {
  font-size: 26rpx;
  line-height: 1.75;
  text-indent: 2em;
}

.lt-address-line {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12rpx;
}

.lt-copy-btn {
  /* text-indent 会把行内 text 节点的首字符也缩进，复位回 0 */
  text-indent: 0;
  font-size: 22rpx;
  line-height: 1;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
}

/* 落款 */
.lt-signature {
  margin-top: 60rpx;
  font-size: 28rpx;
  font-weight: 500;
  text-align: right;
  letter-spacing: 1rpx;
}

.tw-caret {
  display: inline-block;
  margin-left: 2rpx;
  font-weight: 400;
  opacity: 0.55;
  animation: tw-blink 0.7s steps(1, end) infinite;
}

@keyframes tw-blink {
  50% {
    opacity: 0;
  }
}
</style>
