<template>
  <view class="parent-page">
    <!-- 汉字输入区 -->
    <view class="input-section">
      <text class="input-label">输入多个汉字</text> <!-- 修改提示 -->
      <view class="input-wrapper">
        <input
            v-model.trim="inputValue"
            @confirm="handleSubmit"
            @input="handleInputChange"
            placeholder="如：你好世界"
            class="char-input"
            maxlength="10"
            confirm-type="search"
            type="text"
            cursor-spacing="30"
        />
        <button
            v-if="inputValue"
            @click="clearInput"
            class="clear-btn"
            aria-label="清除内容"
        >
          ✕
        </button>
      </view>

      <button
          :disabled="!isValidMultiInput"
          @click="handleSubmit"
          class="submit-btn"
          :class="{ disabled: !isValidMultiInput }"
      >
        添加汉字
      </button>

      <!-- 历史字符列表 (仅在有内容时显示) -->
      <scroll-view v-if="historyChars.length > 0" class="history-scroll" scroll-x>
        <view class="history-chars">
          <button
              v-for="(char, index) in historyChars"
              :key="index"
              @click="selectChar(char)"
              class="history-char-btn"
              :class="{ active: selectedChar === char }"
          >
            {{ char }}
          </button>
        </view>
      </scroll-view>

      <!-- 重写按钮（仅在有选中字符时显示） -->
      <button v-if="selectedChar" @click="handleResetWrite" class="reset-btn">
        ↺ {{ countdownSeconds > 0 ? `重新书写"${selectedChar}" (${countdownSeconds}s)` : `重新书写 "${selectedChar}"` }}
      </button>

      <text v-if="error" class="error-tip">{{ error }}</text>
    </view>

    <!-- 笔顺展示区 -->
    <view class="stroke-section" :class="{ 'has-content': selectedChar }">
      <HanziStroke
          v-if="selectedChar"
          ref="hanziStrokeRef"
          :char="selectedChar"
          :autoWrite="true"
          :autoWriteInterval="1200"
          class="stroke-component"
          @edit-complete="OnEditComplete"
      />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted,onUnmounted } from 'vue';
import HanziStroke from '../../components/HanziStroke.vue'; // 确保路径正确
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';

const inputValue = ref('');
const historyChars = ref([]); // 存储历史输入的单个汉字
const selectedChar = ref(''); // 当前选中并展示笔顺的字符
const error = ref('');
const hanziStrokeRef = ref(null);
const isWechatMiniProgram = ref(false);
const autoRewriteTimer = ref(null); // 用于存储倒计时定时器
const countdownSeconds = ref(0); // 新增：用于存储倒计时秒数


onMounted(() => {
  // 检测运行环境
  const platform = uni.getSystemInfoSync().platform;
  const miniProgramEnv = uni.getAccountInfoSync()?.miniProgram?.envVersion;
  isWechatMiniProgram.value = platform === 'devtools' || !!miniProgramEnv;

  // 监听右上角菜单分享（好友/群聊）
  onShareAppMessage(() => {
    return getShareConfig();
  });

  // 监听朋友圈分享（可选）
  onShareTimeline(() => {
    return {
      title: `${selectedChar.value || '汉字'}笔顺学习 - funfun日程`,
      imageUrl: '/static/share-stroke.png'
    };
  });
});

/**
 * 生成分享配置（核心）
 */
function getShareConfig() {
  const shareTitle = selectedChar.value
      ? `${selectedChar.value}字笔顺学习 | fungrowth日程`
      : '汉字笔顺学习 | fungrowth日程';
  // 分享路径：携带当前汉字参数
  const sharePath = `/subPackages/study-tools/pages/writing/stroke-order?char=${selectedChar.value || ''}`;

  return {
    title: shareTitle,
    path: sharePath,
    success: (res) => {
      uni.showToast({
        title: '分享成功',
        icon: 'success'
      });
    },
    fail: (err) => {
      console.log('分享失败', err);
      uni.showToast({
        title: '分享取消',
        icon: 'none'
      });
    }
  };
}

