<template>
  <view class="hanzi-stroke-container">
    <button v-if="!char" @click="handleInputConfirm" class="load-btn">加载笔顺</button>

    <!-- H5保留type="2d"，小程序仅保留canvas-id -->
    <canvas
        v-if="strokes.length > 0"
        :canvas-id="isMiniProgram ? 'strokeCanvas' : undefined"
        :id="isH5 ? 'strokeCanvas' : undefined"
        :type="isH5 ? '2d' : ''"
        ref="canvasRef"
        class="stroke-canvas"
    ></canvas>

    <view v-if="strokes.length > 0" class="step-info">
      第 {{ currentStep + 1 }} / {{ strokes.length }} 步
    </view>

    <view v-if="strokes.length > 0 && !autoWrite" class="controls">
      <button @click="prev" :disabled="currentStep === 0" class="control-btn">上一步</button>
      <button @click="next" :disabled="currentStep >= strokes.length - 1" class="control-btn">下一步</button>
    </view>
  </view>
</template>

<script setup>
import { nextTick, onMounted, ref, watch, onUnmounted, getCurrentInstance } from 'vue';
import { getCharData } from '../stroke-data/index';

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
const canvasRef = ref(null);
const wholeCharBounds = ref({ minX: 0, maxX: 1024, minY: 0, maxY: 1024 });

// 平台判断
const isH5 = process.env.UNI_PLATFORM === 'h5';
const isMiniProgram = !isH5 && process.env.UNI_PLATFORM !== 'app-plus';

// Canvas上下文
let ctx = null; // 小程序旧版/H5 2D
let autoWriteTimer = null;
const canvasSize = 300; // 逻辑像素

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
  setTimeout(initCanvas, 200);
});

onUnmounted(() => {
  stopAutoWrite();
});

/**
 * 初始化Canvas上下文
 */
function initCanvas() {
  if (isH5) {
    nextTick(() => {
      const uniCanvasEl = canvasRef.value?.$el;
      if (!uniCanvasEl) return;
      const realCanvas = uniCanvasEl.querySelector('canvas');
      if (realCanvas) {
        const dpr = window.devicePixelRatio || 1;
        realCanvas.width = canvasSize * dpr;
        realCanvas.height = canvasSize * dpr;
        ctx = realCanvas.getContext('2d');
        console.log('✅ H5 Canvas 2D初始化成功');
      }
    });
  } else if (isMiniProgram) {
    // 小程序旧版上下文
    ctx = uni.createCanvasContext('strokeCanvas', proxy);
    console.log('✅ 小程序旧版Canvas初始化成功');
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
    const data = getCharData(targetChar);
    if (data && Array.isArray(data?.strokes)) {
      strokes.value = data.strokes.map(removeTrailingZ);
      wholeCharBounds.value = getWholeCharBounds(strokes.value);

      setTimeout(() => {
        drawCurrentStroke();
        if (props.autoWrite) {
          startAutoWrite();
        }
      }, 300);
    } else {
      uni.showToast({ title: '该字暂不支持', icon: 'none' });
    }
  } catch (e) {
    console.error('加载笔顺失败:', e);
    uni.showToast({ title: '字库无此字', icon: 'none' });
  }
}

/**
 * 处理输入框确认事件
 */
function handleInputConfirm() {
  loadStrokes();
}

/**
 * 小程序旧版Canvas绘制实心笔画（核心：双线填充法）
 */
