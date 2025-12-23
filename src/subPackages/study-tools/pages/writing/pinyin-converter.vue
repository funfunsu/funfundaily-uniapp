<template>
  <view class="container">
    <view class="input-section">
      <text class="label">请输入汉字:</text>
      <!-- 使用 v-model 绑定 inputValueRef -->
      <input
          class="input"
          type="text"
          v-model="inputValueRef"
          placeholder="例如: 你好世界"
          @input="handleInput"
      />
    </view>

    <view class="output-section">
      <text class="label">拼音结果:</text>
      <!-- 显示转换后的拼音 -->
      <view class="output-text">{{ pinyinResultRef }}</view>
      <!-- 如果有错误信息则显示 -->
      <view v-if="errorMessageRef" class="error-text">{{ errorMessageRef }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue';
// 引入 pinyin-pro 库，按需引入 toneType: 'none' 对应的函数以减小包体积
// 如果需要声调，可以引入 pinyin 方法并配置 toneType
import { pinyin } from 'pinyin-pro';

// 定义响应式数据
const inputValueRef = ref(''); // 存储用户输入的汉字
const pinyinResultRef = ref(''); // 存储转换后的拼音
const errorMessageRef = ref(''); // 存储可能的错误信息

// 处理输入事件（可选，这里主要用于演示）
const handleInput = (event) => {
  // 输入值已经通过 v-model 自动更新到 inputValueRef.value
  // console.log('Input value changed:', inputValueRef.value);
};

// 监听 inputValueRef 的变化，自动触发转换
watch(inputValueRef, (newVal) => {
  if (!newVal.trim()) {
    // 如果输入为空或只有空格，则清空结果和错误信息
    pinyinResultRef.value = '';
    errorMessageRef.value = '';
    return;
  }

  try {
    // 调用 pinyin 函数进行转换
    // toneType: 'none' 表示不带声调
    // type: 'array' 返回数组格式，方便处理
    const resultArray = pinyin(newVal, {  type: 'array' });
    // 将数组用空格连接成字符串
    pinyinResultRef.value = resultArray.join(' ');
    errorMessageRef.value = ''; // 清除之前的错误信息
  } catch (error) {
    console.error("Pinyin conversion error:", error);
    pinyinResultRef.value = '';
    errorMessageRef.value = '转换出错，请检查输入。';
  }
}, { immediate: false }); // immediate: false 表示初始化时不执行 handler

</script>

<style scoped>
.container {
  padding: 30rpx; /* 使用 rpx 适配不同屏幕 */
  background-color: #f5f5f5;
  min-height: 100vh; /* 使容器占满整个视口高度 */
  box-sizing: border-box;
}

.input-section,
.output-section {
  margin-bottom: 40rpx;
  background-color: #ffffff;
  padding: 30rpx;
  border-radius: 15rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1); /* 添加轻微阴影 */
}

.label {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 2rpx solid #ddd;
  border-radius: 10rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}

.output-text {
  font-size: 34rpx;
  color: #007AFF; /* 使用 uniapp 推荐的链接蓝色 */
  min-height: 80rpx; /* 确保即使没有内容也有一定高度 */
  padding: 15rpx 0;
  word-break: break-all; /* 允许长单词换行 */
}

.error-text {
  font-size: 28rpx;
  color: #ff0000;
  margin-top: 10rpx;
}
</style>