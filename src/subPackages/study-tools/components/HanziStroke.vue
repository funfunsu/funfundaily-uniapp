<template>
  <view class="hanzi-stroke-container">
    <button v-if="!char" @click="handleInputConfirm" class="load-btn">加载笔顺</button>

    <!-- 主画布：动态书写区域 -->
    <view v-if="strokes.length > 0" class="main-canvas-wrapper">
      <canvas
          :canvas-id="isMiniProgram ? `strokeCanvas-main` : undefined"
          :id="isH5 ? `strokeCanvas-main` : undefined"
          :type="isH5 ? '2d' : ''"
          ref="mainCanvasRef"
          class="stroke-canvas main-canvas"
      ></canvas>
      <view class="step-info">
        第 {{ currentStep + 1 }} / {{ strokes.length }} 步
      </view>
    </view>

    <!-- 平铺展示所有笔画阶段（无滚动，自动换行） -->
    <view v-if="strokes.length > 0" class="stroke-tile-wrapper">
      <text class="tile-title">书写步骤预览：</text>
      <view class="tile-list">
        <view
            v-for="(step, index) in strokes.length"
            :key="index"
            class="tile-item"
        >
          <canvas
              :canvas-id="isMiniProgram ? `strokeCanvas-tile-${index}` : undefined"
              :id="isH5 ? `strokeCanvas-tile-${index}` : undefined"
              :type="isH5 ? '2d' : ''"
              ref="tileCanvasRefs"
              data-step="index"
              class="stroke-canvas tile-canvas"
          ></canvas>
          <text class="tile-step-text">第{{ index + 1 }}笔</text>
        </view>
      </view>
    </view>

    <!-- 控制按钮 -->
    <view v-if="strokes.length > 0 && !autoWrite" class="controls">
      <button @click="prev" :disabled="currentStep === 0" class="control-btn">上一步</button>
      <button @click="next" :disabled="currentStep >= strokes.length - 1" class="control-btn">下一步</button>
    </view>
  </view>
</template>

<script setup>
import { nextTick, onMounted, ref, watch, onUnmounted, getCurrentInstance } from 'vue';
import { getCharData } from '../stroke-data/index';
import apiTs from "../../../utils/apiTs";

const instance = getCurrentInstance();
const proxy = instance?.proxy;

// Props定义
const props = defineProps({
  char: {
    type: String,
    default: '',
    validator: (val) => val.length <= 1
  },
  autoWrite: {
    type: Boolean,
    default: false
  },
  autoWriteInterval: {
    type: Number,
    default: 800
  }
});

// 响应式数据
const inputChar = ref(props.char);
const strokes = ref([]);
const currentStep = ref(0);
const wholeCharBounds = ref({ minX: 0, maxX: 1024, minY: 0, maxY: 1024 });

// Canvas相关：主画布 + 平铺画布
const mainCanvasRef = ref(null); // 主画布Ref
const tileCanvasRefs = ref([]); // 平铺画布Ref列表
const mainCtx = ref(null); // 主画布上下文
const tileCtxMap = ref({}); // 平铺画布上下文映射 { index: ctx }

// 平台判断
const isH5 = process.env.UNI_PLATFORM === 'h5';
const isMiniProgram = !isH5 && process.env.UNI_PLATFORM !== 'app-plus';

// 常量
const canvasSize = 300; // 主画布尺寸
const tileCanvasSize = 80; // 平铺画布尺寸
let autoWriteTimer = null;

const emit = defineEmits(['edit-complete'])


// 监听char变化
watch(
    () => props.char,
    (newChar) => {
      if (newChar) {
        inputChar.value = newChar;
        loadStrokes();
      }
    },
    { immediate: true }
);

// 监听autoWrite变化
watch(
    () => props.autoWrite,
    (newVal) => {
      if (newVal && strokes.value.length > 0) {
        startAutoWrite();
      } else {
        stopAutoWrite();
      }
    },
    { immediate: true }
);

onMounted(() => {
  // 初始化主画布
  setTimeout(() => initMainCanvas(), 200);
});