function drawSolidPathForMiniProgram(ctx, pathData, globalBounds) {
  const logicalW = canvasSize;
  const logicalH = canvasSize;
  const pad = 16;
  const actualPad = pad * 0.6;
  const lineWidth = 8; // 笔画宽度

  // 计算缩放和偏移
  const contentW = globalBounds.maxX - globalBounds.minX;
  const contentH = globalBounds.maxY - globalBounds.minY;
  if (contentW <= 0 || contentH <= 0) return;

  const scaleX = (logicalW - actualPad * 2) / contentW;
  const scaleY = (logicalH - actualPad * 2) / contentH;
  const scale = Math.min(scaleX, scaleY) * 0.8;

  const offsetX = (logicalW - contentW * scale) / 2;
  const offsetY = (logicalH - contentH * scale) / 2;

  // 解析路径并存储所有点（用于生成填充轮廓）
  const pathPoints = [];
  const tokens = pathData.trim().split(/\s+/);
  let i = 0;
  let lastX = 0, lastY = 0;

  // 第一步：解析路径，转换坐标并存储点
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === 'M') {
      const x = parseFloat(tokens[i + 1]);
      const y = parseFloat(tokens[i + 2]);
      if (!isNaN(x) && !isNaN(y)) {
        const newX = (x - globalBounds.minX) * scale + offsetX;
        const newY = logicalH - ((y - globalBounds.minY) * scale + offsetY);
        lastX = newX;
        lastY = newY;
        pathPoints.push({ type: 'M', x: newX, y: newY });
      }
      i += 3;
    } else if (token === 'L') {
      const x = parseFloat(tokens[i + 1]);
      const y = parseFloat(tokens[i + 2]);
      if (!isNaN(x) && !isNaN(y)) {
        const newX = (x - globalBounds.minX) * scale + offsetX;
        const newY = logicalH - ((y - globalBounds.minY) * scale + offsetY);
        pathPoints.push({ type: 'L', x: newX, y: newY });
        lastX = newX;
        lastY = newY;
      }
      i += 3;
    } else if (token === 'Q') {
      const x1 = parseFloat(tokens[i + 1]);
      const y1 = parseFloat(tokens[i + 2]);
      const x = parseFloat(tokens[i + 3]);
      const y = parseFloat(tokens[i + 4]);
      if (!isNaN(x1) && !isNaN(y1) && !isNaN(x) && !isNaN(y)) {
        const cx1 = (x1 - globalBounds.minX) * scale + offsetX;
        const cy1 = logicalH - ((y1 - globalBounds.minY) * scale + offsetY);
        const cx = (x - globalBounds.minX) * scale + offsetX;
        const cy = logicalH - ((y - globalBounds.minY) * scale + offsetY);
        pathPoints.push({ type: 'Q', x1: cx1, y1: cy1, x: cx, y: cy });
        lastX = cx;
        lastY = cy;
      }
      i += 5;
    } else {
      i++;
    }
  }

  // 第二步：绘制实心笔画（双线填充法）
  ctx.beginPath();

  // 绘制主路径（粗描边）
  for (let p = 0; p < pathPoints.length; p++) {
    const point = pathPoints[p];
    if (point.type === 'M') {
      ctx.moveTo(point.x, point.y);
    } else if (point.type === 'L') {
      ctx.lineTo(point.x, point.y);
    } else if (point.type === 'Q') {
      ctx.quadraticCurveTo(point.x1, point.y1, point.x, point.y);
    }
  }

  // 核心：设置粗线宽 + 填充色 = 实心效果
  ctx.setStrokeStyle('#1E88E5');
  ctx.setFillStyle('#1E88E5');
  ctx.setLineWidth(lineWidth);
  ctx.setLineCap('round');
  ctx.setLineJoin('round');

  // 先描边（粗线），再填充路径内部（模拟实心）
  ctx.stroke();
  // 额外绘制一个细线填充层，确保实心
  ctx.setLineWidth(1);
  ctx.fill();

  ctx.closePath();
}

/**
 * H5 Canvas 2D绘制实心笔画
 */
function drawSolidPathForH5(ctx, pathData, globalBounds) {
  const dpr = window.devicePixelRatio || 1;
  const logicalW = canvasSize;
  const logicalH = canvasSize;
  const pad = 16;
  const actualPad = pad * 0.6;
  const lineWidth = 8 * dpr;

  const contentW = globalBounds.maxX - globalBounds.minX;
  const contentH = globalBounds.maxY - globalBounds.minY;
  if (contentW <= 0 || contentH <= 0) return;

  const scaleX = (logicalW - actualPad * 2) / contentW;
  const scaleY = (logicalH - actualPad * 2) / contentH;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (logicalW - contentW * scale) / 2;
  const offsetY = (logicalH - contentH * scale) / 2;

  const tokens = pathData.trim().split(/\s+/);
  const newTokens = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (token === 'M' || token === 'L' || token === 'Q') {
      newTokens.push(token);
      let valCount = token === 'M' || token === 'L' ? 2 : 4;
      for (let j = 1; j <= valCount; j++) {
        const val = parseFloat(tokens[i + j]);
        if (isNaN(val)) break;
        const isX = j % 2 === 1;
        const originalY = isX ? val : globalBounds.maxY - (val - globalBounds.minY);
        const logicVal = isX
            ? (val - globalBounds.minX) * scale + offsetX
            : (originalY - globalBounds.minY) * scale + offsetY;
        newTokens.push((logicVal * dpr).toString());
      }
      i += token === 'M' || token === 'L' ? 3 : 5;
    } else {
      i++;
    }
  }

  const finalPath = newTokens.join(' ');
  const path = new Path2D(finalPath);

  // H5正常填充+描边
  ctx.fillStyle = '#1E88E5';
  ctx.strokeStyle = '#1E88E5';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.fill(path);
  ctx.stroke(path);
}

/**
 * 绘制当前步骤的笔画
 */
function drawCurrentStroke() {
  if (!strokes.value.length || currentStep.value >= strokes.value.length || !ctx) {
    return;
  }

  if (isH5) {
    // H5绘制
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i <= currentStep.value; i++) {
      drawSolidPathForH5(ctx, strokes.value[i], wholeCharBounds.value);
    }
  } else if (isMiniProgram) {
    // 小程序绘制实心笔画
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    for (let i = 0; i <= currentStep.value; i++) {
      drawSolidPathForMiniProgram(ctx, strokes.value[i], wholeCharBounds.value);
    }

    // 强制绘制
    ctx.draw(false, () => {
      console.log('✅ 小程序实心笔画绘制完成');
    });
  }
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
  // 3. 重新绘制第一步
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
.stroke-canvas {
  width: 300px;
  height: 300px;
  background: #f9f9f9;
  border-radius: 8px;
  margin: 20rpx 0;
  display: block;
  border: 1px solid #eee;
}
.step-info {
  text-align: center;
  margin: 20rpx 0;
  font-size: 32rpx;
  color: #333;
}
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
</style>