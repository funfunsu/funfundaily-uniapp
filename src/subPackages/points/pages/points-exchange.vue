<template>
  <view class="exchange-page">
    <!-- 顶部积分卡 -->
    <view class="balance-card">
      <view class="balance-card__left">
        <text class="balance-card__label">我的积分</text>
        <text class="balance-card__value">{{ myScore !== null ? myScore : '--' }}</text>
        <text class="balance-card__hint" v-if="currentGroup.groupName">{{ currentGroup.groupName }}</text>
      </view>
      <view class="balance-card__right" @click="goRecords">
        <text class="balance-card__action-text">兑换记录</text>
        <text class="balance-card__action-arrow">›</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="section-title">
      <text class="section-title__main">可兑换商品</text>
      <text class="section-title__count" v-if="products.length > 0">共 {{ products.length }} 件</text>
    </view>

    <view class="products" v-if="!isLoading && products.length > 0">
      <view class="product-card" v-for="item in products" :key="item.id">
        <view class="product-card__media">
          <text class="product-card__points">{{ item.points }} 积分</text>
        </view>
        <view class="product-card__body">
          <text class="product-card__name">{{ item.name }}</text>
          <text class="product-card__desc">{{ item.description || ' ' }}</text>
          <button
              class="product-card__btn"
              :class="{ 'product-card__btn--disabled': cannotAfford(item) }"
              :disabled="cannotAfford(item)"
              @click="onExchange(item)">
            {{ cannotAfford(item) ? '积分不足' : '立即兑换' }}
          </button>
        </view>
      </view>
    </view>

    <view class="empty" v-else-if="!isLoading">
      <text class="empty__icon">🎁</text>
      <text class="empty__text">{{ currentGroup.id ? '暂无可兑换商品' : '请先选择群组' }}</text>
    </view>
  </view>

  <schedule-bottom-bar :buttons="buttons"
                       :is-tab-bar-page="false"
                       :show-group-member="true"
                       @member-change="handleMemberChange"
                       @buttonClick="handleButtonClick" />
</template>

<script setup>
import {ref} from 'vue';
import apiTs from '../../../utils/apiTs';
import ScheduleBottomBar from "../../../components/schedule-bottom-bar.vue";

const isLoading = ref(true);
const currentGroup = ref({});
const currentMember = ref(null);
const products = ref([]);
const myScore = ref(null);

const buttons = ref([]);
const handleButtonClick = () => {};

const cannotAfford = (item) => myScore.value !== null && myScore.value < item.points;

function handleMemberChange(e) {
  currentGroup.value = e.currentGroup || {};
  currentMember.value = e.currentMember || null;
  fetchAll();
}

async function fetchAll() {
  await Promise.all([fetchPointBalance(), fetchProducts()]);
}

const fetchPointBalance = async () => {
  if (!currentMember.value || !currentGroup.value || !currentGroup.value.id) {
    myScore.value = null;
    return;
  }
  try {
    const req = {flowType: 'POINTS', targetUserId: currentMember.value.userId, groupId: currentGroup.value.id};
    const balance = await apiTs.flow.balance(req);
    myScore.value = typeof balance === 'number' ? balance : (balance != null ? Number(balance) : 0);
  } catch (e) {
    console.error('获取积分余额失败:', e);
    myScore.value = null;
  }
};

const fetchProducts = async () => {
  if (!currentGroup.value.id) {
    isLoading.value = false;
    products.value = [];
    return;
  }
  try {
    isLoading.value = true;
    const res = await apiTs.pointExchange.listProducts({groupId: currentGroup.value.id});
    if (Array.isArray(res)) {
      products.value = res.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        points: item.requiredScore,
        status: item.status
      }));
    } else {
      products.value = [];
    }
  } catch (e) {
    console.error('获取兑换商品失败:', e);
    products.value = [];
    uni.showToast({title: '获取商品列表失败', icon: 'none'});
  } finally {
    isLoading.value = false;
  }
};