onUnmounted(() => {
  stopAutoWrite();
});

/**
 * 初始化主画布上下文
 */
function initMainCanvas() {
  if (isH5) {
    nextTick(() => {
      const uniCanvasEl = mainCanvasRef.value?.$el;
      if (!uniCanvasEl) return;
      const realCanvas = uniCanvasEl.querySelector('canvas');
      if (realCanvas) {
        const dpr = window.devicePixelRatio || 1;
        realCanvas.width = canvasSize * dpr;
        realCanvas.height = canvasSize * dpr;
        mainCtx.value = realCanvas.getContext('2d');
        console.log('✅ 主画布(H5)初始化成功');
      }
    });
  } else if (isMiniProgram) {
    mainCtx.value = uni.createCanvasContext('strokeCanvas-main', proxy);
    console.log('✅ 主画布(小程序)初始化成功');
  }
}

/**
 * 初始化平铺画布上下文（批量）
 */
function initTileCanvases() {
  if (isH5) {
    nextTick(() => {
      const tileRefs = tileCanvasRefs.value;
      if (!tileRefs.length) return;

      tileRefs.forEach((refEl, index) => {
        const uniCanvasEl = refEl?.$el;
        if (!uniCanvasEl) return;
        const realCanvas = uniCanvasEl.querySelector('canvas');
        if (realCanvas) {
          const dpr = window.devicePixelRatio || 1;
          realCanvas.width = tileCanvasSize * dpr;
          realCanvas.height = tileCanvasSize * dpr;
          tileCtxMap.value[index] = realCanvas.getContext('2d');
        }
      });
      console.log('✅ 平铺画布(H5)初始化成功');
      // 初始化后立即绘制所有平铺步骤
      drawAllTileStrokes();
    });
  } else if (isMiniProgram) {
    // 小程序初始化平铺画布上下文
    strokes.value.forEach((_, index) => {
      tileCtxMap.value[index] = uni.createCanvasContext(`strokeCanvas-tile-${index}`, proxy);
    });
    console.log('✅ 平铺画布(小程序)初始化成功');
    // 初始化后立即绘制所有平铺步骤
    drawAllTileStrokes();
  }
}

/**
 * 移除SVG路径末尾的Z
 */
function removeTrailingZ(path) {
  return path.trim().replace(/[\sZz]+$/, '');
}

/**
 * 提取路径坐标点计算边界
 */
function extractPointsFromPath(path) {
  const points = [];
  const tokens = path.trim().split(/\s+/);
  let i = 0;
  let currentX = 0, currentY = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (token === 'M' || token === 'm') {
      currentX = parseFloat(tokens[i + 1]);
      currentY = parseFloat(tokens[i + 2]);
      points.push([currentX, currentY]);
      i += 3;
    } else if (token === 'L' || token === 'l') {
      currentX = parseFloat(tokens[i + 1]);
      currentY = parseFloat(tokens[i + 2]);
      points.push([currentX, currentY]);
      i += 3;
    } else if (token === 'Q' || token === 'q') {
      const x1 = parseFloat(tokens[i + 1]);
      const y1 = parseFloat(tokens[i + 2]);
      currentX = parseFloat(tokens[i + 3]);
      currentY = parseFloat(tokens[i + 4]);
      points.push([x1, y1], [currentX, currentY]);
      i += 5;
    } else {
      i++;
    }
  }
  return points;
}

/**
 * 计算整字边界
 */
function getWholeCharBounds(strokeList) {
  let allX = [], allY = [];

  for (const path of strokeList) {
    const points = extractPointsFromPath(path);
    for (const [x, y] of points) {
      if (!isNaN(x) && !isNaN(y)) {
        allX.push(x);
        allY.push(y);
      }
    }
  }

  if (allX.length === 0 || allY.length === 0) {
    return { minX: 0, maxX: 1024, minY: 0, maxY: 1024 };
  }

  return {
    minX: Math.min(...allX),
    maxX: Math.max(...allX),
    minY: Math.min(...allY),
    maxY: Math.max(...allY),
  };
}

