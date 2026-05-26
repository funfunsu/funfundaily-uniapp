<template>
  <view v-if="visible" class="poster-overlay" @tap.self="handleClose">
    <view class="poster-shell" @tap.stop>
      <view class="poster-topbar">
        <text class="poster-title">分享任务清单</text>
        <view class="poster-close" @click="handleClose"><text class="poster-close__icon">×</text></view>
      </view>

      <!-- 预览区 -->
      <scroll-view scroll-y class="poster-stage">
        <view class="poster-frame">
          <image v-if="resultImg" :src="resultImg" class="poster-preview" mode="widthFix" />
          <view v-else class="poster-loading">
            <view class="poster-loading__spinner"></view>
            <text class="poster-loading__text">{{ renderStage }}</text>
          </view>
        </view>
      </scroll-view>

      <text class="poster-hint">好友收到图片后，长按识别二维码即可收下任务</text>

      <!-- 操作按钮 -->
      <view class="poster-actions">
        <button class="poster-btn poster-btn--ghost" :disabled="!resultImg" @click="handleSave">
          <text class="poster-btn__text">保存到相册</text>
        </button>
        <!-- #ifdef MP-WEIXIN -->
        <button class="poster-btn poster-btn--primary" :disabled="!resultImg" @tap="handleShareImageMenu">
          <text class="poster-btn__text">分享给朋友</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="poster-btn poster-btn--primary" :disabled="!resultImg" @click="handleSave">
          <text class="poster-btn__text">保存并分享</text>
        </button>
        <!-- #endif -->
      </view>

      <!-- 隐藏画布（离屏绘制） -->
      <!-- #ifdef MP-WEIXIN -->
      <canvas
        id="sharePosterCanvas2d"
        type="2d"
        :style="`position:absolute;left:-9999px;top:-9999px;width:${canvasWidth}px;height:${canvasHeight}px;`"
      ></canvas>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <!-- #ifndef H5 -->
      <canvas
        canvas-id="sharePosterCanvas"
        :style="`position:absolute;left:-9999px;top:-9999px;width:${canvasWidth}px;height:${canvasHeight}px;`"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
      <!-- #endif -->
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup>
import { ref, watch, getCurrentInstance, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 选中的任务数组
  tasks: { type: Array, default: () => [] },
  // 二维码图片来源（已由 imageHelper 转成各端可用的路径 / dataURL）
  qrSource: { type: String, default: '' },
  // 分享者昵称
  creatorName: { type: String, default: '我' }
})

const emit = defineEmits(['close', 'shared'])

const instance = getCurrentInstance()
const resultImg = ref('')
const renderStage = ref('正在生成分享图...')
const canvasWidth = ref(600)
const canvasHeight = ref(900)

// 布局常量（逻辑像素）
const WIDTH = 600
const PAD = 40
const HEADER_H = 200
const ROW_H = 96
const FOOTER_H = 320

const isH5 = () => typeof process !== 'undefined' && process.env && process.env.UNI_PLATFORM === 'h5'

watch(
  () => [props.visible, props.tasks, props.qrSource],
  () => {
    if (props.visible && props.tasks.length > 0) {
      resultImg.value = ''
      renderStage.value = '正在生成分享图...'
      nextTick(() => setTimeout(() => renderPoster(), 60))
    }
  },
  { immediate: true, deep: false }
)

// ===== 跨平台 canvas 样式 API（兼容旧版 uni canvas 的 setXxx 写法）=====
function makeCanvasApi(ctx) {
  const legacy = typeof ctx.setFillStyle === 'function' && typeof ctx.fillStyle === 'undefined'
  return {
    legacy,
    setFill(v) { if (legacy) ctx.setFillStyle(v); else ctx.fillStyle = v },
    setStroke(v) { if (legacy) ctx.setStrokeStyle(v); else ctx.strokeStyle = v },
    setLineWidth(v) { if (legacy) ctx.setLineWidth(v); else ctx.lineWidth = v },
    setTextAlign(v) { if (legacy && ctx.setTextAlign) ctx.setTextAlign(v); else if (!legacy) ctx.textAlign = v },
    setTextBaseline(v) { if (legacy && ctx.setTextBaseline) ctx.setTextBaseline(v); else if (!legacy) ctx.textBaseline = v },
    setFont(spec, size) { if (legacy) ctx.setFontSize(size); else ctx.font = spec },
    measureWidth(text) {
      if (ctx.measureText) { try { return ctx.measureText(text).width } catch (e) { /* ignore */ } }
      return String(text || '').length * 12
    }
  }
}