const onExchange = (item) => {
  if (cannotAfford(item)) return;
  uni.showModal({
    title: '确认兑换',
    content: `「${item.name}」需要 ${item.points} 积分，是否确认兑换？`,
    confirmColor: '#007AFF',
    success: (res) => {
      if (res.confirm) doExchange(item);
    }
  });
};

const doExchange = async (item) => {
  try {
    const res = await apiTs.pointExchange.exchange({
      groupId: currentGroup.value.id,
      productId: item.id,
      productRequiredScore: item.points
    });
    if (res && res.balanceAfter != null) {
      myScore.value = res.balanceAfter;
      uni.showToast({title: '兑换成功', icon: 'success'});
    } else {
      uni.showToast({title: '兑换失败', icon: 'none'});
    }
  } catch (e) {
    console.error('兑换失败:', e);
    uni.showToast({title: (e && e.message) || '兑换失败，请重试', icon: 'none'});
  }
};

const goRecords = () => {
  if (!currentGroup.value.id) {
    uni.showToast({title: '请先选择群组', icon: 'none'});
    return;
  }
  const userId = currentMember.value && currentMember.value.userId
      ? currentMember.value.userId
      : '';
  uni.navigateTo({
    url: `/subPackages/points/pages/points-exchange-records?groupId=${currentGroup.value.id}&userId=${userId}`
  });
};
</script>

<style scoped>
/* 主题 tokens 定义见 App.vue */
.exchange-page {
  padding: 24rpx;
  padding-bottom: 160rpx;
  background-color: var(--color-bg-page);
  min-height: 100vh;
}

/* 顶部积分卡 */
.balance-card {
  display: flex;
  align-items: stretch;
  background: var(--gradient-primary);
  border-radius: var(--radius-block);
  padding: 32rpx;
  box-shadow: var(--shadow-primary-elevated);
  margin-bottom: 24rpx;
}

.balance-card__left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.balance-card__label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 6rpx;
}

.balance-card__value {
  font-size: 64rpx;
  font-weight: 700;
  color: var(--color-text-on-primary);
  line-height: 1.1;
}

.balance-card__hint {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 6rpx;
}

.balance-card__right {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-pill);
  padding: 12rpx 24rpx;
  align-self: center;
}

.balance-card__action-text {
  font-size: 24rpx;
  color: var(--color-text-on-primary);
}

.balance-card__action-arrow {
  font-size: 28rpx;
  color: var(--color-text-on-primary);
  margin-left: 6rpx;
  line-height: 1;
}

/* 分区标题 */
.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 8rpx 4rpx 16rpx;
}

.section-title__main {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-title__count {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

/* 商品网格 */
.products {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.product-card {
  width: calc(50% - 10rpx);
  background-color: var(--color-bg-card);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
}

.product-card__media {
  position: relative;
  height: 180rpx;
  background: var(--gradient-soft-media);
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-card__points {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--color-primary);
  background-color: var(--color-bg-card);
  border-radius: var(--radius-pill);
  padding: 8rpx 20rpx;
  box-shadow: var(--shadow-pill);
}

.product-card__body {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}

.product-card__name {
  font-size: 28rpx;
  color: var(--color-text-primary);
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card__desc {
  font-size: 22rpx;
  color: var(--color-text-secondary);
  line-height: 1.4;
  min-height: 56rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card__btn {
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius-pill);
  font-size: 24rpx;
  font-weight: 500;
  padding: 12rpx 0;
  margin-top: 8rpx;
}

.product-card__btn--disabled,
.product-card__btn[disabled] {
  background-color: var(--color-bg-disabled) !important;
  color: var(--color-text-disabled) !important;
}

/* 空态 */
.empty {
  text-align: center;
  padding: 120rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.empty__icon {
  font-size: 80rpx;
}

.empty__text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}
</style>