function handleInputChange() {
  error.value = '';
}

// 验证输入是否包含至少一个有效汉字
const isValidMultiInput = computed(() => {
  const val = inputValue.value.trim();
  if (!val) return false;
  // 检查是否有至少一个汉字
  return /[\u4e00-\u9fa5]/.test(val);
});

// 验证并返回有效的汉字数组
function validateAndGetChars() {
  const val = inputValue.value.trim();
  if (!val) {
    error.value = '请输入至少一个汉字';
    return [];
  }

  // 提取所有汉字字符
  const chars = val.match(/[\u4e00-\u9fa5]/g) || [];

  if (chars.length === 0) {
    error.value = '请输入至少一个汉字';
    return [];
  }

  error.value = '';
  // 返回去重后的数组，保持顺序
  return [...new Set(chars)];
}


function handleSubmit() {
  const newChars = validateAndGetChars(); // 获取本次输入的有效汉字
  if (newChars.length > 0) {
    // 更新历史记录：将新字符添加到开头，如果已存在则移除旧的
    let updatedHistory = [...historyChars.value];
    for (let i = newChars.length - 1; i >= 0; i--) { // 逆序添加以保证顺序
      const char = newChars[i];
      const existingIndex = updatedHistory.indexOf(char);
      if (existingIndex !== -1) {
        updatedHistory.splice(existingIndex, 1); // 移除旧位置
      }
      updatedHistory.unshift(char); // 添加到开头
    }
    historyChars.value = updatedHistory.slice(0, 20); // 限制历史记录数量，例如最多20个

    // 默认选中第一个新加入的字符（或者你可以选择不自动选中，让用户手动点）
    // 这里我们选择自动选中第一个新字符
    selectChar(newChars[0]);

    // 清空输入框
    inputValue.value = '';
  }
}

function clearInput() {
  inputValue.value = '';
  historyChars.value = []; // 清空历史记录
  selectedChar.value = ''; // 清空选中字符
  error.value = '';
}

// 选择一个字符进行展示
function selectChar(char) {
  selectedChar.value = char;
  clearAutoRewriteTimer()
  // 如果需要每次切换都重置动画，可以调用 resetWrite
  // hanziStrokeRef.value?.resetWrite?.();
}

function handleResetWrite() {
  if (selectedChar.value) {
    hanziStrokeRef.value?.resetWrite?.();
  }
}

function clearAutoRewriteTimer() {
  if (autoRewriteTimer.value) {
    clearInterval(autoRewriteTimer.value); // 使用 clearInterval
    autoRewriteTimer.value = null;
  }
  countdownSeconds.value = 0; // 重置倒计时显示
}
// 启动倒计时的函数
function startCountdown() {
  clearAutoRewriteTimer(); // 确保没有其他计时器在运行
  countdownSeconds.value = 5; // 初始化为5秒

  autoRewriteTimer.value = setInterval(() => {
    countdownSeconds.value--;
    if (countdownSeconds.value <= 0) {
      clearAutoRewriteTimer(); // 清理定时器
      // 时间到，执行自动重写
      if (selectedChar.value && hanziStrokeRef.value?.resetWrite) {
        hanziStrokeRef.value.resetWrite();
      }
    }
  }, 1000); // 每秒更新一次
}



function OnEditComplete(){
  console.log("OnEditComplete");
  // 启动5秒倒计时
  startCountdown();
}
// 组件卸载时清理定时器
onUnmounted(() => {
  clearAutoRewriteTimer();
});
</script>

