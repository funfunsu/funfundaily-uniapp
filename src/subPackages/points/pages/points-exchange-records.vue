<template>
  <view class="records-page">
    <view class="records-header">
      <text class="records-header__title">兑换记录</text>
      <text class="records-header__total" v-if="total > 0">共 {{ total }} 条</text>
    </view>

    <view class="records-list" v-if="!isLoading && records.length > 0">
      <view class="record-item" v-for="r in records" :key="r.id">
        <view class="record-item__left">
          <text class="record-item__name">{{ r.productName }}</text>
          <text class="record-item__time">{{ formatTime(r.exchangeTime) }}</text>
        </view>
        <view class="record-item__right">
          <text class="record-item__deduct">-{{ r.scoreDeducted }}</text>
          <text class="record-item__balance">余 {{ r.balanceAfter }}</text>
        </view>
      </view>
    </view>

    <view class="loading" v-else-if="isLoading">
      <text class="loading__text">加载中...</text>
    </view>

    <view class="empty" v-else>
      <text class="empty__icon">📭</text>
      <text class="empty__text">暂无兑换记录</text>
    </view>
  </view>
</template>

<script setup>
import {ref} from 'vue';
import {onLoad, onReachBottom} from '@dcloudio/uni-app';
import apiTs from '../../../utils/apiTs';

const isLoading = ref(true);
const records = ref([]);
const total = ref(0);
const groupId = ref(null);
const userId = ref(null);
const page = ref(1);
const pageSize = 20;
const noMore = ref(false);

onLoad((options) => {
  groupId.value = options.groupId ? Number(options.groupId) : null;
  userId.value = options.userId ? Number(options.userId) : null;
  fetchRecords(true);
});

onReachBottom(() => {
  if (noMore.value || isLoading.value) return;
  page.value += 1;
  fetchRecords(false);
});

const fetchRecords = async (reset) => {
  if (!groupId.value) {
    isLoading.value = false;
    return;
  }
  try {
    if (reset) {
      page.value = 1;
      noMore.value = false;
      records.value = [];
    }
    isLoading.value = true;
    const params = {
      groupId: groupId.value,
      page: page.value,
      pageSize
    };
    if (userId.value) params.userId = userId.value;

    // res 直接是 PointExchangeRecordsResponse: { total, list }
    const res = await apiTs.pointExchange.queryRecords(params);
    if (res && Array.isArray(res.list)) {
      total.value = res.total || res.list.length;
      records.value = reset ? res.list : records.value.concat(res.list);
      if (records.value.length >= total.value || res.list.length < pageSize) {
        noMore.value = true;
      }
    } else if (reset) {
      records.value = [];
      total.value = 0;
    }
  } catch (e) {
    console.error('获取兑换记录失败:', e);
    uni.showToast({title: '获取记录失败', icon: 'none'});
  } finally {
    isLoading.value = false;
  }
};

const formatTime = (iso) => {
  if (!iso) return '';
  // 后端格式 yyyy-MM-ddTHH:mm:ss
  const [date, time] = String(iso).split('T');
  if (!time) return date;
  return `${date} ${time.substring(0, 5)}`;
};
</script>

<style scoped>
/* 主题 tokens 定义见 App.vue */
.records-page {
  padding: 24rpx;
  background-color: var(--color-bg-page);
  min-height: 100vh;
}

.records-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.records-header__title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
}

.records-header__total {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background-color: var(--color-bg-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.record-item__left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
  min-width: 0;
}

.record-item__name {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--color-text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.record-item__time {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

.record-item__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
  margin-left: 16rpx;
}

.record-item__deduct {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--color-primary);
}

.record-item__balance {
  font-size: 22rpx;
  color: var(--color-text-secondary);
}

.loading {
  text-align: center;
  padding: 80rpx 0;
}

.loading__text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.empty {
  text-align: center;
  padding: 160rpx 40rpx;
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
