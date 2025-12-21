<template>
  <view class="parent-page">
    <!-- 汉字输入区 -->
    <view class="input-section">
      <text class="input-label">输入汉字或拼音</text>
      <view class="input-wrapper">
        <input
            v-model.trim="inputValue"
            @confirm="handleSubmit"
            @input="handleInputChange"
            placeholder="如：五 / 国"
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
          :disabled="!isValidInput"
          @click="handleSubmit"
          class="submit-btn"
          :class="{ disabled: !isValidInput }"
      >
        查看笔顺
      </button>

      <!-- 重写按钮（仅在有内容时显示） -->
<!--      <button v-if="displayChar" @click="handleResetWrite" class="reset-btn">-->
<!--        ↺ 重新书写-->
<!--      </button>-->

      <text v-if="error" class="error-tip">{{ error }}</text>
    </view>

    <!-- 笔顺展示区 -->
    <view class="stroke-section" :class="{ 'has-content': displayChar }">
      <HanziStroke
          v-if="displayChar"
          ref="hanziStrokeRef"
          :char="displayChar"
          :autoWrite="true"
          :autoWriteInterval="800"
          class="stroke-component"
      />

    </view>
  </view>
</template>

<script setup>
import { ref, computed,onMounted } from 'vue';
import HanziStroke from '../../components/HanziStroke.vue';
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';


const inputValue = ref('');
const displayChar = ref('');
const error = ref('');
const hanziStrokeRef = ref(null);
const isWechatMiniProgram = ref(false);


onMounted(() => {
  // 检测运行环境
  const platform = uni.getSystemInfoSync().platform;
  // 微信小程序的 envVersion 包含 develop/trial/release
  const miniProgramEnv = uni.getAccountInfoSync()?.miniProgram?.envVersion;
  isWechatMiniProgram.value = platform === 'devtools' || !!miniProgramEnv;

  // 监听右上角菜单分享（好友/群聊）
  onShareAppMessage(() => {
    return getShareConfig();
  });

  // 监听朋友圈分享（可选）
  onShareTimeline(() => {
    return {
      title: `${displayChar.value || '汉字'}笔顺学习 - funfun日程`,
      imageUrl: '/static/share-stroke.png' // 建议提前准备分享图片
    };
  });
});

/**
 * 生成分享配置（核心）
 */
function getShareConfig() {
  const shareTitle = displayChar.value
      ? `${displayChar.value}字笔顺学习 | fungrowth日程`
      : '汉字笔顺学习 | fungrowth日程';
  // 分享路径：携带当前汉字参数，分享后打开页面可直接显示该字笔顺
  const sharePath = `/subPackages/study-tools/pages/writing/stroke-order?char=${displayChar.value || ''}`;

  return {
    title: shareTitle,
    path: sharePath,
    // 可选：自定义分享图片（建议放在static目录）
    // imageUrl: '/static/share-stroke.png',
    // 分享成功回调
    success: (res) => {
      uni.showToast({
        title: '分享成功',
        icon: 'success'
      });
    },
    // 分享失败/取消回调
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

const isValidInput = computed(() => {
  const val = inputValue.value.trim();
  if (!val) return false;
  return val.length === 1 && /^[\u4e00-\u9fa5]$/.test(val);

});

function validateAndSetError() {
  const val = inputValue.value.trim();
  if (!val) {
    error.value = '请输入一个汉字或有效拼音';
    return false;
  }

  error.value = '';
  return val;
}

function handleSubmit() {
  const targetChar = validateAndSetError();
  if (targetChar) {
    displayChar.value = targetChar;
    inputValue.value = targetChar; // 输入框显示最终汉字，更直观
  }
}

function clearInput() {
  inputValue.value = '';
  displayChar.value = '';
  error.value = '';
}

function handleResetWrite() {
  hanziStrokeRef.value?.resetWrite?.();
}
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
  margin-bottom: 70rpx;
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
  border-color: #1E88E5;
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
  background: #1E88E5;
  color: white;
  border: none;
  border-radius: 60rpx;
  font-size: 38rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(30, 136, 229, 0.3);
  transition: all 0.2s ease;
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
  width: 280rpx;
  height: 80rpx;
  background: white;
  color: #1E88E5;
  border: 2rpx solid #1E88E5;
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