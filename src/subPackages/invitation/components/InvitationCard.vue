<template>
  <view class="invitation-card" :style="{ background: style.cardBg }">
    <view
      class="invitation-card__badge"
      :style="{ background: style.badgeBg, color: style.badgeColor }"
    >
      邀请函
    </view>
    <view class="invitation-card__title" :style="{ color: style.titleColor }">
      {{ content.title || '活动标题' }}
    </view>
    <view
      v-if="content.recipientName"
      class="invitation-card__recipient"
      :style="{ color: style.titleColor }"
    >
      诚邀 {{ content.recipientName }} 莅临
    </view>
    <view class="invitation-card__meta">
      <text class="meta-line" :style="{ color: style.metaColor }">
        🕘 {{ content.eventTime || '时间待定' }}
      </text>
      <text class="meta-line" :style="{ color: style.metaColor }">
        📍 {{ content.address || '地址待定' }}
      </text>
    </view>
    <view class="invitation-card__divider" :style="{ background: style.dividerColor }"></view>
    <view class="invitation-card__body" :style="{ color: style.bodyColor }">
      {{ content.body || '邀请正文…' }}
    </view>
    <view
      v-if="content.creatorNickname"
      class="invitation-card__signature"
      :style="{ color: style.metaColor }"
    >
      来自 {{ content.creatorNickname }}
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const props = defineProps<{
  content: CardContent
  styleId?: string
}>()

const style = computed<CardStyle>(() => resolveCardStyle(props.styleId))
void CARD_STYLES
</script>

<style scoped>
.invitation-card {
  border-radius: 16rpx;
  padding: 48rpx 36rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.invitation-card__badge {
  display: inline-block;
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  margin-bottom: 24rpx;
}

.invitation-card__title {
  font-size: 44rpx;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 16rpx;
}

.invitation-card__recipient {
  font-size: 28rpx;
  margin-bottom: 24rpx;
  opacity: 0.85;
}

.invitation-card__meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 18rpx;
}

.meta-line {
  font-size: 26rpx;
  line-height: 1.5;
}

.invitation-card__divider {
  height: 2rpx;
  margin: 18rpx 0;
}

.invitation-card__body {
  font-size: 28rpx;
  line-height: 1.7;
  white-space: pre-wrap;
}

.invitation-card__signature {
  margin-top: 28rpx;
  font-size: 22rpx;
  text-align: right;
  opacity: 0.75;
}
</style>