/**
 * 绘制米字格（通用方法）
 * @param {CanvasRenderingContext2D/uni.CanvasContext} ctx 画布上下文
 * @param {Number} size 画布尺寸
 * @param {Boolean} isTile 是否为平铺画布
 */
function drawGrid(ctx, size, isTile = false) {
  if (!ctx) return;

  // 米字格样式配置
  const gridColor = '#e0e0e0'; // 米字格颜色（浅灰色，不干扰笔画）
  const mainLineWidth = isTile ? 0.5 : 1; // 横竖中线宽度
  const diagLineWidth = isTile ? 0.3 : 0.8; // 对角线宽度
  const padding = isTile ? 5 : 15; // 内边距
  const dpr = isH5 ? (window.devicePixelRatio || 1) : 1;

  // 计算米字格实际绘制区域
  const startX = padding;
  const startY = padding;
  const endX = size - padding;
  const endY = size - padding;
  const centerX = size / 2;
  const centerY = size / 2;

  // 开始绘制米字格
  ctx.beginPath();

  // 适配H5和小程序的画布API
  if (isH5) {
    // H5 2D画布
    ctx.strokeStyle = gridColor;

    // 绘制竖中线
    ctx.lineWidth = mainLineWidth * dpr;
    ctx.moveTo(centerX, startY);
    ctx.lineTo(centerX, endY);

    // 绘制横中线
    ctx.moveTo(startX, centerY);
    ctx.lineTo(endX, centerY);

    // 绘制对角线1（左上到右下）
    ctx.lineWidth = diagLineWidth * dpr;
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);

    // 绘制对角线2（右上到左下）
    ctx.moveTo(endX, startY);
    ctx.lineTo(startX, endY);

    ctx.stroke();
  } else {
    // 小程序画布
    ctx.setStrokeStyle(gridColor);

    // 绘制竖中线
    ctx.setLineWidth(mainLineWidth);
    ctx.moveTo(centerX, startY);
    ctx.lineTo(centerX, endY);

    // 绘制横中线
    ctx.moveTo(startX, centerY);
    ctx.lineTo(endX, centerY);

    // 绘制对角线1（左上到右下）
    ctx.setLineWidth(diagLineWidth);
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);

    // 绘制对角线2（右上到左下）
    ctx.moveTo(endX, startY);
    ctx.lineTo(startX, endY);

    ctx.stroke();
  }

  ctx.closePath();
}

/**
 * 加载汉字笔顺数据
 */
async function loadStrokes() {
  const targetChar = inputChar.value.trim();
  if (!targetChar || targetChar.length !== 1) {
    uni.showToast({ title: '请输入单个汉字', icon: 'none' });
    return;
  }

  currentStep.value = 0;
  stopAutoWrite();

  try {
    let data = getCharData(targetChar);
    if (!data){
      const req ={key:targetChar}
      data = await apiTs.json.get(req);
    }
    if (data && Array.isArray(data?.strokes)) {
      strokes.value = data.strokes.map(removeTrailingZ);
      wholeCharBounds.value = getWholeCharBounds(strokes.value);

      setTimeout(() => {
        // 初始化主画布并绘制当前步骤
        drawCurrentStroke();
        // 初始化平铺画布
        initTileCanvases();
        // 启动自动书写
        if (props.autoWrite) {
          startAutoWrite();
        }
      }, 300);
    } else {
      await uni.showToast({title: '该字暂不支持', icon: 'none'});
    }
  } catch (e) {
    console.error('加载笔顺失败:', e);
    await uni.showToast({title: '字库无此字', icon: 'none'});
  }
}

/**
 * 处理输入框确认事件
 */
function handleInputConfirm() {
  loadStrokes();
}

/**
 * 通用绘制方法：绘制指定步骤的笔画（适配不同画布/尺寸）
 * @param {CanvasRenderingContext2D/uni.CanvasContext} ctx 画布上下文
 * @param {Number} targetStep 目标步骤（绘制到第N笔）
 * @param {Number} canvasSize 画布尺寸
 * @param {Boolean} isTile 是否为平铺画布
 */