<style scoped>
.parent-page {
  min-height: 100vh;
  padding: 60rpx 40rpx 80rpx;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

/* === 输入区域 === */
.input-section {
  width: 100%;
  max-width: 640rpx;
  margin-bottom: 30rpx; /* 调整间距 */
  text-align: center;
}

.input-label {
  font-size: 36rpx;
  color: #444;
  font-weight: 500;
  margin-bottom: 32rpx;
  letter-spacing: 1rpx;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 36rpx;
}

.char-input {
  flex: 1;
  height: 100rpx;
  padding: 0 40rpx;
  font-size: 38rpx;
  background: white;
  border: 2rpx solid #ddd;
  border-radius: 60rpx;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.06);
  text-align: center;
  color: #333;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.char-input:focus {
  border-color: #1e88e5;
  box-shadow: 0 6rpx 20rpx rgba(30, 136, 229, 0.15);
}

.clear-btn {
  position: absolute;
  right: 28rpx;
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
  font-size: 28rpx;
  color: #888;
  border: none;
  padding: 0;
  line-height: 1;
  z-index: 2;
}

.submit-btn {
  width: 100%;
  height: 100rpx;
  background: #1e88e5;
  color: white;
  border: none;
  border-radius: 60rpx;
  font-size: 38rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(30, 136, 229, 0.3);
  transition: all 0.2s ease;
  margin-bottom: 20rpx; /* 与下方列表间隔 */
}

.submit-btn:not(.disabled):active {
  transform: scale(0.97);
  box-shadow: 0 4rpx 16rpx rgba(30, 136, 229, 0.25);
}

.submit-btn.disabled {
  background: #cfd8dc;
  color: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  transform: none;
}

/* === 历史字符列表 === */
.history-scroll {
  width: 100%;
  margin-bottom: 20rpx; /* 与重写按钮间隔 */
  white-space: nowrap; /* 强制子元素在同一行 */
}

.history-chars {
  display: inline-block; /* 让容器宽度适应内容 */
  padding: 10rpx 0; /* 上下留白 */
}

.history-char-btn {
  display: inline-block; /* 行内块显示 */
  min-width: 80rpx; /* 最小宽度 */
  height: 80rpx;
  margin-right: 20rpx; /* 按钮间水平间距 */
  background: #e3f2fd;
  color: #1e88e5;
  border: 2rpx solid #bbdefb;
  border-radius: 50%; /* 圆形按钮 */
  font-size: 32rpx;
  font-weight: 500;
  box-shadow: 0 2rpx 6rpx rgba(30, 136, 229, 0.1);
  transition: all 0.2s;
  vertical-align: top; /* 顶部对齐 */
}

.history-char-btn:last-child {
  margin-right: 0; /* 最后一个按钮无右边距 */
}

.history-char-btn.active {
  background: #1e88e5;
  color: white;
  border-color: #1e88e5;
  transform: scale(1.1); /* 选中时稍大一点 */
  box-shadow: 0 4rpx 10rpx rgba(30, 136, 229, 0.2);
}

.history-char-btn:active {
  background: #bbdefb;
  transform: scale(0.95); /* 点击时缩小 */
}

.error-tip {
  color: #f44336;
  font-size: 28rpx;
  margin-top: 20rpx;
  min-height: 36rpx;
  display: block;
  font-weight: 500;
}

/* === 笔顺展示区 === */
.stroke-section {
  width: 100%;
  max-width: 640rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0;
  transform: translateY(20rpx);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.stroke-section.has-content {
  opacity: 1;
  transform: translateY(0);
}

.stroke-component {
  width: 100%;
  margin-bottom: 40rpx;
}

.reset-btn {
  width: auto; /* 宽度自适应内容 */
  padding: 0 40rpx; /* 左右内边距 */
  height: 80rpx;
  background: white;
  color: #1e88e5;
  border: 2rpx solid #1e88e5;
  border-radius: 50rpx;
  font-size: 32rpx;
  font-weight: 500;
  box-shadow: 0 4rpx 12rpx rgba(30, 136, 229, 0.1);
  transition: all 0.2s;
}

.reset-btn:active {
  background: #f0f9ff;
  transform: scale(0.98);
}
</style>