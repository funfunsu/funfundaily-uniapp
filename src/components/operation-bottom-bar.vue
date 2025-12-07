<template>
  <view class="bottom-bar">
    <view class="bottom-bar-content">
      <!-- 左侧：群组信息 + 成员选择器 -->
      <view class="left-section">
      </view>

      <!-- 右侧：两个按钮（靠右） -->
      <view class="right-section">
        <view v-for="item in buttons" >
          <button v-if="item.type === 'share'" open-type="share" class="bottom-add-btn">
            <text class="add-text" >{{ item.text || '-' }}</text>
          </button>
          <button v-if="item.type !== 'share'" class="bottom-add-btn" @click="handleButtonClick(item.code)">
            <text class="add-text" >{{ item.text || '-' }}</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>

// ===== Props 定义 =====
const props = defineProps({
  buttons:{type: Array, default: () => []}
})

// ===== Emits 定义 =====
const emit = defineEmits(['button-click'])
const handleButtonClick = (buttonCode) => emit('button-click',buttonCode)
</script>

<style scoped>
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  height: 60px;
  z-index: 100;
}

.bottom-bar-content {
  height: 100%;
  padding: 0 16px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  /* 不使用 justify-content，靠 margin-left: auto 实现右对齐 */
}

/* —————— 左侧区域 —————— */
.left-section {
  flex-shrink: 0; /* 不收缩 */
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0; /* 允许内部文本省略 */
}

.group-info {
  white-space: nowrap;
}

.group-name {
  font-size: 15px;
  color: #333;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 60px;   /* 防止过窄 */
  max-width: 120px;  /* 防止过长撑开布局 */
}

.member-switcher {
  min-width: 80px;   /* 保证可点击区域 */
  max-width: 140px;
}

.member-selector {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background-color: #f5f5f5;
  border-radius: 16px;
  height: 32px;
  font-size: 13px;
  width: 100%;
}

.member-name {
  color: #333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.arrow-icon {
  font-size: 16px;
  color: #666;
  margin-left: 4px;
}

.member-selector:active {
  background-color: #e9e9e9;
}

/* —————— 右侧区域 —————— */
.right-section {
  margin-left: auto;     /* 👈 关键：推到最右边 */
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;        /* 按钮不被压缩 */
}

.bottom-add-btn {
  background-color: #007aff;
  color: #fff;
  border-radius: 20px;
  font-size: 13px;
  padding: 0 16px;
  height: 32px;
  line-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.3);
  flex-shrink: 0;
}

.bottom-add-btn::after {
  border: none;
}

.bottom-add-btn:active {
  transform: scale(0.97);
  box-shadow: 0 1px 3px rgba(0, 122, 255, 0.3);
}

.add-icon {
  font-size: 16px;
  font-weight: bold;
  margin-right: 4px;
}

.add-text {
  font-weight: 500;
}
</style>