function drawStrokeStep(ctx, targetStep, canvasSize, isTile = false) {
  if (!ctx || !strokes.value.length || targetStep >= strokes.value.length) return;

  // 清空画布
  ctx.clearRect(0, 0, canvasSize, canvasSize);

  // 第一步：绘制米字格背景
  drawGrid(ctx, canvasSize, isTile);

  const pad = isTile ? 2 : 8; // 平铺画布内边距更小
  const actualPad = pad * 0.6;
  const lineWidth = isTile ? 1 : 5; // 平铺画布笔画更细
  const dpr = isH5 ? (window.devicePixelRatio || 1) : 1;

  // 计算缩放和偏移
  const globalBounds = wholeCharBounds.value;
  const contentW = globalBounds.maxX - globalBounds.minX;
  const contentH = globalBounds.maxY - globalBounds.minY;
  if (contentW <= 0 || contentH <= 0) return;

  const scaleX = (canvasSize - actualPad * 2) / contentW;
  const scaleY = (canvasSize - actualPad * 2) / contentH;
  const scale = Math.min(scaleX, scaleY) * (isTile ? 0.9 : 0.8);

  const offsetX = (canvasSize - contentW * scale) / 2;
  const offsetY = (canvasSize - contentH * scale) / 2;

  // 绘制到目标步骤的所有笔画
  for (let i = 0; i <= targetStep; i++) {
    const pathData = strokes.value[i];
    const tokens = pathData.trim().split(/\s+/);
    let iToken = 0;
    let lastX = 0, lastY = 0;

    ctx.beginPath();
    while (iToken < tokens.length) {
      const token = tokens[iToken];
      if (token === 'M') {
        const x = parseFloat(tokens[iToken + 1]);
        const y = parseFloat(tokens[iToken + 2]);
        if (!isNaN(x) && !isNaN(y)) {
          const newX = (x - globalBounds.minX) * scale + offsetX;
          const newY = canvasSize - ((y - globalBounds.minY) * scale + offsetY);
          lastX = newX;
          lastY = newY;
          ctx.moveTo(newX, newY);
        }
        iToken += 3;
      } else if (token === 'L') {
        const x = parseFloat(tokens[iToken + 1]);
        const y = parseFloat(tokens[iToken + 2]);
        if (!isNaN(x) && !isNaN(y)) {
          const newX = (x - globalBounds.minX) * scale + offsetX;
          const newY = canvasSize - ((y - globalBounds.minY) * scale + offsetY);
          ctx.lineTo(newX, newY);
          lastX = newX;
          lastY = newY;
        }
        iToken += 3;
      } else if (token === 'Q') {
        const x1 = parseFloat(tokens[iToken + 1]);
        const y1 = parseFloat(tokens[iToken + 2]);
        const x = parseFloat(tokens[iToken + 3]);
        const y = parseFloat(tokens[iToken + 4]);
        if (!isNaN(x1) && !isNaN(y1) && !isNaN(x) && !isNaN(y)) {
          const cx1 = (x1 - globalBounds.minX) * scale + offsetX;
          const cy1 = canvasSize - ((y1 - globalBounds.minY) * scale + offsetY);
          const cx = (x - globalBounds.minX) * scale + offsetX;
          const cy = canvasSize - ((y - globalBounds.minY) * scale + offsetY);
          ctx.quadraticCurveTo(cx1, cy1, cx, cy);
          lastX = cx;
          lastY = cy;
        }
        iToken += 5;
      } else {
        iToken++;
      }
    }

    // 设置样式并绘制
    const strokeStyle = '#1E88E5';
    if (isH5) {
      ctx.strokeStyle = strokeStyle;
      ctx.fillStyle = strokeStyle;
      ctx.lineWidth = lineWidth * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.fill();
    } else {
      ctx.setStrokeStyle(strokeStyle);
      ctx.setFillStyle(strokeStyle);
      ctx.setLineWidth(lineWidth);
      ctx.setLineCap('round');
      ctx.setLineJoin('round');
      ctx.stroke();
      ctx.setLineWidth(1);
      ctx.fill();
    }
    ctx.closePath();
  }

  // 小程序需要手动调用draw
  if (isMiniProgram && !isH5) {
    ctx.draw(false, () => {
      if (isTile) {
        console.log(`✅ 平铺画布第${targetStep + 1}笔绘制完成`);
      } else {
        console.log(`✅ 主画布第${targetStep + 1}笔绘制完成`);
      }
    });
  }
}

