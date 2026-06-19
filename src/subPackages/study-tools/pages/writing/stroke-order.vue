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

      <!-- 生成识字打卡图，分享到家长群引流 -->
      <button v-if="historyChars.length > 0" @click="doShare" class="share-btn">
        📤 生成识字打卡图 · 发家长群
      </button>

      <text v-if="error" class="error-tip">{{ error }}</text>
    </view>
    <view class="pinyin-text">{{pinyinResultRef}}</view>

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

    <!-- 识字打卡分享海报（复用公共组件 + strokeLearn 绘制器） -->
    <share-poster
        :visible="posterVisible"
        renderer="strokeLearn"
        :payload="posterPayload"
        :qr-source="posterQr"
        :creator-name="posterCreator"
        :show-link="true"
        title="识字打卡分享"
        hint="把图片发到家长群，长按识别二维码即可一起免费学笔顺"
        @close="posterVisible = false"
        @shared="posterVisible = false"/>
  </view>
</template>

<script setup>
import { ref, computed, onMounted,onUnmounted } from 'vue';
import HanziStroke from '../../components/HanziStroke.vue'; // 确保路径正确
import { onLoad,onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import { pinyin } from 'pinyin-pro';
import { APP_BRAND } from '../../../../utils/appBrand';
import sharePoster from '../../../../components/share/share-poster.vue';
import apiTs from '../../../../utils/apiTs';
import { base64ToImageSource } from '../../../../utils/imageHelper';
import { setShareToken } from '../../../../utils/token';
import { autoLogin } from '../../../../utils/auth';

// 识字工具自身页面路径（扫码 / 二维码落地页）
const STUDY_SHARE_PAGE = 'subPackages/study-tools/pages/writing/stroke-order';

const inputValue = ref('');
const historyChars = ref([]); // 存储历史输入的单个汉字
const selectedChar = ref(''); // 当前选中并展示笔顺的字符
const error = ref('');
const hanziStrokeRef = ref(null);
const isWechatMiniProgram = ref(false);
const autoRewriteTimer = ref(null); // 用于存储倒计时定时器
const countdownSeconds = ref(0); // 新增：用于存储倒计时秒数
const pinyinResultRef = ref(''); // 存储转换后的拼音

// 识字打卡分享海报状态
const posterVisible = ref(false);
const posterPayload = ref([]);
const posterQr = ref('');
const posterCreator = ref('我');
const shareToken = ref('');



onMounted(() => {
  // 检测运行环境
  // getSystemInfoSync 已废弃：platform 改用 getDeviceInfo（旧版本回退）
  const platform = (uni.getDeviceInfo ? uni.getDeviceInfo() : uni.getSystemInfoSync()).platform;
  const miniProgramEnv = uni.getAccountInfoSync()?.miniProgram?.envVersion;
  isWechatMiniProgram.value = platform === 'devtools' || !!miniProgramEnv;

  // 监听右上角菜单分享（好友/群聊）
  onShareAppMessage(() => {
    return getShareConfig();
  });

  // 监听朋友圈分享（可选）
  onShareTimeline(() => {
    return {
      title: `和孩子一起每天认字 · 免费看「${selectedChar.value || '汉字'}」笔顺动画 | ${APP_BRAND}`,
      imageUrl: '/static/share-stroke.png'
    };
  });
});


// 解析扫码 / 转发进入时携带的分享 token（scene 为 getUnlimitedQRCode 的 scene）
function resolveShareToken(query) {
  let raw = (query && (query.token || query.scene)) || '';
  // #ifdef MP-WEIXIN
  if (!raw && typeof wx !== 'undefined') {
    try {
      const enter = (wx.getEnterOptionsSync && wx.getEnterOptionsSync())
          || (wx.getLaunchOptionsSync && wx.getLaunchOptionsSync()) || {};
      const q = enter.query || {};
      raw = q.token || q.scene || '';
    } catch (e) { console.warn('[stroke] getEnterOptionsSync 失败:', e); }
  }
  // #endif
  if (raw) { try { raw = decodeURIComponent(raw); } catch (e) { /* token 为纯 hex */ } }
  return raw;
}

// 扫码进入：用 token 还原分享者的识字清单
async function restoreFromShareToken(token) {
  setShareToken(token);
  try { await autoLogin(token); } catch (e) { console.warn('自动登录失败:', e); }
  try {
    const res = await apiTs.share.getContent(token);
    let data = (res && res.data) ? res.data : res;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { /* ignore */ } }
    const chars = data && Array.isArray(data.chars)
        ? data.chars.filter(c => /[一-龥]/.test(c))
        : [];
    if (chars.length > 0) {
      historyChars.value = chars.slice(0, 20);
      const main = data.main && chars.includes(data.main) ? data.main : chars[0];
      selectChar(main);
    }
  } catch (e) {
    console.error('还原分享识字清单失败:', e);
  }
}

