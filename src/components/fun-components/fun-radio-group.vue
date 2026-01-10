<template>
  <view class="type-selector">
    <view
        class="selector-item"
        :class="{ 'selected': modelValue === item.value }"
        @click="handleSelect(item.value)"
        v-for="(item, index) in options"
        :key="index"
    >
      <text class="type-text">{{  item.label }}</text>
    </view>
  </view>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue'

// 1. 接收父组件传入的参数
const props = defineProps({
  options: {
    type: Array,
    required: true,
    default: () => []
  },
  // 必传：v-model绑定的值（双向绑定）
  modelValue: {
    type: [String, Number],
    required: true
  }
})

// 2. 定义事件，实现v-model双向绑定核心逻辑
const emit = defineEmits(['update:modelValue'])

// 3. 点击选中项
const handleSelect = (val) => {
  emit('update:modelValue', val)
}
</script>

<style scoped>
/* 完全复用你原有的样式 + 优化后的完美样式，无任何改动，保留全部视觉效果 */
.type-selector {
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.selector-item {
  flex: 1;
  border: 1rpx solid #ddd;
  font-size: 28rpx;
  transition: all 0.3s;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* ✅ 核心3：第一个item 只显示 左上角+左下角 圆角 */
.selector-item:first-child {
  border-radius: 8rpx 0 0 8rpx;
  margin-left: 0; /* 第一个项取消左边的负边距 */
}
/* ✅ 核心4：最后一个item 只显示 右上角+右下角 圆角 */
.selector-item:last-child {
  border-radius: 0 8rpx 8rpx 0;
}

/* 选中样式 - 你原有的高亮效果，完美保留 */
.selector-item.selected {
  background-color: #007aff;
  color: white;
  border-color: #007aff;
}

.type-text {
  font-size: 28rpx;
}
</style>