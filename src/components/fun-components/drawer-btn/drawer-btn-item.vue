<template>
  <view
      class="child-circle-btn"
      :style="{
        width: circleSize + 'rpx',
        height: circleSize + 'rpx',
        backgroundColor: bgColor || mainColor,
        top: y + 'rpx',
        left: x + 'rpx'
      }"
      @click.stop="handleClick"
  >
    <text class="btn-text">{{ btnText }}</text>
  </view>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue'

const props = defineProps({
  btnText: { type: String, required: true }, // 按钮文字
  angle: { type: Number, required: true },   // 按钮在环形上的角度【核心】
  radius: { type: Number, required: true },  // 环形半径（必须和主组件一致）
  circleSize: { type: Number, default: 100 },// 按钮尺寸（必须和主组件一致）
  mainColor: { type: String, default: '#007AFF' },// 继承主按钮颜色
  bgColor: { type: String, default: '' }     // 自定义按钮颜色
})

const emit = defineEmits(['btn-click'])

// ✅ 精准环形坐标计算（不变，保留完美环形环绕）
const x = computed(() => {
  const rad = (props.angle * Math.PI) / 180
  return (props.circleSize / 2) - (props.radius * Math.cos(rad)) - (props.circleSize / 2)
})
const y = computed(() => {
  const rad = (props.angle * Math.PI) / 180
  return (props.circleSize / 2) - (props.radius * Math.sin(rad)) - (props.circleSize / 2)
})

const handleClick = () => {
  emit('btn-click')
}
</script>

<style scoped>
/* ✅ 核心修改1：按钮完全不透明 + 渐变边框 + 完美圆形 */
.child-circle-btn {
  position: absolute;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: -2rpx 2rpx 8rpx rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  opacity: 1 !important; /* ✅ 强制100%完全不透明，彻底去除透明感 */
  /* ✅ 核心：基于主色#007AFF的渐变边框 宽度4rpx 高级感拉满 */
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(#39e982, #007AFF), linear-gradient(135deg, #39e982, #0066FF);
}
/* ✅ 点击态优化：保留缩放+加深，依然完全不透明 */
.child-circle-btn:active {
  transform: scale(0.95);
  opacity: 0.95 !important; /* 点击仅轻微降一点透明度，保留质感，不是全透 */
  background-image: linear-gradient(#0066CC, #0066CC), linear-gradient(135deg, #0099FF, #0066FF);
}
/* ✅ 文字样式优化：白色文字+完全不透明，和按钮底色对比明显 */
.btn-text {
  color: #ffffff; /* 修正为白色，适配按钮底色 */
  font-size: 20rpx;
  font-weight: 500;
  text-align: center;
  padding: 0 5rpx;
  opacity: 1; /* 文字也强制不透明 */
}
</style>