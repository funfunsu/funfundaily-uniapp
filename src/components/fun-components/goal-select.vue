<template>
  <view class="goal-select-comp">
    <!-- 核心选择区域：始终展示 不关联目标 + 当前选中的目标 -->
    <view class="goal-select-wrap">
      <!-- 不关联目标选项 - 固定展示 -->
      <view
          class="goal-select-item"
          :class="{active: modelValue === '' || modelValue === 0}"
          @click="handleSelectGoal(0)"
      >
        <text class="goal-name">不关联目标</text>
        <text class="icon-selected" v-show="modelValue === '' || modelValue === 0">✓</text>
      </view>

      <!-- 当前选中的目标 - 有选中时展示（排除不关联状态） -->
      <view
          v-if="modelValue && modelValue !== 0 && currentActiveGoal"
          class="goal-select-item"
          :class="{active: true}"
          @click="handleSelectGoal(currentActiveGoal.id)"
      >
        <text class="goal-name">{{ currentActiveGoal.itemTitle || '未命名目标' }}</text>
        <text class="icon-selected">✓</text>
      </view>
    </view>

    <!-- 展开/收起按钮 - 有其他目标时才显示 -->
    <view
        v-if="goalList.length > 0"
        class="toggle-btn"
        @click="isExpand = !isExpand"
    >
      <text class="btn-text">{{ isExpand ? '收起目标' : '选择其他目标' }}</text>
      <text class="btn-icon" :class="{rotate: isExpand}">▼</text>
    </view>

    <!-- 展开的目标列表 - 仅当展开时显示，排除当前已选中的目标 -->
    <view
        v-if="isExpand && goalList.length > 0"
        class="goal-select-wrap expand-list"
    >
      <view
          class="goal-select-item"
          v-for="(goal, idx) in goalList"
          :key="idx"
          :class="{active: modelValue === goal.id}"
          @click="handleSelectGoal(goal.id)"
      >
        <text class="goal-name">{{ goal.itemTitle || '未命名目标' }}</text>
        <text class="icon-selected" v-show="modelValue === goal.id">✓</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, watch } from 'vue'

// 定义组件属性
const props = defineProps({
  // 目标列表：[{id, itemTitle}, ...]
  goalList: {
    type: Array,
    default: () => [],
    validator: (list) => list.every(item => item.hasOwnProperty('id'))
  },
  // 绑定值：选中的目标ID，0/''表示不关联（默认不关联）
  modelValue: {
    type: [String, Number],
    default: 0
  }
})

// 定义组件事件
const emit = defineEmits(['update:modelValue', 'change'])

// 响应式：控制目标列表展开/收起（默认收起）
const isExpand = ref(false)

// 计算属性：获取当前选中的目标对象（用于展示选中的目标名称）
const currentActiveGoal = computed(() => {
  // 排除不关联状态，从目标列表中匹配选中的ID
  if (!props.modelValue || props.modelValue === 0) return null
  return props.goalList.find(goal => goal.id === props.modelValue) || null
})

// 选择目标/不关联目标的核心方法
const handleSelectGoal = (goalId) => {
  const finalId = goalId === 0 ? 0 : goalId
  // 更新v-model绑定值
  emit('update:modelValue', finalId)
  // 抛出change事件供父组件监听
  emit('change', finalId)
  // 选中目标后自动收起列表，优化交互
  isExpand.value = false
}

// 监听目标列表/选中值变化，若选中值不在列表中，重置为不关联（容错处理）
watch(
    () => [props.goalList, props.modelValue],
    ([newList, newVal]) => {
      if (newVal && newVal !== 0) {
        const isExist = newList.some(goal => goal.id === newVal)
        if (!isExist) {
          emit('update:modelValue', 0)
          emit('change', 0)
        }
      }
    },
    { immediate: true, deep: true }
)
</script>

<style scoped>
/* 组件外层容器，统一间距 */
.goal-select-comp {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

/* 目标选择容器基础样式 */
.goal-select-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

/* 展开的列表添外边距，区分核心选择区 */
.expand-list {
  padding-left: 16rpx;
}

/* 目标选项基础样式 */
.goal-select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 16rpx;
  border-radius: 12rpx;
  background: #f7f8fa;
  font-size: 28rpx;
  color: #333;
  transition: all 0.2s ease;
}

/* 选中态高亮 */
.goal-select-item.active {
  background: #e6f0ff;
  color: #007AFF;
}

/* 目标名称占满剩余空间，防止溢出 */
.goal-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 选中对勾样式 */
.icon-selected {
  font-size: 24rpx;
  font-weight: bold;
  color: #007AFF;
}

/* 点击反馈 */
.goal-select-item:active {
  background: #e5e7eb;
}
.goal-select-item.active:active {
  background: #d1e0ff;
}

/* 展开/收起按钮样式 */
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: #007AFF;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* 按钮文字 */
.btn-text {
  font-weight: 500;
}

/* 按钮箭头 */
.btn-icon {
  font-size: 20rpx;
  transition: transform 0.2s ease;
}

/* 箭头旋转动画 */
.btn-icon.rotate {
  transform: rotate(180deg);
}

/* 按钮点击反馈 */
.toggle-btn:active {
  color: #0066cc;
  opacity: 0.8;
}
</style>