/**
 * 绘制主画布当前步骤
 */
function drawCurrentStroke() {
  if (!mainCtx.value) return;
  drawStrokeStep(mainCtx.value, currentStep.value, canvasSize);
}

/**
 * 绘制所有平铺画布的步骤
 */
function drawAllTileStrokes() {
  Object.keys(tileCtxMap.value).forEach((index) => {
    const ctx = tileCtxMap.value[index];
    const step = parseInt(index);
    drawStrokeStep(ctx, step, tileCanvasSize, true);
  });
}

/**
 * 上一步
 */
function prev() {
  if (currentStep.value > 0) {
    currentStep.value--;
    drawCurrentStroke();
  }
}

/**
 * 下一步
 */
function next() {
  if (currentStep.value < strokes.value.length - 1) {
    currentStep.value++;
    drawCurrentStroke();

    if (props.autoWrite && currentStep.value >= strokes.value.length - 1) {
      stopAutoWrite();
      emit('edit-complete')
    }
  }
}

/**
 * 启动自动书写
 */
function startAutoWrite() {
  stopAutoWrite();
  autoWriteTimer = setInterval(() => {
    next();
  }, props.autoWriteInterval);
}

/**
 * 停止自动书写
 */
function stopAutoWrite() {
  if (autoWriteTimer) {
    clearInterval(autoWriteTimer);
    autoWriteTimer = null;
  }
}

/**
 * 重置书写（核心：重新从第一笔开始书写）
 */
function resetWrite() {
  // 1. 停止当前的自动书写
  stopAutoWrite();
  // 2. 重置到第一步
  currentStep.value = 0;
  // 3. 重新绘制主画布第一步
  drawCurrentStroke();
  // 4. 如果开启自动书写，重新启动
  if (props.autoWrite) {
    startAutoWrite();
  }
  console.log('✅ 重新书写已触发，重置到第一笔并重新开始');
}

// 暴露方法给父组件调用
defineExpose({
  resetWrite
});
</script>

<style scoped>
.hanzi-stroke-container {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.load-btn {
  width: 200px;
  height: 80rpx;
  line-height: 80rpx;
  background: #1E88E5;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 32rpx;
  margin-bottom: 40rpx;
}

/* 主画布样式 */
.main-canvas-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30rpx;
}

.main-canvas {
  width: 300px;
  height: 300px;
}

.step-info {
  text-align: center;
  margin: 20rpx 0;
  font-size: 32rpx;
  color: #333;
}

/* 平铺展示区域样式（一行4个，无滚动） */
.stroke-tile-wrapper {
  width: 100%;
  margin: 20rpx 0 40rpx;
}

.tile-title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 15rpx;
  display: block;
  padding-left: 0rpx;
}

.tile-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 15rpx;
}

/* 核心：一行显示4个步骤 */
.tile-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: calc(25% - 15rpx);
}

.tile-canvas {
  width: 80px;
  height: 80px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
}

.tile-step-text {
  font-size: 22rpx;
  color: #666;
  margin-top: 8rpx;
  text-align: center;
}

/* 控制按钮样式 */
.controls {
  display: flex;
  justify-content: space-around;
  width: 100%;
  max-width: 300px;
  margin-top: 20rpx;
}

.control-btn {
  width: 120px;
  height: 70rpx;
  line-height: 70rpx;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.control-btn:disabled {
  background: #eee;
  color: #999;
}

/* 通用画布样式 */
.stroke-canvas {
  background: #f9f9f9;
  border-radius: 8px;
  display: block;
  border: 1px solid #eee;
}
</style>