function drawRoundRectPath(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function truncate(api, text, maxWidth) {
  const str = String(text == null ? '' : text)
  if (api.measureWidth(str) <= maxWidth) return str
  let result = str
  while (result.length > 1 && api.measureWidth(result + '…') > maxWidth) {
    result = result.slice(0, -1)
  }
  return result + '…'
}

function computeHeight() {
  return HEADER_H + props.tasks.length * ROW_H + FOOTER_H
}

// 真正的绘制逻辑（ctx 为 2d/H5/legacy 任一；qrImg 为 Image 对象或路径字符串）
function paint(ctx, api, width, height, qrImg) {
  // 背景
  api.setFill('#f5f7fa')
  ctx.fillRect(0, 0, width, height)

  // ===== 顶部头图 =====
  if (ctx.createLinearGradient) {
    const grad = ctx.createLinearGradient(0, 0, width, HEADER_H)
    grad.addColorStop(0, '#4f8cff')
    grad.addColorStop(1, '#2196f3')
    api.setFill(grad)
  } else {
    api.setFill('#2196f3')
  }
  ctx.fillRect(0, 0, width, HEADER_H)

  api.setFill('rgba(255,255,255,0.92)')
  api.setTextAlign('left')
  api.setTextBaseline('top')
  api.setFont('600 26px sans-serif', 26)
  ctx.fillText('fun成长 · 任务清单', PAD, 44)

  api.setFill('#ffffff')
  api.setFont('800 40px "PingFang SC", sans-serif', 40)
  ctx.fillText(truncate(api, `来自 ${props.creatorName} 的分享`, width - PAD * 2), PAD, 86)

  api.setFill('rgba(255,255,255,0.85)')
  api.setFont('400 24px sans-serif', 24)
  ctx.fillText(`共 ${props.tasks.length} 个任务，一起打卡吧`, PAD, 142)

  // ===== 任务行 =====
  let y = HEADER_H + 16
  api.setTextBaseline('middle')
  props.tasks.forEach((task, idx) => {
    const cardX = PAD
    const cardY = y
    const cardW = width - PAD * 2
    const cardH = ROW_H - 16
    // 卡片底
    drawRoundRectPath(ctx, cardX, cardY, cardW, cardH, 16)
    api.setFill('#ffffff')
    ctx.fill()

    // 序号圆点
    const dotR = 18
    const dotCx = cardX + 20 + dotR
    const dotCy = cardY + cardH / 2
    api.setFill('#e8f1ff')
    ctx.beginPath()
    ctx.arc(dotCx, dotCy, dotR, 0, Math.PI * 2)
    ctx.fill()
    api.setFill('#2196f3')
    api.setTextAlign('center')
    api.setFont('700 22px sans-serif', 22)
    ctx.fillText(String(idx + 1), dotCx, dotCy + 1)

    const textX = dotCx + dotR + 18
    // 右侧标签（积分 / 类型）
    const score = Number(task?.extra?.score || 0)
    const tagText = score > 0 ? `+${score}分` : (task?.extra?.taskType === 'Habit' ? '习惯' : '任务')
    api.setFont('600 22px sans-serif', 22)
    const tagW = api.measureWidth(tagText) + 28
    const tagH = 40
    const tagX = cardX + cardW - tagW - 16
    const tagY = cardY + (cardH - tagH) / 2
    drawRoundRectPath(ctx, tagX, tagY, tagW, tagH, tagH / 2)
    api.setFill(score > 0 ? '#fff4e5' : '#eef2f7')
    ctx.fill()
    api.setFill(score > 0 ? '#f59e0b' : '#64748b')
    api.setTextAlign('center')
    ctx.fillText(tagText, tagX + tagW / 2, dotCy + 1)

    // 标题 + 描述
    const textMaxW = tagX - textX - 16
    api.setTextAlign('left')
    api.setFill('#1f2937')
    api.setFont('600 26px sans-serif', 26)
    const desc = task?.itemDesc ? String(task.itemDesc) : ''
    if (desc) {
      ctx.fillText(truncate(api, task?.itemTitle || '未命名任务', textMaxW), textX, dotCy - 14)
      api.setFill('#94a3b8')
      api.setFont('400 20px sans-serif', 20)
      ctx.fillText(truncate(api, desc, textMaxW), textX, dotCy + 16)
    } else {
      ctx.fillText(truncate(api, task?.itemTitle || '未命名任务', textMaxW), textX, dotCy + 1)
    }

    y += ROW_H
  })

  // ===== 底部二维码卡片 =====
  const footerY = HEADER_H + props.tasks.length * ROW_H + 8
  const fCardX = PAD
  const fCardW = width - PAD * 2
  const fCardH = FOOTER_H - 40
  drawRoundRectPath(ctx, fCardX, footerY, fCardW, fCardH, 20)
  api.setFill('#ffffff')
  ctx.fill()

  const qrSize = 180
  const qrX = fCardX + (fCardW - qrSize) / 2
  const qrY = footerY + 30
  if (qrImg) {
    try { ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize) } catch (e) { /* ignore */ }
  } else {
    api.setFill('#f1f5f9')
    ctx.fillRect(qrX, qrY, qrSize, qrSize)
  }

  api.setFill('#1f2937')
  api.setTextAlign('center')
  api.setTextBaseline('top')
  api.setFont('600 26px sans-serif', 26)
  ctx.fillText('长按识别二维码 · 收下任务', width / 2, qrY + qrSize + 24)
  api.setFill('#94a3b8')
  api.setFont('400 20px sans-serif', 20)
  ctx.fillText('用微信打开 fun成长 小程序', width / 2, qrY + qrSize + 60)
}