// 页面加载时的处理逻辑
onLoad(async (options) => {
  console.log("Page loaded with options:", options);

  // 优先处理扫码 / 二维码进入：scene/token 还原识字清单
  const shareTokenFromEnter = resolveShareToken(options);
  if (shareTokenFromEnter) {
    await restoreFromShareToken(shareTokenFromEnter);
    return;
  }

  // --- 关键修改开始 ---
  // 1. 处理传入的历史记录
  if (options.history) {
    try {
      // 解码并反序列化 historyChars
      const decodedHistory = decodeURIComponent(options.history);
      const parsedHistory = JSON.parse(decodedHistory);

      // 简单验证一下格式 (可选)
      if (Array.isArray(parsedHistory) && parsedHistory.every(item => typeof item === 'string')) {
        historyChars.value = parsedHistory.filter(char => /[\u4e00-\u9fa5]/.test(char)); // 再次过滤确保是汉字

        console.log("Restored historyChars from share:", historyChars.value);

        // 2. 如果历史记录非空且当前没有选中字符，可以默认选中第一个
        //    或者根据 options.char 来决定选中哪个
        if (historyChars.value.length > 0 && !selectedChar.value) {
          // 可以选择不立即选中，让用户自己点，或者默认选中第一个
          // selectChar(historyChars.value[0]);
        }
      } else {
        console.warn("Parsed history is not a valid array of strings:", parsedHistory);
      }
    } catch (e) {
      console.error("Failed to parse shared historyChars:", e);
      // 可以选择显示错误提示给用户
    }
  }

  // 3. 处理可能直接传入的特定字符 (优先级高于默认选中历史第一个)
  if (options.char && /[\u4e00-\u9fa5]/.test(options.char)) {
    const charToSelect = options.char;

    // 如果这个字符不在恢复的历史记录里，可以考虑添加进去，或者直接选中它
    if (!historyChars.value.includes(charToSelect)) {
      // 例如：将它添加到历史记录开头
      historyChars.value = [charToSelect, ...historyChars.value].slice(0, 20);
    }
    selectedChar.value = charToSelect;
    console.log(`Selected character from URL param: ${charToSelect}`);
  } else if (options.char) {
    console.warn("Invalid character provided in URL:", options.char);
  }
  // --- 关键修改结束 ---
});

/**
 * 生成分享配置（核心）
 */
function getShareConfig() {
  const charHint = selectedChar.value ? `「${selectedChar.value}」` : '';
  const shareTitle = `和孩子一起认字${charHint} · 免费看笔顺动画 | ${APP_BRAND}`;
  // 分享路径：携带当前汉字参数
  const encodedHistory = encodeURIComponent(JSON.stringify(historyChars.value));

  // 分享路径：携带当前汉字和历史记录
  // 注意：URL 长度有限制，如果 historyChars 很多可能会超出限制，需要考虑截断或其他策略
  let sharePath = `/subPackages/study-tools/pages/writing/stroke-order?history=${encodedHistory}`;

  // 如果有选中的字符，也可以加上，方便直接定位
  if (selectedChar.value) {
    sharePath += `&char=${selectedChar.value}`;
  }
  console.log(sharePath)
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

// 「生成识字打卡图」：建分享 token → 取小程序码 → 弹出海报长图，引导发家长群
async function doShare() {
  const chars = historyChars.value;
  if (!chars || chars.length === 0) {
    uni.showToast({ title: '请先添加要打卡的汉字', icon: 'none' });
    return;
  }
  uni.showLoading({ title: '生成分享图...', mask: true });
  try {
    const main = selectedChar.value || chars[0];
    const content = JSON.stringify({ chars, main });
    posterQr.value = '';
    try {
      const res = await apiTs.share.create({ content, sceneCode: 'study_share' });
      shareToken.value = res?.token || '';
      if (shareToken.value) {
        const qr = await apiTs.share.qrcode({ token: shareToken.value, page: STUDY_SHARE_PAGE });
        if (qr?.qrBase64) {
          posterQr.value = await base64ToImageSource(qr.qrBase64, qr.contentType || 'image/png');
        }
      }
    } catch (qrErr) {
      // 二维码失败（dev 占位 / 未配置 appid）不阻断出图，海报画灰块占位
      console.warn('生成二维码失败，继续出图:', qrErr);
    }
    posterPayload.value = [{ chars: [...chars], main, pinyin: pinyin(main) }];
    posterVisible.value = true;
  } catch (e) {
    console.error('生成分享图失败:', e);
    uni.showToast({ title: e?.message || '生成失败，请重试', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
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
  pinyinResultRef.value  = pinyin(char);

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
.pinyin-text{
  font-size: 40rpx;
  font-weight: 500;
  color: #1e88e5;
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

.share-btn {
  width: 100%;
  height: 92rpx;
  margin-top: 8rpx;
  background: linear-gradient(135deg, #4f8cff 0%, #1e88e5 100%);
  color: #ffffff;
  border: none;
  border-radius: 60rpx;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(30, 136, 229, 0.3);
  transition: all 0.2s ease;
}

.share-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(30, 136, 229, 0.25);
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