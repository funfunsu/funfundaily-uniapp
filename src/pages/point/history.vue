<template>
  <view class="page-container">
    <!-- 顶部：当前余额汇总 -->
    <view class="balance-card">
      <text class="balance-label">{{ memberName ? memberName + ' 的总积分' : '总积分' }}</text>
      <text class="balance-value">{{ balance }}</text>
    </view>

    <!-- 流水列表 -->
    <scroll-view class="flow-scroll" scroll-y>
      <view v-if="loading" class="flow-empty">
        <text class="flow-empty__text">加载中…</text>
      </view>
      <view v-else-if="flowList.length === 0" class="flow-empty">
        <text class="flow-empty__icon">🪙</text>
        <text class="flow-empty__text">还没有积分流水</text>
      </view>
      <view v-else class="flow-list">
        <view v-for="flow in flowList" :key="flow.id" class="flow-item">
          <view class="flow-item__main">
            <text class="flow-item__desc">{{ flow.description || (isIncome(flow) ? '积分增加' : '积分扣减') }}</text>
            <text class="flow-item__time">{{ formatTime(flow.createdAt) }}</text>
          </view>
          <view class="flow-item__right">
            <text class="flow-item__amount" :class="isIncome(flow) ? 'is-income' : 'is-expense'">
              {{ formatAmount(flow.amount) }}
            </text>
            <text v-if="flow.balance !== undefined && flow.balance !== null" class="flow-item__balance">余额 {{ flow.balance }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import apiTs from '../../utils/apiTs'
import { ensureCurrentContext } from '../../utils/currentGroupResolver'

const FLOW_TYPE = 'POINTS'

const groupId = ref('')
const targetUserId = ref('')
const memberName = ref('')
const balance = ref(0)
const flowList = ref([])
const loading = ref(true)

// INCOME（完成打卡等）amount 为正；EXPENSE（兑换/扣减）amount 为负。
const isIncome = (flow) => Number(flow?.amount || 0) >= 0

const formatAmount = (amount) => {
  const n = Number(amount || 0)
  return n >= 0 ? `+${n}` : `${n}`
}

// createdAt 形如 "2026-05-29T09:00:00"，展示为 "05-29 09:00"
const formatTime = (raw) => {
  if (!raw) return ''
  const s = String(raw)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (m) return `${m[2]}-${m[3]} ${m[4]}:${m[5]}`
  return s
}

async function resolveContext(query) {
  if (query?.groupId && query?.targetUserId) {
    groupId.value = query.groupId
    targetUserId.value = query.targetUserId
    if (query.name) memberName.value = decodeURIComponent(query.name)
    return true
  }
  const ctx = await ensureCurrentContext()
  if (!ctx) {
    uni.showToast({ title: '请先选择小队成员', icon: 'none' })
    return false
  }
  groupId.value = ctx.group.id
  targetUserId.value = ctx.member.userId ?? ctx.member.id
  return true
}

async function fetchData() {
  if (!groupId.value || !targetUserId.value) return
  loading.value = true
  const req = { flowType: FLOW_TYPE, targetUserId: targetUserId.value, groupId: groupId.value }
  try {
    const [bal, list] = await Promise.all([
      apiTs.flow.balance(req),
      apiTs.flow.list({ ...req, pageNo: 1, pageSize: 200 })
    ])
    balance.value = bal || 0
    // 后端已按 createdAt 倒序返回，直接使用
    flowList.value = Array.isArray(list) ? list : []
  } catch (e) {
    console.error('获取积分流水失败:', e)
    flowList.value = []
  } finally {
    loading.value = false
  }
}

onLoad(async (query) => {
  const ok = await resolveContext(query)
  if (ok) await fetchData()
  else loading.value = false
})

onShow(() => {
  if (groupId.value && targetUserId.value) fetchData()
})
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.balance-card {
  margin: 20rpx;
  padding: 36rpx 32rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #2196f3 0%, #007AFF 100%);
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.22);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.balance-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}
.balance-value {
  font-size: 64rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.1;
}

.flow-scroll {
  flex: 1;
  min-height: 0;
}

.flow-list {
  margin: 0 20rpx 20rpx;
  border-radius: 20rpx;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.flow-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 28rpx;
  border-bottom: 1rpx solid #f1f5f9;
}
.flow-item:last-child {
  border-bottom: none;
}
.flow-item__main {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  flex: 1;
  min-width: 0;
}
.flow-item__desc {
  font-size: 29rpx;
  color: #1f2937;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.flow-item__time {
  font-size: 23rpx;
  color: #9aa3af;
}
.flow-item__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  flex-shrink: 0;
  margin-left: 20rpx;
}
.flow-item__amount {
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.1;
}
.flow-item__amount.is-income {
  color: #00b050;
}
.flow-item__amount.is-expense {
  color: #e64340;
}
.flow-item__balance {
  font-size: 23rpx;
  color: #9aa3af;
}

.flow-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
  gap: 16rpx;
}
.flow-empty__icon {
  font-size: 72rpx;
}
.flow-empty__text {
  font-size: 28rpx;
  color: #9aa3af;
}
</style>
