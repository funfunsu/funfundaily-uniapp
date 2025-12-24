<template>
  <view class="transaction-item">
    <view class="item-content">
      <view class="summary-section">
        <text class="summary">{{ transaction.description || '无摘要' }}</text>
        <text class="time">{{ transaction.createdAt || '未知时间' }}</text>
      </view>
      <view class="amount-section">
        <text class="amount" :class="{ 'income': transaction.amount < 0, 'expense': transaction.amount > 0 }">
          {{ formatAmount(transaction.amount) }}
        </text>
        <text class="balance" v-if="transaction.balance !== undefined">¥{{ formatBalance(transaction.balance) }}</text>
      </view>
    </view>
    <view class="divider" v-if="showDivider"></view>
  </view>
</template>

<script setup>
import { defineProps } from 'vue';

// 定义接收的属性，单个流水对象
const props = defineProps({
  transaction: {
    type: Object,
    default: () => ({
      amount: 0,
      balance: 0,
      createdAt: '',
      description: ''
    }),
    required: true
  },
  showDivider: {
    type: Boolean,
    default: true // 默认显示分界线
  }
});

// 格式化金额，例如 1234.5 -> "1,234.50"
const formatAmount = (valueInFen) => {
  if (typeof valueInFen !== 'number') {
    return '0.00';
  }
  const yuanValue = Math.abs(valueInFen) / 100;
  return yuanValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 格式化余额显示，只保留整数部分和两位小数
const formatBalance = (valueInFen) => {
  if (typeof valueInFen !== 'number') {
    return '0.00';
  }
  const yuanValue = Math.abs(valueInFen) / 100;
  return yuanValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
</script>

<style scoped>
.transaction-item {
  position: relative;
  padding: 28rpx 32rpx;
  background-color: #fff;
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20rpx;
}

.summary-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.summary {
  font-size: 30rpx;
  color: #333;
  line-height: 1.4;
}

.time {
  font-size: 24rpx;
  color: #999;
}

.amount-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  min-width: 120rpx;
}

.amount {
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1.2;
}

.amount.income {
  color: #00b050; /* 收入绿色 */
}

.amount.expense {
  color: #e64340; /* 支出红色 */
}

.balance {
  font-size: 24rpx;
  color: #999;
}

.divider {
  position: absolute;
  bottom: 0;
  left: 32rpx;
  right: 32rpx;
  height: 1rpx;
  background-color: #f0f0f0;
  transform: scaleY(0.5); /* 1像素线 */
}
</style>