function renderPoster() {
  const width = WIDTH
  const height = computeHeight()
  canvasWidth.value = width
  canvasHeight.value = height

  // ---- H5 ----
  if (isH5()) {
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
    if (!canvas) { renderStage.value = '当前环境不支持生成图片'; return }
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    const api = makeCanvasApi(ctx)
    const finish = (qrImg) => {
      paint(ctx, api, width, height, qrImg)
      try { resultImg.value = canvas.toDataURL('image/png') } catch (e) { renderStage.value = '生成失败' }
    }
    if (props.qrSource) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => finish(img)
      img.onerror = () => finish(null)
      img.src = props.qrSource
    } else { finish(null) }
    return
  }

  // ---- mp-weixin canvas 2d ----
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.createSelectorQuery) {
    const query = wx.createSelectorQuery()
    if (instance && instance.proxy && query.in) query.in(instance.proxy)
    query.select('#sharePosterCanvas2d').fields({ node: true, size: true }).exec((res) => {
      const node = res && res[0] && res[0].node
      if (!node) { renderStage.value = '生成失败(canvas)'; return }
      const canvas = node
      const ctx = canvas.getContext('2d')
      // pixelRatio 改用 getWindowInfo（getSystemInfoSync 已废弃），旧基础库回退
      const dpr = ((wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {})).pixelRatio) || 2
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.scale(dpr, dpr)
      const api = makeCanvasApi(ctx)
      const finish = (qrImg) => {
        paint(ctx, api, width, height, qrImg)
        wx.canvasToTempFilePath({
          canvas,
          x: 0, y: 0, width, height,
          destWidth: width * dpr, destHeight: height * dpr,
          fileType: 'png',
          success: (r) => { resultImg.value = r.tempFilePath },
          fail: () => { renderStage.value = '导出失败，请重试' }
        })
      }
      if (props.qrSource) {
        const img = canvas.createImage()
        img.onload = () => finish(img)
        img.onerror = () => finish(null)
        img.src = props.qrSource
      } else { finish(null) }
    })
    return
  }
  // #endif

  // ---- 其它平台（App）：旧版 uni canvas ----
  // #ifndef H5
  // #ifndef MP-WEIXIN
  const ctx = uni.createCanvasContext('sharePosterCanvas', instance && instance.proxy)
  const api = makeCanvasApi(ctx)
  paint(ctx, api, width, height, props.qrSource || null)
  ctx.draw(false, () => {
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId: 'sharePosterCanvas', x: 0, y: 0, width, height,
        success: (r) => { resultImg.value = r.tempFilePath },
        fail: () => { renderStage.value = '导出失败，请重试' }
      }, instance && instance.proxy)
    }, 120)
  })
  // #endif
  // #endif
}

