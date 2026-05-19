<template>
  <view class="container">
    <view v-if="loaded && data" class="card-wrapper">
      <InvitationCard
        :content="{
          title: data.title,
          eventTime: data.eventTime,
          address: data.address,
          body: data.body,
          recipientName: data.recipientName,
          creatorNickname: creatorNickname,
        }"
        :styleId="data.cardStyle"
      />
    </view>

    <view class="card-wrapper placeholder" v-else-if="loaded">
      <view class="placeholder-text">邀请函不存在或已过期</view>
    </view>

    <view class="action-bar" v-if="loaded && data">
      <button class="share-button" open-type="share">分享给微信好友</button>
      <button v-if="isOwner" class="copy-button" @click="copyLink">复制链接</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import apiTs from '../../../utils/apiTs'
import InvitationCard from '../components/InvitationCard.vue'
import type { InvitationShareContent } from '../types/invitation'

const data = ref<InvitationShareContent | null>(null)
const creatorNickname = ref('')
const token = ref('')
const isOwner = ref(false)
const loaded = ref(false)

onLoad(async (query: any) => {
  if (!query?.token) {
    loaded.value = true
    uni.showToast({ title: '缺少邀请令牌', icon: 'none' })
    return
  }
  token.value = query.token
  isOwner.value = query.owner === '1'

  try {
    const resp: any = await apiTs.share.getContent(token.value)
    if (resp?.data) {
      data.value = resp.data as InvitationShareContent
      creatorNickname.value = resp.creatorNickname || ''
    }
  } catch (err) {
    console.error('加载邀请函失败:', err)
  } finally {
    loaded.value = true
  }
})

// #ifdef MP-WEIXIN
onShareAppMessage(() => {
  const title = data.value
    ? `${creatorNickname.value || ''}邀请你参加${data.value.title}`.trim()
    : '邀请函'
  return {
    title,
    path: `/subPackages/invitation/pages/preview?token=${token.value}`
  }
})
// #endif

const copyLink = () => {
  if (!token.value) return
  uni.setClipboardData({
    data: `/subPackages/invitation/pages/preview?token=${token.value}`,
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' })
  })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f0f2f5;
  padding: 24rpx;
  box-sizing: border-box;
}

.card-wrapper.placeholder {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 48rpx 36rpx;
  text-align: center;
}

.placeholder-text {
  font-size: 28rpx;
  color: #86909c;
  padding: 60rpx 0;
}

.action-bar {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.share-button {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
  background-color: #2196f3;
  border: none;
  border-radius: 10rpx;
}

.copy-button {
  font-size: 28rpx;
  color: #2196f3;
  background-color: #ffffff;
  border: 2rpx solid #2196f3;
  border-radius: 10rpx;
}
</style>
