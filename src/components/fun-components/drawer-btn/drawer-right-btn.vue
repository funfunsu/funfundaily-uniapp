<template>
  <view class="drawer-wrap" :style="{ top: btnTop }">
    <view
        class="main-circle-btn shake-ani"
        :class="{ active: isOpen }"
        :style="{ width: circleSize + 'rpx', height: circleSize + 'rpx', backgroundColor: mainColor}"
        @click="toggleOpen"
    >
      <text class="btn-text">{{ isOpen ? '收起' : '展开' }}</text>
    </view>

    <!-- 环形子按钮容器：原代码完全不变 -->
    <view class="circle-wrap" :class="{ active: isOpen }" :style="{ width: circleSize + 'rpx', height: circleSize + 'rpx' }">
      <slot :circleSize="circleSize" :mainColor="mainColor" :radius="radius" />
    </view>
  </view>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'

const props = defineProps({
  circleTranslate: { type: Number, default: 70 }, // 主按钮露出宽度 (70=露30%)
  btnTop: { type: String, default: '50%' },       // 整体垂直位置 (屏幕居中)
  circleSize: { type: Number, default: 100 },     // 主/子按钮 统一圆形尺寸
  mainColor: { type: String, default: '#007AFF' },// 按钮底色
  radius: { type: Number, default: 140 }          // 环形半径 → 子按钮到主按钮圆心的距离
})

const isOpen = ref(false)
// const emit = defineEmits(['close'])

const toggleOpen = () => {
  isOpen.value = !isOpen.value
}
const closeDrawer = () => {
  isOpen.value = false
}

defineExpose({ closeDrawer })
</script>

<style scoped>
.drawer-wrap {
  position: fixed;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 主按钮-圆心 【原样式完全不变，一行未改】 */
.main-circle-btn {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: -2rpx 0 10rpx rgba(0, 0, 0, 0.15);
  transform: translateX(v-bind('circleTranslate + "rpx"'));
  transition: all 0.3s ease;
  z-index: 99;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
}
/* active展开样式 【原样式完全不变，优先级不受任何影响】 */
.main-circle-btn.active {
  transform: translateX(0);
  background-image: linear-gradient(#e9398b, #007AFF);
}
.btn-text {
  color: #fff;
  font-size: 22rpx;
  font-weight: 500;
}
/* 环形容器 【原样式完全不变】 */
.circle-wrap {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
}
.circle-wrap.active {
  opacity: 1;
  pointer-events: auto;
}

/* ✅✅✅ 核心新增：初始化3次摇摆动画 【关键：只作用于未展开状态，不影响active】 */
/* 动画规则：仅初始化执行、3次完整左右摇摆、结束后静止、和active样式无任何冲突 */
.shake-ani {
  animation: shakeBtn 1.8s ease-in-out 0.2s 1 forwards;
  animation-fill-mode: none;
}
/* 精准3次左右摇摆：幅度轻柔不突兀，匹配按钮露出的交互逻辑，向右多露/向左少露 */
@keyframes shakeBtn {
  0% { transform: translateX(v-bind('circleTranslate + "rpx"')); }
  12% { transform: translateX(calc(v-bind('circleTranslate + "rpx"') + 7rpx)); }
  25% { transform: translateX(calc(v-bind('circleTranslate + "rpx"') - 5rpx)); }
  37% { transform: translateX(calc(v-bind('circleTranslate + "rpx"') + 4rpx)); }
  50% { transform: translateX(calc(v-bind('circleTranslate + "rpx"') - 3rpx)); }
  62% { transform: translateX(calc(v-bind('circleTranslate + "rpx"') + 2rpx)); }
  75% { transform: translateX(calc(v-bind('circleTranslate + "rpx"') - 1rpx)); }
  100% { transform: translateX(v-bind('circleTranslate + "rpx"')); }
}
/* ✅ 终极关键：强制让active的样式优先级最高，动画完全不干扰展开状态 */
.main-circle-btn.active {
  animation: none !important;
  transform: translateX(0) !important;
}
</style>