function handleSave() {
  if (!resultImg.value) return
  // #ifdef H5
  if (typeof document !== 'undefined') {
    const a = document.createElement('a')
    a.href = resultImg.value
    a.download = `task-share-${Date.now()}.png`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    uni.showToast({ title: '已开始下载', icon: 'none' })
  }
  return
  // #endif
  // #ifndef H5
  uni.saveImageToPhotosAlbum({
    filePath: resultImg.value,
    success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
    fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' })
  })
  // #endif
}

function handleShareImageMenu() {
  if (!resultImg.value) return
  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && wx.showShareImageMenu) {
    wx.showShareImageMenu({
      path: resultImg.value,
      success: () => { emit('shared'); },
      fail: () => uni.showToast({ title: '已取消分享', icon: 'none' })
    })
  } else {
    uni.showToast({ title: '当前微信版本不支持，请先保存图片', icon: 'none' })
  }
  // #endif
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.poster-overlay {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.65); z-index: 9999;
  display: flex; align-items: flex-end; justify-content: center;
}
.poster-shell {
  width: 100%; max-width: 760rpx;
  background: #ffffff;
  border-top-left-radius: 28rpx; border-top-right-radius: 28rpx;
  display: flex; flex-direction: column;
  max-height: 90vh;
  padding-bottom: env(safe-area-inset-bottom);
}
.poster-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28rpx 32rpx 12rpx;
  box-sizing: border-box; width: 100%;
}
.poster-title { font-size: 32rpx; font-weight: 700; color: #1f2937; }
.poster-close {
  width: 60rpx; height: 60rpx; border-radius: 50%;
  background: #f1f5f9; display: flex; align-items: center; justify-content: center;
}
.poster-close__icon { font-size: 40rpx; color: #64748b; line-height: 1; }
.poster-stage {
  flex: 1; min-height: 0; padding: 12rpx 32rpx;
  box-sizing: border-box; width: 100%;
}
.poster-frame {
  width: 100%; border-radius: 20rpx; overflow: hidden;
  background: #f5f7fa; min-height: 400rpx;
  display: flex; align-items: center; justify-content: center;
}
.poster-preview { width: 100%; display: block; }
.poster-loading { display: flex; flex-direction: column; align-items: center; gap: 18rpx; padding: 80rpx 0; }
.poster-loading__spinner {
  width: 56rpx; height: 56rpx; border-radius: 50%;
  border: 6rpx solid #e2e8f0; border-top-color: #2196f3;
  animation: posterSpin 0.9s linear infinite;
}
@keyframes posterSpin { to { transform: rotate(360deg); } }
.poster-loading__text { font-size: 26rpx; color: #94a3b8; }
.poster-hint { display: block; text-align: center; font-size: 24rpx; color: #94a3b8; padding: 8rpx 32rpx 0; box-sizing: border-box; width: 100%; }
.poster-actions { display: flex; gap: 20rpx; padding: 24rpx 32rpx 28rpx; box-sizing: border-box; width: 100%; }
.poster-btn {
  flex: 1; height: 88rpx; border-radius: 44rpx; border: none; margin: 0;
  display: flex; align-items: center; justify-content: center;
}
.poster-btn::after { border: none; }
.poster-btn[disabled] { opacity: 0.45; }
.poster-btn--ghost { background: #f1f5f9; }
.poster-btn--ghost .poster-btn__text { color: #475569; font-size: 28rpx; font-weight: 600; }
.poster-btn--primary { background: #2196f3; }
.poster-btn--primary .poster-btn__text { color: #ffffff; font-size: 28rpx; font-weight: 600; }
</style>
