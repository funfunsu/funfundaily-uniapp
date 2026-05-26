<template>
  <!-- 无任务时的引导卡片：帮助新用户了解任务打卡功能并吸引其开始使用 -->
  <view class="onboarding">
    <view class="onboarding__hero">
      <text class="onboarding__emoji">🎯</text>
      <text class="onboarding__title">开启你的任务打卡之旅</text>
      <text class="onboarding__subtitle">完成任务 · 赚取积分 · 养成好习惯</text>
    </view>

    <view class="onboarding__features">
      <view class="feature-item">
        <text class="feature-icon">📝</text>
        <view class="feature-text">
          <text class="feature-title">制定任务计划</text>
          <text class="feature-desc">添加每日、每周或一次性任务，目标更清晰</text>
        </view>
      </view>
      <view class="feature-item">
        <text class="feature-icon">✅</text>
        <view class="feature-text">
          <text class="feature-title">打卡完成赚积分</text>
          <text class="feature-desc">每完成一项任务即可获得积分奖励</text>
        </view>
      </view>
      <view class="feature-item">
        <text class="feature-icon">🎁</text>
        <view class="feature-text">
          <text class="feature-title">积分兑换奖励</text>
          <text class="feature-desc">攒下的积分可以兑换心仪的奖励</text>
        </view>
      </view>
    </view>

    <button class="onboarding__cta" @click="emit('create-task')">+ 创建第一个任务</button>
    <text class="onboarding__hint">完成任务后即可在这里看到今天的打卡进度</text>
  </view>
</template>

<script setup>
import { defineEmits } from 'vue'

const emit = defineEmits(['create-task'])
</script>

<style scoped>
.onboarding {
  margin: 40rpx auto 0;
  padding: 56rpx 40rpx 48rpx;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 14rpx 36rpx rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* --- 头部 --- */
.onboarding__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.onboarding__emoji {
  font-size: 96rpx;
  line-height: 1;
}
.onboarding__title {
  margin-top: 24rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #1d2129;
}
.onboarding__subtitle {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #86909c;
}

/* --- 功能亮点 --- */
.onboarding__features {
  width: 100%;
  margin: 44rpx 0 8rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}
.feature-icon {
  font-size: 40rpx;
  line-height: 1.3;
  flex-shrink: 0;
}
.feature-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.feature-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1d2129;
}
.feature-desc {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #86909c;
  line-height: 1.4;
}

/* --- CTA --- */
.onboarding__cta {
  margin-top: 48rpx;
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(90deg, #2196f3 0%, #007AFF 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  box-shadow: 0 10rpx 24rpx rgba(0, 122, 255, 0.28);
}
.onboarding__cta::after {
  border: none;
}
.onboarding__hint {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: #c0c4cc;
  text-align: center;
}
</style>
