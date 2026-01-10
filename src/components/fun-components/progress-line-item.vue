<template>
  <view class="progress-bar-container">
    <view
        v-for="n in totalCount"
        :key="n"
        class="progress-line"
        :class="{
        'line-filled': n <= fillCount,
        'line-current': n === fillCount,
        'line-disabled': isCompleted
      }"
        @click.stop="!isCompleted && handleItemClick(n)"
    ></view>
  </view>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

// ✅ 父组件传递的参数
const props = defineProps({
  // 总打卡次数（原startCount）
  totalCount: {
    type: Number,
    required: true,
    default: 0
  },
  // 已打卡填充数（原fillStartCount）
  fillCount: {
    type: Number,
    required: true,
    default: 0
  },
  // 任务是否完成（是否禁用点击）
  isCompleted: {
    type: Boolean,
    required: true,
    default: false
  }
})

// ✅ 向父组件派发点击事件
const emit = defineEmits(['star-click'])

// ✅ 点击竖线触发事件，把点击的序号传给父组件
const handleItemClick = (n) => {
  emit('star-click', n)
}
</script>

<style scoped>
/* ✅ 进度条容器+竖线所有样式，全部迁移过来，独立作用域不污染其他样式 */
.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
  height: 24rpx;
}
.progress-line {
  width: 6rpx;
  height: 20rpx;
  border-radius: 3rpx;
  background-color: #E5E7EB;
  transition: all 0.2s ease-in-out;
  flex-shrink: 0;
}
.progress-line.line-filled {
  background-color: #007AFF;
}
.progress-line.line-current {
  height: 26rpx;
}
.progress-line.line-disabled {
  cursor: not-allowed;
}
.progress-line:not(.line-filled):not(.line-disabled) {
  cursor: pointer;
}
.progress-line:not(.line-filled):not(.line-disabled):active {
  background-color: #CBD5E1;
  height: 22rpx;
}
</style>